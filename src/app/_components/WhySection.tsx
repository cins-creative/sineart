/**
 * "Ba trụ cột" — 3 card giải thích vì sao chọn Sine Art.
 * Static — không cần data từ server; tokens trong `sineart-home-v2.css`.
 */
import type { ReactElement } from "react";

const BookIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UsersIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.9" />
  </svg>
);

const PulseIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <polyline
      points="22 12 18 12 15 21 9 3 6 12 2 12"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type Pillar = {
  id: "c1" | "c2" | "c3";
  num: string;
  title: string;
  text: string;
  Icon: () => ReactElement;
};

const PILLARS: Pillar[] = [
  {
    id: "c1",
    num: "01",
    title: "Giáo trình khoa học",
    text: "Từ hình họa cơ bản đến digital painting chuyên sâu — 6 cấp độ được thiết kế bài bản theo chuẩn ĐH Mỹ thuật Công nghiệp & SKĐA.",
    Icon: BookIcon,
  },
  {
    id: "c2",
    num: "02",
    title: "Giáo viên đồng hành",
    text: "Lớp nhỏ tối đa 12 học viên. Giáo viên đi từ đầu đến cuối — chấm bài chi tiết, sửa từng nét, hỗ trợ cả khi bạn về nhà.",
    Icon: UsersIcon,
  },
  {
    id: "c3",
    num: "03",
    title: "Hướng nghiệp thực chiến",
    text: "Kết nối với studio Hoạt hình, Game và Phim hàng đầu Việt Nam. Bạn ra trường với portfolio thật, kỹ năng thật, việc làm thật.",
    Icon: PulseIcon,
  },
];

export default function WhySection() {
  return (
    <section className="why-section">
      <div className="sec-head sec-head--align-start">
        <div className="sec-head-left">
          <div className="sec-label">Vì sao chọn Sine Art</div>
          <h2 className="sec-title">
            Ba trụ cột làm nên một <em>Họa sỹ công nghệ</em>
          </h2>
          <p className="sec-sub">
            Chúng tôi không dạy mẹo — chúng tôi xây nền móng. Mỗi học viên đi qua cùng một
            hành trình đã được kiểm chứng.
          </p>
        </div>
      </div>

      <div className="why-grid">
        {PILLARS.map(({ id, num, title, text, Icon }) => (
          <article key={id} className={`why-card why-card--${id}`}>
            <div className="why-num" aria-hidden>
              {num}
            </div>
            <div className="why-icon" aria-hidden>
              <Icon />
            </div>
            <h3 className="why-title">{title}</h3>
            <p className="why-text">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
