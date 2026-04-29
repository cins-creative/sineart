/** Gỡ HTML cho đoạn meta SEO — không import sanitize admin để tránh bundle thừa. */
export function stripHtmlToPlain(html: string | null | undefined, maxLen?: number): string {
  if (!html?.trim()) return "";
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (maxLen != null && plain.length > maxLen) {
    return `${plain.slice(0, maxLen - 1).trim()}…`;
  }
  return plain;
}
