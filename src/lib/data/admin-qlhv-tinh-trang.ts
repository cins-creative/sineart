/**
 * Trạng thái tổng học viên / từng khoá — đồng bộ với «Quản lý học viên» (`QuanLyHocVienView`).
 */
import type { AdminQlhvEnrollment, AdminQlhvStudent, QlhvTrangThaiTuVan } from "@/lib/data/admin-quan-ly-hoc-vien";

const ISO_YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Đã có kỳ học phí trên `hp_thu_hp_chi_tiet` (đủ ngày đầu + cuối kỳ). */
export function hasHpTuitionKy(k: AdminQlhvEnrollment): boolean {
  const dau = (k.ngay_dau_ky ?? "").trim().slice(0, 10);
  const cuoi = (k.ngay_cuoi_ky ?? "").trim().slice(0, 10);
  return ISO_YMD.test(dau) && ISO_YMD.test(cuoi);
}

/**
 * Chỉ dựa vào kỳ học phí đã giải (`ngay_*`) — dùng khi chỉ có hai ngày, không có full `AdminQlhvEnrollment`.
 * Trùng logic `deriveEnrollmentStatus` (không đọc cột `status` text trên ghi danh).
 */
export function isEnrollmentDangHocByKy(
  ngay_dau_ky: string | null | undefined,
  ngay_cuoi_ky: string | null | undefined,
): boolean {
  const partial = {
    ngay_dau_ky: ngay_dau_ky ?? null,
    ngay_cuoi_ky: ngay_cuoi_ky ?? null,
  } as Pick<AdminQlhvEnrollment, "ngay_dau_ky" | "ngay_cuoi_ky">;
  return deriveEnrollmentStatus(partial as AdminQlhvEnrollment) === "Đang học";
}

/** Tình trạng khoá từ kỳ HP (`hp_thu_hp_chi_tiet`); chưa có kỳ → «Chưa học». */
export function deriveEnrollmentStatus(k: AdminQlhvEnrollment): "Chưa học" | "Đang học" | "Nghỉ" {
  if (!hasHpTuitionKy(k)) return "Chưa học";
  try {
    const e = new Date((k.ngay_cuoi_ky ?? "").trim().slice(0, 10));
    e.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return e.getTime() >= t.getTime() ? "Đang học" : "Nghỉ";
  } catch {
    return "Chưa học";
  }
}

/** Trạng thái «tổng» học viên qua gộp các khoá (`ql_quan_ly_hoc_vien` + kỳ HP). */
export function computeOverallStatus(khs: AdminQlhvEnrollment[]): string {
  if (!khs?.length) return "Nghỉ";
  const statuses = khs.map(deriveEnrollmentStatus);
  if (statuses.includes("Đang học")) return "Đang học";
  if (statuses.includes("Chưa học")) return "Chưa học";
  return "Nghỉ";
}

/**
 * Nhãn badge trạng thái trên admin (DH, v.v.).
 * «TT tư vấn» = Nghỉ (`trang_thai_tu_van`) luôn ưu tiên — khớp cột TT tư vấn ở Quản lý học viên.
 * Còn lại suy từ kỳ học phí (`computeOverallStatus`).
 */
export function displayHvTinhTrangForAdmin(
  trangThaiTuVan: QlhvTrangThaiTuVan | string | null | undefined,
  enrollments: AdminQlhvEnrollment[],
): string {
  if (trangThaiTuVan === "nghi") return "Nghỉ";
  return computeOverallStatus(enrollments);
}

export type EnrollmentKyPartial = Pick<AdminQlhvEnrollment, "ngay_dau_ky" | "ngay_cuoi_ky">;

export function isoDateFromCreatedAt(v: string | null | undefined): string | null {
  if (v == null || String(v).trim() === "") return null;
  const ymd = String(v).trim().slice(0, 10);
  return ISO_YMD.test(ymd) ? ymd : null;
}

export function todayIsoDateLocal(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function maxNgayCuoiKyFromKyRows(khs: EnrollmentKyPartial[]): string | null {
  let maxD: string | null = null;
  for (const k of khs) {
    const d = (k.ngay_cuoi_ky ?? "").trim().slice(0, 10);
    if (!ISO_YMD.test(d)) continue;
    if (!maxD || d > maxD) maxD = d;
  }
  return maxD;
}

/** Số tháng lịch giữa hai ngày YYYY-MM-DD (chỉ phần năm/tháng). */
export function monthsBetweenCalendarYmd(start: string, end: string): number | null {
  try {
    const e = new Date(end);
    const s = new Date(start);
    const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    return m >= 0 ? m : null;
  } catch {
    return null;
  }
}

function sliceIsoYmd(v: string | null | undefined): string | null {
  if (v == null || String(v).trim() === "") return null;
  const ymd = String(v).trim().slice(0, 10);
  return ISO_YMD.test(ymd) ? ymd : null;
}

/** Ngày bắt đầu tính tháng học: ưu tiên `ngay_bat_dau`, không có thì `created_at`. */
export function resolveNgayBatDauForThang(
  createdAt: string | null | undefined,
  ngayBatDau: string | null | undefined,
): string | null {
  return sliceIsoYmd(ngayBatDau) ?? isoDateFromCreatedAt(createdAt);
}

export type ThangHocTaiSineProfile = {
  ngay_bat_dau?: string | null;
  ngay_ket_thuc?: string | null;
};

/**
 * Nhãn «X tháng» — đồng bộ Quản lý học viên.
 * Bắt đầu: `ngay_bat_dau` hoặc `created_at`. Kết thúc: `ngay_ket_thuc` hoặc hôm nay / cuối kỳ HP.
 */
export function formatThangHocTaiSineArt(
  createdAt: string | null | undefined,
  enrollments: EnrollmentKyPartial[],
  profile?: ThangHocTaiSineProfile,
): string | null {
  const start = resolveNgayBatDauForThang(createdAt, profile?.ngay_bat_dau);
  if (!start) return null;
  const profileEnd = sliceIsoYmd(profile?.ngay_ket_thuc);
  const tt = computeOverallStatus(enrollments as AdminQlhvEnrollment[]);
  const end = profileEnd ?? (tt === "Nghỉ" ? maxNgayCuoiKyFromKyRows(enrollments) : todayIsoDateLocal());
  if (!end) return null;
  const m = monthsBetweenCalendarYmd(start, end);
  return m != null ? `${m} tháng` : null;
}

/**
 * Ít nhất một ghi danh và mọi khoá đều hết kỳ HP — không còn lớp «Đang học» hay «Chưa học».
 * (Từng khoá đã có kỳ thì ngày học còn lại = 0; khoá không kỳ làm tổng trạng thái khác «Nghỉ».)
 */
export function isAllKhoaHetHanTheoKy(khs: AdminQlhvEnrollment[]): boolean {
  if (!khs?.length) return false;
  return computeOverallStatus(khs) === "Nghỉ";
}

/** Số học viên có `computeOverallStatus === "Đang học"` — không tính học viên mẫu (`is_hoc_vien_mau`). */
export function countHocVienDangHoc(students: AdminQlhvStudent[], enrollments: AdminQlhvEnrollment[]): number {
  const byHv = new Map<number, AdminQlhvEnrollment[]>();
  for (const e of enrollments) {
    const list = byHv.get(e.hoc_vien_id) ?? [];
    list.push(e);
    byHv.set(e.hoc_vien_id, list);
  }
  let n = 0;
  for (const hv of students) {
    if (hv.is_hoc_vien_mau) continue;
    if (computeOverallStatus(byHv.get(hv.id) ?? []) === "Đang học") n++;
  }
  return n;
}
