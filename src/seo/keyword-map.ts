/**
 * Bản đồ từ khóa tham chiếu (không phải route).
 * Dùng cho metadata keywords trên trang môn / mở rộng SEO địa phương.
 */

export type SubjectKeywordGroup = "HH" | "BC" | "TT" | "DG";

/** Từ khóa chính / phụ theo nhóm môn (rút gọn mã nội bộ). */
export const keywordMapBySubject: Record<
  SubjectKeywordGroup,
  { primary: string; secondary: readonly string[] }
> = {
  HH: {
    primary: "học vẽ hình họa",
    secondary: ["luyện thi hình họa tp hcm", "vẽ hình họa cơ bản"],
  },
  BC: {
    primary: "học vẽ bố cục màu",
    secondary: ["bố cục màu luyện thi", "màu sắc mỹ thuật"],
  },
  TT: {
    primary: "vẽ trang trí màu",
    secondary: ["trang trí màu tp hcm", "học vẽ trang trí"],
  },
  DG: {
    primary: "học vẽ kỹ thuật số",
    secondary: ["digital art việt nam", "vẽ máy tính tp hcm"],
  },
};

/** Trường đại học mục tiêu luyện thi — có thể gộp vào keywords trang khóa học liên quan. */
export const universityTargetKeywords = [
  "Luyện thi Đại học Kiến trúc TP.HCM",
  "Luyện thi Đại học Văn Lang",
  "Luyện thi đại học Tôn Đức Thắng",
] as const;
