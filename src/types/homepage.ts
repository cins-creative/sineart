/** Lọc tác phẩm theo cột `ten_mon_hoc` (bảng `ql_mon_hoc`). */
export type GalleryMonHocFilter = "all" | string;

export interface MonHoc {
  id: number;
  created_at?: string | null;
  ten_mon_hoc: string;
  thumbnail: string | null;
  loai_khoa_hoc: string | null;
  thu_tu_hien_thi: number;
  is_featured: boolean;
  /** Hình thức / nhãn hiển thị (Online, Tại lớp, …) */
  hinh_thuc?: string | null;
  /** Sức chứa hoặc chỉ tiêu sĩ số (numeric trong DB) */
  si_so?: number | string | null;
}

export interface BaiHocVien {
  id: number | string;
  photo: string | null;
  score: number | string | null;
  bai_mau: boolean;
  ten_hoc_vien: { full_name: string } | null;
  /** Alias trong query — tránh từ khoá `class` (PostgREST / Turbopack) */
  lop_hoc: { class_name: string } | null;
  thuoc_bai_tap: {
    ten_bai_tap: string;
    mon_hoc: { id: number; ten_mon_hoc: string } | null;
  } | null;
}

export interface NhanSu {
  id: number;
  full_name: string;
  avatar: string | null;
  bio: string | null;
  nam_kinh_nghiem: number;
  /** Text (URL Cloudflare / nhiều URL) hoặc mảng URL tùy schema */
  portfolio: string | string[] | null;
  mon_day: number[] | null;
}

/** Một ảnh portfolio (trang chủ — chỉ hiển thị ảnh, không text) */
export interface TeacherArtSlide {
  id: string;
  src: string;
}

export interface DanhGia {
  id: number | string;
  ten_nguoi: string;
  avatar_url: string | null;
  noi_dung: string;
  so_sao: number;
  thoi_gian_hoc: string | null;
  nguon: string;
  /** Embed từ ql_mon_hoc qua FK khoa_hoc (CLAUDE.md) */
  khoa_hoc: { ten_mon_hoc: string } | null;
}

export interface GalleryDisplayItem {
  id: string | number;
  photo: string | null;
  /** Điểm từ `hv_bai_hoc_vien.score` — null nếu chưa chấm */
  score: number | null;
  studentName: string;
  categoryLabel: string;
  /** Giá trị `ten_mon_hoc` qua `thuoc_bai_tap.mon_hoc` — null nếu không gắn môn */
  tenMonHoc: string | null;
  /** `ql_mon_hoc.id` — dùng lọc trang /khoa-hoc/[slug] (không phụ thuộc so khớp chuỗi) */
  monHocId?: number | null;
  baiMau: boolean;
  mi: number;
}

/** Tab filter: khớp chuỗi `ten_mon_hoc` trong DB */
export type GalleryMonHocTab = { tenMonHoc: string; label: string };

export interface HomeReview {
  id: string | number;
  name: string;
  course: string;
  avatarEmoji: string;
  avatarUrl: string | null;
  text: string;
  stars: number;
  source: string;
  grad: string;
  artTag: string;
}

