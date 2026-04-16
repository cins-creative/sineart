"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { lookupClassroomByEmail } from "@/lib/phong-hoc/lookup-by-email";
import { saveClassroomSession, type ClassroomSessionRecord } from "@/lib/phong-hoc/classroom-session";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function StudentProfileSignInOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setMessage("");
    setLoading(false);
  }, [open]);

  const close = () => {
    if (loading) return;
    onClose();
  };

  const enterProfile = (record: ClassroomSessionRecord, typedEmail: string) => {
    if (record.userType !== "Student") return;
    saveClassroomSession(record);
    onClose();
    const fromRow = String(record.data.email ?? "").trim();
    const resolved = (fromRow !== "" ? fromRow : typedEmail.trim()).toLowerCase();
    router.push(`/hoc-vien/${encodeURIComponent(resolved)}`);
  };

  const check = async () => {
    if (!email.trim()) {
      setMessage("Vui lòng nhập email.");
      return;
    }
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setMessage("Chưa cấu hình Supabase.");
      return;
    }
    setLoading(true);
    setMessage("Đang xác thực...");
    try {
      const { records } = await lookupClassroomByEmail(sb, email.trim());
      const students = records.filter((r) => r.userType === "Student");
      if (!students.length) {
        setMessage("Không tìm thấy học viên với email này.");
        return;
      }
      enterProfile(students[0]!, email.trim());
    } catch {
      setMessage("Lỗi kết nối dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label="Đăng nhập học viên"
      onClick={(e) => e.target === e.currentTarget && close()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10030,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(420px, calc(100vw - 24px))",
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #ececf3",
          boxShadow: "0 16px 44px rgba(45, 32, 32, 0.12)",
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, color: "#2d2020", marginBottom: 6 }}>
          Đăng nhập học viên
        </div>
        <p style={{ margin: 0, color: "rgba(45, 32, 32, 0.56)", fontSize: 13, lineHeight: 1.5 }}>
          Nhập email đã đăng ký tại Sine Art để vào trang cá nhân.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void check();
          }}
          placeholder="email@..."
          style={{
            marginTop: 12,
            width: "100%",
            border: "1.5px solid #e5e7eb",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            outline: "none",
          }}
          autoFocus
        />
        {message ? (
          <p style={{ margin: "10px 2px 0", color: "rgba(45, 32, 32, 0.56)", fontSize: 12 }}>{message}</p>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={close}
            disabled={loading}
            style={{
              flex: 1,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fff",
              color: "#4b5563",
              padding: "9px 10px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void check()}
            disabled={loading}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 10,
              background: "linear-gradient(135deg, #a78bfa, #ee5ca2)",
              color: "#fff",
              padding: "9px 10px",
              fontWeight: 800,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Đang kiểm tra..." : "Đăng nhập"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
