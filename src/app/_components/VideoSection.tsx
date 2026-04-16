"use client";

import { useState } from "react";

const tabs = [
  {
    id: "online" as const,
    label: "📡 Lớp Online",
    desc: "📡 Học online qua Zoom · Tương tác trực tiếp",
    youtubeId: "U1e5S6RpXoQ",
  },
  {
    id: "offline" as const,
    label: "🏫 Lớp Offline",
    desc: "🏫 Tại cơ sở · Không gian sáng tạo thực tế",
    youtubeId: "rdtqpyKMn18",
  },
];

export default function VideoSection() {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("online");

  return (
    <div className="video-section">
      <div className="sec-label">Xem lớp học</div>
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
