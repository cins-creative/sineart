"use client";

type WaitingForTeacherProps = {
  className?: string;
};

export default function WaitingForTeacher({ className }: WaitingForTeacherProps) {
  return (
    <div className={["phc-wait-teacher", className].filter(Boolean).join(" ")} role="status">
      <div className="phc-wait-teacher-pulse" aria-hidden />
      <div className="phc-wait-teacher-inner">
        <span className="phc-wait-teacher-ico" aria-hidden>
          🎨
        </span>
        <h2 className="phc-wait-teacher-title">Đang chờ giáo viên vào lớp…</h2>
        <p className="phc-wait-teacher-desc">
          Bạn đã kết nối phòng học. Video sẽ hiện tự động khi giáo viên tham gia.
        </p>
        <div className="phc-wait-teacher-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
