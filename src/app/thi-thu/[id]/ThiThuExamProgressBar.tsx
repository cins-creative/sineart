"use client";

import type { CSSProperties } from "react";

import type { MonThiConfig } from "@/lib/thi-thu-config";

type Props = {
  cfg: MonThiConfig;
  /** 0..1 — elapsed / thoi_luong_phut */
  progress: number;
  /** Vị trí giải lao (0..1) trên trục thời gian làm bài — Hình họa */
  breakMarkerPct: number | null;
  /** Nhãn giờ giải lao, vd "12:30 - 14:00" */
  breakRangeLabel: string | null;
  showBreakAbove: boolean;
};

function markerStyle(phut: number, dur: number): CSSProperties {
  const t = dur <= 0 ? 0 : phut / dur;
  const leftPct = Math.min(100, Math.max(0, t * 100));
  if (phut <= 0) {
    return { left: 0, transform: "none", textAlign: "left" as const };
  }
  if (phut >= dur) {
    return { left: "100%", transform: "translateX(-100%)", textAlign: "right" as const };
  }
  return { left: `${leftPct}%`, transform: "translateX(-50%)", textAlign: "center" as const };
}

/**
 * Timeline theo **phút elapsed / tổng phút** — mốc đặt đúng vị trí tỷ lệ (không flex chia đều).
 * Giải lao (Hình họa): ▼ phía trên thanh tại (GL_start - T) / dur.
 */
export default function ThiThuExamProgressBar({
  cfg,
  progress,
  breakMarkerPct,
  breakRangeLabel,
  showBreakAbove,
}: Props) {
  const dur = cfg.thoi_luong_phut;
  const pct = Math.min(100, Math.max(0, progress * 100));

  const breakPctNum =
    showBreakAbove && breakMarkerPct != null && Number.isFinite(breakMarkerPct) && dur > 0
      ? Math.min(100, Math.max(0, breakMarkerPct * 100))
      : null;
  const breakLeft = breakPctNum != null ? `${breakPctNum}%` : null;
  const breakAlignClass =
    breakPctNum == null ? "" : breakPctNum <= 1 ? "tti-pb-break--start" : breakPctNum >= 99 ? "tti-pb-break--end" : "";

  return (
    <>
      <div className={`tti-pb-track-wrap${breakLeft ? " tti-pb-track-wrap--break" : ""}`}>
        {breakLeft ? (
          <div
            className={["tti-pb-break", breakAlignClass].filter(Boolean).join(" ")}
            style={{
              left: breakLeft,
            }}
          >
            <span className="tti-pb-break-tri" aria-hidden>
              ▼
            </span>
            <span className="tti-pb-break-lbl">Nghỉ giải lao</span>
            {breakRangeLabel ? (
              <span className="tti-pb-break-time">{breakRangeLabel}</span>
            ) : null}
          </div>
        ) : null}
        <div className="tti-pb-track">
          <div className="tti-pb-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="tti-pb-mkrs">
        {cfg.moc_timeline.map((m, i) => {
          const dacBiet = cfg.nhan_moc_dac_biet[m.phut];
          const isLast = m.phut >= dur;
          return (
            <div
              key={`${m.phut}-${i}`}
              className="tti-pb-mk"
              style={markerStyle(m.phut, dur)}
            >
              <span className={`tti-pb-mk-tri ${isLast ? "sp" : ""}`} aria-hidden>
                ▲
              </span>
              <span className="tti-pb-mk-lbl">{m.label}</span>
              {dacBiet ? <span className="tti-pb-mk-note">{dacBiet}</span> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
