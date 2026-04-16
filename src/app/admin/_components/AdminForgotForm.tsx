"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminForgotForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (data.ok) {
        setMessage(
          data.message ??
            "Nếu email thuộc nhân sự Sine Art, bạn sẽ nhận hướng dẫn trong hộp thư (kể cả mục spam)."
        );
      } else {
        setError(data.error ?? "Không gửi được yêu cầu.");
      }
    } catch {
      setError("Lỗi mạng. Thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] px-4 py-12 text-white [font-family:ui-sans-serif,system-ui,sans-serif]">
      <div className="w-full max-w-[400px]">
        <Link
          href="/admin"
          className="text-sm text-[#9ca3af] hover:text-[#fdba74] mb-8 inline-block"
        >
          ← Quay lại đăng nhập
        </Link>
        <h1 className="text-2xl font-bold text-white mb-1">Quên mật khẩu</h1>
        <p className="text-sm text-[#9ca3af] mb-8">
          Nhập email công việc — hệ thống gửi liên kết đặt lại mật khẩu (hoặc đặt mật khẩu lần đầu nếu tài
          khoản chưa có mật khẩu).
        </p>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="block text-sm text-[#d1d5db] mb-1.5">
              Email công việc
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="username"
              placeholder="ten@sineart.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1c1c1c] px-3 py-2.5 text-[15px] text-white placeholder:text-[#6b7280] outline-none focus:border-[#4b5563]"
              required
            />
          </div>
          {message ? (
            <p className="rounded-lg border border-[#365314] bg-[#14532d]/40 px-3 py-2 text-sm text-[#bbf7d0]">
              {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-[#fca5a5]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#1f1f1f] py-3 text-[15px] font-medium text-white hover:bg-[#262626] disabled:opacity-50"
          >
            {loading ? "Đang gửi…" : "Gửi email"}
          </button>
        </form>
      </div>
    </div>
  );
}
