/**
 * Lớp học tại trung tâm — nhận qua tên lớp (`ql_lop_hoc.class_name` / `class_full_name`):
 * - Có **«tại lớp»** (vd. phụ đề admin), hoặc
 * - Có **«offline»** (vd. "CT BCM Offline", "HH & TTM Offline" — cùng bộ lớp với filter «Luyện thi tại lớp»).
 */
export function lopClassNameIndicatesTaiLop(
  classFullName: string | null | undefined,
  className: string | null | undefined
): boolean {
  const combined = `${classFullName ?? ""} ${className ?? ""}`;
  const n = combined
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (n.length === 0) return false;
  return n.includes("tai lop") || n.includes("offline");
}
