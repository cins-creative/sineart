/** Loại bỏ markdown bold (** … **) để hiển thị như chat thường. */
export function stripMarkdownBold(text: string): string {
  let out = text;
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  }
  return out.replace(/\*\*/g, "");
}

const DEFAULT_MAX_CHUNK = 300;

/**
 * Tách một phản hồi dài thành vài “tin” ngắn (đoạn + giới hạn độ dài) giống chat tay.
 */
export function splitAgentReplyIntoChatParts(
  text: string,
  maxChunk = DEFAULT_MAX_CHUNK,
): string[] {
  const cleaned = text.trim();
  if (!cleaned) return ["…"];

  const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const segments: string[] = [];

  for (const block of paragraphs) {
    if (block.length <= maxChunk) {
      segments.push(block);
      continue;
    }
    const sentences = block.split(/(?<=[.!?…])\s+/u).filter(Boolean);
    let buf = "";
    for (const s of sentences) {
      const next = buf ? `${buf} ${s}` : s;
      if (next.length <= maxChunk || !buf) {
        buf = next;
      } else {
        segments.push(buf.trim());
        buf = s;
      }
    }
    if (buf.trim()) segments.push(buf.trim());
  }

  const merged: string[] = [];
  for (const p of segments) {
    const t = p.trim();
    if (
      merged.length > 0 &&
      t.length < 40 &&
      merged[merged.length - 1].length + t.length + 2 <= maxChunk
    ) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${t}`;
    } else {
      merged.push(t);
    }
  }

  return merged.length > 0 ? merged : [cleaned];
}

/** Bubble thứ hai khi có ảnh/link đính kèm từ KB — ảnh và link hiển thị ngay dưới bubble này trong UI. */
export const ATTACHMENT_INVITE_BUBBLE =
  "Mình gửi bạn thêm thông tin để bạn tham khảo nha, cần gì thì hỏi mình thêm!";

const REFERENCE_TAIL_PARA =
  /xem\s+(thêm\s+)?(chi\s+tiết|thông\s+tin)|tại\s+đây\b|tham\s+khảo\s+tại|lịch\s+học\s+tại|https?:\/\/|đường\s+dẫn/i;

function paragraphLooksLikeReferenceTail(p: string): boolean {
  const t = p.trim();
  if (REFERENCE_TAIL_PARA.test(t)) return true;
  if (t.length < 240 && /\bbạn\s+có\s+thể\s+xem\b/i.test(t)) return true;
  return false;
}

/** Một đoạn dài có thể gồm câu trả lời + câu dẫn xem link — tách phần trước “Bạn có thể xem / xem thêm chi tiết…”. */
function extractCoreBeforeReferenceSentence(paragraph: string): string {
  const re =
    /\s+(?=Bạn\s+có\s+thể\s+xem\b)|\s+(?=xem\s+thêm\s+chi\s+tiết)|\s+(?=chi\s+tiết\s+về\s+lịch)|\s+(?=thông\s+tin\s+chi\s+tiết)/i;
  const match = paragraph.match(re);
  if (!match || match.index === undefined || match.index === 0) return paragraph.trim();
  return paragraph.slice(0, match.index).trim();
}

type ChatAttachmentHint = {
  images?: string[];
  links?: { url: string }[];
};

/**
 * Có đính kèm KB: bubble 1 = chỉ phần trả lời chính; bubble 2 = câu mời cố định (ảnh + link render ở UI/Messenger sau).
 * Không đính kèm: giữ cách tách đoạn/câu như `splitAgentReplyIntoChatParts`.
 */
export function buildReplyPartsForChat(
  text: string,
  attachments: ChatAttachmentHint | undefined,
): string[] {
  const cleaned = text.trim();
  if (!cleaned) return ["…"];

  const hasAtt =
    attachments &&
    ((attachments.images?.length ?? 0) > 0 ||
      (attachments.links?.length ?? 0) > 0);

  if (!hasAtt) {
    return splitAgentReplyIntoChatParts(cleaned);
  }

  const paras = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  let coreText = "";

  if (paras.length >= 2) {
    const coreParas: string[] = [];
    for (const p of paras) {
      if (paragraphLooksLikeReferenceTail(p)) break;
      coreParas.push(p);
    }
    coreText = coreParas.join("\n\n").trim();
  }

  if (!coreText && paras.length === 1) {
    coreText = extractCoreBeforeReferenceSentence(paras[0]);
  }

  if (!coreText) {
    const nonTail = paras.filter((p) => !paragraphLooksLikeReferenceTail(p));
    coreText =
      nonTail.join("\n\n").trim() || paras[0] || cleaned;
  }

  if (paragraphLooksLikeReferenceTail(coreText) && paras.length > 1) {
    coreText =
      paras.filter((p) => !paragraphLooksLikeReferenceTail(p)).join("\n\n").trim() ||
      extractCoreBeforeReferenceSentence(paras[0]);
  }

  const trimmedCore = coreText.trim() || cleaned;
  const coreChunks = splitAgentReplyIntoChatParts(trimmedCore);

  return [...coreChunks, ATTACHMENT_INVITE_BUBBLE];
}
