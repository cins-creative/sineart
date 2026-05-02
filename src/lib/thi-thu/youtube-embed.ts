/**
 * URL Youtube → src iframe embed (nocookie). Hỗ trợ youtu.be, watch?v=, /embed/, /shorts/.
 */
export function parseYouTubeEmbedSrc(videoUrl: string | null | undefined): string | null {
  if (videoUrl == null || typeof videoUrl !== "string") return null;
  const raw = videoUrl.trim();
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./, "");
    let vid: string | null = null;
    if (host === "youtu.be") {
      vid = u.pathname.replace(/^\//, "").split("/")[0] ?? null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      vid = u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      if (!vid && parts[0] === "embed" && parts[1]) vid = parts[1];
      if (!vid && parts[0] === "shorts" && parts[1]) vid = parts[1];
      if (!vid && parts[0] === "live" && parts[1]) vid = parts[1];
    }
    if (!vid || vid.length < 6) return null;
    return `https://www.youtube-nocookie.com/embed/${vid}`;
  } catch {
    return null;
  }
}
