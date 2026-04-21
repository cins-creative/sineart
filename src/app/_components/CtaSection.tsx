import Link from "next/link";

const FACEBOOK_PAGE_URL = "https://www.facebook.com/sineart0102";
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@MythuatSineArt";
const TIKTOK_PROFILE_URL = "https://www.tiktok.com/@sineart.official";

function IconMap({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 22s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h4l2 4-2.5 1.5a11 11 0 006 6L15.5 13l4 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4V6z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconYoutube({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function IconTiktok({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.82 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export default function CtaSection() {
  return (
    <footer className="site-footer" aria-label="Chân trang">
      <div className="site-footer__inner">
        <div className="sf-top">
          <div className="sf-top-text">
            <p className="sf-lead">
              Thêm thông tin về lịch học tại{" "}
              <span className="sf-brand-name">Sine Art</span>
            </p>
            <p className="sf-sub">Đăng kí nhận lộ trình luyện thi vẽ</p>
          </div>
          <div className="sf-top-actions">
            <a
              href={FACEBOOK_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sf-btn sf-btn--primary"
            >
              ĐĂNG KÝ HỌC
            </a>
            <a
              href={FACEBOOK_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sf-btn sf-btn--secondary"
            >
              ĐĂNG KÝ TƯ VẤN
            </a>
          </div>
        </div>

        <div className="sf-divider" role="separator" />

        <div className="sf-bottom">
          <div className="sf-brand-col">
            <Link href="/" className="sf-logo" aria-label="Sine Art — Trang chủ">
              <img
                src="/brand/sine-art-logo.png"
                alt="Sine Art"
                className="sf-logo-img"
                width={150}
                height={60}
                decoding="async"
                loading="lazy"
              />
            </Link>
            <p className="sf-about">
              SineArt là trung tâm luyện thi vẽ với lộ trình chi tiết cho từng ngành và từng
              trường, giúp bạn thi đậu vào ngôi trường mơ ước.
            </p>
          </div>

          <div className="sf-contact-col">
            <ul className="sf-contact-list">
              <li>
                <IconMap className="sf-icon" />
                <span>
                  67 Đ. Tân Sơn Nhì, Phường 14, Tân Phú, Thành phố Hồ Chí Minh
                </span>
              </li>
              <li>
                <IconPhone className="sf-icon" />
                <a href="tel:+84867551531">086 755 1531</a>
              </li>
              <li>
                <IconMail className="sf-icon" />
                <a href="mailto:sineart.official@gmail.com">sineart.official@gmail.com</a>
              </li>
            </ul>
            <div className="sf-social">
              <a
                href={FACEBOOK_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="sf-soc"
                aria-label="Facebook"
              >
                <IconFacebook />
              </a>
              <a
                href={YOUTUBE_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="sf-soc"
                aria-label="YouTube"
              >
                <IconYoutube />
              </a>
              <a
                href={TIKTOK_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="sf-soc"
                aria-label="TikTok"
              >
                <IconTiktok />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
