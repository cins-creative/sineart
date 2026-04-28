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

/** 60% → 1 tin, 30% → 2 tin, 10% → 3 tin (mỗi lần gọi độc lập). */
export function rollReplyBubbleCount(): 1 | 2 | 3 {
  const r = Math.random();
  if (r < 0.6) return 1;
  if (r < 0.9) return 2;
  return 3;
}

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

/**
 * Gộp các đoạn liền kề cho đến khi còn đúng `n` phần (ưu tiên gộp cặp liền kề có tổng độ dài nhỏ nhất).
 */
function mergeSegmentGroupsToCount(segments: string[], n: number): string[] {
  if (n <= 0) return [segments.join("\n\n").trim() || "…"];
  let a = segments.map((s) => s.trim()).filter(Boolean);
  if (a.length === 0) return ["…"];
  while (a.length > n) {
    let bestI = 0;
    let bestSum = Infinity;
    for (let i = 0; i < a.length - 1; i++) {
      const sum = a[i].length + a[i + 1].length;
      if (sum < bestSum) {
        bestSum = sum;
        bestI = i;
      }
    }
    a.splice(bestI, 2, `${a[bestI]}\n\n${a[bestI + 1]}`.trim());
  }
  return a;
}

function splitLongestAtSentence(text: string): [string, string] | null {
  const t = text.trim();
  if (t.length < 80) return null;
  const mid = Math.floor(t.length / 2);
  for (let i = mid; i < t.length - 15; i++) {
    const ch = t[i]!;
    if (/[.!?…]/.test(ch) && /\s/.test(t[i + 1] ?? "")) {
      let j = i + 1;
      while (j < t.length && /\s/.test(t[j]!)) j++;
      if (j > 20 && t.length - j > 20) {
        return [t.slice(0, j).trim(), t.slice(j).trim()];
      }
    }
  }
  for (let i = mid; i > 15; i--) {
    const ch = t[i]!;
    if (/[.!?…]/.test(ch) && /\s/.test(t[i + 1] ?? "")) {
      let j = i + 1;
      while (j < t.length && /\s/.test(t[j]!)) j++;
      if (j > 20 && t.length - j > 20) {
        return [t.slice(0, j).trim(), t.slice(j).trim()];
      }
    }
  }
  const sp = t.indexOf(" ", mid);
  if (sp > 20 && t.length - sp - 1 > 20) {
    return [t.slice(0, sp).trim(), t.slice(sp + 1).trim()];
  }
  return null;
}

/** Chia đều theo độ dài khi không đủ ranh giới câu. */
function partitionRoughlyN(t: string, n: number): string[] {
  const s = t.trim();
  if (!s) return ["…"];
  if (n <= 1) return [s];
  const len = s.length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((len * i) / n);
    const b = i === n - 1 ? len : Math.floor((len * (i + 1)) / n);
    const slice = s.slice(a, b).trim();
    if (slice) out.push(slice);
  }
  return out.length ? out : [s];
}

function expandToCount(parts: string[], n: number): string[] {
  let a = [...parts];
  while (a.length < n && a.length > 0) {
    let longest = 0;
    let len = -1;
    for (let i = 0; i < a.length; i++) {
      if (a[i].length > len) {
        len = a[i].length;
        longest = i;
      }
    }
    const sp = splitLongestAtSentence(a[longest]);
    if (!sp) break;
    a.splice(longest, 1, sp[0], sp[1]);
  }
  return a;
}

/**
 * Giống tin nhắn tay: mỗi lần trả lời ngẫu nhiên 1–3 tin (60% / 30% / 10%).
 */
export function splitAgentReplyIntoRandomChatParts(
  text: string,
  maxChunk = DEFAULT_MAX_CHUNK,
): string[] {
  const cleaned = text.trim();
  if (!cleaned) return ["…"];

  let targetN = rollReplyBubbleCount();
  if (cleaned.length < 96) targetN = 1;

  const segments = splitAgentReplyIntoChatParts(cleaned, maxChunk);
  if (targetN === 1) {
    return [segments.join("\n\n").trim() || "…"];
  }

  if (segments.length >= targetN) {
    return mergeSegmentGroupsToCount(segments, targetN);
  }

  let merged = expandToCount(segments, targetN);
  if (merged.length < targetN) {
    merged = partitionRoughlyN(cleaned, targetN);
  }
  return merged.length ? merged : [cleaned];
}

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
 * Tách nội dung chat thành 1–3 tin ngẫu nhiên. Ảnh/link đính kèm render riêng trong UI — không thêm bubble cố định để tránh luôn thành 2 tin.
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
    return splitAgentReplyIntoRandomChatParts(cleaned);
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
  return splitAgentReplyIntoRandomChatParts(trimmedCore);
}
