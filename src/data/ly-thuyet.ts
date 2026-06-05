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
    slug: "phuong-phap-ve-silhouette",
    ten: "Phương pháp vẽ Silhouette",
    nhom: "Lý thuyết cơ sở",
    so_thu_tu: 5,
    mo_ta:
      "Đọc và khống chế hình bìa trước khi vào chi tiết — nền tảng của nhận dạng dáng và tỉ lệ nhanh.",
    tags: ["silhouette", "hình-bìa", "notan", "dựng-hình"],
    doc_time: 9,
    hero_image: "/img/phuong-phap-ve-silhouette/hero-cover.png",
    thumbnail: "/img/phuong-phap-ve-silhouette/thumbnail.jpg",
  },
  {
    slug: "phuong-phap-ve-force",
    ten: "Phương pháp vẽ Force",
    nhom: "Lý thuyết cơ sở",
    so_thu_tu: 6,
    mo_ta:
      "Đường chỉ phương và lực ẩn — Mike Mattesi: hình có ‘sống’ khi có đối lực và rhythm.",
    tags: ["force", "gesture", "đường-chỉ-phương", "nhân-vật"],
    doc_time: 11,
    hero_image: "/img/phuong-phap-ve-force/hero-cover.png",
    thumbnail: "/img/phuong-phap-ve-force/thumbnail.png",
  },
  {
    slug: "phuong-phap-ky-hoa",
    ten: "Phương pháp ký họa",
    nhom: "Lý thuyết cơ sở",
    so_thu_tu: 7,
    mo_ta:
      "Ghi nhanh quan sát — trọng tâm, thời gian giới hạn và làm giàu nhật ký hình.",
    tags: ["ký-họa", "sketch", "quan-sát", "urban-sketch"],
    doc_time: 14,
    hero_image: "/img/phuong-phap-ky-hoa/hero-cover.png",
    thumbnail: "/img/phuong-phap-ky-hoa/hero-cover.png",
  },
  {
    slug: "cach-dieu",
    ten: "Cách điệu",
    nhom: "Lý thuyết cơ sở",
    so_thu_tu: 8,
    mo_ta:
      "Biến đổi hình mẫu nhưng giữ đặc trưng nhận diện — chuỗi Ý tưởng → Concept → Cách điệu → Trang trí và họa tiết.",
    tags: ["cách-điệu", "stylize", "trang-trí", "hình-tượng"],
    doc_time: 14,
    hero_image: "/img/cach-dieu/hero-cover.png",
    thumbnail: "/img/cach-dieu/thumbnail.png",
  },
  {
    slug: "ly-thuyet-phoi-canh",
    ten: "Lý thuyết phối cảnh",
    nhom: "Bố cục",
    so_thu_tu: 9,
    mo_ta: "Quy luật vật ở xa thì nhỏ — công cụ tạo chiều sâu không gian trong tranh 2D.",
    tags: ["phối-cảnh", "điểm-tụ", "không-gian"],
    doc_time: 12,
    hero_image: "/img/ly-thuyet-phoi-canh/hero-cover.png",
    thumbnail: "/img/ly-thuyet-phoi-canh/thumbnail.png",
  },
  {
    slug: "phoi-canh-song-song",
    ten: "Phối cảnh song song",
    nhom: "Bố cục",
    so_thu_tu: 10,
    mo_ta:
      "Chiếu song song: không điểm tụ cổ điển, đường song song giữ nguyên — isometric, axonometric, orthographic; so sánh với phối cảnh tuyến tính, quy trình lưới và ứng dụng kiến trúc · game · storyboard.",
    tags: ["phối-cảnh", "axonometric", "song-song", "kỹ-thuật"],
    doc_time: 19,
    hero_image: "/img/phoi-canh-song-song/hero-cover.png",
    thumbnail: "/img/phoi-canh-song-song/thumbnail.png",
  },
  {
    slug: "phoi-canh-mat-ca",
    ten: "Phối cảnh mắt cá",
    nhom: "Bố cục",
    so_thu_tu: 11,
    mo_ta:
      "Phối cảnh cong (curvilinear): fisheye, đường thẳng thành cung, chân trời cong; so với rectilinear siêu rộng và panorama 360; lưới tâm, nhân vật ở mép, circle vs full-frame.",
    tags: ["phối-cảnh", "fisheye", "góc-rộng", "curvilinear"],
    doc_time: 18,
    hero_image: "/img/phoi-canh-mat-ca/hero-cover.png",
    thumbnail: "/img/phoi-canh-mat-ca/thumbnail.png",
  },
  {
    slug: "phoi-canh-panorama-360",
    ten: "Phối cảnh Panorama (360°)",
    nhom: "Bố cục",
    so_thu_tu: 12,
    mo_ta:
      "Toàn cảnh 360° — equirect 2:1, cube map, seam và cực; VR / game / HDRI; phân biệt panorama siêu rộng một hướng với bọc kín trục ngang; quy trình matte và liên hệ phối cảnh tuyến tính · mắt cá.",
    tags: ["panorama", "360", "VR", "phối-cảnh"],
    doc_time: 19,
    hero_image: "/img/phoi-canh-panorama-360/hero-cover.png",
    thumbnail: "/img/phoi-canh-panorama-360/thumbnail.jpg",
  },
  {
    slug: "diem-tap-trung",
    ten: "Điểm tập trung",
    nhom: "Bố cục",
    so_thu_tu: 13,
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
    so_thu_tu: 14,
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
    so_thu_tu: 15,
    mo_ta: "Công thức đo chiều cao và bố cục các phần cơ thể — chìa khoá vẽ nhân vật đúng.",
    tags: ["tỉ-lệ", "giải-phẫu", "8-đầu"],
    doc_time: 10,
    thumbnail: "/img/ti-le-co-the-nguoi/thumbnail.jpg",
    hero_image: "/img/ti-le-co-the-nguoi/hero-cover.png",
  },
  {
    slug: "vai-tro-cua-giai-phau",
    ten: "Vai trò của giải phẫu",
    nhom: "Giải phẫu",
    so_thu_tu: 16,
    mo_ta:
      "Giải phẫu trong hội họa: bóc tách cấu trúc, logic chuyển động, cách điệu có kiểm soát, sinh vật giả tưởng và pipeline 3D — nền tảng cho concept thuyết phục.",
    tags: ["giải-phẫu", "concept-art", "character-design", "pipeline", "nền-tảng"],
    doc_time: 12,
    thumbnail: "/img/giai-phau-cho-hoa-si/thumbnail.jpg",
    hero_image: "/img/giai-phau-cho-hoa-si/hero-cover.png",
  },
  {
    slug: "giai-phau-cho-hoa-si",
    ten: "Giải phẫu cho thiết kế nhân vật",
    nhom: "Giải phẫu",
    so_thu_tu: 17,
    mo_ta:
      "Hiểu giải phẫu để concept khớp logic: khớp tay chân, cánh không ‘rơi’, và hình thể nhất quán với môi trường sống của nhân vật.",
    tags: ["concept-art", "character-design", "worldbuilding", "giải-phẫu"],
    doc_time: 12,
    thumbnail: "/img/giai-phau-cho-hoa-si/thumbnail.jpg",
    hero_image: "/img/giai-phau-cho-hoa-si/hero-cover.png",
  },
  {
    slug: "giai-phau-chan-dung-nguoi",
    ten: "Giải phẫu chân dung người",
    nhom: "Giải phẫu",
    so_thu_tu: 18,
    mo_ta:
      "Hộp sọ, mặt phẳng nghiêng, ổ mắt, khớp hàm và cơ biểu cảm; chính diện / 3/4 / profile; trẻ – trưởng thành – lão hóa; liên hệ tỉ lệ, cấu trúc, silhouette và thiết kế nhân vật.",
    tags: ["chân-dung", "mặt", "hộp-sọ", "cơ-bảng-mặt"],
    doc_time: 20,
    hero_image: "/img/giai-phau-chan-dung-nguoi/hero-cover.png",
    thumbnail: "/img/giai-phau-chan-dung-nguoi/mosaic-thumb-1.png",
  },
  {
    slug: "giai-phau-ban-chan",
    ten: "Cấu trúc & giải phẫu bàn chân",
    nhom: "Giải phẫu",
    so_thu_tu: 19,
    mo_ta:
      "Gót–cầu cổ chân–vòm–bàn ngón; khớp gập/duỗi và lật trong–ngoài; điểm chạm đất, giày dép như bọc khối; góc nhìn chân; liên hệ tỉ lệ toàn thân, tay và chân dung.",
    tags: ["bàn-chân", "xương", "giải-phẫu", "tư-thế"],
    doc_time: 22,
    hero_image: "/img/giai-phau-ban-chan/hero-cover.png",
    thumbnail: "/img/giai-phau-ban-chan/mosaic-thumb-1.png",
  },
  {
    slug: "giai-phau-ban-tay",
    ten: "Cấu trúc và giải phẫu bàn tay",
    nhom: "Giải phẫu",
    so_thu_tu: 20,
    mo_ta:
      "Xương bàn, ngón, gân và các cử động gập duỗi — cơ sở vẽ tay cầm nắm, cử chỉ và chân dung tay.",
    tags: ["bàn-tay", "xương", "cử-động", "giải-phẫu"],
    doc_time: 12,
    hero_image: "/img/giai-phau-ban-tay/hero-cover.png",
    thumbnail: "/img/giai-phau-ban-tay/thumbnail.jpg",
  },
  {
    slug: "khong-gian-mau",
    ten: "Không gian màu là gì?",
    nhom: "Màu sắc",
    so_thu_tu: 21,
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
    so_thu_tu: 22,
    mo_ta: "Quy luật phối màu hài hoà với mắt người — từ bánh xe màu đến các scheme kinh điển.",
    tags: ["hoà-sắc", "complementary", "analogous"],
    doc_time: 12,
    thumbnail: "/img/ly-thuyet-hoa-sac/thumbnail.jpg",
    hero_image: "/img/ly-thuyet-hoa-sac/hero-cover.png",
  },
  {
    slug: "co-nen-hoc-vong-ryb",
    ten: "Có nên học vòng RYB?",
    nhom: "Màu sắc",
    so_thu_tu: 23,
    mo_ta:
      "Vòng Đỏ–Vàng–Xanh trong lò luyện thi và giới hạn so với khoa học màu hiện đại — video Đồ họa Sine Art.",
    tags: ["RYB", "màu-sắc", "hoà-sắc", "Munsell", "khối-H"],
    doc_time: 12,
    hero_image: "/img/co-nen-hoc-vong-ryb/hero-cover.png",
    thumbnail: "/img/co-nen-hoc-vong-ryb/thumbnail.jpg",
  },
  {
    slug: "gam-mau",
    ten: "Gam màu",
    nhom: "Màu sắc",
    so_thu_tu: 24,
    mo_ta: "Bộ màu chủ đạo quyết định cảm xúc và tông của tác phẩm — công cụ mạnh nhất trước khi cầm cọ.",
    tags: ["gam-màu", "palette", "cảm-xúc"],
    doc_time: 10,
    thumbnail: "/img/gam-mau/thumbnail.jpg",
  },
  {
    slug: "he-thong-mau-munsell",
    ten: "Hệ thống màu Munsell",
    nhom: "Màu sắc",
    so_thu_tu: 25,
    mo_ta: "Hệ thống mô tả màu 3 chiều chính xác nhất dành cho họa sĩ dùng màu vật lý.",
    tags: ["munsell", "hue-value-chroma", "atelier"],
    doc_time: 10,
    thumbnail: "/img/he-thong-mau-munsell/thumbnail.png",
    hero_image: "/img/he-thong-mau-munsell/hero-cover.png",
  },
  {
    slug: "mo-hinh-cong-tru-mau",
    ten: "Mô hình Cộng - Trừ màu",
    nhom: "Màu sắc",
    so_thu_tu: 26,
    mo_ta: "Hai mô hình vật lý tạo ra màu — RGB (ánh sáng) và CMY (sắc tố).",
    tags: ["RGB", "CMYK", "additive", "subtractive"],
    doc_time: 8,
    thumbnail: "/img/mo-hinh-cong-tru-mau/thumbnail.png",
    hero_image: "/img/mo-hinh-cong-tru-mau/hero-cover.png",
  },
  {
    slug: "thuoc-tinh-mau-sac",
    ten: "Các thuộc tính cơ bản của Màu sắc",
    nhom: "Màu sắc",
    so_thu_tu: 27,
    mo_ta: "Hue, Saturation, Lightness, Chroma, Value — ngôn ngữ chính xác để nói về màu.",
    tags: ["HSL", "hue", "saturation", "value"],
    doc_time: 10,
    thumbnail: "/img/thuoc-tinh-mau-sac/thumbnail.png",
    hero_image: "/img/thuoc-tinh-mau-sac/hero-cover.png",
  },
  {
    slug: "mau-sac-qua-thiet-bi-dien-tu",
    ten: "Màu sắc qua các thiết bị điện tử",
    nhom: "Màu sắc",
    so_thu_tu: 28,
    mo_ta: "Tại sao màu trên iPhone, Samsung và laptop lại khác nhau — và cách kiểm soát.",
    tags: ["calibration", "màn-hình", "OLED", "IPS"],
    doc_time: 10,
    thumbnail: "/img/mau-sac-qua-thiet-bi-dien-tu/thumbnail.png",
    hero_image: "/img/mau-sac-qua-thiet-bi-dien-tu/hero-cover.png",
  },
  {
    slug: "cac-he-mau-vat-ly",
    ten: "Các hệ màu vật lý phổ biến",
    nhom: "Màu sắc",
    so_thu_tu: 29,
    mo_ta: "Chì, than, màu nước, acrylic, sơn dầu, pastel — đặc tính và cách chọn đúng.",
    tags: ["vật-liệu", "acrylic", "sơn-dầu", "màu-nước"],
    doc_time: 12,
    thumbnail: "/img/cac-he-mau-vat-ly/thumbnail.png",
  },
  {
    slug: "phoi-canh-khi-quyen",
    ten: "Phối cảnh khí quyển",
    nhom: "Sắc độ",
    so_thu_tu: 30,
    mo_ta: "Vật càng xa càng nhạt, mờ, ngả lạnh — công cụ tạo chiều sâu cho tranh phong cảnh.",
    tags: ["atmospheric", "chiều-sâu", "sfumato"],
    doc_time: 8,
    thumbnail: "/img/phoi-canh-khi-quyen/thumbnail.jpg",
  },
  {
    slug: "shading-la-gi",
    ten: "Shading là gì?",
    nhom: "Sắc độ",
    so_thu_tu: 31,
    mo_ta: "Kỹ thuật tả khối 3D bằng sáng tối — biến đường vẽ 2D thành hình khối có thể tích.",
    tags: ["shading", "tả-khối", "sáng-tối"],
    doc_time: 12,
    thumbnail: "/img/shading-la-gi/thumbnail.png",
  },
  {
    slug: "ly-thuyet-vat-lieu",
    ten: "Lý thuyết vật liệu cơ bản",
    nhom: "Vật liệu",
    so_thu_tu: 32,
    mo_ta: "Tại sao kim loại sáng chói, vải mờ đục, kính trong suốt — chữ ký thị giác của vật liệu.",
    tags: ["vật-liệu", "material", "texture"],
    doc_time: 10,
    thumbnail: "/img/ly-thuyet-vat-lieu/thumbnail.jpg",
  },
  {
    slug: "ly-thuyet-vat-lieu-pbr",
    ten: "Lý thuyết vật liệu nâng cao (PBR)",
    nhom: "Vật liệu",
    so_thu_tu: 33,
    mo_ta:
      "Physically Based Rendering — albedo, độ nhám, kim loại và mô hình ánh sáng vật lý cho game, 3D và minh họa kỹ thuật.",
    tags: ["PBR", "vật-liệu", "roughness", "metallic", "3D"],
    doc_time: 14,
    hero_image: "/img/ly-thuyet-vat-lieu-pbr/hero-cover.png",
    thumbnail: "/img/ly-thuyet-vat-lieu-pbr/thumbnail.jpg",
  },
  {
    slug: "bo-cuc-trong-tranh",
    ten: "Bố cục trong tranh",
    nhom: "Bố cục",
    so_thu_tu: 34,
    mo_ta: "Sắp xếp yếu tố thị giác để dẫn dắt cảm xúc — từ golden ratio đến rule of thirds.",
    tags: ["bố-cục", "golden-ratio", "composition"],
    doc_time: 14,
    hero_image: "/img/bo-cuc-trong-tranh/hero-cover.png",
  },
  {
    slug: "bo-cuc-trong-thiet-ke",
    ten: "Bố cục trong thiết kế",
    nhom: "Bố cục",
    so_thu_tu: 35,
    mo_ta: "Tổ chức yếu tố thị giác để truyền đạt thông tin hiệu quả — grid, hierarchy, Bauhaus.",
    tags: ["design", "layout", "grid", "hierarchy"],
    doc_time: 14,
    hero_image: "/img/bo-cuc-trong-thiet-ke/hero-cover.png",
    thumbnail: "/img/bo-cuc-trong-thiet-ke/hero-cover.png",
  },
  {
    slug: "nghe-thuat-chu-typography",
    ten: "Nghệ thuật chữ — Typography",
    nhom: "Bố cục",
    so_thu_tu: 36,
    mo_ta:
      "Chữ như hình: macro (lưới, hierarchy) và micro (kerning, rag); modular scale, baseline; tiếng Việt & dấu; ghép font, WCAG, poster — liên hệ Cơ sở tạo hình, Điểm tập trung, Bố cục sắc độ.",
    tags: ["typography", "font", "chữ", "hierarchy"],
    doc_time: 22,
    thumbnail: "/img/nghe-thuat-chu-typography/thumbnail.png",
    hero_image: "/img/nghe-thuat-chu-typography/hero-cover.png",
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
