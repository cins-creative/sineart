/** Học phí phải thu từ một dòng gói (`hp_goi_hoc_phi` / `hp_goi_hoc_phi_new`). */

export function hpParseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function hpDiscountToPayable(giaGoc: number, discountPct: number): number {
  const g = Math.max(0, giaGoc);
  const d = Math.min(100, Math.max(0, discountPct));
  return Math.round((g * (100 - d)) / 100);
}

/** Số tiền phải thu từ dòng gói master (legacy hoặc bảng mới). */
export function hpPayableFromGoiRow(row: Record<string, unknown>): number | null {
  const giaGoc = hpParseMoney(row.gia_goc);
  const disc = hpParseMoney(row.discount);
  if (giaGoc > 0) return hpDiscountToPayable(giaGoc, disc);
  const giaGiam = hpParseMoney(row.gia_giam);
  if (giaGiam > 0) return Math.round(giaGiam);
  const hp = hpParseMoney(row.hoc_phi);
  return hp > 0 ? hp : null;
}

export function hpGoiHocPhiSelectForTable(table: string): string {
  return table === "hp_goi_hoc_phi" ? "id, hoc_phi, gia_giam" : 'id, "number", don_vi, gia_goc, discount';
}

/** Gói HP — thêm môn + hình thức để BCTC tự động gán đúng Online/Offline & môn. */
export function hpGoiHocPhiSelectForBctc(table: string): string {
  if (table === "hp_goi_hoc_phi") {
    return "id, hoc_phi, gia_giam, mon_hoc, hinh_thuc, ten_goi_hoc_phi, so_mon";
  }
  return 'id, "number", don_vi, gia_goc, discount, mon_hoc, hinh_thuc, ten_goi_hoc_phi, so_buoi, so_mon';
}

/**
 * Ưu tiên `hoc_phi_dong` snapshot trên `hp_thu_hp_chi_tiet`;
 * fallback sang giá gói hiện tại (dữ liệu cũ chưa backfill).
 */
export function hpResolveHocPhiDong(
  chi: { hoc_phi_dong?: unknown | null },
  goiRow?: Record<string, unknown> | null,
): number {
  if (chi.hoc_phi_dong != null && String(chi.hoc_phi_dong).trim() !== "") {
    const snap = hpParseMoney(chi.hoc_phi_dong);
    if (Number.isFinite(snap) && snap >= 0) return Math.round(snap);
  }
  const fromGoi = goiRow != null ? hpPayableFromGoiRow(goiRow) : null;
  return fromGoi ?? 0;
}
