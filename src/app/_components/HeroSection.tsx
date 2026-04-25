import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import {
  DEFAULT_HOME_CONTENT,
  type HeroCardImage,
  type HeroContent,
} from "@/lib/admin/home-content-schema";

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

type Props = {
  content?: HeroContent;
};

function cardImageStyle(card: HeroCardImage): CSSProperties | undefined {
  return card.imageUrl ? { backgroundImage: `url("${card.imageUrl}")` } : undefined;
}

function HeroImageCard({
  className,
  card,
  eager,
  sizes,
}: {
  className: string;
  card: HeroCardImage;
  eager?: boolean;
  sizes: string;
}) {
  return (
    <div className={className} style={cardImageStyle(card)}>
      {card.imageUrl ? (
        <Image
          src={card.imageUrl}
          alt={card.alt}
          fill
          sizes={sizes}
          className="hero-card-img"
          loading={eager ? "eager" : undefined}
          unoptimized
        />
      ) : null}
    </div>
  );
}

export default function HeroSection({ content = DEFAULT_HOME_CONTENT.hero }: Props) {
  const [stickerOne, stickerTwo] = content.stickers;

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
            {content.eyebrow}
          </p>
          <h1 className="hero-headline">
            {content.headlineBefore}
            <em>{content.headlineEmphasis}</em>
            <br />
            <span className="hero-underline">{content.headlineAfter}</span>
            {content.headlineSuffix}
          </h1>
          <p className="hero-lead">{content.lead}</p>
          <div className="hero-actions">
            <Link href={content.ctaPrimary.href} className="btn-p">
              <PencilIcon />
              {content.ctaPrimary.label}
            </Link>
            <Link href={content.ctaGhost.href} className="btn-g">
              <BookIcon />
              {content.ctaGhost.label}
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
                <span className="stars">★★★★★</span> <b>{content.ratingScore}</b> ·{" "}
                {content.ratingSource}
              </div>
              <div>
                Được <b>{content.studentsTrust}</b> tin tưởng
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <HeroImageCard
            className="hero-card hero-card--top"
            card={content.cards.top}
            sizes="(max-width: 860px) 32vw, 180px"
          />
          <HeroImageCard
            className="hero-card hero-card--bottom"
            card={content.cards.bottom}
            sizes="(max-width: 860px) 34vw, 190px"
          />
          <HeroImageCard
            className="hero-card hero-card--main"
            card={content.cards.main}
            eager
            sizes="(max-width: 860px) 82vw, 460px"
          />
          <div className="hero-sticker hero-sticker--1">
            <span className="hero-sticker-emoji">{stickerOne.emoji}</span>
            <span className="hero-sticker-txt">
              {stickerOne.title}
              <span className="hero-sticker-sub">{stickerOne.sub}</span>
            </span>
          </div>
          <div className="hero-sticker hero-sticker--2">
            <span className="hero-sticker-emoji">{stickerTwo.emoji}</span>
            <span className="hero-sticker-txt">
              {stickerTwo.title}
              <span className="hero-sticker-sub">{stickerTwo.sub}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
