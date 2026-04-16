"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  token: string;
  title: string;
  subtitle: string;
};

export default function AdminPasswordTokenForm({ token, title, subtitle }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("Hai lần nhập mật khẩu không khớp.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu cần ít nhất 8 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (data.ok) {
        router.replace("/admin?notice=password_updated");
        return;
      }
      setError(data.error ?? "Không đặt được mật khẩu.");
    } catch {
      setError("Lỗi mạng. Thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] px-4 py-12 text-white [font-family:ui-sans-serif,system-ui,sans-serif]">
      <div className="w-full max-w-[400px]">
        <Link href="/admin" className="text-sm text-[#9ca3af] hover:text-[#fdba74] mb-8 inline-block">
          ← Đăng nhập
        </Link>
        <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
        <p className="text-sm text-[#9ca3af] mb-8">{subtitle}</p>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="np1" className="block text-sm text-[#d1d5db] mb-1.5">
              Mật khẩu mới
            </label>
            <input
              id="np1"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1c1c1c] px-3 py-2.5 text-[15px] text-white outline-none focus:border-[#4b5563]"
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="np2" className="block text-sm text-[#d1d5db] mb-1.5">
              Nhập lại mật khẩu
            </label>
            <input
              id="np2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1c1c1c] px-3 py-2.5 text-[15px] text-white outline-none focus:border-[#4b5563]"
              required
              minLength={8}
            />
          </div>
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
            {loading ? "Đang lưu…" : "Lưu mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}
