"use client";

type PhongHocMeetTabProps = {
  isTeacher: boolean;
  gmeetFormOpen: boolean;
  gmeetInput: string;
  gmeetSaving: boolean;
  gmeetJustSaved: boolean;
  gmeetRowReady: boolean;
  googleMeetUrl: string | null;
  studentMeetUrl: string | null;
  onGmeetInputChange: (value: string) => void;
  onOpenGmeetForm: () => void;
  onCloseGmeetForm: () => void;
  onSaveGmeet: () => void;
  onClearGmeet: () => void;
};

export default function PhongHocMeetTab({
  isTeacher,
  gmeetFormOpen,
  gmeetInput,
  gmeetSaving,
  gmeetJustSaved,
  gmeetRowReady,
  googleMeetUrl,
  studentMeetUrl,
  onGmeetInputChange,
  onOpenGmeetForm,
  onCloseGmeetForm,
  onSaveGmeet,
  onClearGmeet,
}: PhongHocMeetTabProps) {
  const teacherMeetUrl = googleMeetUrl?.trim() || null;
  const activeMeetUrl = isTeacher ? teacherMeetUrl : studentMeetUrl;

  if (activeMeetUrl && !gmeetFormOpen) {
    return (
      <div className="canvas-ph canvas-ph--meet">
        <iframe
          src={activeMeetUrl}
          title="Google Meet"
          allow="camera; microphone; fullscreen; display-capture"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {isTeacher ? (
          <div className="phc-meet-tab-toolbar">
            <button
              type="button"
              className="dhp-btn-ghost phc-meet-tab-toolbar-btn"
              disabled={gmeetSaving}
              onClick={onOpenGmeetForm}
            >
              Đổi link Meet
            </button>
            <button
              type="button"
              className="meet-clear-link"
              disabled={gmeetSaving}
              onClick={onClearGmeet}
            >
              {gmeetSaving ? "Đang gỡ…" : "Gỡ link Meet"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="canvas-ph canvas-ph--meet canvas-ph--meet-cta">
      <div
        className={[
          "phc-meet-cta-card",
          !isTeacher && !studentMeetUrl && "phc-meet-cta-card--muted",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="phc-meet-cta-ico" aria-hidden>
          📹
        </span>
        <h3 className="phc-meet-cta-title">
          {isTeacher ? "Google Meet (dự phòng)" : "Google Meet"}
        </h3>
        <p className="phc-meet-cta-hint">
          {isTeacher
            ? "Tạo hoặc dán link Meet để học viên tham gia qua tab phụ — phòng học chính vẫn là LiveKit."
            : studentMeetUrl
              ? "Mở Google Meet trong tab trình duyệt nếu phòng LiveKit gặp sự cố."
              : "Giáo viên chưa tạo link Meet cho hôm nay."}
        </p>

        {isTeacher ? (
          gmeetFormOpen ? (
            <>
              <input
                className="meet-input"
                placeholder="Dán link Google Meet vào đây…"
                value={gmeetInput}
                onChange={(e) => onGmeetInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveGmeet();
                }}
                autoFocus
              />
              <button
                type="button"
                className="dhp-btn phc-btn-block"
                disabled={gmeetSaving}
                onClick={onSaveGmeet}
              >
                {gmeetSaving ? "Đang lưu…" : "Lưu link Meet"}
              </button>
              <button
                type="button"
                className="dhp-btn-ghost phc-btn-block"
                disabled={gmeetSaving}
                onClick={onCloseGmeetForm}
              >
                Huỷ
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="dhp-btn phc-btn-block"
                onClick={() => {
                  window.open("https://meet.new", "_blank", "noopener,noreferrer");
                  onOpenGmeetForm();
                }}
              >
                {gmeetJustSaved ? "✓ Đã lưu link!" : "Tạo Google Meet"}
              </button>
              {teacherMeetUrl ? (
                <button
                  type="button"
                  className="dhp-btn-ghost phc-btn-block"
                  onClick={() =>
                    window.open(teacherMeetUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  Mở Meet tab mới
                </button>
              ) : null}
            </>
          )
        ) : studentMeetUrl ? (
          <button
            type="button"
            className="dhp-btn phc-btn-block"
            onClick={() => window.open(studentMeetUrl, "_blank", "noopener,noreferrer")}
          >
            Mở Google Meet
          </button>
        ) : (
          <button type="button" className="meet-wait" disabled>
            {gmeetRowReady ? "Chờ giáo viên tạo Meet…" : "Đang tải…"}
          </button>
        )}

        {isTeacher && gmeetJustSaved && !gmeetFormOpen ? (
          <p className="meet-saved" role="status">
            ✓ Đã lưu link — học viên có thể tham gia trong ngày.
          </p>
        ) : null}
      </div>
    </div>
  );
}
