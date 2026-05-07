/** Dòng lớp cho admin Quản lý lớp học — dùng server + client. */
export type AdminLopRow = {
  id: number;
  class_name: string | null;
  class_full_name: string | null;
  mon_hoc: number | null;
  /** Mảng ID giáo viên (có thể rỗng). */
  teacher: number[];
  chi_nhanh_id: number | null;
  avatar: string | null;
  lich_hoc: string | null;
  url_class: string | null;
  url_google_meet: string | null;
  /** URL nhóm chat Messenger — `ql_lop_hoc.group_chat_messenger`. */
  group_chat_messenger: string | null;
  device: string | null;
  /** Lớp cấp tốc — theo cột `special`. */
  special: boolean;
  /** Lớp đang hoạt động — theo cột `tinh_trang`. */
  tinh_trang: boolean;
  /** Chỉ dùng khi môn Hình họa — `ql_lop_hoc.level_hinh_hoa`. */
  level_hinh_hoa: string | null;
};
