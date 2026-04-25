"use client";

import { useState } from "react";

import {
  DEFAULT_HOME_CONTENT,
  type VideoContent,
} from "@/lib/admin/home-content-schema";

type TabId = "online" | "offline";

type Props = {
  content?: VideoContent;
};

export default function VideoSection({ content = DEFAULT_HOME_CONTENT.video }: Props) {
  const [active, setActive] = useState<TabId>("online");
  const tabs = content.tabs.map((tab, index) => ({
    ...tab,
    id: (index === 0 ? "online" : "offline") as TabId,
  }));

  return (
    <div className="video-section">
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
      <div className="video-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`vtab${active === t.id ? " active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          className={`video-panel${active === t.id ? " active" : ""}`}
          id={`vp-${t.id}`}
        >
          <div className="video-block video-block--embed">
            <iframe
              src={`https://www.youtube.com/embed/${t.youtubeId}`}
              title={t.label}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <p className="video-caption">{t.desc}</p>
        </div>
      ))}
    </div>
  );
}
