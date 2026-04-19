/** Giảm rủi ro XSS khi lưu / hiển thị HTML nội bộ admin (không thay DOMPurify đầy đủ). */
export function sanitizeAdminRichHtml(html: string): string {
  let t = html;
  t = t.replace(/<\/?(?:script|object|embed|link|meta|style|base)[^>]*>/gi, "");
  t = t.replace(/<(?:script|object|embed)[^>]*>[\s\S]*?<\/(?:script|object|embed)>/gi, "");
  t = t.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
  t = t.replace(/\son\w+\s*=\s*[^\s>]*/gi, "");
  t = t.replace(/javascript:/gi, "");
  t = t.replace(/data:text\/html/gi, "");
  t = sanitizeAllowedIframes(t);
  return t;
}

function sanitizeAllowedIframes(html: string): string {
  return html.replace(/<iframe\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\bsrc\s*=\s*(['"])(.*?)\1/i);
    const src = srcMatch?.[2]?.trim() ?? "";
    if (!src || !isAllowedIframeSrc(src)) return "";

    const titleMatch = tag.match(/\btitle\s*=\s*(['"])(.*?)\1/i);
    const allowMatch = tag.match(/\ballow\s*=\s*(['"])(.*?)\1/i);
    const referrerMatch = tag.match(/\breferrerpolicy\s*=\s*(['"])(.*?)\1/i);
    const loadingMatch = tag.match(/\bloading\s*=\s*(['"])(.*?)\1/i);

    const attrs: string[] = [
      `src="${escapeHtmlAttr(src)}"`,
      `title="${escapeHtmlAttr((titleMatch?.[2] ?? "Embedded content").trim() || "Embedded content")}"`,
      `loading="${escapeHtmlAttr((loadingMatch?.[2] ?? "lazy").trim() || "lazy")}"`,
      `referrerpolicy="${escapeHtmlAttr((referrerMatch?.[2] ?? "no-referrer-when-downgrade").trim() || "no-referrer-when-downgrade")}"`,
      'style="width:100%;min-height:360px;border:0;border-radius:12px;"',
      "allowfullscreen",
    ];

    const allowRaw = (allowMatch?.[2] ?? "").trim();
    if (allowRaw) attrs.push(`allow="${escapeHtmlAttr(allowRaw)}"`);

    return `<iframe ${attrs.join(" ")}></iframe>`;
  });
}

function isAllowedIframeSrc(src: string): boolean {
  try {
    const u = new URL(src);
    const host = u.hostname.toLowerCase();
    if (host === "sketchfab.com" || host.endsWith(".sketchfab.com")) return true;
    if (host === "youtube.com" || host.endsWith(".youtube.com")) return true;
    if (host === "youtu.be") return true;
    if (host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com")) return true;
    return false;
  } catch {
    return false;
  }
}

function escapeHtmlAttr(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function htmlToPlainText(html: string): string {
  const s = html.trim();
  if (!s) return "";
  if (typeof document === "undefined") {
    return s
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const d = document.createElement("div");
  d.innerHTML = sanitizeAdminRichHtml(s);
  return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
}
