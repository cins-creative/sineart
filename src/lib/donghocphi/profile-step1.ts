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
 * Chỉ chấp nhận email Gmail — thống nhất với luồng đăng nhập học viên và
 * gợi ý trên placeholder («vd. tenban@gmail.com»).
 */
const STUDENT_EMAIL_ALLOWED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
]);

/** Thông báo hiển thị khi email sai định dạng hoặc không phải Gmail. */
export const STUDENT_EMAIL_REQUIREMENT_VI =
  "Vui lòng dùng email Gmail (ví dụ: tenban@gmail.com). Các nhà cung cấp khác hiện không được hỗ trợ.";

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
