"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Phone, CalendarClock, Landmark } from "lucide-react";

import { updateStaffSelfBasicInfo } from "@/app/admin/dashboard/ho-so-ca-nhan/actions";
import type { AdminNhanSuRow } from "@/lib/data/admin-quan-ly-nhan-su";
import { cn } from "@/lib/utils";

const inputClass = cn(
  "mt-1 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#1a1a1a]",
  "outline-none focus:border-[#bc89f8] focus:ring-2 focus:ring-[#bc89f8]/25",
);

function isoFromStaffNgaySinh(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const s = raw.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

export default function StaffPersonalSelfBasicForm({
  staff,
}: Readonly<{
  staff: AdminNhanSuRow;
}>) {
  const router = useRouter();
  const [email, setEmail] = useState(staff.email?.trim() ?? "");
  const [sdt, setSdt] = useState(staff.sdt?.trim() ?? "");
  const [ngaySinh, setNgaySinh] = useState(isoFromStaffNgaySinh(staff.ngay_sinh));
  const [stk, setStk] = useState((staff.stk_nhan_luong ?? staff.bank_stk)?.trim() ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setEmail(staff.email?.trim() ?? "");
    setSdt(staff.sdt?.trim() ?? "");
    setNgaySinh(isoFromStaffNgaySinh(staff.ngay_sinh));
    setStk((staff.stk_nhan_luong ?? staff.bank_stk)?.trim() ?? "");
  }, [staff]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setMsg(null);
      const r = await updateStaffSelfBasicInfo({
        email: email.trim() || null,
        sdt: sdt.trim() || null,
        ngay_sinh: ngaySinh.trim() || null,
        stk_nhan_luong: stk.trim() || null,
      });
      setBusy(false);
      if (!r.ok) {
        setMsg({ ok: false, text: r.error });
        return;
      }
      setMsg({ ok: true, text: "Đã lưu thay đổi." });
      router.refresh();
    },
    [email, sdt, ngaySinh, stk, router],
  );

  return (
    <form
      onSubmit={(ev) => void onSubmit(ev)}
      className="rounded-2xl border border-[#f8a668]/25 bg-gradient-to-br from-white to-[#fff9f5] p-4 shadow-sm ring-1 ring-[#f8a668]/10 md:p-5"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#1a1a1a]">Thông tin bạn có thể chỉnh</h2>
          <p className="mt-0.5 text-[11px] text-black/45">Email, điện thoại, ngày sinh và STK nhận lương.</p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          Lưu thay đổi
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-black/40">
            <Mail className="h-3.5 w-3.5 text-[#c2417c]" strokeWidth={2} aria-hidden />
            Email
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-black/40">
            <Phone className="h-3.5 w-3.5 text-[#c2417c]" strokeWidth={2} aria-hidden />
            Điện thoại
          </span>
          <input
            type="tel"
            name="sdt"
            autoComplete="tel"
            value={sdt}
            onChange={(e) => setSdt(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-black/40">
            <CalendarClock className="h-3.5 w-3.5 text-[#c2417c]" strokeWidth={2} aria-hidden />
            Ngày sinh
          </span>
          <input
            type="date"
            name="ngay_sinh"
            value={ngaySinh}
            onChange={(e) => setNgaySinh(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-black/40">
            <Landmark className="h-3.5 w-3.5 text-[#c2417c]" strokeWidth={2} aria-hidden />
            STK ngân hàng (nhận lương)
          </span>
          <input
            type="text"
            name="stk_nhan_luong"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Số tài khoản"
            value={stk}
            onChange={(e) => setStk(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {msg ? (
        <p
          className={cn(
            "mt-3 text-xs font-medium",
            msg.ok ? "text-emerald-700" : "text-red-700",
          )}
          role="status"
        >
          {msg.text}
        </p>
      ) : null}
    </form>
  );
}
