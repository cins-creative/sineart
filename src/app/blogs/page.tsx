import Link from "next/link";

/** Placeholder — SITE_STRUCTURE: /blogs */
export default function BlogsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
        Blog
      </p>
      <h1 className="mb-4 text-3xl font-bold">Blog</h1>
      <p className="mb-8 text-neutral-600">
        Trang đang được xây dựng — danh sách bài theo SITE_STRUCTURE.
      </p>
      <Link href="/" className="font-semibold text-rose-600 underline">
        ← Về trang chủ
      </Link>
    </div>
  );
}
