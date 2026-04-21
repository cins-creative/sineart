import Link from "next/link";

/** Dot check dùng cho eyebrow — gradient ball trắng tick. */
const CheckIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M5 12l5 5L20 7" />
  </svg>
);

const PencilIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BookIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function HeroSection() {
  return (
    <section className="hero">
      <span className="hero-blob hero-blob--1" aria-hidden />
      <span className="hero-blob hero-blob--2" aria-hidden />
      <span className="hero-blob hero-blob--3" aria-hidden />
      <span className="hero-blob hero-blob--4" aria-hidden />

      <div className="hero-grid">
        <div className="hero-copy-col">
          <p className="hero-eyebrow">
            <span className="hero-eyebrow-dot">
              <CheckIcon />
            </span>
            Giáo trình khoa học · Từ 2015
          </p>
          <h1 className="hero-headline">
            Dành cho <em>Họa sỹ</em>
            <br />
            <span className="hero-underline">công nghệ</span>.
          </h1>
          <p className="hero-lead">
            Sine Art xây dựng nền tảng Mỹ thuật <b>bài bản và khoa học</b>, giúp các bạn đủ
            kiến thức để trở thành Họa sỹ công nghệ trong Hoạt hình, Phim và Game.
          </p>
          <div className="hero-actions">
            <Link href="/dang-ky" className="btn-p">
              <PencilIcon />
              Học thử miễn phí
            </Link>
            <Link href="/khoa-hoc" className="btn-g">
              <BookIcon />
              Xem khoá học
            </Link>
          </div>

          <div className="hero-trust">
            <div className="hero-trust-avs" aria-hidden>
              <div
                className="av"
                style={{ background: "linear-gradient(135deg,#f8a668,#ee5b9f)" }}
              >
                LP
              </div>
              <div
                className="av"
                style={{
                  background: "linear-gradient(135deg,#fde859,#f8a668)",
                  color: "#5a4a00",
                }}
              >
                MT
              </div>
              <div
                className="av"
                style={{
                  background: "linear-gradient(135deg,#6efec0,#3dc9a3)",
                  color: "#0a4a34",
                }}
              >
                TH
              </div>
              <div
                className="av"
                style={{ background: "linear-gradient(135deg,#bb89f8,#8a5fd8)" }}
              >
                QA
              </div>
              <div className="av more">+</div>
            </div>
            <div className="hero-trust-text">
              <div>
                <span className="stars">★★★★★</span> <b>4.9/5</b> · Google Reviews
              </div>
              <div>
                Được <b>350+ học viên</b> tin tưởng
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden>
          <div className="hero-card hero-card--top" />
          <div className="hero-card hero-card--bottom" />
          <div className="hero-card hero-card--main" />
          <div className="hero-sticker hero-sticker--1">
            <span className="hero-sticker-emoji">🎨</span>
            <span className="hero-sticker-txt">
              Hình họa
              <span className="hero-sticker-sub">Lớp mới · T5</span>
            </span>
          </div>
          <div className="hero-sticker hero-sticker--2">
            <span className="hero-sticker-emoji">✨</span>
            <span className="hero-sticker-txt">
              Digital Art
              <span className="hero-sticker-sub">Procreate</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
