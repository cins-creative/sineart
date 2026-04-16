export type MucDoQuanTrong = "Bắt buộc" | "Tập luyện" | "Tuỳ chọn";

export type BaiTap = {
  id: number;
  ten_bai_tap: string;
  bai_so: number;
  /** Ảnh minh hoạ bài — `hv_he_thong_bai_tap.thumbnail` (URL Cloudflare hoặc khác) */
  thumbnail: string | null;
  noi_dung_liet_ke: string | null;
  video_bai_giang: string | null;
  is_visible: boolean;
  so_buoi: number;
  muc_do_quan_trong: MucDoQuanTrong;
  mon_hoc: { id: number; ten_mon_hoc: string };
};
