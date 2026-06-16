/** Mã đơn / trạng thái đơn bán họa cụ — dùng chung admin «Đơn bán» và «Thống kê thu chi». */

export function hcDonCodesFromId(donId: number): { ma_don: string; ma_don_so: string } {
  const ma_don_so = `SC${String(donId).padStart(6, "0").slice(-6)}`;
  const ma_don = `HC-${String(donId).padStart(8, "0")}`;
  return { ma_don, ma_don_so };
}

export function resolveBanDonCodes(
  donId: number,
  raw?: { ma_don?: string | null; ma_don_so?: string | null },
): { ma_don: string; ma_don_so: string } {
  const fallback = hcDonCodesFromId(donId);
  const ma_don = raw?.ma_don?.trim() || fallback.ma_don;
  const ma_don_so = raw?.ma_don_so?.trim() || fallback.ma_don_so;
  return { ma_don, ma_don_so };
}

export function resolveHcBanDonTrangThai(
  hinh_thuc_thu: string | null | undefined,
  status: string | null | undefined,
): string {
  const s = status?.trim();
  if (s) return s;
  return (hinh_thuc_thu ?? "").trim() === "Chuyển khoản" ? "Chờ thanh toán" : "Đã thanh toán";
}

export function isHcBanDonDaThanhToan(
  hinh_thuc_thu: string | null | undefined,
  status: string | null | undefined,
): boolean {
  return resolveHcBanDonTrangThai(hinh_thuc_thu, status) === "Đã thanh toán";
}

export function parseBanDonIdFromQuery(q: string): number | null {
  const t = q.trim();
  const hc = t.match(/^HC-0*(\d+)$/i);
  if (hc) {
    const n = Number(hc[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const sc = t.match(/^SC0*(\d+)$/i);
  if (sc) {
    const n = Number(sc[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}
