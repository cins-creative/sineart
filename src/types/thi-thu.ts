import type { MonThiKey } from "@/lib/thi-thu-config";

export type ThiThuTrangThai = "draft" | "published";

export type ThiThuKyThiRow = {
  id: string;
  tieu_de: string;
  mon_thi: MonThiKey;
  thoi_gian_bat_dau: string;
  thoi_gian_giai_lao_bat_dau: string | null;
  thoi_gian_giai_lao_ket_thuc: string | null;
  thumbnail_url: string | null;
  lich_cham_bai_url: string | null;
  /** Link Youtube phát lại / sửa bài (điền sau khi có video). */
  video_sua_bai: string | null;
  /** Lịch chiếu video sửa bài — ISO timestamptz hoặc (server) `time` ghép ngày thi. */
  thoi_gian_sua_bai: string | null;
  /** Đề thi — mảng JSON (`jsonb`) trên `thi_thu_ky_thi`. */
  de_thi?: ThiThuDeThiItem[] | null;
  trang_thai: ThiThuTrangThai;
  created_at?: string;
};

/** Một đề trong kỳ thi (lưu trong `thi_thu_ky_thi.de_thi`). */
export type ThiThuDeThiItem = {
  tieu_de: string;
  anh_urls: string[];
  thu_tu: number;
};

/** Giữ tên cũ — trùng `ThiThuDeThiItem` (không còn bảng `thi_thu_de_thi`). */
export type ThiThuDeThiRow = ThiThuDeThiItem;

export type ThiThuBaiNopRow = {
  id: string;
  ky_thi_id: string;
  ho_ten: string;
  facebook: string | null;
  anh_bai_nop_urls: string[];
  ghi_chu: string | null;
  thoi_gian_nop: string;
};

export type ThiThuPhase =
  | "waiting"
  | "countdown"
  | "exam_1"
  | "break"
  | "exam_2"
  | "submit_grace"
  | "ended";
