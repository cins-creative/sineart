import type { KbLinkAttachment, PickedFaqAttachments } from "@/lib/agent/knowledge-attachments";

/** Cùng thứ tự ảnh mẫu gửi kèm khi hội thoại nhắc tới môn (khớp `dh_truong_nganh.mon_thi`). */
export const DH_MON_THI_SAMPLE_ORDER = [
  "Hình họa khối cơ bản",
  "Hình họa tĩnh vật",
  "Hình họa tượng tròn",
  "Hình họa chân dung",
  "Hình họa toàn thân",
  "Trang trí màu",
  "Bố cục màu",
] as const;

export type DhMonThiSampleLabel = (typeof DH_MON_THI_SAMPLE_ORDER)[number];

/**
 * Map cố định nhãn môn thi (khớp đề ĐH / prompt) → file trong `public/img/dh-mon-thi/`
 * → URL công khai `…/img/dh-mon-thi/<file>` (VD: https://sineart.vn/img/dh-mon-thi/bo-cuc-mau.png).
 */
const FILENAME_BY_MON: Record<DhMonThiSampleLabel, string> = {
  "Hình họa khối cơ bản": "hinh-hoa-khoi-co-ban.png",
  "Hình họa tĩnh vật": "hinh-hoa-tinh-vat.png",
  "Hình họa tượng tròn": "hinh-hoa-tuong-tron.png",
  "Hình họa chân dung": "hinh-hoa-chan-dung.png",
  "Hình họa toàn thân": "hinh-hoa-toan-than.png",
  "Trang trí màu": "trang-tri-mau.png",
  "Bố cục màu": "bo-cuc-mau.png",
};

export const DH_MON_THI_SAMPLE_FILENAME_BY_LABEL = FILENAME_BY_MON;

/** Tối đa ảnh môn thi gửi kèm một lượt phản hồi — khuyến khích giải thích từng ảnh (tin tiếp theo có thể gửi ảnh khác). */
export const MAX_DH_MON_THI_IMAGES_PER_REPLY = 2;

export function getPublicSiteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "https://sineart.vn";
}

/** URL tuyệt đối cho Worker / Messenger / admin chat. */
export function buildDhMonThiSampleImageUrls(baseUrl: string): Record<string, string> {
  const b = baseUrl.replace(/\/$/, "");
  const out: Record<string, string> = {};
  for (const mon of DH_MON_THI_SAMPLE_ORDER) {
    out[mon] = `${b}/img/dh-mon-thi/${FILENAME_BY_MON[mon]}`;
  }
  return out;
}

function foldVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** HV hỏi kiểu “thi môn gì / môn nào…” — cho phép khớp từ khóa ngắn trên tin user. */
const EXAM_SUBJECT_INTENT_RE =
  /(?:thi|đề)\s*môn|môn\s*(?:thi|nào|gì)|học\s*môn\s*gì|môn\s*nào|môn\s*gì|thi\s*những|đề\s*thi|thi\s*mấy\s*môn/i;

/**
 * User xin xem ảnh mẫu / minh họa — gộp vài tin assistant trước để bắt tên môn khi user chỉ nhắn "cho ảnh".
 * Khớp rộng: hình mẫu, mẫu bài, xem mẫu, tham khảo ảnh…
 */
export const USER_ASKS_SAMPLE_IMAGE_RE =
  /ảnh|hình\s*ảnh|hình\s*minh|minh\s*họa|gửi.*ảnh|xin\s*ảnh|có\s*hình|co\s*hinh|hình\s*mẫu|mẫu\s*bài|xem\s*mẫu|cho\s*xem|gửi\s*mẫu|tham\s*khảo\s*ảnh|xem\s*ảnh|họa\s*mẫu/i;

/** HV có dấu hiệu nhầm / cần làm rõ trường–ngành–môn — cho phép gửi ảnh minh họa kèm giải thích. */
const USER_SCHOOL_MAJOR_MON_CONFUSION_RE =
  /(?:nhầm|nhằm|lộn)\s*(?:môn|trường|ngành)|hiểu\s*sai|sai\s*(?:trường|ngành|môn)|không\s*phải\s*môn|tưởng\s*(?:môn|trường|ngành)\s|(?:trường|ngành|môn)\s*(?:sai|nhầm)|lộn\s*môn/i;

/**
 * Chỉ đính kèm ảnh `/img/dh-mon-thi/*.png` khi HV chủ động xin mẫu/minh họa HOẶc thoại có dấu hiệu nhầm trường/ngành/môn.
 * Không gửi chỉ vì trong tin có nhắc tên môn.
 */
export function shouldAttachDhMonThiSampleImages(
  userMessage: string,
  _assistantReply: string,
  _priorAssistantContext?: string,
): boolean {
  const u = userMessage.trim();
  if (USER_ASKS_SAMPLE_IMAGE_RE.test(u)) return true;
  if (USER_SCHOOL_MAJOR_MON_CONFUSION_RE.test(u)) return true;
  return false;
}

/**
 * Khi user chỉ nhắn “cho ảnh / xin ảnh”, nối các bubble assistant gần nhất để match tên môn.
 */
export function buildPriorAssistantContextForMonMatch(
  userMessage: string,
  history: readonly { role: string; content: string }[],
): string | undefined {
  if (!USER_ASKS_SAMPLE_IMAGE_RE.test(userMessage)) return undefined;
  const chunks: string[] = [];
  for (const t of history) {
    if (t.role === "assistant" && typeof t.content === "string" && t.content.trim()) {
      chunks.push(t.content.trim());
    }
  }
  if (chunks.length === 0) return undefined;
  return chunks.slice(-4).join("\n\n");
}

/**
 * Từ khóa thường gặp (đã gấp dấu) → nhãn DB. Thứ tự: cụm dài trước.
 */
const SHORT_NEEDLES: { needle: string; mon: DhMonThiSampleLabel }[] = [
  { needle: "hinh hoa khoi co ban", mon: "Hình họa khối cơ bản" },
  { needle: "hinh hoa tinh vat", mon: "Hình họa tĩnh vật" },
  { needle: "hinh hoa tuong tron", mon: "Hình họa tượng tròn" },
  { needle: "hinh hoa chan dung", mon: "Hình họa chân dung" },
  { needle: "hinh chan dung", mon: "Hình họa chân dung" },
  { needle: "hinh hoa toan than", mon: "Hình họa toàn thân" },
  { needle: "trang tri mau", mon: "Trang trí màu" },
  { needle: "bo cuc mau", mon: "Bố cục màu" },
  { needle: "khoi co ban", mon: "Hình họa khối cơ bản" },
  { needle: "tinh vat", mon: "Hình họa tĩnh vật" },
  { needle: "tuong tron", mon: "Hình họa tượng tròn" },
  { needle: "hinh hoa tuong", mon: "Hình họa tượng tròn" },
  { needle: "chan dung", mon: "Hình họa chân dung" },
  { needle: "toan than", mon: "Hình họa toàn thân" },
];

function collectMatchedDhMonLabels(
  userMessage: string,
  assistantReply: string,
  priorAssistantContext?: string,
): Set<DhMonThiSampleLabel> {
  const found = new Set<DhMonThiSampleLabel>();
  const uFold = foldVi(userMessage);
  const assistantBlock =
    priorAssistantContext?.trim() ?
      `${priorAssistantContext.trim()}\n\n${assistantReply}`
    : assistantReply;
  const aFold = foldVi(assistantBlock);
  const combined = `${uFold} ${aFold}`;
  const intent =
    EXAM_SUBJECT_INTENT_RE.test(userMessage) ||
    EXAM_SUBJECT_INTENT_RE.test(assistantReply) ||
    (priorAssistantContext ? EXAM_SUBJECT_INTENT_RE.test(priorAssistantContext) : false);

  for (const mon of DH_MON_THI_SAMPLE_ORDER) {
    if (combined.includes(foldVi(mon))) found.add(mon);
  }

  const haystackAssistant = aFold;
  const haystackUserShort = intent ? uFold : "";

  for (const { needle, mon } of SHORT_NEEDLES) {
    if (found.has(mon)) continue;
    if (haystackAssistant.includes(needle) || (haystackUserShort && haystackUserShort.includes(needle))) {
      found.add(mon);
    }
  }

  return found;
}

/**
 * Trả về URL ảnh mẫu khi hội thoại nhắc môn (tên đầy đủ như DB hoặc từ khóa thường dùng trong câu trả lời).
 */
export function pickDhMonThiSampleImageAttachments(
  userMessage: string,
  assistantReply: string,
  urlByMon: Record<string, string> | null | undefined,
  priorAssistantContext?: string,
): PickedFaqAttachments | undefined {
  if (!urlByMon || typeof urlByMon !== "object") return undefined;
  if (
    !shouldAttachDhMonThiSampleImages(userMessage, assistantReply, priorAssistantContext)
  ) {
    return undefined;
  }
  const labels = collectMatchedDhMonLabels(userMessage, assistantReply, priorAssistantContext);
  const images: string[] = [];
  for (const mon of DH_MON_THI_SAMPLE_ORDER) {
    if (!labels.has(mon)) continue;
    const u = urlByMon[mon];
    if (u && typeof u === "string" && u.trim()) images.push(u.trim());
    if (images.length >= MAX_DH_MON_THI_IMAGES_PER_REPLY) break;
  }
  if (!images.length) return undefined;
  return { images, links: [] as KbLinkAttachment[] };
}

export function mergePickedFaqExtras(
  a: PickedFaqAttachments | undefined,
  b: PickedFaqAttachments | undefined,
): PickedFaqAttachments | undefined {
  const imgs = new Set<string>();
  const links: KbLinkAttachment[] = [];
  for (const block of [a, b]) {
    if (!block) continue;
    for (const im of block.images ?? []) imgs.add(im);
    for (const l of block.links ?? []) {
      if (!links.some((x) => x.url === l.url)) links.push(l);
    }
  }
  if (!imgs.size && !links.length) return undefined;
  return { images: [...imgs], links };
}
