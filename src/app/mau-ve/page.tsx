import Link from "next/link";

export default function MauVePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
        Đề thi
      </p>
      <h1 className="mb-4 text-3xl font-bold">Mẫu vẽ hình họa</h1>
      <p className="mb-8 text-neutral-600">Trang đang được xây dựng.</p>
      <Link href="/" className="font-semibold text-rose-600 underline">
        ← Về trang chủ
      </Link>
    </div>
  );
}
