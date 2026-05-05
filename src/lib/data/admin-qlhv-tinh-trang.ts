/**
 * Trạng thái tổng học viên / từng khoá — đồng bộ với «Quản lý học viên» (`QuanLyHocVienView`).
 */
import type { AdminQlhvEnrollment, AdminQlhvStudent } from "@/lib/data/admin-quan-ly-hoc-vien";

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
