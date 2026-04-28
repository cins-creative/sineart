/**
 * Extract YouTube video ID for embed / thumbnails.
 * Accepts full URLs (watch, youtu.be, embed, shorts) or a bare 11-char id.
 */
export function parseYoutubeVideoId(raw: string): string {
  const s = raw.trim();
  if (!s) return "";

  if (!/[/?#&=]/.test(s) && /^[a-zA-Z0-9_-]{6,20}$/.test(s)) {
    return s;
  }

  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return s;
  }

  const host = url.hostname.replace(/^www\./i, "");
  if (host === "youtu.be" || host === "m.youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? id.split("?")[0]! : "";
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    for (const key of ["embed", "shorts", "live"] as const) {
      const i = parts.indexOf(key);
      if (i >= 0 && parts[i + 1]) return parts[i + 1]!.split("?")[0]!;
    }
  }

  return s;
}
