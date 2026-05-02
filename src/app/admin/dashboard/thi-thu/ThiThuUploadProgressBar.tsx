"use client";

/** Thanh tiến trình gửi file (XHR upload progress). */
export default function ThiThuUploadProgressBar({
  pct,
  caption,
  fullWidth,
  indeterminate,
}: {
  pct: number;
  caption?: string;
  /** Chiếm full khối cha (vùng ảnh đề). */
  fullWidth?: boolean;
  /** Chưa có byte progress (vd. đang bắt tay TLS) — hiện thanh chạy. */
  indeterminate?: boolean;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)));
  const showIndeterminate = Boolean(indeterminate && safe < 5);
  return (
    <div className={`tti-upload-progress-wrap ${fullWidth ? "tti-upload-progress-wrap--full" : ""}`}>
      <div
        className="tti-upload-progress-track"
        role="progressbar"
        aria-valuenow={showIndeterminate ? undefined : safe}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`tti-upload-progress-fill ${showIndeterminate ? "is-indeterminate" : ""}`}
          style={showIndeterminate ? undefined : { width: `${safe}%` }}
        />
      </div>
      <div className="tti-upload-progress-meta">
        {caption ? <span>{caption}</span> : null}
        <span className="tti-upload-progress-pct">{safe}%</span>
      </div>
    </div>
  );
}
