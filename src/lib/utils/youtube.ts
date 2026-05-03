/** Một dòng URL YouTube → embed (hoặc null nếu không nhận dạng được). */
export function youtubeLineToEmbed(trimmed: string): string | null {
  if (!trimmed) return null;
  if (trimmed.includes("youtube.com/embed/")) return trimmed;
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

/** Trích `videoId` (11 ký tự) từ URL YouTube — dùng để build thumbnail `img.youtube.com/vi/{id}/...`. */
export function youtubeVideoId(url: string): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  const m = u.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/
  );
  if (m) return m[1];
  try {
    const parsed = new URL(u.includes("://") ? u : `https://${u}`);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube.com")
    ) {
      const v = parsed.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[1])) return parts[1];
      if (parts[0] === "shorts" && parts[1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[1])) return parts[1];
      if (parts[0] === "live" && parts[1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[1])) return parts[1];
    }
  } catch {
    /* ignore */
  }
  return null;
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
