/** URL gốc (https, không dấu / cuối) — dùng trong link email. */
export function getSiteOrigin(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (u) return u;
  const v = process.env.VERCEL_URL?.trim();
  if (v) return `https://${v.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
