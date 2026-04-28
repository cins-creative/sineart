/**
 * Supabase: thêm cột một lần (SQL Editor):
 * `alter table public.ag_knowledge_base add column if not exists attachments jsonb;`
 */

export type KbLinkAttachment = { label?: string; url: string };

/** Lưu Supabase `ag_knowledge_base.attachments` (jsonb). */
export type KbAttachments = {
  images?: string[];
  links?: KbLinkAttachment[];
};

export function parseKbAttachments(value: unknown): KbAttachments | null {
  if (value == null || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const images = Array.isArray(o.images)
    ? o.images
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const linksRaw = Array.isArray(o.links) ? o.links : [];
  const links: KbLinkAttachment[] = [];
  for (const item of linksRaw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { url?: unknown; label?: unknown };
    const url = typeof rec.url === "string" ? rec.url.trim() : "";
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const label = typeof rec.label === "string" ? rec.label.trim() : "";
    links.push(label ? { label, url } : { url });
  }
  const out: KbAttachments = {};
  if (images.length) out.images = [...new Set(images)];
  if (links.length) out.links = links;
  return Object.keys(out).length ? out : null;
}

export type KbDraftLinkRow = { label: string; url: string };

/** Đính kèm gửi kèm phản hồi chat (admin thử / Messenger). */
export type PickedFaqAttachments = {
  images: string[];
  links: KbLinkAttachment[];
};

const VI_STOPWORDS = new Set([
  "là",
  "gì",
  "có",
  "cho",
  "và",
  "một",
  "các",
  "với",
  "không",
  "nào",
  "thì",
  "được",
  "theo",
  "như",
  "hay",
  "ở",
  "học",
  "phí",
  "lớp",
  "khóa",
]);

/** Dùng trong system prompt — cùng ý với Worker `formatFaqEntry`. */
export function formatFaqRowForPrompt(row: {
  question?: string | null;
  answer?: string | null;
  attachments?: unknown;
}): string {
  const q = (row.question ?? "").trim();
  const a = (row.answer ?? "").trim();
  const lines = [`Q: ${q}`, `A: ${a}`];
  const parsed = parseKbAttachments(row.attachments);
  if (!parsed) return lines.join("\n");

  const extra: string[] = [];
  if (parsed.images?.length) {
    extra.push(
      `Đính kèm ảnh (URL — gửi kèm khi phù hợp): ${parsed.images.join(" | ")}`,
    );
  }
  if (parsed.links?.length) {
    const linkStr = parsed.links
      .map((l) => (l.label ? `${l.label}: ${l.url}` : l.url))
      .join(" | ");
    extra.push(`Link tham chiếu: ${linkStr}`);
  }
  if (extra.length) lines.push(extra.join("\n"));
  return lines.join("\n");
}

/**
 * Chọn attachments từ các mục FAQ khớp câu hỏi / câu trả lời (heuristic, không LLM).
 */
export function pickMatchedFaqAttachments(
  userMessage: string,
  assistantReply: string,
  faq: Array<{
    question?: string | null;
    answer?: string | null;
    attachments?: unknown;
  }>,
): PickedFaqAttachments | undefined {
  const um = userMessage.toLowerCase().trim();
  const ar = assistantReply.toLowerCase();
  const mergedImages = new Set<string>();
  const mergedLinks: KbLinkAttachment[] = [];

  for (const row of faq) {
    const parsed = parseKbAttachments(row.attachments);
    if (
      !parsed ||
      (!parsed.images?.length && !parsed.links?.length)
    ) {
      continue;
    }

    const q = (row.question ?? "").toLowerCase().trim();
    const ans = (row.answer ?? "").toLowerCase();
    let relevant = false;

    if (q.length >= 4 && um.length >= 4) {
      if (um.includes(q.slice(0, Math.min(60, q.length)))) relevant = true;
      if (
        !relevant &&
        q.includes(um.slice(0, Math.min(40, um.length)))
      ) {
        relevant = true;
      }
    }

    if (!relevant && q.length >= 6) {
      const words = q
        .split(/\s+/)
        .filter((w) => w.length > 2 && !VI_STOPWORDS.has(w));
      relevant = words.some((w) => um.includes(w));
    }

    if (!relevant && ans.length >= 20) {
      const prefix = ans.slice(0, 60);
      relevant = ar.includes(prefix.slice(0, Math.min(40, prefix.length)));
    }

    if (!relevant) continue;

    for (const im of parsed.images ?? []) mergedImages.add(im);
    for (const l of parsed.links ?? []) {
      if (!mergedLinks.some((x) => x.url === l.url)) mergedLinks.push(l);
    }
  }

  if (!mergedImages.size && !mergedLinks.length) return undefined;
  return {
    images: [...mergedImages],
    links: mergedLinks,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Bỏ khỏi tin nhắn chữ các URL ảnh đã hiển thị / gửi kèm để tránh trùng lặp. */
export function stripMatchedImageUrlsFromText(
  text: string,
  imageUrls: string[],
): string {
  if (!imageUrls.length) return text;
  let out = text;
  for (const raw of imageUrls) {
    const u = raw.trim();
    if (!u) continue;
    out = out.replace(new RegExp(escapeRegExp(u), "gi"), "");
  }
  out = out.replace(/`{1,3}\s*`{1,3}/g, " ");
  out = out.replace(/[ \t]+/g, " ");

  const lines = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (/^[:-–—•\s]+$/.test(l)) return false;
      const t = l.replace(/\s+/g, " ");
      if (/:\s*$/.test(t) && isLikelyImageUrlIntroLine(t)) return false;
      return true;
    });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isLikelyImageUrlIntroLine(line: string): boolean {
  return /(?:gửi|gởi).*ảnh|ảnh\s+(?:thông\s+tin|chi\s+tiết|minh\s+họa)|link\s+(?:ảnh|hình)|hình\s+minh\s+họa/i.test(
    line,
  );
}

export function buildKbAttachmentsForSave(input: {
  imageUrls: string[];
  links: KbDraftLinkRow[];
}): KbAttachments | null {
  const images = input.imageUrls
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((u) => /^https?:\/\//i.test(u));
  const links: KbLinkAttachment[] = [];
  for (const row of input.links) {
    const url = row.url.trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const label = row.label.trim();
    links.push(label ? { label, url } : { url });
  }
  const out: KbAttachments = {};
  if (images.length) out.images = [...new Set(images)];
  if (links.length) out.links = links;
  return Object.keys(out).length ? out : null;
}
