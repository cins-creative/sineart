/**
 * "Ba trụ cột" — 3 card giải thích vì sao chọn Sine Art.
 * Nội dung lấy từ dashboard admin; fallback giữ nguyên bản gốc.
 */
import type { ReactElement } from "react";

import {
  DEFAULT_HOME_CONTENT,
  type WhyContent,
  type WhyPillarIconKey,
} from "@/lib/admin/home-content-schema";

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

const ICONS: Record<WhyPillarIconKey, () => ReactElement> = {
  book: BookIcon,
  users: UsersIcon,
  pulse: PulseIcon,
};

type Props = {
  content?: WhyContent;
};

function buildPillars(content: WhyContent): Pillar[] {
  return content.pillars.map((p, index) => ({
    id: `c${index + 1}` as Pillar["id"],
    num: p.num,
    title: p.title,
    text: p.text,
    Icon: ICONS[p.iconKey],
  }));
}

export default function WhySection({ content = DEFAULT_HOME_CONTENT.why }: Props) {
  const pillars = buildPillars(content);

  return (
    <section className="why-section">
      <div className="sec-head sec-head--align-start">
        <div className="sec-head-left">
          <div className="sec-label">{content.sectionLabel}</div>
          <h2 className="sec-title">
            {content.titleBefore}
            <em>{content.titleEmphasis}</em>
            {content.titleAfter}
          </h2>
          <p className="sec-sub">{content.subtitle}</p>
        </div>
      </div>

      <div className="why-grid">
        {pillars.map(({ id, num, title, text, Icon }) => (
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
