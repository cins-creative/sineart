import Link from "next/link";
import type { BaiTap } from "@/types/baiTap";

/** Chặn toàn bộ trang — chỉ học viên (hồ sơ trong DB khớp email) được vào xem bài tập. */
export default function HeThongBaiTapStudentOnlyGate({
  bai,
  variant,
}: {
  bai: BaiTap;
  /** Chưa đăng nhập / đã đăng nhập nhưng không phải học viên trong hệ thống */
  variant: "sign_in" | "not_student";
}) {
  const title =
    variant === "sign_in"
      ? "Đăng nhập để xem bài tập"
      : "Chỉ dành cho học viên";

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
        <h2 className="htbt-gate-title">{title}</h2>
        <p className="htbt-gate-text">
          {variant === "sign_in" ? (
            <>
              Nội dung bài tập <strong>{bai.ten_bai_tap}</strong> ({bai.mon_hoc.ten_mon_hoc}) chỉ dành cho học viên
              đã đăng nhập. Vui lòng đăng nhập tài khoản học viên qua Phòng học.
            </>
          ) : (
            <>
              Tài khoản hiện tại không khớp hồ sơ học viên trong hệ thống. Nếu bạn đang học tại Sine Art, liên hệ
              lớp hoặc văn phòng để được cập nhật email trong hồ sơ.
            </>
          )}
        </p>
        <div className="htbt-gate-actions">
          <Link href="/phong-hoc" className="htbt-gate-btn htbt-gate-btn--primary">
            {variant === "sign_in" ? "Đăng nhập — Phòng học" : "Vào Phòng học"}
          </Link>
          <Link href="/khoa-hoc" className="htbt-gate-btn">
            Khóa học
          </Link>
        </div>
      </div>
    </article>
  );
}
