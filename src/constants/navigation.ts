/**
 * Cấu trúc navigation — slug khóa học = `/khoa-hoc/{slug}` với slug suy từ `ten_mon_hoc` (vd. Hình họa → hinh-hoa).
 */

export type NavSubItem = {
  label: string;
  href: string;
  emoji: string;
  /** Thẻ hình thức — tách khỏi `label` để không lặp (vd. "Luyện thi tại lớp" + "Tại lớp") */
  hinhThucTag?: "Online" | "Tại lớp";
  /** Nhãn hiển thị trên thẻ — từ `ql_mon_hoc.hinh_thuc` khi có */
  navHinhThucLabel?: string | null;
};

/** Nhóm trong menu Khóa học (luyện thi, digital, …) */
export type NavKhoaHocGroup = {
  title: string;
  items: NavSubItem[];
};

export type NavDropdown = {
  kind: "dropdown";
  id: string;
  /** Nếu có: click label = vào trang này; vẫn mở dropdown khi hover */
  href?: string;
  label: string;
  /** Fallback khi không truyền `khoaHocGroups` từ server */
  children: NavSubItem[];
};

export type NavLink = {
  kind: "link";
  id: string;
  label: string;
  href: string;
  external?: boolean;
};

export type NavItem = NavLink | NavDropdown;

/** Fallback khi chưa fetch `ql_mon_hoc` — trang chủ nên truyền `khoaHocGroups` động */
const KHOA_HOC_CHILDREN: NavSubItem[] = [
  { emoji: "🟨", label: "Hình họa Online", href: "/khoa-hoc/hinh-hoa" },
  { emoji: "🟪", label: "Trang trí màu Online", href: "/khoa-hoc/trang-tri-mau" },
  { emoji: "🟩", label: "Bố cục màu Online", href: "/khoa-hoc/bo-cuc-mau" },
  { emoji: "🟦", label: "Sine Kids", href: "/khoa-hoc/sine-kids" },
  { emoji: "🟨", label: "Background Online", href: "/khoa-hoc/background" },
  { emoji: "🟥", label: "Offline tại lớp", href: "/khoa-hoc/offline" },
  { emoji: "⬛", label: "Mỹ thuật bổ trợ tại lớp", href: "/khoa-hoc/my-thuat-bo-tro" },
];

export const NAV_ITEMS: NavItem[] = [
  {
    kind: "dropdown",
    id: "khoa-hoc",
    label: "Khóa học",
    href: "/khoa-hoc",
    children: KHOA_HOC_CHILDREN,
  },
  {
    kind: "link",
    id: "bai-hoc-vien",
    label: "Bài học viên",
    href: "/gallery",
  },
  {
    kind: "link",
    id: "huong-nghiep",
    label: "Hướng nghiệp",
    href: "https://cins.vn",
    external: true,
  },
  {
    kind: "dropdown",
    id: "thu-vien",
    label: "Thư viện",
    children: [
      {
        emoji: "🟥",
        label: "Lý thuyết nền tảng",
        href: "/kien-thuc-nen-tang",
      },
      { emoji: "🟪", label: "Free ebook", href: "/ebook" },
      { emoji: "🟨", label: "Đề thi", href: "/tong-hop-de-thi" },
      { emoji: "🟪", label: "Mẫu vẽ hình họa", href: "/mau-ve" },
    ],
  },
  {
    kind: "dropdown",
    id: "thong-tin-dh",
    label: "Thông tin đại học",
    href: "/tra-cuu-thong-tin",
    children: [
      {
        emoji: "🟪",
        label: "Thông tin đại học",
        href: "/tra-cuu-thong-tin",
      },
      { emoji: "🟩", label: "Tính điểm", href: "/tinh-diem" },
    ],
  },
  { kind: "link", id: "thi-thu", label: "Thi thử", href: "/thi-thu" },
  { kind: "link", id: "blogs", label: "Blogs", href: "/blogs" },
];
