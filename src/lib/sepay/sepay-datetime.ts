const SEPAY_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
const VN_TZ = "Asia/Ho_Chi_Minh";
const VN_UTC_OFFSET_HOURS = 7;

/** SePay `transactionDate`: `YYYY-MM-DD HH:mm:ss` — giờ Việt Nam (GMT+7). */
export function parseSepayLocalDateTimeToUtcIso(raw: string): string | null {
  const m = raw.trim().match(SEPAY_LOCAL_RE);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const utcMs = Date.UTC(+y, +mo - 1, +d, +h - VN_UTC_OFFSET_HOURS, +mi, +s);
  const iso = new Date(utcMs).toISOString();
  return Number.isFinite(Date.parse(iso)) ? iso : null;
}

export function extractSePayRawTransactionDate(rawWebhook: unknown): string | null {
  if (!rawWebhook || typeof rawWebhook !== "object") return null;
  const td = (rawWebhook as { transactionDate?: unknown }).transactionDate;
  return typeof td === "string" && td.trim() ? td.trim() : null;
}

/** Hiển thị giờ CK — ưu tiên chuỗi gốc SePay (đúng giờ ngân hàng). */
export function formatSepayTransactionDateVn(storedIso: string, rawLocal?: string | null): string {
  const raw = rawLocal?.trim();
  if (raw) {
    const m = raw.match(SEPAY_LOCAL_RE);
    if (m) return `${m[4]}:${m[5]} ${m[3]}/${m[2]}/${m[1]}`;
  }
  if (!storedIso) return "—";
  const d = new Date(storedIso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Timestamp ms để sort / unread — ưu tiên raw SePay (giờ VN). */
export function sepayTransactionInstantMs(storedIso: string, rawLocal?: string | null): number {
  const raw = rawLocal?.trim();
  if (raw) {
    const iso = parseSepayLocalDateTimeToUtcIso(raw);
    if (iso) return Date.parse(iso);
  }
  const t = Date.parse(storedIso);
  return Number.isFinite(t) ? t : 0;
}
