/** Giảm rủi ro XSS khi lưu / hiển thị HTML nội bộ admin (không thay DOMPurify đầy đủ). */
export function sanitizeAdminRichHtml(html: string): string {
  let t = html;
  t = t.replace(/<\/?(?:script|iframe|object|embed|link|meta|style|base)[^>]*>/gi, "");
  t = t.replace(/<(?:script|iframe|object|embed)[^>]*>[\s\S]*?<\/(?:script|iframe|object|embed)>/gi, "");
  t = t.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
  t = t.replace(/\son\w+\s*=\s*[^\s>]*/gi, "");
  t = t.replace(/javascript:/gi, "");
  t = t.replace(/data:text\/html/gi, "");
  return t;
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
