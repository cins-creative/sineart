"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Copy, LayoutGrid, LayoutList, Pencil, Plus, School, Search, X, Zap } from "lucide-react";

import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import type { LopHocFormState } from "@/app/admin/dashboard/lop-hoc/actions";
import { createLopHoc, deleteLopHoc, duplicateLopHoc, toggleLopSpecial, updateLopHoc } from "@/app/admin/dashboard/lop-hoc/actions";
import { cn } from "@/lib/utils";

const DS = {
  teacher: "#BC8AF9",
  border: "#EAEAEA",
  green: "#10b981",
};

const DEVICE_OPTS = ["Tablet", "Laptop"] as const;

const DEVICE_CFG: Record<string, { bg: string; text: string }> = {
  Tablet: { bg: "#eff6ff", text: "#2563eb" },
  Laptop: { bg: "#f0fdf4", text: "#16a34a" },
};

export type AdminLopRow = {
  id: number;
  class_name: string | null;
  class_full_name: string | null;
  mon_hoc: number | null;
  /** Mảng ID giáo viên (có thể rỗng). */
  teacher: number[];
  chi_nhanh_id: number | null;
  avatar: string | null;
  lich_hoc: string | null;
  url_class: string | null;
  url_google_meet: string | null;
  device: string | null;
  /** Lớp cấp tốc — theo cột `special`. */
  special: boolean;
  /** Lớp đang hoạt động — theo cột `tinh_trang`. */
  tinh_trang: boolean;
};

type MonOpt = { id: number; ten_mon_hoc: string | null };
type NsOpt = { id: number; full_name: string; avatar: string | null };
type ChiOpt = { id: number; ten: string };

type Props = {
  rows: AdminLopRow[];
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  /** Chỉ nhân sự thuộc ban Đào tạo — dùng trong picker. */
  pickerNhanSuList: NsOpt[];
  chiNhanhList: ChiOpt[];
  statsByLopId: Record<string, { dang_hoc: number; da_nghi: number }>;
  defaultChiNhanhId: number | null;
};

type HvStats = { dang_hoc: number; da_nghi: number };

const LOP_LIST_PAGE_SIZE = 10;

function getAccent(tenMon: string | null): string {
  if (!tenMon) return DS.teacher;
  const l = tenMon.toLowerCase();
  if (l.includes("hình họa") || l.includes("chân dung") || l.includes("tĩnh vật") || l.includes("ký họa")) {
    return "#D4920E";
  }
  if (l.includes("trang trí") || l.includes("màu nước")) return "#9B6FF0";
  if (l.includes("bố cục")) return "#0DA874";
  if (l.includes("digital")) return "#2074CA";
  return DS.teacher;
}

function getAccentText(accent: string): string {
  const m: Record<string, string> = {
    "#D4920E": "#713f12",
    "#9B6FF0": "#4a1d96",
    "#0DA874": "#065f46",
    "#2074CA": "#ffffff",
    [DS.teacher]: "#4a1d96",
  };
  return m[accent] ?? "#323232";
}

function inpClass(): string {
  return cn(
    "w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]",
    "outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
  );
}

function NsAvatar({ name, src, size = 28 }: { name: string; src?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (src && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,#BC8AF9,#ED5C9D)",
      }}
    >
      {initial}
    </div>
  );
}

/** Bộ chọn nhiều giáo viên — dropdown + checkbox. */
function TeacherMultiPicker({
  nhanSuList,
  value,
  onChange,
}: {
  nhanSuList: NsOpt[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const filtered = useMemo(
    () =>
      nhanSuList.filter(
        (n) => !search || n.full_name.toLowerCase().includes(search.toLowerCase()),
      ),
    [nhanSuList, search],
  );

  const selectedItems = useMemo(
    () =>
      value
        .map((id) => nhanSuList.find((n) => String(n.id) === id))
        .filter(Boolean) as NsOpt[],
    [value, nhanSuList],
  );

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-[38px] w-full items-center rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-1.5 text-left text-[13px] transition",
          "shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none",
          open
            ? "border-[#BC8AF9] ring-[3px] ring-[#BC8AF9]/15"
            : "hover:border-black/20 focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {selectedItems.length === 0 ? (
            <span className="text-[#AAAAAA]">— Chọn giáo viên —</span>
          ) : (
            selectedItems.map((ns) => (
              <span
                key={ns.id}
                className="flex items-center gap-1 rounded-full border border-[#BC8AF9]/25 bg-[#BC8AF9]/10 px-2 py-0.5"
              >
                <NsAvatar name={ns.full_name} src={ns.avatar} size={16} />
                <span className="text-[11px] font-semibold text-[#4a1d96]">{ns.full_name}</span>
              </span>
            ))
          )}
        </span>
        <ChevronDown
          size={15}
          className={cn(
            "ml-2 shrink-0 text-[#AAAAAA] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[10px] border border-[#EAEAEA] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
          {/* Search */}
          <div className="border-b border-[#EAEAEA] p-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-[#EAEAEA] bg-[#fafafa] px-2 py-1.5">
              <Search size={12} className="shrink-0 text-[#AAAAAA]" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên giáo viên…"
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#BBBBBB]"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-[#AAAAAA] hover:text-[#666]">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-center text-[12px] text-[#BBBBBB]">
                Không tìm thấy giáo viên phù hợp
              </div>
            ) : (
              filtered.map((n) => {
                const idStr = String(n.id);
                const checked = value.includes(idStr);
                return (
                  <label
                    key={n.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors",
                      checked ? "bg-[#BC8AF9]/08" : "hover:bg-[#fafafa]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(idStr)}
                      className="h-3.5 w-3.5 cursor-pointer rounded accent-[#BC8AF9]"
                    />
                    <NsAvatar name={n.full_name} src={n.avatar} size={22} />
                    <span
                      className={cn(
                        "flex-1 text-[12px]",
                        checked ? "font-semibold text-[#1a1a2e]" : "text-[#323232]",
                      )}
                    >
                      {n.full_name}
                    </span>
                    {checked && (
                      <span className="text-[10px] font-bold text-[#BC8AF9]">✓</span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#EAEAEA] bg-[#fafafa] px-3 py-2">
            <span className="text-[11px] text-[#AAAAAA]">
              {value.length > 0 ? `${value.length} đã chọn` : "Chưa chọn ai"}
            </span>
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-red-400 transition-colors hover:text-red-600"
              >
                Xóa tất cả
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LopHocCard({
  item,
  monList,
  nhanSuList,
  hvStats,
  isSelected,
  onClick,
}: {
  item: AdminLopRow;
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  hvStats: HvStats | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tenMon = monList.find((m) => m.id === item.mon_hoc)?.ten_mon_hoc ?? null;
  const gvList = item.teacher
    .map((id) => nhanSuList.find((n) => n.id === id))
    .filter(Boolean) as NsOpt[];
  const firstGv = gvList[0] ?? null;
  const extraCount = gvList.length - 1;
  const devCfg = item.device ? DEVICE_CFG[item.device] ?? { bg: "#f3f4f6", text: "#6b7280" } : null;
  const accent = getAccent(tenMon);
  const aText = getAccentText(accent);
  const [imgErr, setImgErr] = useState(false);
  const [toggling, setToggling] = useState(false);

  const inactive = !item.tinh_trang;

  async function handleSpecialToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    try {
      await toggleLopSpecial(item.id, !item.special);
    } finally {
      setToggling(false);
    }
  }

  const subTitle =
    hvStats != null
      ? `${hvStats.dang_hoc} đang học${hvStats.da_nghi > 0 ? ` · ${hvStats.da_nghi} đã nghỉ` : ""}`
      : "—";

  return (
    <motion.div
      role="button"
      tabIndex={inactive ? -1 : 0}
      layout
      onClick={inactive ? undefined : onClick}
      onKeyDown={(e) => {
        if (!inactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      whileHover={inactive ? {} : { y: -2, borderColor: DS.teacher }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-2xl border-[1.5px] bg-white text-left shadow-sm outline-none",
        inactive
          ? "cursor-not-allowed opacity-55 grayscale-[40%]"
          : "cursor-pointer focus-visible:ring-2 focus-visible:ring-[#BC8AF9]/40",
        isSelected && !inactive && "ring-2 ring-[#BC8AF9]/25",
      )}
      style={{
        borderColor: inactive ? "#E0E0E0" : isSelected ? DS.teacher : DS.border,
        boxShadow:
          inactive
            ? "none"
            : isSelected
              ? "0 6px 20px rgba(188,138,249,0.18)"
              : "0 1px 4px rgba(0,0,0,.06)",
      }}
    >
      {/* ── Image area ─────────────────────────── */}
      <div className="relative aspect-[16/7] w-full bg-[#F5F7F7]">
        {item.avatar && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatar}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🏫</div>
        )}
        {/* Device badge — top left */}
        {devCfg && item.device ? (
          <div
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm"
            style={{ background: devCfg.bg, color: devCfg.text }}
          >
            {item.device}
          </div>
        ) : null}
        {/* Cấp tốc quick-toggle — top right */}
        <button
          type="button"
          title={item.special ? "Bỏ cấp tốc" : "Đánh dấu cấp tốc"}
          disabled={toggling}
          onClick={handleSpecialToggle}
          className={cn(
            "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-all disabled:opacity-50",
            item.special
              ? "border-orange-300/60 bg-gradient-to-br from-orange-400 to-red-400 text-white shadow-sm"
              : "border-white/60 bg-black/20 text-white/70 backdrop-blur-sm hover:bg-black/35",
          )}
        >
          <Zap size={11} strokeWidth={2.5} fill={item.special ? "currentColor" : "none"} />
        </button>
        {/* Môn học badge — bottom right of image */}
        {tenMon ? (
          <div
            className="absolute bottom-2 right-2 max-w-[min(100%,12rem)] truncate rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-sm"
            style={{
              background: `${accent}f0`,
              color: aText,
              borderColor: `${accent}55`,
            }}
          >
            {tenMon}
          </div>
        ) : null}
      </div>

      {/* ── Card body ──────────────────────────── */}
      <div className="flex flex-1 flex-col px-3.5 pb-2.5 pt-3">
        <p className="m-0 line-clamp-2 text-sm font-bold text-[#1a1a2e]">
          {item.class_name || item.class_full_name || "—"}
        </p>
        {item.class_full_name && item.class_name ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[#AAAAAA]">{item.class_full_name}</p>
        ) : null}
        {firstGv ? (
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <NsAvatar name={firstGv.full_name} src={firstGv.avatar} size={22} />
            <span className="truncate text-[11px] font-semibold text-[#666]">{firstGv.full_name}</span>
            {extraCount > 0 ? (
              <span className="shrink-0 rounded-full border border-[#BC8AF9]/40 bg-[#BC8AF9]/10 px-1.5 py-px text-[10px] font-bold text-[#BC8AF9]">
                +{extraCount}
              </span>
            ) : null}
          </div>
        ) : null}
        {item.lich_hoc ? (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#888]">
            <Calendar className="h-3 w-3 shrink-0 text-[#AAAAAA]" />
            <span className="line-clamp-1">{item.lich_hoc}</span>
          </div>
        ) : null}
        <p className="mt-1 text-[11px] tabular-nums text-[#AAAAAA]">{subTitle}</p>
      </div>

      {/* ── Footer ─────────────────────────────── */}
      <div className="flex items-center border-t border-[#F5F7F7]">
        <span className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[#888]">
          {inactive ? "Không hoạt động" : "Chi tiết"}
        </span>
        {/* Cấp tốc badge — bottom right */}
        {item.special ? (
          <span className="mr-2 rounded-full border border-orange-300/60 bg-gradient-to-r from-orange-400 to-red-400 px-2 py-0.5 text-[10px] font-bold text-white">
            ⚡ Cấp tốc
          </span>
        ) : null}
        {item.url_class ? (
          <a
            href={item.url_class}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center border-l border-[#F5F7F7] px-3.5 py-2.5 text-[#AAAAAA] transition hover:bg-[#BC8AF9]/10 hover:text-[#BC8AF9]"
            title="Mở URL lớp"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            🔗
          </a>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Dạng hàng ngang cho list view */
function LopHocListRow({
  item,
  monList,
  nhanSuList,
  hvStats,
  isSelected,
  onClick,
}: {
  item: AdminLopRow;
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  hvStats: HvStats | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tenMon = monList.find((m) => m.id === item.mon_hoc)?.ten_mon_hoc ?? null;
  const gvList = item.teacher.map((id) => nhanSuList.find((n) => n.id === id)).filter(Boolean) as NsOpt[];
  const accent = getAccent(tenMon);
  const aText = getAccentText(accent);
  const devCfg = item.device ? DEVICE_CFG[item.device] ?? { bg: "#f3f4f6", text: "#6b7280" } : null;
  const inactive = !item.tinh_trang;
  const [imgErr, setImgErr] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleSpecialToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    try {
      await toggleLopSpecial(item.id, !item.special);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={inactive ? -1 : 0}
      onClick={inactive ? undefined : onClick}
      onKeyDown={(e) => {
        if (!inactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex items-center gap-3 border-b border-[#F5F7F7] px-4 py-2.5 text-left transition-colors",
        inactive
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-[#fafafa]",
        isSelected && !inactive && "bg-[#BC8AF9]/06",
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#F5F7F7]">
        {item.avatar && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatar}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-base">🏫</div>
        )}
      </div>

      {/* Class name */}
      <div className="min-w-0 w-[180px] shrink-0">
        <div className="flex items-center gap-1.5">
          <p className="m-0 truncate text-[13px] font-bold text-[#1a1a2e]">
            {item.class_name || item.class_full_name || "—"}
          </p>
          {/* Cấp tốc quick-toggle */}
          <button
            type="button"
            title={item.special ? "Bỏ cấp tốc" : "Đánh dấu cấp tốc"}
            disabled={toggling}
            onClick={handleSpecialToggle}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all disabled:opacity-50",
              item.special
                ? "border-orange-300/60 bg-gradient-to-br from-orange-400 to-red-400 text-white"
                : "border-[#E5E5E5] bg-white text-[#CCCCCC] hover:border-orange-300 hover:text-orange-400",
            )}
          >
            <Zap size={9} strokeWidth={2.5} fill={item.special ? "currentColor" : "none"} />
          </button>
        </div>
        {item.class_full_name && item.class_name ? (
          <p className="m-0 truncate text-[10px] text-[#AAAAAA]">{item.class_full_name}</p>
        ) : null}
      </div>

      {/* Mon */}
      <div className="w-[120px] shrink-0">
        {tenMon ? (
          <span
            className="inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${accent}20`, color: aText, borderColor: `${accent}55` }}
          >
            {tenMon}
          </span>
        ) : <span className="text-[11px] text-[#DDD]">—</span>}
      </div>

      {/* Teachers */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {gvList.length === 0 ? (
          <span className="text-[11px] text-[#CCCCCC]">—</span>
        ) : gvList.map((gv) => (
          <span key={gv.id} className="flex items-center gap-1">
            <NsAvatar name={gv.full_name} src={gv.avatar} size={18} />
            <span className="max-w-[80px] truncate text-[11px] font-medium text-[#555]">{gv.full_name}</span>
          </span>
        ))}
      </div>

      {/* Lich hoc */}
      {item.lich_hoc ? (
        <div className="hidden w-[110px] shrink-0 items-center gap-1 text-[11px] text-[#888] md:flex">
          <Calendar className="h-3 w-3 shrink-0 text-[#CCCCCC]" />
          <span className="truncate">{item.lich_hoc}</span>
        </div>
      ) : <div className="hidden w-[110px] shrink-0 md:block" />}

      {/* Device */}
      {devCfg && item.device ? (
        <span
          className="hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-block"
          style={{ background: devCfg.bg, color: devCfg.text }}
        >
          {item.device}
        </span>
      ) : null}

      {/* Stats */}
      <div className="w-[56px] shrink-0 text-right text-[11px] tabular-nums text-[#AAAAAA]">
        {hvStats != null ? (
          <span>{hvStats.dang_hoc} HV</span>
        ) : "—"}
      </div>

      {/* Status */}
      {inactive ? (
        <span className="hidden shrink-0 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[9px] font-semibold text-gray-400 sm:inline-block">
          Không HĐ
        </span>
      ) : null}

      {/* Arrow */}
      <ChevronRight size={14} className="shrink-0 text-[#CCCCCC]" />
    </div>
  );
}

type DetailForm = {
  class_name: string;
  class_full_name: string;
  mon_hoc: string;
  /** Mảng string ID giáo viên. */
  teacher: string[];
  chi_nhanh_id: string;
  device: string;
  lich_hoc: string;
  avatar: string;
  special: boolean;
  tinh_trang: boolean;
};

function rowToForm(r: AdminLopRow): DetailForm {
  return {
    class_name: r.class_name ?? "",
    class_full_name: r.class_full_name ?? "",
    mon_hoc: r.mon_hoc != null ? String(r.mon_hoc) : "",
    teacher: r.teacher.map(String),
    chi_nhanh_id: r.chi_nhanh_id != null ? String(r.chi_nhanh_id) : "",
    device: r.device ?? "",
    lich_hoc: r.lich_hoc ?? "",
    avatar: r.avatar ?? "",
    special: r.special,
    tinh_trang: r.tinh_trang,
  };
}

function LopDetailPanel({
  item,
  monList,
  nhanSuList,
  pickerNhanSuList,
  chiNhanhList,
  hvStats,
  onClose,
}: {
  item: AdminLopRow;
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  pickerNhanSuList: NsOpt[];
  chiNhanhList: ChiOpt[];
  hvStats: HvStats | null;
  onClose: () => void;
}) {
  const { canDelete } = useAdminDashboardAbilities();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DetailForm>(() => rowToForm(item));
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, startTransition] = useTransition();
  const [delBusy, setDelBusy] = useState(false);
  const [dupBusy, setDupBusy] = useState(false);

  useEffect(() => {
    setForm(rowToForm(item));
    setEditing(false);
    setErr(null);
    setConfirmDel(false);
  }, [item]);

  const tenMon = monList.find((m) => m.id === item.mon_hoc)?.ten_mon_hoc ?? null;
  const gvList = item.teacher
    .map((id) => nhanSuList.find((n) => n.id === id))
    .filter(Boolean) as NsOpt[];
  const devCfg = item.device ? DEVICE_CFG[item.device] ?? { bg: "#f3f4f6", text: "#6b7280" } : null;

  function setK<K extends keyof DetailForm>(k: K, v: DetailForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function save() {
    setErr(null);
    const fd = new FormData();
    fd.set("id", String(item.id));
    fd.set("class_name", form.class_name);
    fd.set("class_full_name", form.class_full_name);
    fd.set("mon_hoc", form.mon_hoc);
    form.teacher.forEach((id) => fd.append("teacher", id));
    fd.set("chi_nhanh_id", form.chi_nhanh_id);
    fd.set("device", form.device);
    fd.set("lich_hoc", form.lich_hoc);
    fd.set("avatar", form.avatar);
    fd.set("special", form.special ? "1" : "");
    fd.set("tinh_trang", form.tinh_trang ? "1" : "");
    startTransition(async () => {
      const r = await updateLopHoc(null, fd);
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else if (!r.ok) {
        setErr(r.error);
      }
    });
  }

  async function remove() {
    setDelBusy(true);
    setErr(null);
    try {
      const r = await deleteLopHoc(item.id);
      if (r.ok) {
        onClose();
        router.refresh();
      } else if (!r.ok) {
        setErr(r.error);
      }
    } finally {
      setDelBusy(false);
    }
  }

  async function duplicate() {
    setDupBusy(true);
    setErr(null);
    try {
      const r = await duplicateLopHoc(item.id);
      if (r.ok) {
        router.refresh();
      } else {
        setErr(r.error);
      }
    } finally {
      setDupBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div
        className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-black/[0.06] px-4 py-3.5"
        style={{ background: "linear-gradient(135deg,#BC8AF910,#ED5C9D08)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-[#888] hover:bg-white"
          aria-label="Đóng"
        >
          <ChevronLeft size={16} />
        </button>
        {item.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatar}
            alt=""
            className="h-[42px] w-[42px] shrink-0 rounded-[10px] object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] text-xl" style={{ background: "linear-gradient(135deg,#BC8AF9,#ED5C9D)" }}>
            🏫
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-[15px] font-extrabold text-[#1a1a2e]">
            {item.class_full_name || item.class_name || "—"}
          </h2>
          <div className="mt-1 flex flex-wrap gap-1">
            {item.class_name && item.class_full_name ? (
              <span
                className="rounded-full px-2 py-px text-[10px] font-semibold"
                style={{ color: DS.teacher, background: `${DS.teacher}22` }}
              >
                {item.class_name}
              </span>
            ) : null}
            {devCfg && item.device ? (
              <span className="rounded-full px-2 py-px text-[10px] font-bold" style={{ background: devCfg.bg, color: devCfg.text }}>
                {item.device}
              </span>
            ) : null}
            {item.special ? (
              <span className="rounded-full border border-orange-300/60 bg-gradient-to-r from-orange-400 to-red-400 px-2 py-px text-[10px] font-bold text-white">
                Cấp tốc
              </span>
            ) : null}
            {!item.tinh_trang ? (
              <span className="rounded-full border border-gray-300 bg-gray-100 px-2 py-px text-[10px] font-semibold text-gray-500">
                Không hoạt động
              </span>
            ) : null}
          </div>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#666] hover:bg-white"
          >
            <Pencil size={13} /> Sửa
          </button>
        ) : (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(rowToForm(item));
                setErr(null);
              }}
              className="rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[11px] text-[#666]"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-gradient-to-r from-[#BC8AF9] to-[#ED5C9D] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {pending ? "Lưu…" : "✓ Lưu"}
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">✕ {err}</div>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[14px] border border-emerald-200/50 bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] p-3.5">
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-emerald-600">Đang học</p>
            <p className="m-0 mt-1.5 text-3xl font-extrabold leading-none text-emerald-600">{hvStats?.dang_hoc ?? "—"}</p>
            <p className="mt-1 text-[10px] text-emerald-600/80">học viên</p>
          </div>
          <div className="rounded-[14px] border border-slate-200/80 bg-gradient-to-br from-slate-400/10 to-slate-400/[0.02] p-3.5">
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Đã nghỉ</p>
            <p className="m-0 mt-1.5 text-3xl font-extrabold leading-none text-slate-600">{hvStats?.da_nghi ?? "—"}</p>
            <p className="mt-1 text-[10px] text-slate-500">học viên</p>
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: DS.teacher }}>
            Thông tin lớp
          </p>
          {editing ? (
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Tên lớp đầy đủ</div>
                <input className={inpClass()} value={form.class_full_name} onChange={(e) => setK("class_full_name", e.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Tên lớp rút gọn</div>
                <input className={inpClass()} value={form.class_name} onChange={(e) => setK("class_name", e.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Môn học</div>
                <select className={inpClass()} value={form.mon_hoc} onChange={(e) => setK("mon_hoc", e.target.value)}>
                  <option value="">— Chọn —</option>
                  {monList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.ten_mon_hoc ?? `#${m.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Chi nhánh</div>
                <select className={inpClass()} value={form.chi_nhanh_id} onChange={(e) => setK("chi_nhanh_id", e.target.value)}>
                  <option value="">— Chọn —</option>
                  {chiNhanhList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ten}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Giáo viên</div>
                <TeacherMultiPicker
                  nhanSuList={pickerNhanSuList}
                  value={form.teacher}
                  onChange={(ids) => setK("teacher", ids)}
                />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Thiết bị</div>
                <select className={inpClass()} value={form.device} onChange={(e) => setK("device", e.target.value)}>
                  <option value="">— Chọn —</option>
                  {DEVICE_OPTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Lịch học</div>
                <input
                  className={inpClass()}
                  value={form.lich_hoc}
                  onChange={(e) => setK("lich_hoc", e.target.value)}
                  placeholder="T2, T4, T6 — 8:00"
                />
              </div>
              {/* Toggles */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setK("special", !form.special)}
                  className={cn(
                    "flex flex-1 items-center justify-between rounded-[10px] border px-3 py-2 text-[12px] font-semibold transition-colors",
                    form.special
                      ? "border-orange-300/60 bg-gradient-to-r from-orange-50 to-red-50 text-orange-700"
                      : "border-[#EAEAEA] bg-white text-[#888]",
                  )}
                >
                  <span>Cấp tốc</span>
                  <span className={cn(
                    "ml-2 h-4 w-4 rounded-full border-2 transition-colors",
                    form.special ? "border-orange-400 bg-orange-400" : "border-[#CCCCCC] bg-white",
                  )} />
                </button>
                <button
                  type="button"
                  onClick={() => setK("tinh_trang", !form.tinh_trang)}
                  className={cn(
                    "flex flex-1 items-center justify-between rounded-[10px] border px-3 py-2 text-[12px] font-semibold transition-colors",
                    form.tinh_trang
                      ? "border-emerald-300/60 bg-emerald-50 text-emerald-700"
                      : "border-[#EAEAEA] bg-white text-[#888]",
                  )}
                >
                  <span>{form.tinh_trang ? "Hoạt động" : "Không HĐ"}</span>
                  <span className={cn(
                    "ml-2 h-4 w-4 rounded-full border-2 transition-colors",
                    form.tinh_trang ? "border-emerald-500 bg-emerald-500" : "border-[#CCCCCC] bg-white",
                  )} />
                </button>
              </div>
            </div>
          ) : (
            <dl className="m-0 space-y-2 text-[13px]">
              <div className="flex justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Tên lớp</dt>
                <dd className="m-0 font-semibold text-gray-800">{item.class_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Tên đầy đủ</dt>
                <dd className="m-0 text-right font-semibold text-gray-800">{item.class_full_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Môn học</dt>
                <dd className="m-0 font-semibold" style={{ color: DS.teacher }}>
                  {tenMon ?? "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="shrink-0 text-[10px] font-bold uppercase text-[#AAA]">Giáo viên</dt>
                <dd className="m-0 flex flex-col items-end gap-1">
                  {gvList.length > 0 ? (
                    gvList.map((gv) => (
                      <span key={gv.id} className="flex items-center gap-2">
                        <NsAvatar name={gv.full_name} src={gv.avatar} size={28} />
                        <span className="font-bold text-pink-500">{gv.full_name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Thiết bị</dt>
                <dd className="m-0 font-semibold">{item.device ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Lịch học</dt>
                <dd className="m-0 font-semibold text-gray-700">{item.lich_hoc ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Cấp tốc</dt>
                <dd className="m-0">
                  {item.special ? (
                    <span className="rounded-full border border-orange-300/60 bg-gradient-to-r from-orange-400 to-red-400 px-2 py-0.5 text-[10px] font-bold text-white">
                      Cấp tốc
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#CCCCCC]">Không</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Tình trạng</dt>
                <dd className="m-0">
                  {item.tinh_trang ? (
                    <span className="rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      Không hoạt động
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {editing ? (
          <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
            <AdminCfImageInput
              label="Ảnh lớp"
              name="avatar"
              value={form.avatar}
              onValueChange={(u) => setK("avatar", u)}
            />
          </div>
        ) : null}

        {!editing && canDelete ? (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={dupBusy}
              onClick={duplicate}
              className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#BC8AF9]/40 bg-[#BC8AF9]/06 py-2 text-xs font-semibold text-[#BC8AF9] transition-colors hover:bg-[#BC8AF9]/12 disabled:opacity-50"
            >
              <Copy size={13} />
              {dupBusy ? "Đang nhân bản…" : "Nhân bản lớp này"}
            </button>
            {confirmDel ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px]">
                <p className="m-0 mb-2 font-semibold text-red-800">Xóa «{item.class_full_name || item.class_name || "lớp"}»?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmDel(false)} className="flex-1 rounded-lg border border-red-200 bg-white py-2 text-xs font-semibold text-red-700">
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={delBusy}
                    onClick={remove}
                    className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {delBusy ? "…" : "Xóa"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDel(true)}
                className="w-full rounded-[10px] border border-red-200 bg-red-50 py-2 text-xs font-semibold text-red-600"
              >
                🗑 Xóa lớp học này
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateLopModal({
  open,
  onClose,
  monList,
  pickerNhanSuList,
  chiNhanhList,
  defaultChiNhanhId,
}: {
  open: boolean;
  onClose: () => void;
  monList: MonOpt[];
  pickerNhanSuList: NsOpt[];
  chiNhanhList: ChiOpt[];
  defaultChiNhanhId: number | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createLopHoc, null as LopHocFormState | null);
  const [createTeachers, setCreateTeachers] = useState<string[]>([]);
  const [createSpecial, setCreateSpecial] = useState(false);
  const [createTinhTrang, setCreateTinhTrang] = useState(true);

  useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-visible rounded-[20px] bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest" style={{ color: DS.teacher }}>
              Tạo mới
            </p>
            <h2 className="m-0 text-base font-extrabold text-[#1a1a2e]">Lớp học mới</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] text-[#888]">
            <X size={16} />
          </button>
        </div>
        <form key="create-lop" action={action} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {state?.ok === false ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{state.error}</div>
            ) : null}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Tên rút gọn</div>
                <input name="class_name" className={inpClass()} placeholder="VD: HH01" />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Tên đầy đủ *</div>
                <input name="class_full_name" required className={inpClass()} placeholder="VD: Hình họa Online K1" />
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Môn học</div>
              <select name="mon_hoc" className={inpClass()} defaultValue="">
                <option value="">— Chọn môn học —</option>
                {monList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.ten_mon_hoc ?? `#${m.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Chi nhánh</div>
              <select name="chi_nhanh_id" className={inpClass()} defaultValue={defaultChiNhanhId != null ? String(defaultChiNhanhId) : ""}>
                <option value="">— Chọn chi nhánh —</option>
                {chiNhanhList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.ten}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Giáo viên</div>
              <TeacherMultiPicker
                nhanSuList={pickerNhanSuList}
                value={createTeachers}
                onChange={setCreateTeachers}
              />
              {createTeachers.map((id) => (
                <input key={id} type="hidden" name="teacher" value={id} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Thiết bị</div>
                <select name="device" className={inpClass()} defaultValue="">
                  <option value="">— Chọn —</option>
                  {DEVICE_OPTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Lịch học</div>
                <input name="lich_hoc" className={inpClass()} placeholder="T2, T4, T6 — 8:00" />
              </div>
            </div>
            <AdminCfImageInput label="Ảnh lớp" name="avatar" defaultValue="" />
            {/* Toggles */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCreateSpecial((v) => !v)}
                className={cn(
                  "flex flex-1 items-center justify-between rounded-[10px] border px-3 py-2 text-[12px] font-semibold transition-colors",
                  createSpecial
                    ? "border-orange-300/60 bg-gradient-to-r from-orange-50 to-red-50 text-orange-700"
                    : "border-[#EAEAEA] bg-white text-[#888]",
                )}
              >
                <span>Cấp tốc</span>
                <span className={cn(
                  "ml-2 h-4 w-4 rounded-full border-2 transition-colors",
                  createSpecial ? "border-orange-400 bg-orange-400" : "border-[#CCCCCC] bg-white",
                )} />
              </button>
              <button
                type="button"
                onClick={() => setCreateTinhTrang((v) => !v)}
                className={cn(
                  "flex flex-1 items-center justify-between rounded-[10px] border px-3 py-2 text-[12px] font-semibold transition-colors",
                  createTinhTrang
                    ? "border-emerald-300/60 bg-emerald-50 text-emerald-700"
                    : "border-[#EAEAEA] bg-white text-[#888]",
                )}
              >
                <span>{createTinhTrang ? "Hoạt động" : "Không HĐ"}</span>
                <span className={cn(
                  "ml-2 h-4 w-4 rounded-full border-2 transition-colors",
                  createTinhTrang ? "border-emerald-500 bg-emerald-500" : "border-[#CCCCCC] bg-white",
                )} />
              </button>
            </div>
            <input type="hidden" name="special" value={createSpecial ? "1" : ""} />
            <input type="hidden" name="tinh_trang" value={createTinhTrang ? "1" : ""} />
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-[#f0f0f0] px-5 py-3">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] text-[#666]">
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-[10px] bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {pending ? "Đang tạo…" : "✓ Tạo lớp học"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function LopHocListView({
  rows,
  monList,
  nhanSuList,
  pickerNhanSuList,
  chiNhanhList,
  statsByLopId,
  defaultChiNhanhId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(960);
  const [lopSearch, setLopSearch] = useState("");
  const [filterMon, setFilterMon] = useState<number | "">("");
  const [filterSpecial, setFilterSpecial] = useState(false);
  const [filterTinhTrang, setFilterTinhTrang] = useState<"" | "active" | "inactive">("");
  const [lopListPage, setLopListPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "row">("grid");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = w < 580;

  const filteredLop = useMemo(() => {
    const s = lopSearch.toLowerCase().trim();
    return rows.filter((l) => {
      const nameHit =
        !s ||
        (l.class_full_name ?? "").toLowerCase().includes(s) ||
        (l.class_name ?? "").toLowerCase().includes(s);
      const gvHit = l.teacher.some((tid) => {
        const gv = nhanSuList.find((n) => n.id === tid);
        return gv ? gv.full_name.toLowerCase().includes(s) : false;
      });
      const monOk = filterMon === "" || l.mon_hoc === filterMon;
      const specialOk = !filterSpecial || l.special === true;
      const tinhTrangOk =
        filterTinhTrang === "" ||
        (filterTinhTrang === "active" && l.tinh_trang) ||
        (filterTinhTrang === "inactive" && !l.tinh_trang);
      return (nameHit || gvHit) && monOk && specialOk && tinhTrangOk;
    });
  }, [rows, lopSearch, filterMon, filterSpecial, filterTinhTrang, nhanSuList]);

  useEffect(() => {
    setLopListPage(1);
  }, [lopSearch, filterMon, filterSpecial, filterTinhTrang]);

  const lopTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredLop.length / LOP_LIST_PAGE_SIZE)),
    [filteredLop.length],
  );

  useEffect(() => {
    setLopListPage((p) => Math.min(Math.max(1, p), lopTotalPages));
  }, [lopTotalPages]);

  const pagedFilteredLop = useMemo(() => {
    const start = (lopListPage - 1) * LOP_LIST_PAGE_SIZE;
    return filteredLop.slice(start, start + LOP_LIST_PAGE_SIZE);
  }, [filteredLop, lopListPage]);

  const { tongDangHoc, tongDaNghi } = useMemo(() => {
    let d = 0;
    let n = 0;
    for (const r of rows) {
      const st = statsByLopId[String(r.id)];
      if (st) {
        d += st.dang_hoc;
        n += st.da_nghi;
      }
    }
    return { tongDangHoc: d, tongDaNghi: n };
  }, [rows, statsByLopId]);

  const selected = selectedId != null ? rows.find((r) => r.id === selectedId) ?? null : null;

  return (
    <div ref={containerRef} className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <School className="text-white" size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Quản lý lớp học</div>
            <div className="text-xs text-[#AAAAAA]">
              {rows.length} lớp · {tongDangHoc} học viên đang học
              {tongDaNghi > 0 ? ` · ${tongDaNghi} đã nghỉ` : ""}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-[#EAEAEA] bg-[#fafafa] p-0.5">
            <button
              type="button"
              title="Dạng lưới"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-white text-[#BC8AF9] shadow-sm"
                  : "text-[#AAAAAA] hover:text-[#666]",
              )}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              title="Dạng danh sách"
              onClick={() => setViewMode("row")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                viewMode === "row"
                  ? "bg-white text-[#BC8AF9] shadow-sm"
                  : "text-[#AAAAAA] hover:text-[#666]",
              )}
            >
              <LayoutList size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus size={15} /> Lớp học mới
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
          <div className="mx-auto flex min-h-[min(64vh,560px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="shrink-0 space-y-2 border-b border-[#EAEAEA] bg-white px-6 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input
                value={lopSearch}
                onChange={(e) => setLopSearch(e.target.value)}
                placeholder="Tìm tên lớp, giáo viên…"
                className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-white pl-9 pr-9 text-xs text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
              />
              {lopSearch ? (
                <button
                  type="button"
                  aria-label="Xóa tìm"
                  onClick={() => setLopSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/60"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterMon("")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  filterMon === "" ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]" : "border-[#EAEAEA] text-black/50"
                )}
              >
                Tất cả
              </button>
              {monList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFilterMon(filterMon === m.id ? "" : m.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    filterMon === m.id ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]" : "border-[#EAEAEA] text-black/50"
                  )}
                >
                  {m.ten_mon_hoc ?? `#${m.id}`}
                </button>
              ))}
            </div>
            {/* Filter row 2 — cấp tốc + tình trạng */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCCCCC]">Lọc:</span>
              {/* Cấp tốc toggle */}
              <button
                type="button"
                onClick={() => setFilterSpecial((v) => !v)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  filterSpecial
                    ? "border-orange-300 bg-gradient-to-r from-orange-400/20 to-red-400/20 text-orange-600"
                    : "border-[#EAEAEA] text-black/50 hover:border-orange-200 hover:text-orange-500",
                )}
              >
                <Zap size={10} strokeWidth={2.5} fill={filterSpecial ? "currentColor" : "none"} />
                Cấp tốc
              </button>
              {/* Tình trạng hoạt động */}
              <button
                type="button"
                onClick={() => setFilterTinhTrang(filterTinhTrang === "active" ? "" : "active")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  filterTinhTrang === "active"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-[#EAEAEA] text-black/50 hover:border-emerald-200 hover:text-emerald-600",
                )}
              >
                ✓ Đang HĐ
              </button>
              <button
                type="button"
                onClick={() => setFilterTinhTrang(filterTinhTrang === "inactive" ? "" : "inactive")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  filterTinhTrang === "inactive"
                    ? "border-gray-400 bg-gray-100 text-gray-600"
                    : "border-[#EAEAEA] text-black/50 hover:border-gray-300 hover:text-gray-500",
                )}
              >
                Ngừng HĐ
              </button>
              {/* Reset tất cả filter */}
              {(filterSpecial || filterTinhTrang !== "" || filterMon !== "" || lopSearch) ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSpecial(false);
                    setFilterTinhTrang("");
                    setFilterMon("");
                    setLopSearch("");
                  }}
                  className="ml-1 flex items-center gap-1 rounded-full border border-[#EAEAEA] px-2 py-1 text-[11px] text-black/40 transition-colors hover:border-red-200 hover:text-red-500"
                >
                  <X size={10} /> Xóa tất cả
                </button>
              ) : null}
              {/* Đếm kết quả */}
              <span className="ml-auto text-[11px] tabular-nums text-[#AAAAAA]">
                {filteredLop.length} / {rows.length} lớp
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
            {filteredLop.length === 0 ? (
              <div className="flex flex-col items-center gap-2 pt-12 text-center">
                <span className="text-4xl">🏫</span>
                <p className="m-0 text-sm text-[#888]">
                  {lopSearch || filterMon !== "" || filterSpecial || filterTinhTrang !== "" ? "Không tìm thấy lớp phù hợp" : "Chưa có lớp học nào. Nhấn «Lớp học mới»."}
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className={cn("grid gap-3.5 pb-2 pt-1", isMobile ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(220px,1fr))]")}>
                {pagedFilteredLop.map((item) => {
                  const st = statsByLopId[String(item.id)];
                  return (
                    <LopHocCard
                      key={item.id}
                      item={item}
                      monList={monList}
                      nhanSuList={nhanSuList}
                      hvStats={st ?? { dang_hoc: 0, da_nghi: 0 }}
                      isSelected={selectedId === item.id}
                      onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="pb-2 pt-1">
                {/* Row view header */}
                <div className="mb-1 hidden grid-cols-[36px_180px_120px_1fr_110px_60px_auto] items-center gap-3 px-4 pb-1 text-[9px] font-bold uppercase tracking-widest text-[#CCCCCC] md:grid">
                  <span />
                  <span>Tên lớp</span>
                  <span>Môn</span>
                  <span>Giáo viên</span>
                  <span>Lịch học</span>
                  <span className="text-right">HV</span>
                  <span />
                </div>
                {pagedFilteredLop.map((item) => {
                  const st = statsByLopId[String(item.id)];
                  return (
                    <LopHocListRow
                      key={item.id}
                      item={item}
                      monList={monList}
                      nhanSuList={nhanSuList}
                      hvStats={st ?? { dang_hoc: 0, da_nghi: 0 }}
                      isSelected={selectedId === item.id}
                      onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                    />
                  );
                })}
              </div>
            )}
            {filteredLop.length > LOP_LIST_PAGE_SIZE ? (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#EAEAEA] bg-slate-50/90 px-4 py-2 text-[11px] text-slate-600">
                <span className="tabular-nums">
                  {(lopListPage - 1) * LOP_LIST_PAGE_SIZE + 1}–
                  {Math.min(lopListPage * LOP_LIST_PAGE_SIZE, filteredLop.length)} / {filteredLop.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={lopListPage <= 1}
                    onClick={() => setLopListPage((p) => Math.max(1, p - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="min-w-[4.75rem] text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Trang <span className="text-slate-800">{lopListPage}</span> / {lopTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={lopListPage >= lopTotalPages}
                    onClick={() => setLopListPage((p) => Math.min(lopTotalPages, p + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Trang sau"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected ? (
          <>
            <motion.button
              key="lop-detail-backdrop"
              type="button"
              aria-label="Đóng"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/35 backdrop-blur-[2px]"
              onClick={() => setSelectedId(null)}
            />
            <motion.div
              key={`lop-detail-drawer-${selected.id}`}
              role="dialog"
              aria-modal="true"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-0 right-0 top-0 z-[110] flex w-full max-w-[min(100vw,440px)] flex-col border-l border-[#EAEAEA] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]"
            >
              <LopDetailPanel
                item={selected}
                monList={monList}
                nhanSuList={nhanSuList}
                pickerNhanSuList={pickerNhanSuList}
                chiNhanhList={chiNhanhList}
                hvStats={statsByLopId[String(selected.id)] ?? null}
                onClose={() => setSelectedId(null)}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate ? (
          <CreateLopModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            monList={monList}
            pickerNhanSuList={pickerNhanSuList}
            chiNhanhList={chiNhanhList}
            defaultChiNhanhId={defaultChiNhanhId}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
