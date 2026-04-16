import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-cover" aria-hidden="true" />
      <div className="hero-ov" />
      <div className="hero-body">
        <p className="hero-eyebrow">Giáo trình khoa học</p>
        <h1 className="hero-headline">
          Dành cho <em>Họa sỹ công nghệ</em>
        </h1>
        <p className="hero-lead">
          Sứ mệnh của Sine Art xây dựng Kiến thức Mỹ thuật một cách bài bản và khoa học, giúp các
          bạn có đầy đủ kiến thức để trở thành Họa sỹ công nghệ trong lĩnh vực Hoạt hình, Phim và
          Game trong tương lai.
        </p>
        <div className="hero-actions">
          <Link href="/dang-ky" className="btn-p">
            🎨 Học thử miễn phí
          </Link>
          <Link href="/#khoa-hoc" className="btn-g">
            Xem khoá học
          </Link>
        </div>
      </div>
    </section>
  );
}
