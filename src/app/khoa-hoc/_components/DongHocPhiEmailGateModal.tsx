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
};

export default function DongHocPhiEmailGateModal({
  open,
  onClose,
  monHocId,
  courseTitle,
  fromNavLogin = false,
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
    const t = email.trim();
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
        .eq("email", em)
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
    const t = verifiedEmail.trim();
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
            <p className="kd-dhp-nav-choose-eyebrow">Đăng nhập học viên</p>
            <h2 id={titleId} className="kd-dhp-title kd-dhp-title--nav-choose">
              Bạn muốn làm gì tiếp theo?
            </h2>
            <p className="kd-dhp-lead kd-dhp-lead--nav-choose">
              Email này đã có hồ sơ trong hệ thống.
            </p>
          </header>

          <div className="kd-dhp-nav-email-card" role="status">
            <span className="kd-dhp-nav-email-card-label">Email đã xác nhận</span>
            <span className="kd-dhp-nav-email-card-value" title={verifiedEmail}>
              {verifiedEmail}
            </span>
          </div>

          <div className="kd-dhp-nav-choose-actions">
            <button
              type="button"
              className="kd-dhp-nav-choose-btn kd-dhp-nav-choose-btn--primary"
              onClick={handleNavRenew}
            >
              Gia hạn học phí
            </button>
            <button
              type="button"
              className="kd-dhp-nav-choose-btn kd-dhp-nav-choose-btn--secondary"
              disabled={profileLoading}
              onClick={() => void handleNavProfile()}
            >
              {profileLoading ? "Đang mở…" : "Trang cá nhân"}
            </button>
          </div>

          {error ? (
            <p className="kd-dhp-emsg kd-dhp-emsg--nav-choose" role="alert">
              {error}
            </p>
          ) : null}

          <footer className="kd-dhp-nav-choose-footer">
            <button
              type="button"
              className="kd-dhp-btn-ghost kd-dhp-btn-back"
              onClick={() => {
                setNavPhase("gate");
                setError("");
              }}
            >
              ← Quay lại nhập email
            </button>
            <button type="button" className="kd-dhp-btn-dismiss kd-dhp-btn-dismiss--nav-choose" onClick={onClose}>
              Đóng
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
