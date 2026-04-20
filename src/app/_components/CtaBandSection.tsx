import Link from "next/link";

const PencilIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const STICKS = [
  { n: "2 phút", l: "để đăng ký online" },
  { n: "100%", l: "buổi học thử miễn phí" },
  { n: "8+", l: "lớp học / tuần" },
  { n: "7/7", l: "lịch linh hoạt trong tuần" },
] as const;

/**
 * CTA band gradient cuối trang — khoá chốt đăng ký học thử.
 * Style scope CSS `.cta-band` trong `sineart-home-v2.css`.
 */
export default function CtaBandSection() {
  return (
    <section className="cta-band-wrap">
      <div className="cta-band">
        <div className="cta-band-left">
          <h2 className="cta-band-title">
            Sẵn sàng bắt đầu hành trình làm{" "}
            <em>Họa sỹ công nghệ?</em>
          </h2>
          <p className="cta-band-text">
            Học thử 1 buổi miễn phí — không cần kinh nghiệm, chỉ cần giấy bút và đam mê.
          </p>
          <div className="cta-band-actions">
            <Link href="/dang-ky" className="cta-band-btn-primary">
              <PencilIcon />
              Đăng ký học thử
            </Link>
            <Link href="/khoa-hoc" className="cta-band-btn-ghost">
              Tư vấn lộ trình
            </Link>
          </div>
        </div>
        <div className="cta-band-right" aria-hidden>
          {STICKS.map((s) => (
            <div key={s.n} className="cta-stick">
              <div className="cta-stick-n">{s.n}</div>
              <div className="cta-stick-l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
