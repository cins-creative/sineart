/**
 * Bảng gói học phí (cột kiểu `gia_goc`, `discount`, `combo_id`, `so_buoi`, …).
 * Mặc định `hp_goi_hoc_phi_new`. Nếu trên Supabase bạn đặt tên khác hoặc gộp vào
 * `hp_goi_hoc_phi`, set `HP_GOI_HOC_PHI_TABLE` (server — `.env.local` / Vercel).
 */
export function hpGoiHocPhiTableName(): string {
  const t = process.env.HP_GOI_HOC_PHI_TABLE?.trim();
  return t && t.length > 0 ? t : "hp_goi_hoc_phi_new";
}
