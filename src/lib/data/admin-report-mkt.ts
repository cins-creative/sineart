import type { SupabaseClient } from "@supabase/supabase-js";

export const MK_DATA_TABLE = "mk_data_analysis" as const;

export const MK_INPUT_COLS = [
  { key: "chi_phi_chay_ads", label: "Chi phí chạy Ads", group: "ads" },
  { key: "fb_tin_nhan_ads", label: "Tin nhắn Ads", group: "ads" },
  { key: "fb_tin_nhan_tu_nhien", label: "Tin nhắn tự nhiên", group: "ads" },
  { key: "ti_le_chuyen_doi_sang_hoc_vien", label: "Tỉ lệ CĐ → Học viên", group: "ads", isPct: true },
  { key: "chi_phi_trung_binh_mot_tin_nhan", label: "Chi phí TB / tin nhắn", group: "ads" },
  { key: "fb_hoc_vien_moi", label: "Học viên mới", group: "hocvien" },
  { key: "fb_hoc_vien_nghi", label: "Học viên nghỉ", group: "hocvien" },
  { key: "luot_xem", label: "Lượt xem", group: "fanpage" },
  { key: "nguoi_xem", label: "Người xem", group: "fanpage" },
  { key: "fb_luot_theo_doi", label: "Lượt theo dõi", group: "fanpage" },
  { key: "fb_toc_do_phan_hoi_tin_nhan", label: "Tốc độ phản hồi", group: "fanpage", isPct: true },
  { key: "fb_luot_tuong_tac_voi_noi_dung", label: "Lượt tương tác", group: "fanpage" },
  { key: "fb_luot_truy_cap", label: "Lượt truy cập", group: "fanpage" },
  { key: "fb_so_luot_click_vao_lien_ket_ctr", label: "CTR (click link)", group: "fanpage" },
  { key: "fb_so_luong_noi_dung_dang", label: "Số nội dung đăng", group: "fanpage" },
  { key: "web_tong_pageviews", label: "Tổng Pageviews", group: "web" },
  { key: "web_so_nguoi_vao_web", label: "Người vào web", group: "web" },
  { key: "web_ti_le_thoat_bounce_rate", label: "Bounce Rate", group: "web", isPct: true },
  { key: "web_thoi_gian_trung_binh_s", label: "Thời gian TB (giây)", group: "web" },
  { key: "group_hv_thanh_vien_hoat_dong", label: "Group HV hoạt động", group: "group" },
  { key: "group_st_thanh_vien_hoat_dong", label: "Group ST hoạt động", group: "group" },
  { key: "group_hv_noi_dung_moi", label: "Nội dung mới (HV)", group: "group" },
  { key: "group_st_noi_dung_moi", label: "Nội dung mới (ST)", group: "group" },
  { key: "group_hv_yeu_cau_tham_gia", label: "Yêu cầu tham gia (HV)", group: "group" },
  { key: "group_st_yeu_cau_tham_gia", label: "Yêu cầu tham gia (ST)", group: "group" },
] as const;

export type MkInputCol = (typeof MK_INPUT_COLS)[number];
export type MkNumericKey = MkInputCol["key"];
export type MkGroupKey = (typeof MK_INPUT_COLS)[number]["group"];

export const MK_GROUP_META: { key: MkGroupKey; label: string; color: string; rowBg: string }[] = [
  { key: "ads", label: "Ads", color: "#E8527A", rowBg: "rgba(232, 82, 122, 0.08)" },
  { key: "hocvien", label: "Học viên", color: "#E8855A", rowBg: "rgba(232, 133, 90, 0.08)" },
  { key: "fanpage", label: "Fanpage", color: "#4A7EC4", rowBg: "rgba(74, 126, 196, 0.08)" },
  { key: "web", label: "Web", color: "#C4923A", rowBg: "rgba(196, 146, 58, 0.08)" },
  { key: "group", label: "Group", color: "#3A9E72", rowBg: "rgba(58, 158, 114, 0.08)" },
];

export type MkDataAnalysisRow = {
  id: string;
  ngay_thang_nhap: string | null;
} & Partial<Record<MkNumericKey, number | null>>;

export async function fetchMkDataAnalysisRows(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: MkDataAnalysisRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from(MK_DATA_TABLE)
    .select("*")
    .order("ngay_thang_nhap", { ascending: true });

  if (error) return { ok: false, error: error.message };

  return { ok: true, rows: (data ?? []) as MkDataAnalysisRow[] };
}
