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

export function isValidStudentEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** Đủ điều kiện bỏ qua bước 1 / tạo đơn — khớp validate nút bước 1 + API create-order */
export function profileCompleteForSkipStep1(p: QlHocVienStep1Fields): boolean {
  return (
    p.full_name.trim().length > 1 &&
    p.sdt.trim().length > 7 &&
    isValidStudentEmail(p.email) &&
    (p.facebook?.trim().length ?? 0) > 0
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
