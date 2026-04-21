import * as cheerio from "cheerio";

/**
 * Pipeline import bài blog từ URL:
 *   1. Fetch HTML
 *   2. Parse + extract title / thumbnail / content / ảnh
 *   3. Upload từng ảnh lên Cloudflare Images
 *   4. Claude AI viết lại chuẩn SEO/GEO + thêm đoạn giới thiệu Sine Art
 */

export type ImportedBlogPayload = {
  title: string;
  thumbnail: string;
  image_alt: string;
  opening: string;
  content: string;
  ending: string;
  nguon: string;
};

type ExtractedArticle = {
  title: string;
  thumbnail: string;
  imageAlt: string;
  contentHtml: string;
  images: string[];
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const DEFAULT_WORKER = "https://sine-art-api.nguyenthanhtu-nkl.workers.dev";

/**
 * Headers giả lập navigation của Chrome thật để qua WAF/anti-bot đơn giản.
 * Không đủ để qua Cloudflare Bot Management — case đó sẽ fallback sang Worker.
 */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-Ch-Ua":
    '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function assertHtmlContentType(ct: string) {
  if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
    throw new Error(`URL không trả về HTML (content-type: ${ct}).`);
  }
}

/**
 * Fetch HTML qua Cloudflare Worker proxy — IP của Cloudflare network thường
 * không bị các site (Cloudflare/WAF) chặn như IP Vercel datacenter.
 *
 * Yêu cầu env:
 *   - SINE_ART_WORKER_SECRET (bắt buộc — nếu thiếu sẽ throw và fallback thất bại)
 *   - SINE_ART_WORKER_URL    (tuỳ chọn — mặc định DEFAULT_WORKER)
 */
async function fetchHtmlViaWorker(url: string): Promise<string> {
  const secret =
    process.env.SINE_ART_WORKER_SECRET?.trim() ||
    process.env.WORKER_API_SECRET?.trim();
  const base = process.env.SINE_ART_WORKER_URL?.trim() || DEFAULT_WORKER;
  if (!secret) {
    throw new Error(
      "Thiếu SINE_ART_WORKER_SECRET — không thể fallback qua Cloudflare Worker.",
    );
  }

  const res = await fetch(`${base.replace(/\/$/, "")}/fetch-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": secret,
    },
    body: JSON.stringify({ url }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    status?: number;
    statusText?: string;
    contentType?: string;
    html?: string;
    error?: string;
  } | null;

  if (!data) {
    throw new Error(`Worker fetch-url lỗi không đọc được JSON (HTTP ${res.status}).`);
  }
  if (!data.ok) {
    throw new Error(
      `Worker fetch-url trả lỗi: ${data.status ?? "?"} ${data.statusText ?? data.error ?? ""}`.trim(),
    );
  }
  assertHtmlContentType(data.contentType ?? "");
  if (typeof data.html !== "string" || !data.html.trim()) {
    throw new Error("Worker fetch-url trả HTML rỗng.");
  }
  return data.html;
}

/**
 * 2 tầng fetch:
 *   1. Direct fetch từ Vercel với header browser thật (nhanh, đủ cho site mở).
 *   2. Nếu bị chặn (403/401/429/451 hoặc network error) → retry qua Cloudflare
 *      Worker. Worker đi qua network CF nên IP reputation tốt, qua được hầu hết
 *      anti-bot ngoại trừ Cloudflare Bot Management mức cao.
 */
async function fetchHtml(url: string): Promise<string> {
  let directError: string | null = null;
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      redirect: "follow",
    });
    if (res.ok) {
      const ct = res.headers.get("content-type") ?? "";
      assertHtmlContentType(ct);
      return await res.text();
    }
    // 4xx từ WAF/anti-bot → chuyển sang Worker. 5xx cũng retry vì có thể origin
    // đang drop theo IP.
    if ([401, 403, 429, 451, 500, 502, 503].includes(res.status)) {
      directError = `Direct fetch ${res.status} ${res.statusText}`;
    } else {
      throw new Error(`Không fetch được URL (${res.status} ${res.statusText}).`);
    }
  } catch (err) {
    if (directError == null) {
      directError = err instanceof Error ? err.message : String(err);
    }
  }

  try {
    return await fetchHtmlViaWorker(url);
  } catch (workerErr) {
    const msg = workerErr instanceof Error ? workerErr.message : String(workerErr);
    throw new Error(
      `Không fetch được URL. Direct: ${directError ?? "unknown"}. Worker fallback: ${msg}`,
    );
  }
}

/** Resolve URL tương đối -> tuyệt đối dựa trên URL gốc. */
function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function extractArticle(html: string, baseUrl: string): ExtractedArticle {
  const $ = cheerio.load(html);

  const ogTitle = $('meta[property="og:title"]').attr("content");
  const h1 = $("h1").first().text().trim();
  const docTitle = $("title").first().text().trim();
  const title = (ogTitle || h1 || docTitle || "Bài viết").trim();

  const ogImage = $('meta[property="og:image"]').attr("content");
  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  const thumbnailRaw = ogImage || twitterImage || "";
  const thumbnail = thumbnailRaw ? resolveUrl(baseUrl, thumbnailRaw) : "";
  const imageAlt = $('meta[property="og:image:alt"]').attr("content")?.trim() || title;

  // Chọn vùng nội dung chính — thử các selector phổ biến, fallback: div dài nhất trong <body>.
  const candidates = [
    "article",
    "main article",
    "main",
    '[itemprop="articleBody"]',
    ".post-content",
    ".entry-content",
    ".article-content",
    ".single-content",
    "#content",
  ];
  type CheerioSelection = ReturnType<typeof $>;
  let $root: CheerioSelection = $("__sa_blog_none__");
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 400) {
      $root = el;
      break;
    }
  }
  if (!$root.length) {
    let longest: CheerioSelection | null = null;
    let longestLen = 0;
    $("body div").each((_, el) => {
      const $el = $(el);
      const t = $el.text().trim().length;
      const childDivs = $el.find("div").length;
      if (t > longestLen && childDivs < 50) {
        longest = $el;
        longestLen = t;
      }
    });
    if (longest && longestLen > 400) $root = longest;
  }
  if (!$root.length) $root = $("body");

  // Dọn rác
  $root.find(
    "script, style, nav, header, footer, aside, form, iframe, noscript, .share, .related, .ads, .comment, .comments"
  ).remove();

  // Normalize <img src>
  const imageSet = new Set<string>();
  $root.find("img").each((_, el) => {
    const $img = $(el);
    const dataSrc = $img.attr("data-src") || $img.attr("data-lazy-src") || $img.attr("data-original");
    const src = dataSrc || $img.attr("src") || "";
    if (!src) {
      $img.remove();
      return;
    }
    const abs = resolveUrl(baseUrl, src);
    $img.attr("src", abs);
    $img.removeAttr("srcset");
    $img.removeAttr("data-src");
    $img.removeAttr("data-lazy-src");
    $img.removeAttr("data-original");
    $img.removeAttr("loading");
    $img.removeAttr("decoding");
    imageSet.add(abs);
  });

  // Bỏ thuộc tính class/id rườm rà để HTML sạch
  $root.find("*").each((_, el) => {
    const $el = $(el);
    $el.removeAttr("class");
    $el.removeAttr("id");
    $el.removeAttr("style");
    $el.removeAttr("data-*");
  });

  const contentHtml = ($root.html() || "").trim();

  return {
    title,
    thumbnail,
    imageAlt,
    contentHtml,
    images: Array.from(imageSet),
  };
}

/** Upload ảnh từ URL gốc lên Cloudflare Images qua Worker Sine Art. */
async function uploadImageToCloudflare(srcUrl: string): Promise<string | null> {
  const secret =
    process.env.SINE_ART_WORKER_SECRET?.trim() || process.env.WORKER_API_SECRET?.trim();
  const base =
    process.env.SINE_ART_WORKER_URL?.trim() ||
    "https://sine-art-api.nguyenthanhtu-nkl.workers.dev";
  if (!secret) return null;

  try {
    const r = await fetch(srcUrl, {
      headers: { "User-Agent": UA, Accept: "image/*" },
      cache: "no-store",
      redirect: "follow",
    });
    if (!r.ok) return null;
    const blob = await r.blob();
    if (!blob.size) return null;

    const mime = blob.type || "image/jpeg";
    const ext =
      mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";

    const form = new FormData();
    form.append("file", blob, `blog-import.${ext}`);

    const up = await fetch(`${base.replace(/\/$/, "")}/upload-cf-images`, {
      method: "POST",
      headers: { "x-api-secret": secret },
      body: form,
    });
    if (!up.ok) return null;
    const j = (await up.json().catch(() => null)) as { success?: boolean; url?: string } | null;
    if (j?.success && typeof j.url === "string") return j.url;
    return null;
  } catch {
    return null;
  }
}

async function uploadAllImages(article: ExtractedArticle): Promise<{
  thumbnail: string;
  contentHtml: string;
  imageMap: Map<string, string>;
}> {
  const map = new Map<string, string>();

  const uniq = new Set(article.images);
  if (article.thumbnail) uniq.add(article.thumbnail);

  await Promise.all(
    Array.from(uniq).map(async (srcUrl) => {
      if (srcUrl.includes("imagedelivery.net/")) {
        map.set(srcUrl, srcUrl);
        return;
      }
      const cfUrl = await uploadImageToCloudflare(srcUrl);
      if (cfUrl) map.set(srcUrl, cfUrl);
    })
  );

  // Replace trong HTML
  let html = article.contentHtml;
  for (const [orig, cf] of map.entries()) {
    if (orig === cf) continue;
    const safe = orig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(`src="${safe}"`, "g"), `src="${cf}"`);
  }

  const thumbnail = article.thumbnail ? map.get(article.thumbnail) || article.thumbnail : "";
  // Fallback: dùng ảnh đầu tiên trong content nếu không có thumbnail
  const finalThumb = thumbnail || (article.images[0] ? (map.get(article.images[0]) || article.images[0]) : "");

  return { thumbnail: finalThumb, contentHtml: html, imageMap: map };
}

type ClaudeRewrite = {
  title: string;
  opening: string;
  content: string;
  ending: string;
};

const CLAUDE_SYSTEM = [
  "Ban la Sine — mot nguoi co kien thuc sau rong ve linh vuc nghe thuat thi giac: tu nen tang my thuat truyen thong (hinh hoa, bo cuc mau, trang tri mau) den cac cong cu digital hien dai (Procreate, Clip Studio Paint, Photoshop, Illustrator, Blender...). Ban lam viec tai Sine Art — co so dao tao my thuat tai TP.HCM.",
  "",
  "PHONG CACH VIET (rat quan trong):",
  "- Viet nhu dang chia se ca nhan voi ban be, hoc tro — co tinh cach, co cam xuc, khong kho khan.",
  "- Dung 'minh', 'ban', 'chung ta' thay vi 'tac gia', 'nguoi hoc'.",
  "- Dung cau mo dau kieu: 'Minh da tung...', 'Co mot dieu nhieu ban chua biet la...', 'Khi moi bat dau hoc ve, minh cung...', 'That ra thi...'",
  "- Xen cau hoi tu nhien giua bai: 'Ban co biet tai sao khong?', 'Nghe co ve don gian, nhung thuc ra...'",
  "- The hien kien thuc am hieu nhung khong pho truong — nhu dang ngoi cafe noi chuyen ve nghe.",
  "",
  "NHIEM VU: Viet lai bai viet thanh bai blog day du, sau sac, toi thieu 1200-2000 tu trong phan content.",
  "",
  "YEU CAU NOI DUNG:",
  "1. Mo rong moi heading: giai thich, phan tich, vi du cu the tu goc nhin nguoi da tung lam — khong chi liet ke ly thuyet.",
  "2. Them kien thuc nen tu goc do thuc chien: lich su, ngu canh, sai lam pho bien, dieu minh uoc gi biet truoc.",
  "3. Keywords tu nhien: ve, my thuat, hoc ve, hinh hoa, bo cuc mau, digital art (khong nhoi nhet).",
  "4. Them muc FAQ neu phu hop: 3-4 cau hoi + tra loi ngan gon theo phong cach Sine.",
  "5. Cau truc: H2 -> H3 -> doan van >= 3 cau. Khong dung markdown.",
  "6. Giu nguyen moi the <img src='...'> tu noi dung goc, khong xoa, khong them anh moi.",
  "",
  "YEU CAU LAYOUT CHUYEN NGHIEP:",
  "7. Su dung <table> de trinh bay du lieu so sanh, thong ke, danh sach ky thuat co nhieu truong (vi du: bang so sanh cac phan mem ve, bang tom tat dac diem ky thuat). Table can co <thead><th> va <tbody><td>, moi cell co padding.",
  "8. Xen ke anh va van ban chuyen nghiep: dat <img> ngay sau hoac truoc doan van lien quan, them caption <p><em>Mo ta anh</em></p> ngay duoi moi anh.",
  "9. Dung <blockquote> de noi bat diem quan trong hoac trich dan.",
  "10. Them callout box bang <div class='tip-box'><strong>Meo cua Sine:</strong> noi dung</div> cho cac tip thuc hanh.",
  "11. Su dung <ol> cho cac buoc huong dan co trinh tu, <ul> cho danh sach khong co thu tu.",
  "",
  "OUTPUT FORMAT — Tra ve CHINH XAC theo format XML tag sau, khong them gi khac (khong JSON, khong markdown, khong giai thich):",
  "<title>Tieu de SEO hap dan <= 70 ky tu</title>",
  "<opening><p><strong>3-5 cau mo bai tom luoc gia tri bai viet</strong></p></opening>",
  "<content>Toan bo HTML noi dung chinh >= 1200 tu</content>",
  "<ending>",
  "Noi dung ending phai co du cac phan sau (viet bang tieng Viet, hay va thu hut):",
  "1. 1-2 cau dan nhap: Sine Art la co so dao tao my thuat chuyen nghiep tai TP.HCM — chuyen luyen thi dai hoc cac nganh My thuat / Kien truc / Thiet ke, dong thoi co cac khoa my thuat ung dung bo tro ky nang va cong viec tuong lai.",
  "2. Doan <ul><li> liet ke cac khoa hoc: Hinh hoa co ban & nang cao, Bo cuc mau, Trang tri mau, Digital Art (Procreate / Clip Studio), Luyen thi dai hoc chuyen nganh.",
  "3. 1 cau CTA: Lien he tu van mien phi qua so dien thoai <strong>0867 551 531</strong> de duoc ho tro chon khoa hoc phu hop.",
  "</ending>",
].join("\n");

async function callClaude(article: { title: string; contentHtml: string }): Promise<ClaudeRewrite> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Thiếu ANTHROPIC_API_KEY trong biến môi trường server.");
  }

  const userMessage =
    `Tieu de goc: ${article.title}\n\nNoi dung goc (HTML):\n${article.contentHtml}\n\n---\nLUU Y: Viet that day du va chi tiet. Phan content phai >= 1200 tu. Mo rong moi y, them vi du, them kien thuc nen. Khong rut gon.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 16000,
      system: CLAUDE_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Claude API lỗi ${res.status}: ${errText.slice(0, 240)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const textBlock = data.content?.find((c) => c.type === "text");
  const raw = (textBlock?.text ?? "").trim();
  if (!raw) throw new Error("Claude trả về nội dung rỗng.");

  // Extract XML tags — robust hơn JSON với nội dung HTML dài
  const parsed = parseXmlTags(raw);

  if (!isRewriteShape(parsed)) {
    // Log 500 ký tự đầu để debug nếu cần
    const preview = raw.slice(0, 500).replace(/\n/g, " ");
    throw new Error(`Claude trả về format không đúng. Bắt đầu response: ${preview}`);
  }
  return parsed;
}

/** Trích nội dung giữa <tag>...</tag> — không phân biệt whitespace. */
function extractTag(text: string, tag: string): string {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "i");
  const m = text.match(re);
  if (!m) return "";
  return m[0]
    .slice(tag.length + 2, -(tag.length + 3))
    .trim();
}

/**
 * Parse output XML-tag từ Claude thành object ClaudeRewrite.
 * Fallback: nếu Claude vẫn trả JSON thì parse JSON như cũ.
 */
function parseXmlTags(raw: string): unknown {
  // Thử XML tag trước
  const title = extractTag(raw, "title");
  const opening = extractTag(raw, "opening");
  const content = extractTag(raw, "content");
  const ending = extractTag(raw, "ending");

  if (title || content) {
    return { title, opening, content, ending };
  }

  // Fallback: Claude vẫn trả JSON
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

function isRewriteShape(v: unknown): v is ClaudeRewrite {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    typeof o.opening === "string" &&
    typeof o.content === "string" &&
    typeof o.ending === "string"
  );
}

export async function importBlogFromUrl(url: string): Promise<ImportedBlogPayload> {
  const html = await fetchHtml(url);
  const article = extractArticle(html, url);

  const { thumbnail, contentHtml } = await uploadAllImages(article);

  const rewrite = await callClaude({ title: article.title, contentHtml });

  return {
    title: rewrite.title,
    thumbnail,
    image_alt: article.imageAlt || rewrite.title,
    opening: rewrite.opening,
    content: rewrite.content,
    ending: rewrite.ending,
    nguon: url,
  };
}
