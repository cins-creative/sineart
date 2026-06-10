"use client";

import { Clock, Edit2, Monitor } from "lucide-react";

import { YouTubeFacade } from "@/components/YouTubeFacade";

type Props = {
  youtubeId: string;
  sectionLabel: string;
  titleEmphasis: string;
  subtitle: string;
};

export function HomeMockupVideo({ youtubeId, sectionLabel, titleEmphasis, subtitle }: Props) {
  return (
    <section className="section">
      <div className="wrap video-grid">
        <div className="video-frame">
          <YouTubeFacade
            videoId={youtubeId}
            title="Video phương pháp học online Sine Art"
            fillContainer
          />
        </div>
        <div>
          <span className="eyebrow">{sectionLabel}</span>
          <h2 style={{ fontSize: 34, margin: "14px 0 8px" }}>
            Vẽ online vẫn được <span className="grad-text">{titleEmphasis}</span>
          </h2>
          <p style={{ color: "var(--ink-60)", fontSize: 16 }}>{subtitle}</p>
          <ul className="video-feats">
            <li>
              <div className="ic">
                <Monitor className="feather" aria-hidden />
              </div>
              <div>
                <b>Thấy bài real-time</b>
                <p>Giáo viên xem trực tiếp bài của bạn qua camera/iPad, sửa ngay trên màn hình.</p>
              </div>
            </li>
            <li>
              <div className="ic">
                <Edit2 className="feather" aria-hidden />
              </div>
              <div>
                <b>Chấm 1-1 từng lỗi sai</b>
                <p>Mỗi học viên được sửa theo đúng lỗi của mình, sĩ số vừa đủ.</p>
              </div>
            </li>
            <li>
              <div className="ic">
                <Clock className="feather" aria-hidden />
              </div>
              <div>
                <b>Sửa bài ngoài giờ</b>
                <p>Nộp bài tập, được feedback thêm để đẩy nhanh tiến độ.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
