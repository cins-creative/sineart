export type NhomLyThuyet =
  | "Lý thuyết cơ sở"
  | "Bố cục"
  | "Giải phẫu"
  | "Màu sắc"
  | "Sắc độ"
  | "Vật liệu";

export type LyThuyet = {
  slug: string;
  ten: string;
  nhom: NhomLyThuyet;
  so_thu_tu: number;
  mo_ta: string;
  tags: string[];
  doc_time: number;
  /** Optional hero background image (full URL). Nếu bỏ trống → dùng gradient ink mặc định. */
  hero_image?: string;
  /** Optional thumbnail shown on landing-page cards. */
  thumbnail?: string;
};

export const LY_THUYET_LIST: LyThuyet[] = [
  {
    slug: "co-so-tao-hinh",
    ten: "Cơ sở tạo hình",
    nhom: "Lý thuyết cơ sở",
    so_thu_tu: 1,
    mo_ta: "Bộ ngữ pháp thị giác của mọi tác phẩm mỹ thuật — 7 yếu tố nền tảng và 7 nguyên lý tổ chức.",
    tags: ["nền-tảng", "yếu-tố", "nguyên-lý"],
    doc_time: 12,
    hero_image: "/img/co-so-tao-hinh/hero-cover.jpg",
    thumbnail: "/img/co-so-tao-hinh/thumbnail.jpg",
  },
  {
    slug: "nguyen-ly-thi-giac",
    ten: "Nguyên lý thị giác",
    nhom: "Lý thuyết cơ sở",
    so_thu_tu: 2,
    mo_ta: "Các quy luật Gestalt mô tả cách mắt và não người tổ chức hình ảnh.",
    tags: ["gestalt", "thị-giác", "nhận-thức"],
    doc_time: 10,
    hero_image: "/img/nguyen-ly-thi-giac/hero-cover.jpg",
    thumbnail: "/img/nguyen-ly-thi-giac/thumbnail.jpg",
  },
  {
    slug: "phuong-phap-ve-gioi-han",
    ten: "Phương pháp vẽ giới hạn",
    nhom: "Lý thuyết cơ sở",
    so_thu_tu: 3,
    mo_ta: "Kỹ thuật dựng hình bằng đường bao ngoài — bước đầu tiên của mọi người học vẽ.",
    tags: ["contour", "dựng-hình", "nhập-môn"],
    doc_time: 8,
    hero_image: "/img/phuong-phap-ve-gioi-han/hero-cover.png",
    thumbnail: "/img/phuong-phap-ve-gioi-han/thumbnail.jpg",
  },
  {
    slug: "phuong-phap-ve-cau-truc",
    ten: "Phương pháp vẽ cấu trúc",
    nhom: "Lý thuyết cơ sở",
    so_thu_tu: 4,
    mo_ta: "Kỹ thuật dựng hình bằng khối hình học cơ bản — xương sống của vẽ chính xác.",
    tags: ["cấu-trúc", "khối", "3D"],
    doc_time: 10,
    hero_image: "/img/phuong-phap-ve-cau-truc/hero-cover.png",
    thumbnail: "/img/phuong-phap-ve-cau-truc/thumbnail.jpg",
  },
  {
    slug: "ly-thuyet-phoi-canh",
    ten: "Lý thuyết phối cảnh",
    nhom: "Bố cục",
    so_thu_tu: 5,
    mo_ta: "Quy luật vật ở xa thì nhỏ — công cụ tạo chiều sâu không gian trong tranh 2D.",
    tags: ["phối-cảnh", "điểm-tụ", "không-gian"],
    doc_time: 12,
    hero_image: "/img/ly-thuyet-phoi-canh/hero-cover.png",
    thumbnail: "/img/ly-thuyet-phoi-canh/thumbnail.png",
  },
  {
    slug: "diem-tap-trung",
    ten: "Điểm tập trung",
    nhom: "Bố cục",
    so_thu_tu: 6,
    mo_ta: "Nơi mắt người xem dừng lại đầu tiên — nam châm thị giác quyết định thông điệp chính.",
    tags: ["focal-point", "bố-cục", "hierarchy"],
    doc_time: 8,
    thumbnail: "/img/diem-tap-trung/thumbnail.jpg",
    hero_image: "/img/diem-tap-trung/hero-cover.png",
  },
  {
    slug: "bo-cuc-sac-do",
    ten: "Bố cục sắc độ",
    nhom: "Bố cục",
    so_thu_tu: 7,
    mo_ta: "Sắp xếp sáng tối trong tranh để tạo cảm xúc và chiều sâu. Nền tảng trước khi lên màu.",
    tags: ["sắc-độ", "value", "notan"],
    doc_time: 10,
    thumbnail: "/img/bo-cuc-sac-do/thumbnail.jpg",
    hero_image: "/img/bo-cuc-sac-do/hero-cover.png",
  },
  {
    slug: "ti-le-co-the-nguoi",
    ten: "Tỉ lệ cơ thể người",
    nhom: "Giải phẫu",
    so_thu_tu: 8,
    mo_ta: "Công thức đo chiều cao và bố cục các phần cơ thể — chìa khoá vẽ nhân vật đúng.",
    tags: ["tỉ-lệ", "giải-phẫu", "8-đầu"],
    doc_time: 10,
    thumbnail: "/img/ti-le-co-the-nguoi/thumbnail.jpg",
    hero_image: "/img/ti-le-co-the-nguoi/hero-cover.png",
  },
  {
    slug: "khong-gian-mau",
    ten: "Không gian màu là gì?",
    nhom: "Màu sắc",
    so_thu_tu: 9,
    mo_ta: "Khoảng màu mà thiết bị hiển thị được — nền tảng để hiểu tại sao màu màn hình khác màu in.",
    tags: ["color-space", "sRGB", "CMYK"],
    doc_time: 8,
    thumbnail: "/img/khong-gian-mau/thumbnail.jpg",
    hero_image: "/img/khong-gian-mau/hero-cover.png",
  },
  {
    slug: "ly-thuyet-hoa-sac",
    ten: "Lý thuyết hòa sắc",
    nhom: "Màu sắc",
    so_thu_tu: 10,
    mo_ta: "Quy luật phối màu hài hoà với mắt người — từ bánh xe màu đến các scheme kinh điển.",
    tags: ["hoà-sắc", "complementary", "analogous"],
    doc_time: 12,
    thumbnail: "/img/ly-thuyet-hoa-sac/thumbnail.jpg",
  },
  {
    slug: "gam-mau",
    ten: "Gam màu",
    nhom: "Màu sắc",
    so_thu_tu: 11,
    mo_ta: "Bộ màu chủ đạo quyết định cảm xúc và tông của tác phẩm — công cụ mạnh nhất trước khi cầm cọ.",
    tags: ["gam-màu", "palette", "cảm-xúc"],
    doc_time: 10,
    thumbnail: "/img/gam-mau/thumbnail.jpg",
  },
  {
    slug: "he-thong-mau-munsell",
    ten: "Hệ thống màu Munsell",
    nhom: "Màu sắc",
    so_thu_tu: 12,
    mo_ta: "Hệ thống mô tả màu 3 chiều chính xác nhất dành cho họa sĩ dùng màu vật lý.",
    tags: ["munsell", "hue-value-chroma", "atelier"],
    doc_time: 10,
    thumbnail: "/img/he-thong-mau-munsell/thumbnail.png",
  },
  {
    slug: "mo-hinh-cong-tru-mau",
    ten: "Mô hình Cộng - Trừ màu",
    nhom: "Màu sắc",
    so_thu_tu: 13,
    mo_ta: "Hai mô hình vật lý tạo ra màu — RGB (ánh sáng) và CMY (sắc tố).",
    tags: ["RGB", "CMYK", "additive", "subtractive"],
    doc_time: 8,
    thumbnail: "/img/mo-hinh-cong-tru-mau/thumbnail.png",
  },
  {
    slug: "thuoc-tinh-mau-sac",
    ten: "Các thuộc tính cơ bản của Màu sắc",
    nhom: "Màu sắc",
    so_thu_tu: 14,
    mo_ta: "Hue, Saturation, Lightness, Chroma, Value — ngôn ngữ chính xác để nói về màu.",
    tags: ["HSL", "hue", "saturation", "value"],
    doc_time: 10,
    thumbnail: "/img/thuoc-tinh-mau-sac/thumbnail.png",
  },
  {
    slug: "mau-sac-qua-thiet-bi-dien-tu",
    ten: "Màu sắc qua các thiết bị điện tử",
    nhom: "Màu sắc",
    so_thu_tu: 15,
    mo_ta: "Tại sao màu trên iPhone, Samsung và laptop lại khác nhau — và cách kiểm soát.",
    tags: ["calibration", "màn-hình", "OLED", "IPS"],
    doc_time: 10,
    thumbnail: "/img/mau-sac-qua-thiet-bi-dien-tu/thumbnail.png",
  },
  {
    slug: "cac-he-mau-vat-ly",
    ten: "Các hệ màu vật lý phổ biến",
    nhom: "Màu sắc",
    so_thu_tu: 16,
    mo_ta: "Chì, than, màu nước, acrylic, sơn dầu, pastel — đặc tính và cách chọn đúng.",
    tags: ["vật-liệu", "acrylic", "sơn-dầu", "màu-nước"],
    doc_time: 12,
    thumbnail: "/img/cac-he-mau-vat-ly/thumbnail.png",
  },
  {
    slug: "phoi-canh-khi-quyen",
    ten: "Phối cảnh khí quyển",
    nhom: "Sắc độ",
    so_thu_tu: 17,
    mo_ta: "Vật càng xa càng nhạt, mờ, ngả lạnh — công cụ tạo chiều sâu cho tranh phong cảnh.",
    tags: ["atmospheric", "chiều-sâu", "sfumato"],
    doc_time: 8,
    thumbnail: "/img/phoi-canh-khi-quyen/thumbnail.jpg",
  },
  {
    slug: "shading-la-gi",
    ten: "Shading là gì?",
    nhom: "Sắc độ",
    so_thu_tu: 18,
    mo_ta: "Kỹ thuật tả khối 3D bằng sáng tối — biến đường vẽ 2D thành hình khối có thể tích.",
    tags: ["shading", "tả-khối", "sáng-tối"],
    doc_time: 12,
    thumbnail: "/img/shading-la-gi/thumbnail.png",
  },
  {
    slug: "ly-thuyet-vat-lieu",
    ten: "Lý thuyết vật liệu cơ bản",
    nhom: "Vật liệu",
    so_thu_tu: 19,
    mo_ta: "Tại sao kim loại sáng chói, vải mờ đục, kính trong suốt — chữ ký thị giác của vật liệu.",
    tags: ["vật-liệu", "material", "texture"],
    doc_time: 10,
    thumbnail: "/img/ly-thuyet-vat-lieu/thumbnail.jpg",
  },
  {
    slug: "bo-cuc-trong-tranh",
    ten: "Bố cục trong tranh",
    nhom: "Bố cục",
    so_thu_tu: 20,
    mo_ta: "Sắp xếp yếu tố thị giác để dẫn dắt cảm xúc — từ golden ratio đến rule of thirds.",
    tags: ["bố-cục", "golden-ratio", "composition"],
    doc_time: 14,
    hero_image: "/img/bo-cuc-trong-tranh/hero-cover.png",
  },
  {
    slug: "bo-cuc-trong-thiet-ke",
    ten: "Bố cục trong thiết kế",
    nhom: "Bố cục",
    so_thu_tu: 21,
    mo_ta: "Tổ chức yếu tố thị giác để truyền đạt thông tin hiệu quả — grid, hierarchy, Bauhaus.",
    tags: ["design", "layout", "grid", "hierarchy"],
    doc_time: 14,
    hero_image: "/img/bo-cuc-trong-thiet-ke/hero-cover.png",
    thumbnail: "/img/bo-cuc-trong-thiet-ke/hero-cover.png",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export const getNhomList = (): NhomLyThuyet[] =>
  [...new Set(LY_THUYET_LIST.map((b) => b.nhom))] as NhomLyThuyet[];

export const getByNhom = (nhom: NhomLyThuyet) =>
  LY_THUYET_LIST.filter((b) => b.nhom === nhom);

export const getBySlug = (slug: string) =>
  LY_THUYET_LIST.find((b) => b.slug === slug);

export const getPrevNext = (slug: string) => {
  const idx = LY_THUYET_LIST.findIndex((b) => b.slug === slug);
  return {
    prev: idx > 0 ? LY_THUYET_LIST[idx - 1] : null,
    next: idx < LY_THUYET_LIST.length - 1 ? LY_THUYET_LIST[idx + 1] : null,
  };
};

/** Accent colour per group — khớp palette v5 (preview_v5_image_rich.html) */
export const NHOM_ACCENT: Record<NhomLyThuyet, string> = {
  "Lý thuyết cơ sở": "#ee5b9f", // mag
  "Bố cục": "#f8a668",           // peach
  "Giải phẫu": "#bb89f8",        // purple (tt)
  "Màu sắc": "#6efec0",          // green (bc)
  "Sắc độ": "#fde859",           // yellow (hh)
  "Vật liệu": "#2d2020",         // ink
};
