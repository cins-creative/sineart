"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginProps = { passwordUpdatedBanner?: boolean };

export default function AdminLoginView({ passwordUpdatedBanner }: LoginProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hintSetup, setHintSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mailSent, setMailSent] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHintSetup(false);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        code?: string;
        error?: string;
      };

      if (data.ok) {
        router.replace("/admin/dashboard");
        router.refresh();
        return;
      }

      if (data.code === "PASSWORD_NOT_SET") {
        setHintSetup(true);
        setError(data.error ?? "Tài khoản chưa có mật khẩu.");
        return;
      }

      setError(data.error ?? "Đăng nhập thất bại.");
    } catch {
      setError("Lỗi mạng. Thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmailLink() {
    setError(null);
    setMailSent(null);
    setSending(true);
    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (data.ok) {
        setError(null);
        setHintSetup(false);
        setMailSent(data.message ?? "Đã gửi email (nếu địa chỉ hợp lệ).");
      } else {
        setError(data.error ?? "Không gửi được email.");
      }
    } catch {
      setError("Lỗi mạng khi gửi email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] px-4 py-12 text-white [font-family:ui-sans-serif,system-ui,sans-serif]">
      <div className="w-full max-w-[400px]">
        <header className="flex items-center gap-3 mb-10">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white shadow-lg"
            style={{
              background: "linear-gradient(135deg, #f8a668 0%, #ee5b9f 100%)",
            }}
            aria-hidden
          >
            S
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Sine Art</span>
        </header>

        <h1 className="text-2xl font-bold text-white mb-1">Đăng nhập hệ thống</h1>
        <p className="text-sm text-[#9ca3af] mb-8">Dành cho nhân sự Sine Art</p>

        {passwordUpdatedBanner ? (
          <div className="mb-6 rounded-lg border border-[#365314] bg-[#14532d]/35 px-3 py-2 text-sm text-[#bbf7d0]">
            Đã đặt mật khẩu thành công. Bạn có thể đăng nhập.
          </div>
        ) : null}

        {mailSent ? (
          <div className="mb-6 rounded-lg border border-[#365314] bg-[#14532d]/35 px-3 py-2 text-sm text-[#bbf7d0]">
            {mailSent}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="admin-email" className="block text-sm text-[#d1d5db] mb-1.5">
              Email công việc
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="ten@sineart.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1c1c1c] px-3 py-2.5 text-[15px] text-white placeholder:text-[#6b7280] outline-none focus:border-[#4b5563] focus:ring-1 focus:ring-[#4b5563]"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm text-[#d1d5db] mb-1.5">
              Mật khẩu
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1c1c1c] px-3 py-2.5 text-[15px] text-white outline-none focus:border-[#4b5563] focus:ring-1 focus:ring-[#4b5563]"
              required
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-[#3f3f46] bg-[#1c1c1c] px-3 py-2 text-sm text-[#fca5a5]"
            >
              {error}
              {hintSetup ? (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={sending || !email.trim()}
                    onClick={sendEmailLink}
                    className="text-[#fdba74] underline-offset-2 hover:underline disabled:opacity-40"
                  >
                    Gửi email đặt mật khẩu
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#1f1f1f] py-3 text-[15px] font-medium text-white transition hover:bg-[#262626] disabled:opacity-50"
          >
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#9ca3af]">
          <Link href="/admin/forgot" className="text-[#fdba74] hover:underline underline-offset-2">
            Quên mật khẩu?
          </Link>
        </p>
      </div>
    </div>
  );
}
