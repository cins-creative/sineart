/** Nội dung minh họa (chưa nối CMS) — giữ layout theo mock */

import type { CourseGroupId, LearnOutcome } from "@/types/khoa-hoc";

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

/**
 * Fallback cho section «Bạn sẽ học được gì» khi môn học chưa có dữ liệu
 * `ql_mon_hoc.ket_qua_dat_duoc`. Tách theo 4 nhóm `CourseGroupId`, mỗi nhóm
 * 4–8 gạch đầu dòng để match tone từng nhóm học viên.
 */
export const KD_DEFAULT_LEARN_BY_GROUP: Record<CourseGroupId, LearnOutcome[]> = {
  lthi: [
    {
      title: "Dựng hình chuẩn đề thi",
      desc: "Đo tỷ lệ, xác định trục, bố cục trang A3 theo format khối V/H.",
    },
    {
      title: "Kỹ thuật sáng – tối",
      desc: "Phân 5 sắc độ, đan nét, chuyển khối mềm đúng bài thi.",
    },
    {
      title: "Nguyên lý phối màu",
      desc: "Nóng – lạnh, tương phản, sắc xám trung gian có hệ thống.",
    },
    {
      title: "Bố cục điểm nhấn",
      desc: "Phân mảng, cân bằng, hướng nhìn dẫn vào nhân vật chính.",
    },
    {
      title: "Giải đề thực chiến",
      desc: "Làm đủ dạng đề đã ra qua các năm của trường bạn đăng ký.",
    },
    {
      title: "Quản lý thời gian thi",
      desc: "Hoàn thiện bài trong 240 phút, chia pha dựng – lên màu – chỉnh.",
    },
    {
      title: "Portfolio thi cử",
      desc: "Mỗi buổi có bài nộp, tối thiểu 20 tác phẩm đạt chuẩn.",
    },
    {
      title: "Feedback 1-1 sau buổi",
      desc: "Chấm trực tiếp từng học viên, sửa đến khi đạt yêu cầu.",
    },
  ],
  digital: [
    {
      title: "Thành thạo phần mềm",
      desc: "Photoshop / Procreate / Clip Studio — workflow từ sketch đến final.",
    },
    {
      title: "Kỹ thuật line digital",
      desc: "Pen pressure, line weight, đi nét sạch chuẩn illustrator.",
    },
    {
      title: "Rendering ánh sáng",
      desc: "Volume light, ambient, key – fill – rim light theo concept.",
    },
    {
      title: "Phối màu digital",
      desc: "Palette hài hòa, mood board, color harmony cho từng thể loại.",
    },
    {
      title: "Quy trình concept art",
      desc: "Từ ideation, thumbnail, rendering đến final render — đầy đủ pipeline.",
    },
    {
      title: "Portfolio ngành",
      desc: "6–10 tác phẩm đủ chất lượng apply studio / freelance thực tế.",
    },
  ],
  kids: [
    {
      title: "Phát triển quan sát",
      desc: "Nhìn vật thật, mô tả bằng hình — rèn tư duy thị giác từ nhỏ.",
    },
    {
      title: "Tự tin sáng tạo",
      desc: "Không sợ sai, dám thử vật liệu mới, hình thành phong cách cá nhân.",
    },
    {
      title: "Kỹ năng vận động tinh",
      desc: "Điều khiển bút, kiểm soát lực tay qua bài tập có hệ thống.",
    },
    {
      title: "Hoàn thành tác phẩm",
      desc: "Tính kiên trì qua dự án nhỏ 3–5 buổi, tự hào về kết quả.",
    },
  ],
  botro: [
    {
      title: "Nền tảng cơ bản",
      desc: "Đường nét, hình khối, phối cảnh — đủ dùng cho mọi hướng nghề.",
    },
    {
      title: "Khả năng quan sát",
      desc: "Đo đạc tỷ lệ, chuyển vật thể 3D sang hình vẽ 2D chuẩn.",
    },
    {
      title: "Kiến thức giải phẫu",
      desc: "Anatomy người và vật — phục vụ concept art, illustration.",
    },
    {
      title: "Đa dạng vật liệu",
      desc: "Chì, than, bút mực, acrylic, màu nước — mỗi chất liệu có bài riêng.",
    },
    {
      title: "Thói quen vẽ đều",
      desc: "Gắn kết đam mê qua portfolio cá nhân, sketchbook hàng ngày.",
    },
  ],
};

/** @deprecated Dùng `KD_DEFAULT_LEARN_BY_GROUP` hoặc `ketQuaDatDuoc` từ DB. */
export const KD_DEFAULT_LEARN = KD_DEFAULT_LEARN_BY_GROUP.lthi.map((it) =>
  it.desc ? `${it.title} — ${it.desc}` : it.title
);

export const KD_DANH_CHO_AI: { bold: string; text: string }[] = [
  {
    bold: "Học sinh THPT",
    text: "chuẩn bị thi các trường Mỹ thuật, Kiến trúc, Sân khấu Điện ảnh.",
  },
  {
    bold: "Người mới",
    text: "muốn xây nền tảng màu sắc có hệ thống, không học mẹo.",
  },
  {
    bold: "Hoạ sĩ số",
    text: "cần củng cố nguyên lý màu truyền thống trước khi chuyển sang Digital.",
  },
  {
    bold: "Sinh viên",
    text: "ngành thiết kế cần portfolio có chiều sâu về màu.",
  },
];
