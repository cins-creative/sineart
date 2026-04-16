/** Nội dung minh họa (chưa nối CMS) — giữ layout theo mock */

export type KdLesson = {
  num: string;
  name: string;
  badge: "req" | "opt" | "prac";
  dur: string;
  star?: boolean;
};

export type KdChapter = { title: string; lessons: KdLesson[] };

export type KdCurriculumTab = { id: string; label: string; chapters: KdChapter[] };

export const KD_CURRICULUM: KdCurriculumTab[] = [
  {
    id: "hinh-hoa",
    label: "✏️ Hình họa",
    chapters: [
      {
        title: "Kiến thức dựng hình · 5 bài",
        lessons: [
          { num: "1", name: "Nhập môn Hình họa — tổng quan môn học", badge: "prac", dur: "1 buổi" },
          { num: "2", name: "Phối cảnh khối hộp vuông", badge: "req", dur: "1 buổi" },
          { num: "3", name: "Phân tích cấu trúc và tiết diện vật thể", badge: "req", dur: "1 buổi" },
          { num: "4", name: "Phân tích hướng sáng & bóng đổ", badge: "opt", dur: "1 buổi" },
          { num: "5", name: "Kỹ thuật đan nét và sắc độ", badge: "prac", dur: "1 buổi" },
        ],
      },
      {
        title: "Giải đề mẫu thi đại học · 3 đề",
        lessons: [
          { num: "★", name: "Tượng tròn — phân tích và vẽ full", badge: "req", dur: "Giải đề", star: true },
          { num: "★", name: "Chân dung người thật", badge: "req", dur: "Giải đề", star: true },
          { num: "★", name: "Toàn thân người mẫu", badge: "req", dur: "Giải đề", star: true },
        ],
      },
    ],
  },
  {
    id: "trang-tri",
    label: "🎨 Trang trí màu",
    chapters: [
      {
        title: "Lý thuyết màu sắc · 4 bài",
        lessons: [
          { num: "1", name: "Vòng tròn màu và màu bổ túc", badge: "req", dur: "1 buổi" },
          { num: "2", name: "Phối màu nóng lạnh", badge: "req", dur: "1 buổi" },
          { num: "3", name: "Độ bão hoà và giá trị màu", badge: "opt", dur: "1 buổi" },
          { num: "4", name: "Màu chủ đạo và điểm nhấn", badge: "req", dur: "1 buổi" },
        ],
      },
      {
        title: "Thực hành & giải đề · 3 bài",
        lessons: [
          { num: "★", name: "Trang trí đối xứng", badge: "req", dur: "Thực hành", star: true },
          { num: "★", name: "Bố cục tự do chủ đề ngày lễ", badge: "req", dur: "Thực hành", star: true },
          { num: "★", name: "Giải đề thi mẫu khối H", badge: "req", dur: "Giải đề", star: true },
        ],
      },
    ],
  },
  {
    id: "bo-cuc",
    label: "🖼️ Bố cục màu",
    chapters: [
      {
        title: "Nguyên lý bố cục · 4 bài",
        lessons: [
          { num: "1", name: "Luật xa gần và không gian tranh", badge: "req", dur: "1 buổi" },
          { num: "2", name: "Nhân vật trong tranh sinh hoạt", badge: "req", dur: "1 buổi" },
          { num: "3", name: "Phân tích đề mẫu bố cục cũ", badge: "opt", dur: "1 buổi" },
          { num: "4", name: "Cảm xúc và ý đồ sáng tác", badge: "req", dur: "1 buổi" },
        ],
      },
      {
        title: "Bài thi thực hành · 2 đề",
        lessons: [
          { num: "★", name: "Tranh sinh hoạt chủ đề lao động", badge: "req", dur: "Giải đề", star: true },
          { num: "★", name: "Tranh phong cảnh có nhân vật", badge: "req", dur: "Giải đề", star: true },
        ],
      },
    ],
  },
];

export const KD_FAQ = [
  {
    q: "Khóa học có phù hợp nếu em chưa có nền tảng?",
    a: "Chương trình có lộ trình từ cơ bản đến luyện đề. Giáo viên theo sát từng học viên trong buổi học tại lớp.",
  },
  {
    q: "Có học online không?",
    a: "Một số môn hỗ trợ học online kết hợp; chi tiết lịch và hình thức sẽ được tư vấn khi đăng ký.",
  },
  {
    q: "Đăng ký như thế nào?",
    a: "Bạn có thể nhấn Đăng ký học hoặc liên hệ hotline / fanpage Sine Art để được hướng dẫn chọn lớp phù hợp.",
  },
];

export const KD_TEACHERS = [
  { initials: "AT", name: "Anh Thư", role: "7 năm kinh nghiệm", tag: "Hình họa" },
  { initials: "MH", name: "Minh Hiếu", role: "5 năm kinh nghiệm", tag: "Trang trí màu" },
  { initials: "LH", name: "Lan Hương", role: "6 năm kinh nghiệm", tag: "Bố cục màu" },
  { initials: "TK", name: "Thành Khoa", role: "4 năm kinh nghiệm", tag: "Hình họa" },
];

export const KD_REVIEWS = [
  {
    initials: "NM",
    name: "Ngọc Mai",
    text: "Lớp có lộ trình rõ ràng, thầy cô chữa bài kỹ. Em tiến bộ rõ sau 2 tháng.",
  },
  {
    initials: "PQ",
    name: "Phú Quý",
    text: "Không khí lớp thoải mái, được luyện đề sát format thi ĐH.",
  },
];

export const KD_THREE_SUBJECTS = [
  {
    icon: "✏️",
    name: "Hình họa",
    desc: "Nền tảng tả thực, tỷ lệ và hình khối — phù hợp tiêu chuẩn đề thi khối V.",
  },
  {
    icon: "🎨",
    name: "Trang trí màu",
    desc: "Hoa văn, họa tiết và phối màu theo nguyên tắc thẩm mỹ khối H.",
  },
  {
    icon: "🖼️",
    name: "Bố cục màu",
    desc: "Sắp xếp nhân vật và hình ảnh trong tranh sinh hoạt, phong cảnh.",
  },
];

/** Lớp đang mở — minh họa (có thể nối `ql_lop_hoc` sau) */
export type KdOngoingClassStatus = "open" | "almost" | "full";

export type KdOngoingClassCard = {
  id: string;
  title: string;
  /** Tên GV, hiển thị sau "GV: " */
  gvNames: string;
  /** Tên chi nhánh từ `hr_ban.ten_ban` */
  branchLabel?: string;
  status: KdOngoingClassStatus;
  lich: string;
  gio: string;
  filled: number;
  total: number;
};

export const KD_ONGOING_CLASSES: KdOngoingClassCard[] = [
  {
    id: "cap-toc-sang",
    title: "Lớp Cấp tốc sáng",
    gvNames: "Anh Thư · Minh Hiếu",
    status: "open",
    lich: "T3, T5, T7",
    gio: "8:00–11:30",
    filled: 12,
    total: 20,
  },
  {
    id: "cap-toc-chieu",
    title: "Lớp Cấp tốc chiều",
    gvNames: "Thành Khoa · Lan Hương",
    status: "almost",
    lich: "T2, T4, T6",
    gio: "14:00–17:30",
    filled: 17,
    total: 20,
  },
  {
    id: "cap-toc-toi",
    title: "Lớp Cấp tốc tối",
    gvNames: "Anh Thư · Lan Hương",
    status: "full",
    lich: "T3–CN",
    gio: "18:30–21:30",
    filled: 20,
    total: 20,
  },
];

export const KD_DEFAULT_LEARN = [
  "Nắm vững kỹ thuật vẽ theo đúng tiêu chuẩn đề thi",
  "Phối màu và bố cục theo nguyên tắc thẩm mỹ",
  "Luyện tập theo format và thời gian quy định",
  "Nhận xét và chỉnh sửa bài cùng giáo viên tại lớp",
  "Truy cập tài liệu và bài giảng của chương trình",
  "Theo dõi tiến độ qua từng buổi học",
];
