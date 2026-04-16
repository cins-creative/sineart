/** Nhóm hiển thị trang /khoa-hoc — suy ra từ `ql_mon_hoc.loai_khoa_hoc` */
export type CourseGroupId = "lthi" | "digital" | "kids" | "botro";

/** Nhãn Online / Tại lớp — suy từ `ql_mon_hoc.hinh_thuc` */
export type HinhThucHocTag = "Online" | "Tại lớp";

/** Một môn học đã gắn số liệu lớp / học viên */
export type KhoaHocCourseCard = {
  id: number;
  /** Slug đường dẫn: ưu tiên `ql_lop_hoc.url_class` của lớp thuộc môn */
  slug: string;
  tenMonHoc: string;
  /** Nhãn phụ / mô tả ngắn — từ `ql_mon_hoc.hinh_thuc` (cùng nguồn với tag hình thức) */
  tinhChat: string | null;
  /** `loai_khoa_hoc` */
  loaiKhoaHoc: string | null;
  /** Lớp có ≥1 học viên `Đang học` */
  soLopDangHoatDong: number;
  thumbnail: string | null;
  gradientStart: string | null;
  gradientEnd: string | null;
  group: CourseGroupId;
  isFeatured: boolean;
  /** Online / Tại lớp — suy từ `ql_mon_hoc.hinh_thuc` */
  hinhThucTag: HinhThucHocTag;
  /** Nhãn thẻ nav — text từ `ql_mon_hoc.hinh_thuc` khi có */
  hinhThucNavLabel: string | null;
};

/** Một dòng `hp_goi_hoc_phi` — gói học phí theo môn */
export type GoiHocPhi = {
  id: number;
  tenGoiHocPhi: string;
  /** `gia_goc` — giá niêm yết trước giảm */
  giaGoc: number;
  /** `discount` — % giảm (0–100) */
  discount: number;
  /** `number` — giá trị thời lượng (vd: 1, 2, 6) */
  numberValue: number | null;
  /** `don_vi` — đơn vị hiển thị (vd: tháng, buổi) */
  donVi: string | null;
  /** Học phí thực đóng = `gia_goc * (100 - discount) / 100` */
  hocPhiThucDong: number;
  /** `so_mon` — 1 hoặc 2; null (vd: Kids, một số gói lẻ) */
  soMon: number | null;
  /** `thoi_han_thang` — tháng; null nếu gói không gắn tháng */
  thoiHanThang: number | null;
  /** `so_buoi` — số buổi (vd: Kids); có thể null */
  soBuoi: number | null;
  /** `hinh_thuc` — rỗng/null = áp dụng mọi hình thức khi khớp các cột khác */
  hinhThuc: string | null;
  /** `la_chuan_thi` — null coi như false khi khớp gói thường */
  laChuanThi: boolean | null;
};

export type KhoaHocTeacher = {
  id: number;
  fullName: string;
  tag: string;
  /** Toàn bộ ảnh portfolio (theo flow TeacherPortfolio_DataFlow) */
  portfolioUrls: string[];
};

export type OngoingClassStatus = "open" | "almost" | "full";

export type OngoingClassCard = {
  id: string;
  title: string;
  gvNames: string;
  branchLabel?: string;
  portfolioImage: string | null;
  portfolioOwner: string | null;
  status: OngoingClassStatus;
  lich: string;
  gio: string;
  filled: number;
  total: number;
};

export type TeacherPortfolioSlide = {
  id: string;
  src: string;
  monHoc: string;
};

/** Một dòng `hp_goi_hoc_phi_new` cho widget HocPhiBlock (combo + thời lượng) */
export type HocPhiGoiRow = {
  id: number;
  mon_hoc: number;
  number: number;
  don_vi: string;
  gia_goc: number;
  discount: number;
  combo_id: number | null;
  /** `hp_goi_hoc_phi_new.so_buoi` — số buổi gói (đóng học phí). */
  so_buoi: number | null;
};

/** Một dòng `hp_combo_mon` */
export type HocPhiComboRow = {
  id: number;
  ten_combo: string;
  gia_giam: number;
};

/** Dữ liệu server cho `HocPhiBlock` */
export type HocPhiBlockData = {
  gois: HocPhiGoiRow[];
  combos: HocPhiComboRow[];
  monMap: Record<number, string>;
};

/** Chi tiết trang /khoa-hoc/[slug] */
export type KhoaHocDetailData = {
  id: number;
  tenMonHoc: string;
  tinhChat: string | null;
  loaiKhoaHoc: string | null;
  thumbnail: string | null;
  gradientStart: string | null;
  gradientEnd: string | null;
  isFeatured: boolean;
  group: CourseGroupId;
  /** Gói học phí (`hp_goi_hoc_phi` theo `mon_hoc`) */
  goiHocPhi: GoiHocPhi[];
  /** Giáo viên từ `hr_nhan_su` */
  teachers: KhoaHocTeacher[];
  hinhThucTag: HinhThucHocTag;
};
