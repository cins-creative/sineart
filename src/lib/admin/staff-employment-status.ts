/** Các nhãn trạng thái chuẩn trong UI Quản lý nhân sự (đồng bộ với STATUS_PILL). */
const KNOWN_CANONICAL_STATUS = new Set(["Đang làm", "Thử việc", "Nghỉ"]);

/**
 * Chuẩn hóa `hr_nhan_su.status` về nhãn hiển thị (giống logic `statusNormLabel` trên dashboard).
 */
export function normalizeHrStaffStatusDisplayLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const s = raw.trim();
  const lower = s.toLowerCase();
  const aliases: Record<string, string> = {
    active: "Đang làm",
    inactive: "Nghỉ",
    "đang làm": "Đang làm",
    "dang lam": "Đang làm",
    "đang làm việc": "Đang làm",
    "thử việc": "Thử việc",
    "thu viec": "Thử việc",
    nghỉ: "Nghỉ",
    "nghỉ việc": "Nghỉ",
    "nghi viec": "Nghỉ",
    resigned: "Nghỉ",
    offline: "Nghỉ",
  };
  const mapped = aliases[lower];
  if (mapped) return mapped;
  if (KNOWN_CANONICAL_STATUS.has(s)) return s;
  return s;
}

/** Nhân sự ở trạng thái nghỉ — không đăng nhập / không dùng khu vực admin. */
export function isHrStaffBlockedFromAdminStatus(raw: string | null | undefined): boolean {
  return normalizeHrStaffStatusDisplayLabel(raw) === "Nghỉ";
}
