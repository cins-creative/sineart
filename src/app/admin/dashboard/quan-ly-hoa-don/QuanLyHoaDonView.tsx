"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  Clock,
  Edit2,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import {
  deleteHpDonThu,
  updateHpChiTietLine,
  updateHpDonThu,
} from "@/app/admin/dashboard/quan-ly-hoa-don/actions";
import type { AdminChiTietDisplay, AdminHoaDonBundle, AdminHpDonRow } from "@/lib/data/admin-quan-ly-hoa-don";
import { cn } from "@/lib/utils";

const DATE_FILTERS: { label: string; days: number }[] = [
  { label: "Hôm nay", days: 0 },
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
  { label: "Tất cả", days: -1 },
];

const STATUS_OPTIONS = ["Chờ thanh toán", "Đã thanh toán", "Đã hủy"] as const;

const HINH_THUC_OPTIONS = ["Tiền mặt", "Chuyển khoản", "Chuyen khoan", "Thẻ"] as const;

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  "Chờ thanh toán": { bg: "#fff7ed", text: "#ea580c" },
  "Đã thanh toán": { bg: "#dcfce7", text: "#16a34a" },
  "Đã hủy": { bg: "#fee2e2", text: "#dc2626" },
};

const HINH_BADGE: Record<string, { bg: string; text: string }> = {
  "Tiền mặt": { bg: "#dcfce7", text: "#16a34a" },
  "Chuyển khoản": { bg: "#dbeafe", text: "#2563eb" },
  Thẻ: { bg: "#f3e8ff", text: "#7c3aed" },
};

function hinhBadge(raw: string | null): { bg: string; text: string } {
  if (!raw?.trim()) return { bg: "#f3f4f6", text: "#6b7280" };
  const t = raw.trim();
  if (HINH_BADGE[t]) return HINH_BADGE[t]!;
  const low = t.toLowerCase();
  if (low.includes("chuyen") || low.includes("chuyển")) return { bg: "#dbeafe", text: "#2563eb" };
  if (low.includes("mat") || low.includes("mặt")) return { bg: "#dcfce7", text: "#16a34a" };
  if (low.includes("the") || low.includes("thẻ")) return { bg: "#f3e8ff", text: "#7c3aed" };
  return { bg: "#f3f4f6", text: "#4b5563" };
}

function fmtDate(d: string | null): string {
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

function fmtDateTime(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n))) + " ₫";
}

function parseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function subtotalChi(chi: AdminChiTietDisplay[]): number {
  return chi.reduce((s, c) => s + (c.hoc_phi_display ?? 0), 0);
}

function totalDon(don: AdminHpDonRow, chi: AdminChiTietDisplay[]): number {
  return Math.max(0, Math.round(subtotalChi(chi) - parseMoney(don.giam_gia)));
}

function daysRemaining(ngayCuoi: string | null): number | null {
  if (!ngayCuoi) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(ngayCuoi);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / 86400000);
  } catch {
    return null;
  }
}

function inpClass(): string {
  return cn(
    "w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]",
    "outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
  );
}

function daysRangeLabel(days: number): string {
  if (days < 0) return "Mọi thời điểm (giới hạn 2000 đơn gần nhất)";
  if (days === 0) return "Đơn tạo trong ngày hôm nay";
  return `Đơn tạo trong ${days} ngày gần đây`;
}

function StatusBadge({ value }: { value: string }) {
  const cfg = STATUS_BADGE[value] ?? { bg: "#f3f4f6", text: "#6b7280" };
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {value || "—"}
    </span>
  );
}

function DaysRemainingBadge({ ngayCuoi }: { ngayCuoi: string | null }) {
  const days = daysRemaining(ngayCuoi);
  if (days === null) return <span className="text-[12px] font-semibold text-black/35">—</span>;
  let bg = "#dcfce7",
    color = "#16a34a",
    label = `${days} ngày`;
  if (days < 0) {
    bg = "#fee2e2";
    color = "#dc2626";
    label = `Hết ${Math.abs(days)}n`;
  } else if (days === 0) {
    bg = "#fff7ed";
    color = "#ea580c";
    label = "Hết hôm nay";
  } else if (days <= 7) {
    bg = "#fff7ed";
    color = "#ea580c";
  } else if (days <= 30) {
    bg = "#fef9c3";
    color = "#ca8a04";
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: bg, color }}
    >
      <Clock size={9} aria-hidden />
      {label}
    </span>
  );
}

function ChiTietCard({
  ct,
  index,
  onSaved,
}: {
  ct: AdminChiTietDisplay;
  index: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [dau, setDau] = useState(ct.ngay_dau_ky ?? "");
  const [cuoi, setCuoi] = useState(ct.ngay_cuoi_ky ?? "");
  const [st, setSt] = useState(ct.status ?? "");
  const [hocPhi, setHocPhi] = useState(
    ct.hoc_phi_display != null && Number.isFinite(ct.hoc_phi_display) ? String(ct.hoc_phi_display) : ""
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    const hp =
      hocPhi.trim() !== "" && Number.isFinite(Number(hocPhi)) ? Math.round(Number(hocPhi)) : null;
    const res = await updateHpChiTietLine(ct.id, {
      ngay_dau_ky: dau.trim() || null,
      ngay_cuoi_ky: cuoi.trim() || null,
      status: st.trim() || null,
      hoc_phi_goi_dong: hp,
      goi_hoc_phi_id: ct.goi_hoc_phi,
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setEditing(false);
    onSaved();
  };

  return (
    <div
      className={cn(
        "group mb-2 rounded-[10px] border-[1.5px] px-3.5 py-2.5 transition-colors",
        editing ? "border-[#BC8AF9]/50 bg-violet-50/40" : "border-[#EAEAEA] bg-white"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#F8A568]">Gói {index + 1}</span>
        <div className="flex items-center gap-2">
          <StatusBadge value={editing ? st || "—" : ct.status || "—"} />
          {!editing ? (
            <button
              type="button"
              className={cn(
                "rounded-lg border border-[#f8a668]/35 bg-white px-2 py-0.5 text-[10px] font-bold text-[#c2410c] shadow-sm transition",
                "opacity-100",
                "md:pointer-events-none md:opacity-0 md:transition-opacity md:group-hover:pointer-events-auto md:group-hover:opacity-100"
              )}
              onClick={() => setEditing(true)}
            >
              <Edit2 className="mr-0.5 inline" size={10} aria-hidden />
              Sửa
            </button>
          ) : null}
        </div>
      </div>
      {err ? <p className="mb-2 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">{err}</p> : null}
      {[
        {
          label: "ID gói học phí",
          value: ct.goi_hoc_phi != null ? String(ct.goi_hoc_phi) : "—",
        },
        { label: "Lớp học", value: ct.ten_lop },
      ].map((row) => (
        <div key={row.label} className="flex items-center justify-between border-b border-[#EAEAEA] py-1.5 text-[12px]">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">{row.label}</span>
          <span className="max-w-[60%] text-right font-semibold text-[#1a1a2e]">{row.value}</span>
        </div>
      ))}
      {editing ? (
        <>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Ngày đầu kỳ</div>
              <input className={inpClass()} type="date" value={dau.slice(0, 10)} onChange={(e) => setDau(e.target.value)} />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Ngày cuối kỳ</div>
              <input className={inpClass()} type="date" value={cuoi.slice(0, 10)} onChange={(e) => setCuoi(e.target.value)} />
            </div>
          </div>
          <div className="mt-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Trạng thái dòng</div>
            <input className={inpClass()} value={st} onChange={(e) => setSt(e.target.value)} placeholder="Chờ thanh toán / Đã thanh toán…" />
          </div>
          {ct.goi_hoc_phi ? (
            <div className="mt-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Học phí gói (₫)</div>
              <input className={inpClass()} type="number" min={0} value={hocPhi} onChange={(e) => setHocPhi(e.target.value)} />
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Lưu
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setDau(ct.ngay_dau_ky ?? "");
                setCuoi(ct.ngay_cuoi_ky ?? "");
                setSt(ct.status ?? "");
                setHocPhi(
                  ct.hoc_phi_display != null && Number.isFinite(ct.hoc_phi_display)
                    ? String(ct.hoc_phi_display)
                    : ""
                );
                setErr(null);
                setEditing(false);
              }}
              className="rounded-lg border border-[#EAEAEA] bg-white px-3 py-1.5 text-[11px] font-semibold text-black/60"
            >
              Huỷ
            </button>
          </div>
        </>
      ) : (
        <>
          {[
            { label: "Ngày đầu kỳ", value: fmtDate(ct.ngay_dau_ky) },
            { label: "Ngày cuối kỳ", value: fmtDate(ct.ngay_cuoi_ky) },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b border-[#EAEAEA] py-1.5 text-[12px]">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">{row.label}</span>
              <span className="font-semibold text-[#1a1a2e]">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-b border-[#EAEAEA] py-1.5 text-[12px]">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Còn lại</span>
            <DaysRemainingBadge ngayCuoi={ct.ngay_cuoi_ky} />
          </div>
          <div className="flex items-center justify-between py-1.5 text-[12px]">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Học phí (ước tính)</span>
            <span className="font-bold text-[#1a1a2e]">{ct.hoc_phi_display != null ? fmtVnd(ct.hoc_phi_display) : "—"}</span>
          </div>
        </>
      )}
    </div>
  );
}

type Props = {
  bundle: AdminHoaDonBundle;
  days: number;
};

export default function QuanLyHoaDonView({ bundle, days }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  /** ID đơn đang chọn (có thể lệch bundle sau refresh — dùng `selectedIdValid` để bind UI). */
  const selectedIdValid = useMemo(() => {
    if (selectedId == null) return null;
    return bundle.dons.some((d) => d.id === selectedId) ? selectedId : null;
  }, [bundle.dons, selectedId]);

  const selected = useMemo(
    () => (selectedIdValid != null ? bundle.dons.find((d) => d.id === selectedIdValid) ?? null : null),
    [bundle.dons, selectedIdValid]
  );
  const selectedChi = useMemo(() => {
    if (selectedIdValid == null) return [];
    return bundle.chiByDonId[String(selectedIdValid)] ?? [];
  }, [bundle.chiByDonId, selectedIdValid]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bundle.dons.filter((d) => {
      if (filterStatus && String(d.status ?? "") !== filterStatus) return false;
      if (!q) return true;
      const hv = d.student != null ? bundle.hvNameById[String(d.student)] ?? "" : "";
      return (
        String(d.ma_don ?? "")
          .toLowerCase()
          .includes(q) ||
        String(d.ma_don_so ?? "")
          .toLowerCase()
          .includes(q) ||
        hv.toLowerCase().includes(q)
      );
    });
  }, [bundle.dons, bundle.hvNameById, filterStatus, query]);

  const stats = useMemo(() => {
    const total = bundle.dons.length;
    const daTT = bundle.dons.filter((d) => d.status === "Đã thanh toán").length;
    const cho = bundle.dons.filter((d) => d.status === "Chờ thanh toán").length;
    const huy = bundle.dons.filter((d) => d.status === "Đã hủy").length;
    return { total, daTT, cho, huy };
  }, [bundle.dons]);

  const setDays = useCallback(
    (d: number) => {
      setSelectedId(null);
      const p = new URLSearchParams();
      p.set("days", String(d));
      startTransition(() => {
        router.replace(`/admin/dashboard/quan-ly-hoa-don?${p.toString()}`);
      });
    },
    [router]
  );

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const STATUS_QUICK: { value: string; label: string; count: number }[] = [
    { value: "", label: "Tất cả", count: stats.total },
    { value: "Chờ thanh toán", label: "Chờ TT", count: stats.cho },
    { value: "Đã thanh toán", label: "Đã TT", count: stats.daTT },
    { value: "Đã hủy", label: "Huỷ", count: stats.huy },
  ];

  return (
    <div className="mx-auto flex h-[calc(100dvh-5.75rem)] min-h-[420px] w-full min-w-0 max-w-[1600px] flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        {/* —— Header: tiêu đề + khoảng thời gian + làm mới —— */}
        <header className="shrink-0 border-b border-black/[0.06] bg-gradient-to-br from-white via-[#fafafa] to-[#f8f5ff]/40 px-4 py-3 md:px-5 md:py-3.5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f8a668] to-[#ee5b9f] text-white shadow-md">
                <FileText size={22} strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="m-0 text-lg font-extrabold tracking-tight text-[#1a1a2e] md:text-[19px]">Quản lý hóa đơn</h1>
                <p className="mt-0.5 text-[12px] leading-snug text-black/50">{daysRangeLabel(days)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  disabled={isPending}
                  onClick={() => setDays(f.days)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition md:px-3",
                    days === f.days
                      ? "bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] text-white shadow-sm"
                      : "border border-black/[0.08] bg-white text-black/65 hover:border-[#BC8AF9]/40 hover:bg-violet-50/50"
                  )}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                disabled={isPending}
                onClick={refresh}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-bold text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} aria-hidden />
                Làm mới
              </button>
            </div>
          </div>

          {/* —— Lọc nhanh + tìm kiếm —— */}
          <div className="mt-3 flex flex-col gap-2.5 border-t border-black/[0.05] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Lọc theo trạng thái">
              {STATUS_QUICK.map((s) => {
                const active = filterStatus === s.value;
                return (
                  <button
                    key={s.value || "all"}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilterStatus(s.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition",
                      active
                        ? "border-transparent bg-[#1a1a2e] text-white shadow-sm"
                        : "border-black/[0.08] bg-white text-black/70 hover:border-black/15"
                    )}
                  >
                    {s.label}
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0 text-[10px] tabular-nums",
                        active ? "bg-white/15 text-white" : "bg-black/[0.06] text-black/55"
                      )}
                    >
                      {s.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative min-w-0 flex-1 sm:min-w-[200px] sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input
                className={cn(inpClass(), "h-10 pl-9 text-[13px]")}
                placeholder="Tìm mã CK, mã số, tên học viên…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Tìm trong danh sách đơn"
              />
            </div>
          </div>
        </header>

        {/* —— Nội dung: danh sách | chi tiết —— */}
        <div className="flex min-h-0 flex-1 flex-col bg-[#fafafa] lg:flex-row">
          <section
            className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-black/[0.06] bg-white lg:border-b-0 lg:border-r"
            aria-label="Danh sách đơn"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] bg-[#fafafa] px-3 py-2 md:px-4">
              <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-black/40">
                {filtered.length} đơn{query.trim() || filterStatus ? " (đã lọc)" : ""}
              </p>
              {filtered.length > 0 && bundle.dons.length > filtered.length ? (
                <p className="m-0 text-[10px] font-semibold text-black/35">Tổng tải: {bundle.dons.length}</p>
              ) : null}
            </div>
            <div
              className="min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              role="region"
              aria-label="Bảng đơn thu học phí"
            >
              {/* Hàng tiêu đề tách khỏi <table> — grid ngang khớp tỉ lệ colgroup, sticky trong vùng cuộn */}
              <div className="sticky top-0 z-[2] min-w-[800px] w-full border-b border-black/[0.08] bg-[#f4f4f5]">
                <div
                  role="row"
                  className="grid w-full text-[10px] font-extrabold uppercase leading-tight tracking-wide text-black/50"
                  style={{
                    gridTemplateColumns: "48px minmax(0,18fr) minmax(0,12fr) minmax(0,26fr) minmax(0,18fr) minmax(0,14fr) minmax(0,12fr)",
                  }}
                >
                  <div role="columnheader" className="box-border px-2 py-2.5 text-center md:px-3">
                    #
                  </div>
                  <div role="columnheader" className="box-border truncate px-2 py-2.5 md:px-3">
                    Mã CK
                  </div>
                  <div role="columnheader" className="box-border truncate px-2 py-2.5 md:px-3">
                    Mã số
                  </div>
                  <div role="columnheader" className="box-border truncate px-2 py-2.5 md:px-3">
                    Học viên
                  </div>
                  <div role="columnheader" className="box-border truncate px-2 py-2.5 md:px-3">
                    Tạo lúc
                  </div>
                  <div role="columnheader" className="box-border truncate px-2 py-2.5 md:px-3">
                    Trạng thái
                  </div>
                  <div role="columnheader" className="box-border truncate px-2 py-2.5 md:px-3">
                    Hình thức
                  </div>
                </div>
              </div>
              <table className="w-full min-w-[800px] table-fixed border-collapse text-left text-[13px]">
                <colgroup>
                  <col style={{ width: "48px" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "12%" }} />
                </colgroup>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <p className="m-0 text-sm font-semibold text-black/50">Không có đơn phù hợp.</p>
                        <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-black/40">
                          Thử đổi khoảng thời gian, bỏ lọc trạng thái hoặc xóa từ khóa tìm kiếm.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d, idx) => {
                      const active = selectedIdValid === d.id;
                      const hb = hinhBadge(d.hinh_thuc_thu);
                      const hv =
                        d.student != null ? bundle.hvNameById[String(d.student)] ?? `HV #${d.student}` : "—";
                      return (
                        <tr
                          key={d.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedId(d.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedId(d.id);
                            }
                          }}
                          className={cn(
                            "cursor-pointer border-b border-black/[0.04] transition-colors",
                            idx % 2 === 1 && "bg-black/[0.015]",
                            !active && "hover:bg-violet-50/40",
                            active && "bg-gradient-to-r from-violet-50 to-fuchsia-50/80 ring-1 ring-inset ring-[#BC8AF9]/25"
                          )}
                        >
                          <td className="whitespace-nowrap px-2 py-2.5 text-center text-[12px] font-bold text-black/35 md:px-3">
                            {idx + 1}
                          </td>
                          <td className="truncate px-2 py-2.5 font-semibold text-[#1a1a2e] md:px-3" title={d.ma_don?.trim() || undefined}>
                            {d.ma_don?.trim() || "—"}
                          </td>
                          <td className="truncate px-2 py-2.5 font-medium text-black/70 md:px-3" title={d.ma_don_so?.trim() || undefined}>
                            {d.ma_don_so?.trim() || "—"}
                          </td>
                          <td className="truncate px-2 py-2.5 font-medium text-[#1a1a2e] md:px-3" title={hv}>
                            {hv}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-[11px] tabular-nums text-black/55 md:px-3 md:text-[12px]">
                            {fmtDateTime(d.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 md:px-3">
                            <StatusBadge value={String(d.status ?? "—")} />
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 md:px-3">
                            <span
                              className="inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{ backgroundColor: hb.bg, color: hb.text }}
                              title={d.hinh_thuc_thu?.trim() || undefined}
                            >
                              {d.hinh_thuc_thu?.trim() || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Panel phải: chi tiết hoặc placeholder (desktop) */}
          <div className="flex min-h-0 w-full shrink-0 flex-col bg-[#fafafa] lg:w-[min(100%,420px)] lg:max-w-[40%] xl:max-w-[400px]">
            <AnimatePresence mode="wait" initial={false}>
              {selected ? (
                <motion.aside
                  key={`${selected.id}-${selected.ngay_thanh_toan ?? ""}-${selected.status ?? ""}-${String(selected.giam_gia ?? "")}-${selected.hinh_thuc_thu ?? ""}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-t border-black/[0.06] bg-white lg:min-h-0 lg:border-t-0"
                >
                  <DonDetailPanel
                    don={selected}
                    chi={selectedChi}
                    hvName={selected.student != null ? bundle.hvNameById[String(selected.student)] ?? null : null}
                    nsName={selected.nguoi_tao != null ? bundle.nsNameById[String(selected.nguoi_tao)] ?? null : null}
                    onClose={() => setSelectedId(null)}
                    onRefresh={refresh}
                  />
                </motion.aside>
              ) : (
                <motion.div
                  key="empty-detail"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="hidden min-h-0 flex-1 flex-col items-center justify-center gap-2 border-t border-black/[0.06] bg-gradient-to-b from-white to-[#fafafa] px-6 py-10 text-center lg:flex lg:border-t-0"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white text-black/25">
                    <FileText size={28} strokeWidth={1.5} aria-hidden />
                  </div>
                  <p className="m-0 max-w-[240px] text-[13px] font-semibold text-black/55">Chọn một đơn trong danh sách</p>
                  <p className="m-0 max-w-[260px] text-[11px] leading-relaxed text-black/40">
                    Chi tiết thanh toán và từng kỳ học phí hiển thị tại đây. Trên điện thoại, chọn dòng rồi cuộn xuống.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function DonDetailPanel({
  don,
  chi,
  hvName,
  nsName,
  onClose,
  onRefresh,
}: {
  don: AdminHpDonRow;
  chi: AdminChiTietDisplay[];
  hvName: string | null;
  nsName: string | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { canDelete: roleMayDeleteDon } = useAdminDashboardAbilities();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState(String(don.status ?? ""));
  const [editHinh, setEditHinh] = useState(String(don.hinh_thuc_thu ?? ""));
  const [editNgayTT, setEditNgayTT] = useState(
    don.ngay_thanh_toan != null ? String(don.ngay_thanh_toan).slice(0, 10) : ""
  );
  const [editGiam, setEditGiam] = useState(
    don.giam_gia != null && String(don.giam_gia).trim() !== "" ? String(parseMoney(don.giam_gia)) : ""
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sub = subtotalChi(chi);
  const giamVal = editGiam.trim() === "" ? 0 : Math.round(Number(editGiam) || 0);
  const previewTotal = Math.max(0, Math.round(sub - giamVal));

  const saveDon = async () => {
    setSaving(true);
    setErr(null);
    const res = await updateHpDonThu(don.id, {
      status: editStatus,
      hinh_thuc_thu: editHinh.trim() || null,
      ngay_thanh_toan: editNgayTT.trim() || null,
      giam_gia_dong: editGiam.trim() === "" ? null : giamVal,
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setEditing(false);
    startTransition(() => router.refresh());
    onRefresh();
  };

  const del = async () => {
    setDeleting(true);
    setErr(null);
    const res = await deleteHpDonThu(don.id);
    setDeleting(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    onClose();
    startTransition(() => router.refresh());
    onRefresh();
  };

  const title = don.ma_don?.trim() || don.ma_don_so?.trim() || `#${don.id}`;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/[0.06] bg-gradient-to-r from-[#f8a668]/12 via-white to-[#ee5b9f]/10 px-3 py-2.5 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-black/50 shadow-sm transition hover:bg-[#fafafa]"
          aria-label="Đóng chi tiết"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#ee5b9f]">Chi tiết đơn</p>
          <h2 className="m-0 truncate text-sm font-extrabold text-[#1a1a2e]">{title}</h2>
        </div>
        <StatusBadge value={String(don.status ?? "—")} />
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#f8a668]/35 bg-white px-2.5 py-1 text-[11px] font-bold text-[#c2410c] shadow-sm hover:bg-orange-50/80"
          >
            <Edit2 size={12} />
            Sửa
          </button>
        ) : (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDon()}
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Lưu
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditStatus(String(don.status ?? ""));
                setEditHinh(String(don.hinh_thuc_thu ?? ""));
                setEditNgayTT(don.ngay_thanh_toan != null ? String(don.ngay_thanh_toan).slice(0, 10) : "");
                setEditGiam(
                  don.giam_gia != null && String(don.giam_gia).trim() !== ""
                    ? String(parseMoney(don.giam_gia))
                    : ""
                );
                setErr(null);
                setEditing(false);
              }}
              className="rounded-lg border border-[#EAEAEA] bg-white px-2 py-1 text-[11px] font-semibold text-black/55"
            >
              <X className="inline h-3.5 w-3.5" /> Huỷ
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4">
        {err ? (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {err}
          </p>
        ) : null}

        <div className="rounded-xl border border-black/[0.05] bg-[#F5F7F7] p-3">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a1a2e]/55">Thông tin đơn</p>
          {[
            { k: "Mã đơn (CK)", v: don.ma_don?.trim() || "—" },
            { k: "Mã số", v: don.ma_don_so?.trim() || "—" },
            { k: "Học viên", v: hvName ?? "—" },
            { k: "Người tạo", v: nsName ?? "—" },
            { k: "Ngày tạo", v: fmtDateTime(don.created_at) },
          ].map((r) => (
            <div key={r.k} className="flex justify-between gap-3 border-b border-[#EAEAEA] py-1.5 text-[12px] last:border-0">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">{r.k}</span>
              <span className="max-w-[65%] text-right font-semibold text-[#1a1a2e]">{r.v}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-black/[0.05] bg-[#F5F7F7] p-3">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#ea580c]">Thanh toán</p>
          <div className="flex items-center justify-between border-b border-[#EAEAEA] py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Trạng thái</span>
            {editing ? (
              <select
                className={cn(inpClass(), "max-w-[200px] py-1.5 text-[12px]")}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <StatusBadge value={String(don.status ?? "—")} />
            )}
          </div>
          <div className="flex items-center justify-between border-b border-[#EAEAEA] py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Hình thức</span>
            {editing ? (
              <select
                className={cn(inpClass(), "max-w-[200px] py-1.5 text-[12px]")}
                value={editHinh}
                onChange={(e) => setEditHinh(e.target.value)}
              >
                <option value="">—</option>
                {HINH_THUC_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: hinhBadge(don.hinh_thuc_thu).bg,
                  color: hinhBadge(don.hinh_thuc_thu).text,
                }}
              >
                {don.hinh_thuc_thu?.trim() || "—"}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between border-b border-[#EAEAEA] py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Ngày thanh toán</span>
            {editing ? (
              <input className={cn(inpClass(), "max-w-[200px] py-1.5")} type="date" value={editNgayTT} onChange={(e) => setEditNgayTT(e.target.value)} />
            ) : (
              <span className="text-[12px] font-semibold text-[#1a1a2e]">{fmtDate(don.ngay_thanh_toan)}</span>
            )}
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Giảm giá (₫)</span>
            {editing ? (
              <input
                className={cn(inpClass(), "max-w-[200px] py-1.5 text-right")}
                type="number"
                min={0}
                value={editGiam}
                onChange={(e) => setEditGiam(e.target.value)}
                placeholder="0"
              />
            ) : (
              <span className="text-[12px] font-bold text-[#1a1a2e]">{fmtVnd(parseMoney(don.giam_gia))}</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-black/10 bg-white/80 px-2 py-1.5">
            <span className="text-[11px] font-bold text-black/55">Tổng (ước tính)</span>
            <span className="text-sm font-black text-[#1a1a2e]">{editing ? fmtVnd(previewTotal) : fmtVnd(totalDon(don, chi))}</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-black/40">Chi tiết kỳ học phí</p>
          {chi.length === 0 ? (
            <p className="text-[13px] font-semibold text-black/45">Không có dòng chi tiết.</p>
          ) : (
            chi.map((c, i) => (
              <ChiTietCard
                key={`${c.id}-${c.ngay_dau_ky ?? ""}-${c.ngay_cuoi_ky ?? ""}-${c.status ?? ""}-${c.hoc_phi_display ?? ""}`}
                ct={c}
                index={i}
                onSaved={() => startTransition(() => router.refresh())}
              />
            ))
          )}
        </div>

        <div className="border-t border-black/[0.06] pt-3">
          {roleMayDeleteDon ? (
            !confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 py-2 text-[12px] font-bold text-red-700 hover:bg-red-100"
              >
                <Trash2 size={14} />
                Xoá đơn…
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50/80 p-3">
                <p className="m-0 text-[12px] font-semibold text-red-800">
                  Xoá toàn bộ chi tiết và đơn này. Thao tác không hoàn tác.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void del()}
                    className="flex-1 rounded-lg bg-red-600 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                  >
                    {deleting ? "Đang xoá…" : "Xác nhận xoá"}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold text-black/70"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
