/** Một dòng URL YouTube → embed (hoặc null nếu không nhận dạng được). */
export function youtubeLineToEmbed(trimmed: string): string | null {
  if (!trimmed) return null;
  if (trimmed.includes("youtube.com/embed/")) return trimmed;
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

/** Chuyển URL YouTube watch/short → embed. Nhiều dòng: thử lần lượt (dòng đầu hợp lệ được dùng làm video chính). */
export function toEmbedUrl(url: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmedAll = url.trim();
  if (!trimmedAll) return null;

  const lines = trimmedAll.includes("\n")
    ? trimmedAll.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    : [trimmedAll];

  for (const line of lines) {
    const embed = youtubeLineToEmbed(line);
    if (embed) return embed;
  }
  return null;
}

/**
 * Parse `video_bai_giang` (textarea): mỗi dòng «Nhãn - https://youtu.be/…» hoặc một dòng chỉ URL.
 * Dùng cho UI chọn video khi có ≥ 2 URL.
 */
export function parseVideoBaiGiangEntries(raw: string | null): { label: string; embed: string }[] {
  if (!raw?.trim()) return [];
  const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const out: { label: string; embed: string }[] = [];

  /** Nhãn — URL (gạch ngang / en-dash / em-dash); nhãn có thể chứa dấu gạch nếu URL ở cuối. */
  const labeled = /^(.+)\s*[-–—]\s*(https?:\/\/\S+)$/u;

  for (const line of lines) {
    const m = line.match(labeled);
    if (m) {
      const urlPart = m[2].trim();
      const embed = youtubeLineToEmbed(urlPart);
      if (embed) out.push({ label: m[1].trim(), embed });
      continue;
    }
    const embed = youtubeLineToEmbed(line);
    if (embed) out.push({ label: "", embed });
  }
  return out;
}
