"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";
import { useEffect, useState } from "react";

import type { HeroTrustAvatar } from "@/app/_components/HeroSection";
import type { HomeMockupSlide } from "@/lib/data/home-mockup";
import { nextImageShouldUnoptimize } from "@/lib/nextImageRemote";
import { reviewInitials } from "@/lib/review-initials";
import { SITE_GOOGLE_MAPS_URL } from "@/lib/seo/site-jsonld";

type Props = {
  badge: string;
  headlineEmphasis: string;
  subPill: string;
  subSchools: string;
  lead: string;
  ctaPrimary: { label: string; href: string };
  ctaGhost: { label: string; href: string };
  studentsLabel: string;
  trustAvatars: HeroTrustAvatar[];
  trustAvatarOverflow: number;
  slides: HomeMockupSlide[];
};

function formatTrustMoreLabel(extra: number): string {
  if (extra <= 0) return "";
  return `+${Math.min(99, extra)}`;
}

export function HomeMockupHero({
  badge,
  headlineEmphasis,
  subPill,
  subSchools,
  lead,
  ctaPrimary,
  ctaGhost,
  studentsLabel,
  trustAvatars,
  trustAvatarOverflow,
  slides,
}: Props) {
  const trustMoreLabel = formatTrustMoreLabel(trustAvatarOverflow);
  const [cur, setCur] = useState(0);
  const total = slides.length;

  useEffect(() => {
    if (total <= 1) return;
    const id = window.setInterval(() => {
      setCur((n) => (n + 1) % total);
    }, 4200);
    return () => window.clearInterval(id);
  }, [total]);

  return (
    <header className="hero">
      <div className="wrap hero-grid">
        <div className="hero-text">
          <a
            className="hero-badge"
            href={SITE_GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Xem đánh giá Sine Art trên Google Maps (mở tab mới)"
          >
            <span className="star" aria-hidden>
              ★
            </span>{" "}
            {badge}
          </a>
          <h1>
            Dành cho <span className="grad-text">{headlineEmphasis}</span> tương lai
          </h1>
          <p className="sub">
            Giáo trình bài bản từ 2020 — <span className="pill">{subPill}</span> {subSchools}
          </p>
          <p className="lead">{lead}</p>
          <div className="hero-actions">
            <Link
              href={ctaPrimary.href}
              className="btn btn-primary"
              target={ctaPrimary.href.startsWith("http") ? "_blank" : undefined}
              rel={ctaPrimary.href.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {ctaPrimary.label} <ArrowRight className="feather" aria-hidden />
            </Link>
            <Link href={ctaGhost.href} className="btn btn-ghost">
              {ctaGhost.label}
            </Link>
          </div>
          <div className="hero-proof">
            <div className="proof-avatars" aria-hidden>
              {trustAvatars.slice(0, 4).map((r) => {
                const avatarUrl = r.avatarUrl?.trim();
                return (
                  <span
                    key={String(r.id)}
                    className={avatarUrl ? "proof-av--face" : undefined}
                    style={{ background: r.grad }}
                    title={r.name}
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt=""
                        width={38}
                        height={38}
                        className="proof-av-img"
                        loading="lazy"
                        decoding="async"
                        unoptimized={nextImageShouldUnoptimize(avatarUrl)}
                      />
                    ) : (
                      reviewInitials(r.name)
                    )}
                  </span>
                );
              })}
              {trustMoreLabel ? <span className="proof-av-more">{trustMoreLabel}</span> : null}
            </div>
            <div className="proof-text">
              <b>{studentsLabel}</b> đã và đang theo học từ 2020 đến nay
            </div>
          </div>
        </div>

        <div className="cover">
          <div className="carousel">
            <div className="slides" style={{ transform: `translateX(-${cur * 100}%)` }}>
              {slides.map((s) => (
                <div
                  key={s.id}
                  className="slide"
                  style={{
                    background: s.imageUrl
                      ? `linear-gradient(160deg,rgba(45,32,32,.35),rgba(45,32,32,.15)), url(${s.imageUrl}) center/cover no-repeat`
                      : s.bg,
                  }}
                >
                  <span className="slide-tag">
                    <span className="ti" style={{ background: s.tagColor }} aria-hidden />
                    {s.tag}
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                className={i === cur ? "active" : undefined}
                onClick={() => setCur(i)}
              />
            ))}
          </div>
          <div className="cover-float">
            <div className="ic">
              <Award className="feather" aria-hidden />
            </div>
            <div>
              <b>Chuẩn ĐH Mỹ thuật</b>
              <span>& Kiến trúc TP.HCM</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
