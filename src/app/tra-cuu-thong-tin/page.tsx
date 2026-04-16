import Link from "next/link";

/** Placeholder — tra cứu / thông tin đại học */
export default function TraCuuThongTinPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
        Tra cứu
      </p>
      <h1 className="mb-4 text-3xl font-bold">Tra cứu thông tin</h1>
      <p className="mb-8 text-neutral-600">
        Trang đang được xây dựng — Bài học viên / Thông tin đại học.
      </p>
      <Link href="/" className="font-semibold text-rose-600 underline">
        ← Về trang chủ
      </Link>
    </div>
  );
}
