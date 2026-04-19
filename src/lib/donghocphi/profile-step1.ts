/** Khớp cột `ql_thong_tin_hoc_vien` — bước 1 đóng học phí */
export type QlHocVienStep1Fields = {
  full_name: string;
  sdt: string;
  email: string;
  sex: string | null;
  nam_thi: number | null;
  loai_khoa_hoc: string | null;
  facebook: string | null;
  /** `ql_thong_tin_hoc_vien.avatar` */
  avatar: string | null;
};

/**
 * Các domain email «cá nhân» được chấp nhận (Gmail, Yahoo, Outlook, …).
 * Không chấp nhận email doanh nghiệp / tên miền tùy chỉnh — bổ sung domain tại đây nếu cần.
 */
const STUDENT_EMAIL_ALLOWED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.it",
  "yahoo.es",
  "yahoo.ca",
  "yahoo.com.br",
  "yahoo.com.au",
  "yahoo.co.jp",
  "yahoo.com.vn",
  "ymail.com",
  "rocketmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "mail.com",
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "zoho.com",
  "tutanota.com",
  "tutamail.com",
  "fastmail.com",
  "hey.com",
]);

/** Thông báo hiển thị khi email sai định dạng hoặc không thuộc nhà cung cấp được hỗ trợ. */
export const STUDENT_EMAIL_REQUIREMENT_VI =
  "Vui lòng dùng email cá nhân phổ biến (Gmail, Hotmail/Outlook, Yahoo, iCloud, Proton, …). Không dùng email doanh nghiệp hoặc tên miền riêng.";

export function isValidStudentEmail(s: string): boolean {
  const t = s.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return false;
  const at = t.lastIndexOf("@");
  const domain = at >= 0 ? t.slice(at + 1) : "";
  return STUDENT_EMAIL_ALLOWED_DOMAINS.has(domain);
}

/** Đủ điều kiện bỏ qua bước 1 — cần họ tên + SĐT + email hợp lệ */
export function profileCompleteForSkipStep1(p: QlHocVienStep1Fields): boolean {
  return (
    p.full_name.trim().length > 1 &&
    p.sdt.trim().length > 7 &&
    isValidStudentEmail(p.email)
  );
}

export function dbRowToStep1Fields(row: unknown): QlHocVienStep1Fields | null {
  if (row == null || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const email = String(r.email ?? "").trim().toLowerCase();
  if (!email) return null;
  const namRaw = r.nam_thi;
  const namThiNum =
    namRaw != null && namRaw !== "" && Number.isFinite(Number(namRaw))
      ? Number(namRaw)
      : null;
  return {
    full_name: String(r.full_name ?? "").trim(),
    sdt: String(r.sdt ?? "").trim(),
    email,
    sex: r.sex != null && String(r.sex).trim() !== "" ? String(r.sex).trim() : null,
    nam_thi: namThiNum,
    loai_khoa_hoc:
      r.loai_khoa_hoc != null && String(r.loai_khoa_hoc).trim() !== ""
        ? String(r.loai_khoa_hoc).trim()
        : null,
    facebook:
      r.facebook != null && String(r.facebook).trim() !== ""
        ? String(r.facebook).trim()
        : null,
    avatar:
      r.avatar != null && String(r.avatar).trim() !== ""
        ? String(r.avatar).trim()
        : null,
  };
}
