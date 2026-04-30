import Link from "next/link";

export default function ThiThuFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="tti-ft">
      <div className="tti-ft-l">
        <div className="tti-ft-dot" aria-hidden />
        <span className="tti-ft-name">Sine Art</span>
      </div>
      <p>
        © {year} Sine Art — Trường mỹ thuật ứng dụng tại TP.HCM
      </p>
      <div className="tti-ft-r">
        <Link href="/">Trang chủ</Link>
        <a href="https://www.facebook.com/sineart.vn" target="_blank" rel="noreferrer">
          Liên hệ
        </a>
      </div>
    </footer>
  );
}
