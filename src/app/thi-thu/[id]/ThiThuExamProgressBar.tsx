"use client";

import type { CSSProperties } from "react";

import type { MonThiConfig } from "@/lib/thi-thu-config";

type Props = {
  cfg: MonThiConfig;
  /** 0..1 — elapsed / thoi_luong_phut */
  progress: number;
  /** Vị trí giải lao (0..1) — Hình họa */
  breakMarkerPct: number | null;
  breakRangeLabel: string | null;
  showBreakAbove: boolean;
  /** Bấm cụm “Nộp bài …” (mốc kết) để mở modal — không cần chờ giờ nộp */
  onTerminalClick?: () => void;
};

function markerStyle(phut: number, dur: number): CSSProperties {
  const t = dur <= 0 ? 0 : phut / dur;
  const leftPct = Math.min(100, Math.max(0, t * 100));
  if (phut <= 0) {
    return { left: 0, transform: "none", textAlign: "left" as const };
  }
  if (phut >= dur) {
    return { right: 0, left: "auto", transform: "none", textAlign: "right" as const };
  }
  return { left: `${leftPct}%`, transform: "translateX(-50%)", textAlign: "center" as const };
}

function terminalMilestone(cfg: MonThiConfig): { phut: number; label: string; note: string } | null {
  const dur = cfg.thoi_luong_phut;
  const last = [...cfg.moc_timeline].reverse().find((m) => m.phut >= dur);
  if (!last) return null;
  const note = cfg.nhan_moc_dac_biet[last.phut];
  if (!note) return null;
  return { phut: last.phut, label: last.label, note };
}

/**
 * Timeline theo tỷ lệ phút. Nhãn nộp bài tại mốc **kết** (phút = tổng) hiển thị **căn giữa** dưới hàng mốc để không lệch mép phải.
 */
export default function ThiThuExamProgressBar({
  cfg,
  progress,
  breakMarkerPct,
  breakRangeLabel,
  showBreakAbove,
  onTerminalClick,
}: Props) {
  const dur = cfg.thoi_luong_phut;
  const pct = Math.min(100, Math.max(0, progress * 100));
  const terminal = terminalMilestone(cfg);

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
            style={{ left: breakLeft }}
          >
            <span className="tti-pb-break-tri" aria-hidden>
              ▼
            </span>
            <span className="tti-pb-break-lbl">Nghỉ giải lao</span>
            {breakRangeLabel ? <span className="tti-pb-break-time">{breakRangeLabel}</span> : null}
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
          const hideInlineNote = Boolean(isLast && dacBiet && terminal && m.phut === terminal.phut);
          return (
            <div
              key={`${m.phut}-${i}`}
              className={["tti-pb-mk", isLast ? "tti-pb-mk--last" : ""].filter(Boolean).join(" ")}
              style={markerStyle(m.phut, dur)}
            >
              <span className={`tti-pb-mk-tri ${isLast ? "sp" : ""}`} aria-hidden>
                ▲
              </span>
              <span className="tti-pb-mk-lbl">{m.label}</span>
              {dacBiet && !hideInlineNote ? <span className="tti-pb-mk-note">{dacBiet}</span> : null}
            </div>
          );
        })}
      </div>
      {terminal ? (
        <div className="tti-pb-terminal">
          {onTerminalClick ? (
            <button
              type="button"
              className="tti-pb-terminal-inner tti-pb-terminal-btn"
              onClick={onTerminalClick}
            >
              {terminal.note}
            </button>
          ) : (
            <span className="tti-pb-terminal-inner" role="status">
              {terminal.note}
            </span>
          )}
        </div>
      ) : null}
    </>
  );
}
