export type PrivacyLang = "en" | "vi";

export type PrivacySection = {
  title: string;
  paragraphs: string[];
  bullets?: { label: string; text: string }[];
};

export type PrivacyCopy = {
  eyebrow: string;
  title: string;
  updatedLabel: string;
  updatedDate: string;
  intro: string;
  sections: PrivacySection[];
  contactPrefix: string;
  contactOr: string;
  back: string;
  langSwitchLabel: string;
};

export const PRIVACY_COPY: Record<PrivacyLang, PrivacyCopy> = {
  en: {
    eyebrow: "Sine Art Teacher",
    title: "Privacy Policy",
    updatedLabel: "Last updated",
    updatedDate: "June 13, 2026",
    intro:
      'This Privacy Policy describes how Sine Art ("we", "us", or "our") handles information when you use the Sine Art Teacher mobile app and related classroom services at sineart.vn. By using the app, you agree to the practices described below.',
    sections: [
      {
        title: "1. Information we collect",
        paragraphs: ["We collect only what is needed to run classes and support teachers:"],
        bullets: [
          {
            label: "Email address",
            text: "used to sign in and verify that you are an authorized teacher at Sine Art.",
          },
          {
            label: "Classroom chat messages",
            text: "text and images you send during live sessions.",
          },
          {
            label: "Student artwork images",
            text: "photos shared or saved in the classroom (for example, work submitted during a lesson).",
          },
          {
            label: "Basic usage data",
            text: "such as which class you join, to keep sessions secure and working correctly.",
          },
        ],
      },
      {
        title: "2. How we use your data",
        paragraphs: [
          "All data is used for internal educational purposes only — to deliver classes, review student progress, and support day-to-day operations at Sine Art. We do not use your information for advertising, and we do not sell your personal data.",
        ],
      },
      {
        title: "3. Where data is stored",
        paragraphs: [
          "Chat messages and student artwork images are stored in our secure database (Supabase), hosted for Sine Art's classroom system. Access is limited to authorized staff and teachers involved in your classes.",
        ],
      },
      {
        title: "4. Live video (LiveKit)",
        paragraphs: [
          "Live video in the online classroom is delivered through LiveKit for real-time communication between teachers and students. Video and audio streams are not recorded or stored by Sine Art. They exist only during the active session.",
        ],
      },
      {
        title: "5. Sharing with third parties",
        paragraphs: [
          "We do not share your personal data with third parties for marketing or unrelated purposes. Data stays within Sine Art's internal systems and is used solely to operate our teaching platform.",
          "Infrastructure providers (such as Supabase for storage and LiveKit for live video) process data only as needed to run the service on our behalf, under our instructions.",
        ],
      },
      {
        title: "6. Data retention & security",
        paragraphs: [
          "We keep classroom data only as long as needed for teaching and administrative purposes. We use industry-standard safeguards to protect stored information.",
        ],
      },
      {
        title: "7. Your rights & contact",
        paragraphs: [
          "If you have questions about this policy or wish to request access or deletion of your data, please contact us. We will respond in a reasonable time.",
        ],
      },
    ],
    contactPrefix: "Questions? Email",
    contactOr: "or visit",
    back: "Back to Sine Art",
    langSwitchLabel: "Language",
  },
  vi: {
    eyebrow: "Sine Art Teacher",
    title: "Chính sách quyền riêng tư",
    updatedLabel: "Cập nhật lần cuối",
    updatedDate: "13 tháng 6, 2026",
    intro:
      "Chính sách này mô tả cách Sine Art («chúng tôi») xử lý thông tin khi bạn dùng ứng dụng Sine Art Teacher và dịch vụ phòng học trực tuyến tại sineart.vn. Khi sử dụng ứng dụng, bạn đồng ý với các nội dung dưới đây.",
    sections: [
      {
        title: "1. Thông tin chúng tôi thu thập",
        paragraphs: ["Chúng tôi chỉ thu thập những gì cần thiết để vận hành lớp học và hỗ trợ giáo viên:"],
        bullets: [
          {
            label: "Email",
            text: "dùng để đăng nhập và xác minh bạn là giáo viên được ủy quyền tại Sine Art.",
          },
          {
            label: "Tin nhắn chat trong lớp",
            text: "văn bản và hình ảnh bạn gửi trong buổi học trực tuyến.",
          },
          {
            label: "Ảnh bài vẽ học viên",
            text: "hình ảnh được chia sẻ hoặc lưu trong phòng học (ví dụ bài nộp trong buổi học).",
          },
          {
            label: "Dữ liệu sử dụng cơ bản",
            text: "ví dụ lớp bạn tham gia, để giữ phiên học an toàn và hoạt động ổn định.",
          },
        ],
      },
      {
        title: "2. Cách chúng tôi sử dụng dữ liệu",
        paragraphs: [
          "Mọi dữ liệu chỉ phục vụ mục đích giáo dục nội bộ — giảng dạy, theo dõi tiến độ học viên và vận hành hằng ngày tại Sine Art. Chúng tôi không dùng thông tin của bạn cho quảng cáo và không bán dữ liệu cá nhân.",
        ],
      },
      {
        title: "3. Nơi lưu trữ dữ liệu",
        paragraphs: [
          "Tin nhắn chat và ảnh bài vẽ học viên được lưu trong cơ sở dữ liệu bảo mật (Supabase) của hệ thống phòng học Sine Art. Chỉ nhân sự và giáo viên được ủy quyền liên quan đến lớp mới có quyền truy cập.",
        ],
      },
      {
        title: "4. Video trực tiếp (LiveKit)",
        paragraphs: [
          "Video trong phòng học trực tuyến được truyền qua LiveKit để giáo viên và học viên giao tiếp thời gian thực. Sine Art không ghi hình và không lưu trữ luồng video hoặc âm thanh — chúng chỉ tồn tại trong suốt phiên học đang diễn ra.",
        ],
      },
      {
        title: "5. Chia sẻ với bên thứ ba",
        paragraphs: [
          "Chúng tôi không chia sẻ dữ liệu cá nhân của bạn với bên thứ ba cho mục đích quảng cáo hoặc không liên quan. Dữ liệu nằm trong hệ thống nội bộ của Sine Art và chỉ dùng để vận hành nền tảng giảng dạy.",
          "Các nhà cung cấp hạ tầng (như Supabase cho lưu trữ và LiveKit cho video trực tiếp) chỉ xử lý dữ liệu khi cần thiết để chạy dịch vụ thay mặt chúng tôi, theo hướng dẫn của Sine Art.",
        ],
      },
      {
        title: "6. Lưu giữ & bảo mật",
        paragraphs: [
          "Chúng tôi giữ dữ liệu lớp học chỉ trong thời gian cần cho giảng dạy và quản lý. Chúng tôi áp dụng các biện pháp bảo vệ theo tiêu chuẩn ngành để bảo vệ thông tin được lưu trữ.",
        ],
      },
      {
        title: "7. Quyền của bạn & liên hệ",
        paragraphs: [
          "Nếu bạn có câu hỏi về chính sách này hoặc muốn yêu cầu truy cập / xóa dữ liệu, vui lòng liên hệ với chúng tôi. Chúng tôi sẽ phản hồi trong thời gian hợp lý.",
        ],
      },
    ],
    contactPrefix: "Có thắc mắc? Gửi email",
    contactOr: "hoặc truy cập",
    back: "Về trang Sine Art",
    langSwitchLabel: "Ngôn ngữ",
  },
};

export const CONTACT_EMAIL = "sineart.official@gmail.com";
