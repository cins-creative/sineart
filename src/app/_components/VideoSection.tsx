"use client";

import { useState } from "react";

const tabs = [
  {
    id: "online" as const,
    label: "📡 Lớp Online",
    desc: "📡 Học qua website chính thức của Sine Art hoặc Google Meet",
    youtubeId: "6LKT_E8XGu0",
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
      <div className="sec-head sec-head--align-start">
        <div className="sec-head-left">
          <div className="sec-label">Học thử · Xem trực tiếp</div>
          <h2 className="sec-title">
            Online hay Offline — <em>liệu có hiệu quả?</em>
          </h2>
          <p className="sec-sub">
            Sine Art có 2 hình thức học với giáo trình giống hệt nhau. Xem video giới thiệu từng
            lớp để chọn cách học phù hợp với bạn.
          </p>
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
