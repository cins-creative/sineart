import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thi thử — Sine Art",
  description:
    "Ôn luyện và thi thử kiến thức mỹ thuật — khu vực đang được mở rộng tại Sine Art.",
  alternates: { canonical: "https://sineart.vn/thi-thu" },
};

export default function ThiThuPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
        Đề thi
      </p>
      <h1 className="mb-4 text-3xl font-bold">Thi thử</h1>
      <p className="mb-8 text-neutral-600">Trang đang được xây dựng.</p>
      <Link href="/" className="font-semibold text-rose-600 underline">
        ← Về trang chủ
      </Link>
    </div>
  );
}
