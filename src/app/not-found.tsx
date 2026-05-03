import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trang không tìm thấy",
  robots: { index: false, follow: true },
};

/**
 * Trang 404 toàn site — Next.js gọi khi `notFound()` hoặc URL không khớp route.
 */
export default function NotFound() {
  return (
    <main
      className="sa-root"
      style={{
        minHeight: "min(72vh, 720px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="page-inner"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "48px 20px 64px",
          gap: 14,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink2)",
          }}
        >
          Lỗi 404
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(1.45rem, 4vw, 2rem)",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
          }}
        >
          Trang không tìm thấy
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ink2)",
            maxWidth: 440,
            lineHeight: 1.55,
          }}
        >
          Đường dẫn không tồn tại hoặc đã được đổi. Bạn có thể quay về trang chủ Sine Art.
        </p>
        <Link href="/" className="btn-p" style={{ marginTop: 10 }}>
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
