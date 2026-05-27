"use client";

type Props = {
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

export default function PhongHocCanvasMeetOverlay({
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
}: Props) {
  const teacherMeetUrl = googleMeetUrl?.trim() || null;

  return (
    <div className="phc-canvas-maint-overlay" role="region" aria-label="Phòng học đang cập nhật">
      <div className="phc-canvas-maint-card">
        <p className="phc-canvas-maint-eyebrow">Sine Art · Phòng học trực tuyến</p>
        <h2 className="phc-canvas-maint-title">Phòng học đang cập nhật</h2>
        <p className="phc-canvas-maint-desc">
          Hệ thống phòng học video đang được hoàn thiện. Trong lúc chờ, hãy dùng Google Meet bên
          dưới.
        </p>

        <div className="phc-canvas-meet-panel">
          {isTeacher ? (
            <>
              {gmeetFormOpen ? (
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
                    className="phc-btn-green phc-btn-block"
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
              ) : teacherMeetUrl ? (
                <>
                  <button
                    type="button"
                    className="dhp-btn phc-btn-block"
                    onClick={() =>
                      window.open(teacherMeetUrl, "_blank", "noopener,noreferrer")
                    }
                  >
                    Tham gia link Meet
                  </button>
                  <button
                    type="button"
                    className="dhp-btn-ghost phc-btn-block"
                    disabled={gmeetSaving}
                    onClick={onOpenGmeetForm}
                  >
                    Đổi link Meet
                  </button>
                  {gmeetJustSaved ? (
                    <p className="meet-saved" role="status">
                      ✓ Đã lưu link — học viên có thể tham gia trong ngày.
                    </p>
                  ) : null}
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
                    {gmeetJustSaved ? "✓ Đã lưu link!" : "📹 Tạo Google Meet"}
                  </button>
                </>
              )}
              {teacherMeetUrl && gmeetFormOpen ? (
                <button
                  type="button"
                  className="meet-clear-link"
                  disabled={gmeetSaving}
                  onClick={onClearGmeet}
                >
                  {gmeetSaving ? "Đang gỡ…" : "Gỡ link Meet — quay lại phòng học Sine Art"}
                </button>
              ) : null}
            </>
          ) : studentMeetUrl ? (
            <button
              type="button"
              className="dhp-btn phc-btn-block"
              onClick={() => window.open(studentMeetUrl, "_blank", "noopener,noreferrer")}
            >
              Tham gia link Meet
            </button>
          ) : (
            <button type="button" className="meet-wait" disabled>
              {gmeetRowReady ? "Chờ giáo viên tạo Meet…" : "Đang tải…"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
