"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import {
  CONTACT_EMAIL,
  PRIVACY_COPY,
  type PrivacyLang,
} from "@/app/privacy/privacy-content";

function textWithSiteLink(text: string): ReactNode {
  const token = "sineart.vn";
  if (!text.includes(token)) return text;
  const [before, after] = text.split(token);
  return (
    <>
      {before}
      <Link href="/" className="privacy-page__inline-link">
        {token}
      </Link>
      {after}
    </>
  );
}

export default function PrivacyPolicyClient() {
  const [lang, setLang] = useState<PrivacyLang>("en");
  const copy = PRIVACY_COPY[lang];

  return (
    <article className="privacy-page">
      <div className="privacy-page__glow" aria-hidden />
      <div className="privacy-page__inner">
        <header className="privacy-page__header">
          <div className="privacy-page__header-main">
            <p className="privacy-page__eyebrow">
              <span className="privacy-page__eyebrow-dot" aria-hidden />
              {copy.eyebrow}
            </p>
            <h1 className="privacy-page__title">{copy.title}</h1>
            <p className="privacy-page__updated">
              {copy.updatedLabel}: {copy.updatedDate}
            </p>
          </div>

          <div className="privacy-page__lang" role="group" aria-label={copy.langSwitchLabel}>
            <button
              type="button"
              className={[
                "privacy-page__lang-btn",
                lang === "en" && "privacy-page__lang-btn--active",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={[
                "privacy-page__lang-btn",
                lang === "vi" && "privacy-page__lang-btn--active",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={lang === "vi"}
              onClick={() => setLang("vi")}
            >
              VI
            </button>
          </div>
        </header>

        <div className="privacy-page__card">
          <p className="privacy-page__intro">{textWithSiteLink(copy.intro)}</p>

          {copy.sections.map((section) => (
            <section key={section.title} className="privacy-page__section">
              <h2>
                <span className="privacy-page__section-accent" aria-hidden />
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, pi) => (
                <p key={pi}>{textWithSiteLink(paragraph)}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item.label}>
                      <strong>{item.label}</strong>
                      {" — "}
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <p className="privacy-page__contact">
            {copy.contactPrefix}{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> {copy.contactOr}{" "}
            <Link href="/" className="privacy-page__inline-link">
              sineart.vn
            </Link>
            .
          </p>
        </div>

        <Link href="/" className="privacy-page__back">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {copy.back}
        </Link>
      </div>
    </article>
  );
}
