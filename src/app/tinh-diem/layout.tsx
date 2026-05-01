import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Tính điểm thi năng khiếu mỹ thuật 2025 — Sine Art",
  },
  description:
    "Công cụ tính điểm xét tuyển các trường mỹ thuật, kiến trúc, thiết kế tại TP.HCM. Hỗ trợ UFA, UAH, HCMUTE, TDTU, VLU, SGU.",
  alternates: { canonical: "https://sineart.vn/tinh-diem" },
};

export default function TinhDiemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
