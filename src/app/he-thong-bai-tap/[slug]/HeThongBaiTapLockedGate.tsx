import Link from "next/link";

export default function HeThongBaiTapLockedGate({
  maxBaiSoLabel,
}: {
  /** Hiển thị «Bài X» tiến độ cho phép (khi có). */
  maxBaiSoLabel: string | null;
}) {
  return (
    <article className="htbt-shell">
      <div className="htbt-gate-body">
        <div className="htbt-gate-icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <h2 className="htbt-gate-title">Bài chưa được mở</h2>
        <p className="htbt-gate-text">
          Theo tiến độ lớp của bạn, bạn chỉ có thể mở các bài tới{" "}
          {maxBaiSoLabel != null ? (
            <strong>{maxBaiSoLabel}</strong>
          ) : (
            <strong>điểm hiện tại giáo viên gán</strong>
          )}
          . Các bài phía sau sẽ mở dần khi bạn hoàn thành bài trước đó.
        </p>
        <div className="htbt-gate-actions">
          <Link href="/phong-hoc" className="htbt-gate-btn htbt-gate-btn--primary">
            Vào phòng học
          </Link>
          <Link href="/khoa-hoc" className="htbt-gate-btn">
            Khóa học
          </Link>
        </div>
      </div>
    </article>
  );
}
