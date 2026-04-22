/** Các route sidebar dashboard admin — dùng chung cho UI + phân quyền theo phòng. */

export const DASHBOARD_OVERVIEW_HREF = "/admin/dashboard/overview";
export const ORDER_MEDIA_HREF = "/admin/dashboard/order-media";

export const NAV_MAIN: { label: string; href: string; disabled?: boolean }[] = [
  { label: "Chi nhánh", href: "/admin/dashboard/chi-nhanh" },
  { label: "Khóa học", href: "/admin/dashboard/khoa-hoc" },
  { label: "Lớp học", href: "/admin/dashboard/lop-hoc" },
  { label: "Gói học phí", href: "/admin/dashboard/goi-hoc-phi" },
  { label: "Quản lý hóa đơn", href: "/admin/dashboard/quan-ly-hoa-don" },
  { label: "Quản lý học viên", href: "/admin/dashboard/quan-ly-hoc-vien" },
  { label: "Thu chi khác", href: "/admin/dashboard/thu-chi-khac" },
  { label: "Quản lý họa cụ", href: "/admin/dashboard/quan-ly-hoa-cu" },
  { label: "Hệ thống bài tập", href: "/admin/dashboard/he-thong-bai-tap" },
];

export const NAV_HR: { label: string; href: string; disabled?: boolean }[] = [
  { label: "Nhân sự", href: "/admin/dashboard/quan-ly-nhan-su" },
  { label: "Báo cáo tài chính", href: "/admin/dashboard/bao-cao-tai-chinh" },
  { label: "Giá trị tài sản", href: "/admin/dashboard/gia-tri-tai-san" },
  { label: "Thống kê thu chi", href: "/admin/dashboard/thong-ke-thu-chi" },
  { label: "Upload sao kê", href: "/admin/dashboard/sao-ke" },
];

export const NAV_MARKETING: { label: string; href: string; disabled?: boolean }[] = [
  { label: "Marketing analytics", href: "/admin/dashboard/report-mkt" },
  { label: "Quản lý media", href: "/admin/dashboard/quan-ly-media" },
  { label: "Quản lý bài học viên", href: "/admin/dashboard/quan-ly-bai-hoc-vien" },
  { label: "Quản lý Blogs", href: "/admin/dashboard/quan-ly-blog" },
  { label: "Quản lý Ebook", href: "/admin/dashboard/quan-ly-ebook" },
  { label: "Tra cứu thông tin", href: "/admin/dashboard/quan-ly-tra-cuu" },
  { label: "Bình luận", href: "/admin/dashboard/binh-luan" },
];

export const HREFS_DIEU_HANH_ALL = NAV_MAIN.map((n) => n.href);
export const HREFS_NHAN_SU_TC_ALL = NAV_HR.map((n) => n.href);
export const HREFS_MARKETING_ALL = NAV_MARKETING.map((n) => n.href);
