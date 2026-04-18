"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { addTaiSanAsset } from "@/app/admin/dashboard/gia-tri-tai-san/actions";
import {
  computeTaiSanDepreciation,
  monthsElapsedSincePurchase,
  type TaiSanComputed,
  type TaiSanDbRow,
} from "@/lib/data/admin-gia-tri-tai-san";
import { cn } from "@/lib/utils";

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtVND(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function fmtVNDShort(n: number): string {
  const v = num(n);
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")} tr`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return v.toLocaleString("vi-VN");
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

const LOAI_BADGE: Record<string, { bg: string; text: string }> = {
  "Thiết bị": { bg: "#eff6ff", text: "#2563eb" },
  "Đồ nội thất": { bg: "#f5f3ff", text: "#7c3aed" },
  "Phần mềm": { bg: "#f0fdf4", text: "#16a34a" },
  "Phương tiện": { bg: "#fff7ed", text: "#ea580c" },
  "Bất động sản": { bg: "#fef9c3", text: "#ca8a04" },
};

function LoaiBadge({ value }: { value: string }) {
  if (!value) return <span className="text-[11px] text-[#9CA3AF]">—</span>;
  const c = LOAI_BADGE[value] ?? { bg: "#F3F4F6", text: "#6B7280" };
  return (
    <span
      className="inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      {value}
    </span>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: color,
        }}
      />
    </div>
  );
}

type Props = {
  rows: TaiSanDbRow[];
  /** Nút trong Overview — không margin âm, khớp khung tab. */
  embedded?: boolean;
};

export default function GiaTriTaiSanView({ rows, embedded = false }: Props) {
  const assets = useMemo(() => rows.map(computeTaiSanDepreciation), [rows]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const tongGiaTri = assets.reduce((s, a) => s + a.gia_tri_moi_mua, 0);
  const tongConLai = assets.reduce((s, a) => s + a.conLai, 0);
  const tongDaKhauHao = assets.reduce((s, a) => s + a.daKhauHao, 0);
  const tongKhauHaoThang = assets.reduce((s, a) => s + a.khauHaoThang, 0);
  const countDangKhau = assets.filter((a) => a.khauHaoThang > 0).length;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-[#F5F7F7] text-[#323232] [font-family:var(--font-quicksand),system-ui,sans-serif]",
        embedded
          ? "w-full max-w-full rounded-xl border border-[#E5E7EB]"
          : "-m-4 w-[calc(100%+2rem)] max-w-none md:-m-6 md:w-[calc(100%+3rem)]",
      )}
      data-supabase-table="tc_tai_san_rong"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#EAEAEA] bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-[22px]">
          🏛️
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/80">Tài sản</p>
          <h1 className="m-0 text-[18px] font-extrabold leading-tight tracking-tight text-white md:text-[20px]">
            Giá trị tài sản
          </h1>
        </div>
        <div className="ml-auto flex shrink-0">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/45 bg-white/95 px-3.5 py-2.5 text-[13px] font-bold text-[#7c2d12] shadow-[0_1px_8px_rgba(0,0,0,0.08)] transition hover:bg-white"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            Thêm tài sản
          </button>
        </div>
      </div>

      <AddTaiSanModal open={addOpen} onClose={() => setAddOpen(false)} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-[10px] pb-6 pt-3 md:px-6 md:pt-4">
        <div className="flex flex-wrap gap-3">
          <StatCard
            title="Khấu hao tháng này"
            value={`${fmtVNDShort(tongKhauHaoThang)} ₫`}
            sub={`${countDangKhau} tài sản đang khấu hao`}
            icon="📉"
            grad="linear-gradient(135deg, #fbbf24, #f59e0b)"
          />
          <StatCard
            title="Giá trị còn lại"
            value={`${fmtVNDShort(tongConLai)} ₫`}
            sub={
              tongGiaTri > 0 ? `${Math.round((tongConLai / tongGiaTri) * 100)}% tổng giá trị` : undefined
            }
            icon="💹"
            grad="linear-gradient(135deg, #34d399, #10b981)"
          />
          <StatCard
            title="Tổng giá trị tài sản"
            value={`${fmtVNDShort(tongGiaTri)} ₫`}
            sub={`${assets.length} tài sản`}
            icon="🏢"
            grad="linear-gradient(135deg, #BC8AF9, #ED5C9D)"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
          <div className="min-w-[640px] overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-[minmax(0,1fr)_100px_108px_108px_112px] gap-3 border-b border-[#E5E7EB] bg-[#F8F9FA] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] md:grid-cols-[minmax(0,1fr)_110px_120px_120px_120px] md:px-5">
            <div>Tài sản</div>
            <div className="text-center">Loại</div>
            <div className="text-right">Nguyên giá</div>
            <div className="text-right">Còn lại</div>
            <div className="text-right">KH/tháng</div>
          </div>

          {assets.length === 0 ? (
            <div className="px-5 py-14 text-center text-[13px] text-[#9CA3AF]">Chưa có tài sản nào trong hệ thống</div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {assets.map((a) => (
                <AssetRow
                  key={a.id}
                  a={a}
                  expanded={expandedId === a.id}
                  onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                />
              ))}
            </div>
          )}

          {assets.length > 0 ? (
            <div className="min-w-[640px] border-t border-[#E5E7EB] bg-[#F8F9FA] px-4 py-2.5 text-[11px] md:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1">
              <span className="text-[#6B7280]">{assets.length} tài sản</span>
              <span className="font-bold text-amber-600">KH/tháng: {fmtVNDShort(tongKhauHaoThang)} ₫</span>
              <span className="font-bold text-emerald-600">Còn lại: {fmtVNDShort(tongConLai)} ₫</span>
              <span className="font-bold text-[#BC8AF9]">Đã KH: {fmtVNDShort(tongDaKhauHao)} ₫</span>
            </div>
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const LOAI_OPTIONS = Object.keys(LOAI_BADGE);

function AddTaiSanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await addTaiSanAsset(fd);
      if (res.ok) {
        form.reset();
        onClose();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget && !pending) onClose();
      }}
    >
      <div
        className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl [font-family:var(--font-quicksand),system-ui,sans-serif]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tai-san-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="add-tai-san-title" className="m-0 text-[17px] font-extrabold text-[#1a1a2e]">
            Thêm tài sản mới
          </h2>
          <button
            type="button"
            disabled={pending}
            onClick={() => !pending && onClose()}
            className="rounded-lg px-2 py-1 text-[13px] font-semibold text-black/50 transition hover:bg-black/[0.06] hover:text-black/80"
          >
            Đóng
          </button>
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
              Tên tài sản <span className="text-red-600">*</span>
            </span>
            <input
              name="ten_tai_san"
              required
              maxLength={500}
              autoComplete="off"
              placeholder="VD: Máy chiếu phòng A"
              className="rounded-xl border border-[#E5E7EB] bg-[#fafafa] px-3 py-2.5 text-[13px] text-[#1a1a2e] outline-none ring-0 transition focus:border-[#f8a668] focus:bg-white"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Loại</span>
            <select
              name="loai_tai_san"
              className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[13px] text-[#1a1a2e] outline-none focus:border-[#f8a668]"
            >
              <option value="">— Chọn loại (tùy chọn) —</option>
              {LOAI_OPTIONS.map((loai) => (
                <option key={loai} value={loai}>
                  {loai}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Ngày mua</span>
            <input
              name="ngay_mua"
              type="date"
              className="rounded-xl border border-[#E5E7EB] bg-[#fafafa] px-3 py-2.5 text-[13px] text-[#1a1a2e] outline-none focus:border-[#f8a668] focus:bg-white"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
              Nguyên giá (VNĐ) <span className="text-red-600">*</span>
            </span>
            <input
              name="gia_tri_moi_mua"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="VD: 50000000 hoặc 50.000.000"
              className="rounded-xl border border-[#E5E7EB] bg-[#fafafa] px-3 py-2.5 text-[13px] text-[#1a1a2e] outline-none focus:border-[#f8a668] focus:bg-white"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
              Thời gian khấu hao (tháng)
            </span>
            <input
              name="thoi_gian_khau_hao"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Để trống nếu không áp khấu hao"
              className="rounded-xl border border-[#E5E7EB] bg-[#fafafa] px-3 py-2.5 text-[13px] text-[#1a1a2e] outline-none focus:border-[#f8a668] focus:bg-white"
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => !pending && onClose()}
              className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              {pending ? "Đang lưu…" : "Thêm tài sản"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  grad,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: string;
  grad: string;
}) {
  return (
    <div className="flex min-w-[200px] flex-1 flex-col gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[17px]"
          style={{ background: grad }}
        >
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">{title}</span>
      </div>
      <div className="text-[22px] font-extrabold leading-none tracking-tight text-[#1a1a2e]">{value}</div>
      {sub ? <div className="text-[11px] text-[#9CA3AF]">{sub}</div> : null}
    </div>
  );
}

function pctColor(a: TaiSanComputed): string {
  if (a.pctConLai > 60) return "#10b981";
  if (a.pctConLai > 25) return "#f59e0b";
  return "#ef4444";
}

function AssetRow({
  a,
  expanded,
  onToggle,
}: {
  a: TaiSanComputed;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pc = pctColor(a);
  const elapsed = monthsElapsedSincePurchase(a.ngay_mua);
  const monthsLeft =
    a.thoi_gian_khau_hao && a.ngay_mua
      ? Math.max(0, Math.floor(num(a.thoi_gian_khau_hao)) - elapsed)
      : null;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "grid w-full grid-cols-[minmax(0,1fr)_100px_108px_108px_112px] items-center gap-3 px-4 py-3 text-left transition-colors md:grid-cols-[minmax(0,1fr)_110px_120px_120px_120px] md:px-5",
          expanded ? "bg-sky-50/80" : "hover:bg-[#F8FAFF]",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-bold text-[#1a1a2e]">{a.ten_tai_san}</span>
            <ChevronDown
              className={cn("h-3.5 w-3.5 shrink-0 text-[#9CA3AF] transition-transform", expanded && "rotate-180")}
              strokeWidth={2.5}
              aria-hidden
            />
          </div>
          <div className="mt-1.5 max-w-md">
            <ProgressBar pct={a.pctConLai} color={pc} />
          </div>
        </div>
        <div className="flex justify-center">
          <LoaiBadge value={(a.loai_tai_san ?? "").trim()} />
        </div>
        <div className="text-right text-[12px] font-bold tabular-nums text-[#1a1a2e]">{fmtVNDShort(a.gia_tri_moi_mua)}</div>
        <div className="text-right">
          <div className="text-[12px] font-bold tabular-nums" style={{ color: pc }}>
            {fmtVNDShort(a.conLai)}
          </div>
          <div className="text-[10px] text-[#9CA3AF]">{a.pctConLai}% còn lại</div>
        </div>
        <div
          className={cn(
            "text-right text-[12px] font-semibold tabular-nums",
            a.khauHaoThang > 0 ? "text-amber-600" : "text-[#9CA3AF]",
          )}
        >
          {a.khauHaoThang > 0 ? `${fmtVNDShort(a.khauHaoThang)} ₫` : "—"}
        </div>
      </button>

      {expanded ? (
        <div className="border-b border-[#E5E7EB] bg-[#F8FBFF] px-4 py-3 md:px-5">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            <DetailTile label="Ngày mua" value={fmtDate(a.ngay_mua)} />
            <DetailTile
              label="Thời gian khấu hao"
              value={
                a.thoi_gian_khau_hao
                  ? `${Math.floor(num(a.thoi_gian_khau_hao))} tháng (${(num(a.thoi_gian_khau_hao) / 12).toFixed(1)} năm)`
                  : "Không xác định"
              }
            />
            <DetailTile label="Đã khấu hao" value={fmtVND(a.daKhauHao)} />
            <DetailTile label="Giá trị còn lại" value={fmtVND(a.conLai)} />
            <DetailTile label="Tháng đã sử dụng" value={a.ngay_mua ? `${elapsed} tháng` : "—"} />
            <DetailTile
              label="Tháng còn lại"
              value={monthsLeft != null ? `${monthsLeft} tháng` : "—"}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[#E5E7EB] bg-white px-3 py-2.5">
      <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-[#9CA3AF]">{label}</div>
      <div className="text-[13px] font-bold text-[#1a1a2e]">{value}</div>
    </div>
  );
}
