"use client";

/** Bắt buộc khi modal dùng từ NavBar — các trang không import `khoa-hoc-detail.css` sẽ không có layout/z-index cho `.kd-dhp-*`. */
import "@/app/khoa-hoc/khoa-hoc-detail.css";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { lookupClassroomByEmail } from "@/lib/phong-hoc/lookup-by-email";
import {
  saveClassroomSession,
  type ClassroomSessionRecord,
} from "@/lib/phong-hoc/classroom-session";
import { isValidStudentEmail, STUDENT_EMAIL_REQUIREMENT_VI } from "@/lib/donghocphi/profile-step1";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

function NavChooseIcon({ kind }: { kind: "renew" | "profile" | "classroom" }) {
  const common = { className: "kd-dhp-nav-choose-ico", width: 18, height: 18, "aria-hidden": true as const };
  if (kind === "renew") {
    return (
      <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
        <path d="M4 10h16" />
        <path d="M9 14h2" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "profile") {
    return (
      <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="9" r="3.25" />
        <path d="M6 19.5c0-3.5 3-5 6-5s6 1.5 6 5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.2 6.7c-.5-.3-1.1 0-1.1.6v10.4c0 .6.6 1 1.1.7l8.2-5.2c.5-.3.5-1 0-1.3L9.2 6.7z" />
    </svg>
  );
}

function buildDongHocPhiUrl(
  monHocId: number | null,
  courseTitle: string,
  extra?: { email?: string; intent?: "new" }
): string {
  const q = new URLSearchParams();
  if (monHocId != null) q.set("monId", String(monHocId));
  const course = courseTitle.trim();
  if (course) q.set("course", course);
  if (extra?.email?.trim()) q.set("email", extra.email.trim());
  if (extra?.intent === "new") q.set("intent", "new");
  const qs = q.toString();
  return qs ? `/donghocphi?${qs}` : "/donghocphi";
}

export type DongHocPhiEmailGateModalProps = {
  open: boolean;
  onClose: () => void;
  monHocId: number | null;
  courseTitle: string;
  /**
   * true: từ nút «Đăng nhập» trên Nav — sau khi xác nhận email có hồ sơ, hỏi Gia hạn học phí / Trang cá nhân.
   * false: từ trang khóa học — giữ hành vi cũ (vào `/donghocphi` kèm email).
   */
  fromNavLogin?: boolean;
  /** Bước chọn (Nav): mở overlay «Vào học» / phòng học — truyền email đã xác nhận để bỏ qua bước nhập email. */
  onRequestClassroom?: (email: string) => void;
};

export default function DongHocPhiEmailGateModal({
  open,
  onClose,
  monHocId,
  courseTitle,
  fromNavLogin = false,
  onRequestClassroom,
}: DongHocPhiEmailGateModalProps) {
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [navPhase, setNavPhase] = useState<"gate" | "choose">("gate");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setCheckingEmail(false);
    setNavPhase("gate");
    setVerifiedEmail("");
    setProfileLoading(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const goProfileAfterSession = useCallback(
    (record: ClassroomSessionRecord, typedEmail: string) => {
      if (record.userType !== "Student") return;
      saveClassroomSession(record);
      onClose();
      const fromRow = String(record.data.email ?? "").trim();
      const resolved = (fromRow !== "" ? fromRow : typedEmail.trim()).toLowerCase();
      router.push(`/hoc-vien/${encodeURIComponent(resolved)}`);
    },
    [onClose, router]
  );

  const handleContinueWithEmail = useCallback(async () => {
    const t = email.trim().toLowerCase();
    if (!isValidStudentEmail(t)) {
      setError(STUDENT_EMAIL_REQUIREMENT_VI);
      return;
    }
    setError("");
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Không kết nối được hệ thống. Thử lại sau hoặc chọn «Học viên mới».");
      return;
    }
    setCheckingEmail(true);
    try {
      const em = t.toLowerCase();
      const { data, error: qErr } = await supabase
        .from("ql_thong_tin_hoc_vien")
        .select("id")
        .ilike("email", em)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (qErr) {
        setError(qErr.message || "Không kiểm tra được email. Thử lại.");
        return;
      }
      if (data == null) {
        setError(
          "Chưa tìm thấy email này. Dùng khối «Lần đầu» bên trên để tạo hồ sơ mới."
        );
        return;
      }
      if (fromNavLogin) {
        setVerifiedEmail(t);
        setNavPhase("choose");
        return;
      }
      onClose();
      router.push(buildDongHocPhiUrl(monHocId, courseTitle, { email: t }));
    } finally {
      setCheckingEmail(false);
    }
  }, [email, monHocId, courseTitle, fromNavLogin, onClose, router]);

  const handleCreateNew = useCallback(() => {
    onClose();
    router.push(buildDongHocPhiUrl(monHocId, courseTitle, { intent: "new" }));
  }, [monHocId, courseTitle, onClose, router]);

  const handleNavRenew = useCallback(() => {
    onClose();
    router.push(buildDongHocPhiUrl(monHocId, courseTitle, { email: verifiedEmail }));
  }, [monHocId, courseTitle, onClose, router, verifiedEmail]);

  const handleNavProfile = useCallback(async () => {
    const t = verifiedEmail.trim().toLowerCase();
    if (!t) return;
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setError("Không kết nối được hệ thống.");
      return;
    }
    setProfileLoading(true);
    setError("");
    try {
      const { records } = await lookupClassroomByEmail(sb, t);
      const students = records.filter((r) => r.userType === "Student");
      if (!students.length) {
        setError("Không tìm thấy lớp học cho email này — vui lòng dùng «Gia hạn học phí» hoặc liên hệ Sine Art.");
        return;
      }
      goProfileAfterSession(students[0]!, t);
    } catch {
      setError("Lỗi kết nối dữ liệu. Vui lòng thử lại.");
    } finally {
      setProfileLoading(false);
    }
  }, [goProfileAfterSession, verifiedEmail]);

  if (!open) return null;

  if (fromNavLogin && navPhase === "choose") {
    return (
      <div
        className="kd-dhp-ov"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="kd-dhp-popup kd-dhp-popup--nav-choose"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="kd-dhp-nav-choose-head">
            <button type="button" className="kd-dhp-nav-choose-close" onClick={onClose} aria-label="Đóng hộp thoại">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
            <p className="kd-dhp-nav-choose-eyebrow">Đăng nhập học viên</p>
            <h2 id={titleId} className="kd-dhp-title kd-dhp-title--nav-choose">
              Bạn muốn làm gì tiếp theo?
            </h2>
            <p className="kd-dhp-lead kd-dhp-lead--nav-choose">
              Email này đã có hồ sơ trong hệ thống.
            </p>
          </header>

          <div className="kd-dhp-nav-email-card" role="status">
            <span className="kd-dhp-nav-email-badge" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="kd-dhp-nav-email-card-main">
              <span className="kd-dhp-nav-email-card-label">Email đã xác nhận</span>
              <span className="kd-dhp-nav-email-card-value" title={verifiedEmail}>
                {verifiedEmail}
              </span>
            </div>
          </div>

          <div
            className={
              onRequestClassroom
                ? "kd-dhp-nav-choose-actions kd-dhp-nav-choose-actions--with-classroom"
                : "kd-dhp-nav-choose-actions"
            }
          >
            <button
              type="button"
              className="kd-dhp-nav-choose-btn kd-dhp-nav-choose-btn--secondary"
              onClick={handleNavRenew}
            >
              <NavChooseIcon kind="renew" />
              <span>Gia hạn học phí</span>
            </button>
            <button
              type="button"
              className="kd-dhp-nav-choose-btn kd-dhp-nav-choose-btn--secondary"
              disabled={profileLoading}
              onClick={() => void handleNavProfile()}
            >
              <NavChooseIcon kind="profile" />
              <span>{profileLoading ? "Đang mở…" : "Trang cá nhân"}</span>
            </button>
            {onRequestClassroom ? (
              <button
                type="button"
                className="kd-dhp-nav-choose-btn kd-dhp-nav-choose-btn--classroom"
                onClick={() => onRequestClassroom(verifiedEmail)}
              >
                <NavChooseIcon kind="classroom" />
                <span>Vào học</span>
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="kd-dhp-emsg kd-dhp-emsg--nav-choose" role="alert">
              {error}
            </p>
          ) : null}

          <footer className="kd-dhp-nav-choose-footer">
            <button
              type="button"
              className="kd-dhp-nav-choose-back"
              onClick={() => {
                setNavPhase("gate");
                setError("");
              }}
            >
              <span className="kd-dhp-nav-choose-back-ico" aria-hidden>
                ←
              </span>
              Quay lại nhập email
            </button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div
      className="kd-dhp-ov"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="kd-dhp-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="kd-dhp-title">
          Đóng học phí
        </h2>
        <p className="kd-dhp-lead">Chọn đúng trường hợp của bạn</p>

        <div className="kd-dhp-block kd-dhp-block--new">
          <div className="kd-dhp-block-head">
            <span className="kd-dhp-block-tag">Lần đầu</span>
            <span className="kd-dhp-block-title">Chưa có hồ sơ học viên</span>
          </div>
          <p className="kd-dhp-block-hint">Điền thông tin và chọn lớp trên trang tiếp theo.</p>
          <button type="button" className="kd-dhp-btn-primary" onClick={handleCreateNew}>
            Tạo hồ sơ &amp; tiếp tục
          </button>
        </div>

        <div className="kd-dhp-block kd-dhp-block--returning">
          <div className="kd-dhp-block-head">
            <span className="kd-dhp-block-tag">Đã có hồ sơ</span>
            <span className="kd-dhp-block-title">Nhập email đã đăng ký</span>
          </div>
          <p className="kd-dhp-block-hint">
            Hệ thống kiểm tra email trước khi chuyển trang thanh toán.
          </p>
          <p className="kd-dhp-block-hint">{STUDENT_EMAIL_REQUIREMENT_VI}</p>
          <input
            ref={inputRef}
            className={`kd-dhp-input${error ? " kd-dhp-input--err" : ""}`}
            type="email"
            name="dhp-email"
            autoComplete="email"
            placeholder="vd. tenban@gmail.com"
            value={email}
            disabled={checkingEmail}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleContinueWithEmail();
            }}
          />
          {error ? (
            <p className="kd-dhp-emsg" role="alert">
              {error}
            </p>
          ) : (
            <div className="kd-dhp-emsg-spacer" aria-hidden />
          )}
          <button
            type="button"
            className="kd-dhp-btn-solid"
            disabled={checkingEmail}
            onClick={() => void handleContinueWithEmail()}
          >
            {checkingEmail ? "Đang kiểm tra…" : "Tiếp tục"}
          </button>
        </div>

        <button type="button" className="kd-dhp-btn-dismiss" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
}
