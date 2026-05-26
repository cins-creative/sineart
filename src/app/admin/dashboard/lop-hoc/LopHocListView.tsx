"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Flame, LayoutGrid, LayoutList, Loader2, Pencil, Plus, School, Search, Upload, X, Zap } from "lucide-react";

import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import type { LopHocFormState } from "@/app/admin/dashboard/lop-hoc/actions";
import {
  addLoaiHinhHoaOption,
  createLopHoc,
  deleteLopHoc,
  duplicateLopHoc,
  renameLoaiHinhHoaOption,
  toggleLopIsActive,
  toggleLopSpecial,
  toggleLopTinhTrang,
  updateLopHoc,
  updateTeacherPortfolio,
} from "@/app/admin/dashboard/lop-hoc/actions";
import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { joinLevels, splitLevels } from "@/lib/ql-lop-hoc/level-hinh-hoa";
import type { LopHocListFilters } from "@/lib/data/admin-lop-hoc-page";
import { cn } from "@/lib/utils";
import type { AdminLopRow } from "@/types/admin-lop-hoc";

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

export type { AdminLopRow };

type MonOpt = { id: number; ten_mon_hoc: string | null };
type NsOpt = {
  id: number;
  full_name: string;
  avatar: string | null;
  portfolio: string[];
  email: string | null;
};
type ChiOpt = { id: number; ten: string };

type Props = {
  rows: AdminLopRow[];
  listState: { page: number; pageSize: number; total: number; filters: LopHocListFilters };
  totalAllLop: number;
  /** Tổng HV toàn hệ thống (mọi lớp) — dòng phụ đề. */
  tongDangHoc: number;
  tongDaNghi: number;
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  /** Chỉ nhân sự thuộc ban Đào tạo — dùng trong picker. */
  pickerNhanSuList: NsOpt[];
  chiNhanhList: ChiOpt[];
  statsByLopId: Record<string, { dang_hoc: number; da_nghi: number }>;
  defaultChiNhanhId: number | null;
  /** Options động cho dropdown "Loại lớp" (từ bảng `ql_loai_hinh_hoa_options`). */
  levelHinhHoaOptions: string[];
};

type HvStats = { dang_hoc: number; da_nghi: number };

const LOP_HOC_BASE = "/admin/dashboard/lop-hoc";

function lopHocListHref(
  patch: Partial<LopHocListFilters & { page: number }>,
  current: { page: number; filters: LopHocListFilters }
): string {
  const page = patch.page ?? current.page;
  const q = patch.q !== undefined ? patch.q : current.filters.q;
  const mon = patch.mon !== undefined ? patch.mon : current.filters.mon;
  const special = patch.special !== undefined ? patch.special : current.filters.special;
  const tinhTrang =
    patch.tinhTrang !== undefined ? patch.tinhTrang : current.filters.tinhTrang;

  const resetPage =
    patch.page !== undefined
      ? false
      : patch.q !== undefined ||
        patch.mon !== undefined ||
        patch.special !== undefined ||
        patch.tinhTrang !== undefined;

  const nextPage = resetPage ? 1 : page;

  const sp = new URLSearchParams();
  if (nextPage > 1) sp.set("page", String(nextPage));
  if (q.trim()) sp.set("q", q.trim());
  if (mon != null) sp.set("mon", String(mon));
  if (special) sp.set("special", "1");
  if (tinhTrang === "active") sp.set("tt", "active");
  if (tinhTrang === "inactive") sp.set("tt", "inactive");
  const s = sp.toString();
  return s ? `${LOP_HOC_BASE}?${s}` : LOP_HOC_BASE;
}

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

function pickImageFile(items: DataTransferItemList): File | null {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file?.type.startsWith("image/")) return file;
    }
  }
  return null;
}

function TeacherPortfolioEditor({ teacher }: { teacher: NsOpt }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>(() => [...teacher.portfolio]);
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    setUrls([...teacher.portfolio]);
    setUrlInput("");
    setErr(null);
    setOk(false);
  }, [teacher.id, teacher.portfolio]);

  async function uploadFile(file: File) {
    setErr(null);
    setOk(false);
    setBusy(true);
    try {
      const url = await uploadAdminCfImage(file, file.name || "portfolio.jpg");
      setUrls((prev) => [...prev, url]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được ảnh portfolio.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setErr("URL portfolio phải bắt đầu bằng http:// hoặc https://.");
      return;
    }
    setUrls((prev) => [...prev, url]);
    setUrlInput("");
    setErr(null);
    setOk(false);
  }

  function savePortfolio() {
    setErr(null);
    setOk(false);
    const next = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
    startSaving(async () => {
      const res = await updateTeacherPortfolio({ teacherId: teacher.id, portfolio: next });
      if (res.ok) {
        setUrls(next);
        setOk(true);
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  const dirty =
    JSON.stringify(urls.map((u) => u.trim()).filter(Boolean)) !==
    JSON.stringify(teacher.portfolio.map((u) => u.trim()).filter(Boolean));

  return (
    <div className="rounded-[14px] border border-[#EAEAEA] bg-[#fafafa] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <NsAvatar name={teacher.full_name} src={teacher.avatar} size={26} />
          <div className="min-w-0">
            <p className="m-0 truncate text-[12px] font-extrabold text-[#323232]">{teacher.full_name}</p>
            <p className="m-0 text-[10px] font-semibold text-[#999]">{urls.length} ảnh portfolio</p>
          </div>
        </div>
        <button
          type="button"
          onClick={savePortfolio}
          disabled={saving || busy || !dirty}
          className="shrink-0 rounded-lg bg-gradient-to-r from-[#BC8AF9] to-[#ED5C9D] px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-45"
        >
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
      </div>

      {urls.length ? (
        <div className="grid grid-cols-3 gap-1.5">
          {urls.map((url, idx) => (
            <div key={`${idx}-${url.slice(-18)}`} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-white bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setUrls((prev) => prev.filter((_, i) => i !== idx));
                  setOk(false);
                }}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-red-600 opacity-0 shadow-sm transition group-hover:opacity-100"
                aria-label="Gỡ ảnh portfolio"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#EAEAEA] bg-white px-3 py-4 text-center text-[11px] font-semibold text-[#AAA]">
          Chưa có ảnh portfolio
        </div>
      )}

      <div
        className="mt-2 rounded-lg border border-dashed border-[#EAEAEA] bg-white p-2"
        onPaste={(e) => {
          const file = pickImageFile(e.clipboardData.items);
          if (!file) return;
          e.preventDefault();
          void uploadFile(file);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAEAEA] bg-[#fafafa] px-2.5 py-1.5 text-[11px] font-bold text-[#555] disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {busy ? "Đang tải…" : "Upload"}
          </button>
          <span className="text-[10px] font-medium text-[#999]">Có thể Ctrl+V ảnh vào khung này.</span>
        </div>
      </div>

      <div className="mt-2 flex gap-1.5">
        <input
          className="min-w-0 flex-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[11px] outline-none focus:border-[#BC8AF9]"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="Hoặc dán URL ảnh..."
        />
        <button
          type="button"
          onClick={addUrl}
          className="rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#666]"
        >
          Thêm
        </button>
      </div>

      {err ? <p className="m-0 mt-2 text-[11px] font-semibold text-red-600">{err}</p> : null}
      {ok ? <p className="m-0 mt-2 text-[11px] font-semibold text-emerald-600">Đã lưu portfolio.</p> : null}
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

/**
 * Bộ chọn nhiều "Loại lớp" — dropdown + checkbox + ô "Thêm mới" + sửa tên option.
 *
 * - Lưu CSV vào `value` (string, vd `"Chuyên tượng, Chuyên chân dung"`).
 * - Khi user thêm option mới sẽ gọi server action `addLoaiHinhHoaOption`,
 *   append vào danh sách local rồi tick chọn luôn.
 * - Khi user nhấn icon Pencil bên cạnh 1 option → chuyển sang inline edit;
 *   gọi `renameLoaiHinhHoaOption` (server tự đồng bộ CSV các lớp đang dùng tên cũ)
 *   rồi update options + value CSV phía client cho UX phản hồi tức thì.
 */
function LevelHinhHoaMultiPicker({
  options,
  value,
  onChange,
  onOptionsChange,
}: {
  options: string[];
  /** CSV — vd `"A, B"`. */
  value: string;
  onChange: (csv: string) => void;
  /** Cha có thể đồng bộ danh sách option khi user vừa thêm mới hoặc sửa tên. */
  onOptionsChange?: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState("");
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [editingOpt, setEditingOpt] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const selectedItems = useMemo(() => splitLevels(value), [value]);
  const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
      setAdding("");
      setAddErr(null);
      setEditingOpt(null);
      setEditingVal("");
      setEditErr(null);
    }
  }, [open]);

  useEffect(() => {
    if (editingOpt != null) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 30);
    }
  }, [editingOpt]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  function toggle(opt: string) {
    const next = selectedSet.has(opt)
      ? selectedItems.filter((v) => v !== opt)
      : [...selectedItems, opt];
    onChange(joinLevels(next));
  }

  async function handleAddOption() {
    const name = adding.trim();
    setAddErr(null);
    if (!name) {
      setAddErr("Nhập tên loại trước.");
      return;
    }
    if (name.includes(",")) {
      setAddErr('Tên không được chứa dấu phẩy ","');
      return;
    }
    setAddBusy(true);
    try {
      const res = await addLoaiHinhHoaOption(name);
      if (!res.ok) {
        setAddErr(res.error);
        return;
      }
      const newTen = res.ten;
      if (!options.includes(newTen) && onOptionsChange) {
        onOptionsChange([...options, newTen]);
      }
      if (!selectedSet.has(newTen)) {
        onChange(joinLevels([...selectedItems, newTen]));
      }
      setAdding("");
    } finally {
      setAddBusy(false);
    }
  }

  function startEditing(opt: string) {
    setEditingOpt(opt);
    setEditingVal(opt);
    setEditErr(null);
  }

  function cancelEditing() {
    setEditingOpt(null);
    setEditingVal("");
    setEditErr(null);
  }

  async function handleSaveEdit() {
    const oldName = editingOpt;
    if (!oldName) return;
    const nextName = editingVal.trim();
    setEditErr(null);
    if (!nextName) {
      setEditErr("Tên không được để trống.");
      return;
    }
    if (nextName.includes(",")) {
      setEditErr('Tên không được chứa dấu phẩy ","');
      return;
    }
    if (nextName === oldName) {
      cancelEditing();
      return;
    }
    if (
      options.some((o) => o.toLowerCase() === nextName.toLowerCase() && o !== oldName)
    ) {
      setEditErr(`Loại "${nextName}" đã tồn tại — chọn tên khác.`);
      return;
    }
    setEditBusy(true);
    try {
      const res = await renameLoaiHinhHoaOption({ oldName, newName: nextName });
      if (!res.ok) {
        setEditErr(res.error);
        return;
      }
      if (onOptionsChange) {
        onOptionsChange(options.map((o) => (o === oldName ? nextName : o)));
      }
      if (selectedSet.has(oldName)) {
        onChange(joinLevels(selectedItems.map((v) => (v === oldName ? nextName : v))));
      }
      cancelEditing();
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
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
            <span className="text-[#AAAAAA]">— Chọn loại lớp —</span>
          ) : (
            selectedItems.map((opt) => (
              <span
                key={opt}
                className="flex items-center gap-1 rounded-full border border-[#BC8AF9]/25 bg-[#BC8AF9]/10 px-2 py-0.5"
              >
                <span className="text-[11px] font-semibold text-[#4a1d96]">{opt}</span>
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

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[10px] border border-[#EAEAEA] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
          <div className="border-b border-[#EAEAEA] p-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-[#EAEAEA] bg-[#fafafa] px-2 py-1.5">
              <Search size={12} className="shrink-0 text-[#AAAAAA]" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm loại lớp…"
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#BBBBBB]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[#AAAAAA] hover:text-[#666]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[220px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-center text-[12px] text-[#BBBBBB]">
                Không tìm thấy loại lớp phù hợp
              </div>
            ) : (
              filtered.map((opt) => {
                const checked = selectedSet.has(opt);
                const isEditing = editingOpt === opt;
                if (isEditing) {
                  return (
                    <div
                      key={opt}
                      className="flex flex-col gap-1 border-y border-[#BC8AF9]/20 bg-[#BC8AF9]/05 px-3 py-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={editInputRef}
                          value={editingVal}
                          onChange={(e) => {
                            setEditingVal(e.target.value);
                            if (editErr) setEditErr(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleSaveEdit();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEditing();
                            }
                          }}
                          disabled={editBusy}
                          placeholder="Tên loại mới…"
                          className="min-w-0 flex-1 rounded-md border border-[#BC8AF9]/50 bg-white px-2 py-1 text-[12px] outline-none focus:border-[#BC8AF9] focus:ring-2 focus:ring-[#BC8AF9]/20 disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit()}
                          disabled={editBusy || !editingVal.trim()}
                          title="Lưu (Enter)"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#BC8AF9] text-white transition hover:bg-[#a570f0] disabled:opacity-40"
                        >
                          {editBusy ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={editBusy}
                          title="Huỷ (Esc)"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#EAEAEA] bg-white text-[#666] transition hover:bg-[#fafafa] disabled:opacity-40"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      {editErr && (
                        <p className="text-[10.5px] text-[#dc2626]">{editErr}</p>
                      )}
                      <p className="text-[10px] text-[#888]">
                        Đổi tên sẽ tự cập nhật trên mọi lớp đang dùng giá trị
                        cũ.
                      </p>
                    </div>
                  );
                }
                return (
                  <div
                    key={opt}
                    className={cn(
                      "group flex items-center gap-2.5 px-3 py-2 transition-colors",
                      checked ? "bg-[#BC8AF9]/08" : "hover:bg-[#fafafa]",
                    )}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(opt)}
                        className="h-3.5 w-3.5 cursor-pointer rounded accent-[#BC8AF9]"
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[12px]",
                          checked ? "font-semibold text-[#1a1a2e]" : "text-[#323232]",
                        )}
                      >
                        {opt}
                      </span>
                    </label>
                    {checked && (
                      <span className="text-[10px] font-bold text-[#BC8AF9]">✓</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(opt);
                      }}
                      disabled={editBusy}
                      title={`Sửa tên "${opt}"`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#AAAAAA] opacity-0 transition hover:bg-[#BC8AF9]/15 hover:text-[#7c3aed] focus:opacity-100 group-hover:opacity-100 disabled:opacity-30"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Thêm option mới */}
          <div className="border-t border-[#EAEAEA] bg-[#fafafa] p-2">
            <div className="flex gap-1.5">
              <input
                value={adding}
                onChange={(e) => {
                  setAdding(e.target.value);
                  if (addErr) setAddErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAddOption();
                  }
                }}
                placeholder="Thêm loại lớp mới…"
                disabled={addBusy}
                className="min-w-0 flex-1 rounded-md border border-[#EAEAEA] bg-white px-2 py-1.5 text-[11px] outline-none focus:border-[#BC8AF9] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void handleAddOption()}
                disabled={addBusy || !adding.trim()}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-gradient-to-r from-[#BC8AF9] to-[#ED5C9D] px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
              >
                {addBusy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                Thêm
              </button>
            </div>
            {addErr ? (
              <p className="m-0 mt-1 text-[10px] font-semibold text-red-600">{addErr}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-[#EAEAEA] bg-white px-3 py-2">
            <span className="text-[11px] text-[#AAAAAA]">
              {selectedItems.length > 0 ? `${selectedItems.length} đã chọn` : "Chưa chọn"}
            </span>
            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={() => onChange("")}
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
  const router = useRouter();
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
  const [qBusy, setQBusy] = useState<null | "tt" | "ia">(null);

  const inactive = !item.tinh_trang;

  async function handleSpecialToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (toggling || qBusy) return;
    setToggling(true);
    try {
      const r = await toggleLopSpecial(item.id, !item.special);
      if (r.ok) router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function handleTinhTrangFlip(e: React.MouseEvent) {
    e.stopPropagation();
    if (qBusy || toggling) return;
    setQBusy("tt");
    try {
      const r = await toggleLopTinhTrang(item.id, !item.tinh_trang);
      if (r.ok) router.refresh();
    } finally {
      setQBusy(null);
    }
  }

  async function handleIsActiveFlip(e: React.MouseEvent) {
    e.stopPropagation();
    if (qBusy || toggling) return;
    setQBusy("ia");
    try {
      const r = await toggleLopIsActive(item.id, !item.is_active);
      if (r.ok) router.refresh();
    } finally {
      setQBusy(null);
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
      whileHover={inactive ? {} : { y: -2, borderColor: item.special ? "rgba(220,38,38,0.6)" : DS.teacher }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-2xl border-[1.5px] text-left shadow-sm outline-none",
        inactive
          ? "cursor-not-allowed opacity-55 grayscale-[40%]"
          : "cursor-pointer focus-visible:ring-2 focus-visible:ring-[#BC8AF9]/40",
        isSelected && !inactive && "ring-2 ring-[#BC8AF9]/25",
      )}
      style={{
        background: item.special && !inactive
          ? "linear-gradient(165deg,#fffafa 0%,#fff8f8 60%,#fff5f5 100%)"
          : "#ffffff",
        borderColor: inactive
          ? "#E0E0E0"
          : item.special
            ? "rgba(220,38,38,0.18)"
            : isSelected
              ? DS.teacher
              : DS.border,
        boxShadow: inactive
          ? "none"
          : item.special
            ? "0 2px 14px rgba(220,38,38,0.07),0 1px 4px rgba(0,0,0,.05)"
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
          disabled={toggling || qBusy !== null}
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
      <div className="relative flex flex-1 flex-col px-3.5 pb-2.5 pt-3">
        <div className="pointer-events-auto absolute right-2 top-2 z-[1] flex max-w-[min(100%,11rem)] flex-col items-end gap-1">
          <button
            type="button"
            title={item.tinh_trang ? "Chuyển sang tạm dừng" : "Bật đang hoạt động"}
            disabled={qBusy !== null || toggling}
            onClick={handleTinhTrangFlip}
            className={cn(
              "flex max-w-full items-center justify-end gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-sm transition-colors disabled:opacity-50",
              item.tinh_trang
                ? "border-emerald-200/90 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-50",
            )}
          >
            {qBusy === "tt" ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" strokeWidth={2.5} /> : null}
            <span className="truncate">{item.tinh_trang ? "Đang hoạt động" : "Tạm dừng"}</span>
          </button>
          <button
            type="button"
            title={item.is_active ? "Đóng đăng ký" : "Mở đăng ký"}
            disabled={qBusy !== null || toggling}
            onClick={handleIsActiveFlip}
            className={cn(
              "flex max-w-full items-center justify-end gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-sm transition-colors disabled:opacity-50",
              item.is_active
                ? "border-sky-200/90 bg-sky-50 text-sky-900 hover:bg-sky-100"
                : "border-amber-200/90 bg-amber-50 text-amber-950 hover:bg-amber-100",
            )}
          >
            {qBusy === "ia" ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" strokeWidth={2.5} /> : null}
            <span className="truncate">{item.is_active ? "Mở đăng ký" : "Đóng đăng ký"}</span>
          </button>
        </div>
        <p className="m-0 line-clamp-2 pr-[7.5rem] text-sm font-bold text-[#1a1a2e]">
          {item.class_name || item.class_full_name || "—"}
        </p>
        {item.class_full_name && item.class_name ? (
          <p className="mt-0.5 line-clamp-1 pr-[7.5rem] text-[11px] text-[#AAAAAA]">{item.class_full_name}</p>
        ) : null}
        {firstGv ? (
          <div className="mt-2 flex min-w-0 items-center gap-2 pr-[7.5rem]">
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
          <div className="mt-1.5 flex items-center gap-1 pr-[7.5rem] text-[11px] font-medium text-[#888]">
            <Calendar className="h-3 w-3 shrink-0 text-[#AAAAAA]" />
            <span className="line-clamp-1">{item.lich_hoc}</span>
          </div>
        ) : null}
        <p className="mt-1 pr-[7.5rem] text-[11px] tabular-nums text-[#AAAAAA]">{subTitle}</p>
        {!item.is_active ? (
          <p className="mt-1.5 rounded-lg border border-amber-200/90 bg-amber-50 px-2 py-1.5 pr-[7.5rem] text-[10px] font-semibold leading-snug text-amber-950">
            Lớp đã đóng đăng ký HV mới
          </p>
        ) : null}
      </div>

      {/* ── Footer ─────────────────────────────── */}
      <div className="flex items-center border-t border-[#F5F7F7]">
        <span className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[#888]">
          {inactive ? "Tạm dừng" : "Chi tiết"}
        </span>
        {/* Cấp tốc badge — bottom right, style giống hpb-cap-toc--on */}
        {item.special ? (
          <span
            className="mr-2 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold"
            style={{
              borderColor: "rgba(220,38,38,0.55)",
              color: "#7f1d1d",
              background: "linear-gradient(165deg,#fff1f2 0%,#fecaca 45%,#fca5a5 100%)",
              boxShadow: "0 0 0 1px rgba(248,113,113,0.45),0 2px 12px rgba(220,38,38,0.22)",
            }}
          >
            <Flame size={10} strokeWidth={2.2} style={{ color: "#dc2626", filter: "drop-shadow(0 0 4px rgba(248,113,113,0.8))" }} />
            Cấp tốc
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
  const router = useRouter();
  const tenMon = monList.find((m) => m.id === item.mon_hoc)?.ten_mon_hoc ?? null;
  const gvList = item.teacher.map((id) => nhanSuList.find((n) => n.id === id)).filter(Boolean) as NsOpt[];
  const accent = getAccent(tenMon);
  const aText = getAccentText(accent);
  const devCfg = item.device ? DEVICE_CFG[item.device] ?? { bg: "#f3f4f6", text: "#6b7280" } : null;
  const inactive = !item.tinh_trang;
  const [imgErr, setImgErr] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [qBusy, setQBusy] = useState<null | "tt" | "ia">(null);

  async function handleSpecialToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (toggling || qBusy) return;
    setToggling(true);
    try {
      const r = await toggleLopSpecial(item.id, !item.special);
      if (r.ok) router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function applyTinhTrangRow(next: boolean) {
    if (qBusy || toggling || next === item.tinh_trang) return;
    setQBusy("tt");
    try {
      const r = await toggleLopTinhTrang(item.id, next);
      if (r.ok) router.refresh();
    } finally {
      setQBusy(null);
    }
  }

  async function applyIsActiveRow(next: boolean) {
    if (qBusy || toggling || next === item.is_active) return;
    setQBusy("ia");
    try {
      const r = await toggleLopIsActive(item.id, next);
      if (r.ok) router.refresh();
    } finally {
      setQBusy(null);
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

      {/* Class name + trạng thái (dropdown) */}
      <div className="min-w-0 w-[200px] shrink-0">
        <div className="flex items-center gap-1">
          <p className="m-0 min-w-0 flex-1 truncate text-[13px] font-bold text-[#1a1a2e]">
            {item.class_name || item.class_full_name || "—"}
          </p>
          <button
            type="button"
            title={item.special ? "Bỏ cấp tốc" : "Đánh dấu cấp tốc"}
            disabled={toggling || qBusy !== null}
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
        <div className="mt-1 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <select
            aria-label="Trạng thái hoạt động lớp"
            className="h-6 max-w-[calc(50%-2px)] min-w-0 flex-1 rounded-md border border-[#EAEAEA] bg-white py-0 pl-1.5 pr-1 text-[9px] font-semibold text-[#444] shadow-sm disabled:opacity-50"
            value={item.tinh_trang ? "1" : "0"}
            disabled={toggling || qBusy !== null}
            onChange={(e) => void applyTinhTrangRow(e.target.value === "1")}
          >
            <option value="1">Đang hoạt động</option>
            <option value="0">Tạm dừng</option>
          </select>
          <select
            aria-label="Đăng ký HV mới"
            className="h-6 max-w-[calc(50%-2px)] min-w-0 flex-1 rounded-md border border-[#EAEAEA] bg-white py-0 pl-1.5 pr-1 text-[9px] font-semibold text-[#444] shadow-sm disabled:opacity-50"
            value={item.is_active ? "1" : "0"}
            disabled={toggling || qBusy !== null}
            onChange={(e) => void applyIsActiveRow(e.target.value === "1")}
          >
            <option value="1">Mở đăng ký</option>
            <option value="0">Đóng đăng ký</option>
          </select>
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
          Tạm dừng
        </span>
      ) : null}
      {!item.is_active ? (
        <span
          className="hidden max-w-[140px] shrink-0 truncate rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-900 sm:inline-block"
          title="Lớp đã đóng đăng ký HV mới"
        >
          Đóng đăng ký
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
  /** URL nhóm Messenger — `ql_lop_hoc.group_chat_messenger`. */
  group_chat_messenger: string;
  special: boolean;
  tinh_trang: boolean;
  /** Lớp có đang mở đăng ký / nhận HV mới hay không — `ql_lop_hoc.is_active`. */
  is_active: boolean;
  /** Form string CSV — rỗng hoặc danh sách loại Hình họa (vd `"Chuyên tượng, Chuyên chân dung"`). */
  level_hinh_hoa: string;
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
    group_chat_messenger: r.group_chat_messenger ?? "",
    special: r.special,
    tinh_trang: r.tinh_trang,
    is_active: r.is_active,
    level_hinh_hoa: r.level_hinh_hoa ?? "",
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
  levelHinhHoaOptions,
  onLevelHinhHoaOptionsChange,
}: {
  item: AdminLopRow;
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  pickerNhanSuList: NsOpt[];
  chiNhanhList: ChiOpt[];
  hvStats: HvStats | null;
  onClose: () => void;
  levelHinhHoaOptions: string[];
  onLevelHinhHoaOptionsChange: (next: string[]) => void;
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
  const [quickBusy, setQuickBusy] = useState<null | "tt" | "ia">(null);

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
    fd.set("group_chat_messenger", form.group_chat_messenger);
    fd.set("special", form.special ? "1" : "");
    fd.set("tinh_trang", form.tinh_trang ? "1" : "");
    fd.set("is_active", form.is_active ? "1" : "0");
    fd.set("level_hinh_hoa", form.level_hinh_hoa);
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

  async function applyTinhTrangPanel(next: boolean) {
    if (quickBusy || next === item.tinh_trang) return;
    setErr(null);
    setQuickBusy("tt");
    try {
      const r = await toggleLopTinhTrang(item.id, next);
      if (r.ok) router.refresh();
      else setErr(r.error);
    } finally {
      setQuickBusy(null);
    }
  }

  async function applyIsActivePanel(next: boolean) {
    if (quickBusy || next === item.is_active) return;
    setErr(null);
    setQuickBusy("ia");
    try {
      const r = await toggleLopIsActive(item.id, next);
      if (r.ok) router.refresh();
      else setErr(r.error);
    } finally {
      setQuickBusy(null);
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
                Tạm dừng
              </span>
            ) : null}
            {!item.is_active ? (
              <span
                className="max-w-[min(100%,220px)] truncate rounded-full border border-amber-200 bg-amber-50 px-2 py-px text-[10px] font-semibold text-amber-900"
                title="Lớp đã đóng đăng ký HV mới"
              >
                Đã đóng đăng ký
              </span>
            ) : null}
          </div>
        </div>
        {!editing ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <div className="relative flex items-center">
              <select
                id={`lop-panel-tt-${item.id}`}
                aria-label="Trạng thái hoạt động lớp"
                className={cn(
                  "h-[30px] min-w-[7.5rem] appearance-none rounded-lg border py-0 pl-2 pr-7 text-[11px] font-semibold shadow-sm disabled:opacity-50",
                  item.tinh_trang
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 bg-gray-100 text-gray-700",
                )}
                value={item.tinh_trang ? "1" : "0"}
                disabled={quickBusy !== null}
                onChange={(e) => void applyTinhTrangPanel(e.target.value === "1")}
              >
                <option value="1">Đang hoạt động</option>
                <option value="0">Tạm dừng</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#888]"
                aria-hidden
              />
            </div>
            <div className="relative flex items-center">
              <select
                id={`lop-panel-ia-${item.id}`}
                aria-label="Đăng ký HV mới"
                className={cn(
                  "h-[30px] min-w-[7.5rem] appearance-none rounded-lg border py-0 pl-2 pr-7 text-[11px] font-semibold shadow-sm disabled:opacity-50",
                  item.is_active
                    ? "border-sky-200 bg-sky-50 text-sky-900"
                    : "border-amber-200 bg-amber-50 text-amber-950",
                )}
                value={item.is_active ? "1" : "0"}
                disabled={quickBusy !== null}
                onChange={(e) => void applyIsActivePanel(e.target.value === "1")}
              >
                <option value="1">Mở đăng ký</option>
                <option value="0">Đóng đăng ký</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#888]"
                aria-hidden
              />
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#666] hover:bg-white"
            >
              <Pencil size={13} /> Sửa
            </button>
          </div>
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
        {!item.is_active ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
            Lớp đã đóng đăng ký HV mới
          </div>
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
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Loại lớp</div>
                <LevelHinhHoaMultiPicker
                  options={levelHinhHoaOptions}
                  value={form.level_hinh_hoa}
                  onChange={(csv) => setK("level_hinh_hoa", csv)}
                  onOptionsChange={onLevelHinhHoaOptionsChange}
                />
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
              <div>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
                  <img src="/brand/messenger-group-chat.png" alt="" width={18} height={18} className="shrink-0 rounded-full" />
                  Group messenger
                </div>
                <input
                  className={inpClass()}
                  value={form.group_chat_messenger}
                  onChange={(e) => setK("group_chat_messenger", e.target.value)}
                  placeholder="https://m.me/j/…"
                  inputMode="url"
                  autoComplete="off"
                />
              </div>
              {/* Toggles */}
              <div className="flex flex-col gap-2">
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
                <button
                  type="button"
                  onClick={() => setK("is_active", !form.is_active)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-[12px] font-semibold transition-colors",
                    form.is_active
                      ? "border-sky-300/60 bg-sky-50 text-sky-800"
                      : "border-amber-300/70 bg-amber-50 text-amber-900",
                  )}
                >
                  <span>{form.is_active ? "Mở đăng ký" : "Đóng đăng ký"}</span>
                  <span className={cn(
                    "ml-2 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                    form.is_active ? "border-sky-500 bg-sky-500" : "border-amber-500 bg-amber-500",
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
              {item.level_hinh_hoa ? (
                <div className="flex justify-between gap-2 border-b border-[#f0f0f0] py-1">
                  <dt className="text-[10px] font-bold uppercase text-[#AAA]">Loại lớp</dt>
                  <dd className="m-0 text-right font-semibold text-gray-800">{item.level_hinh_hoa}</dd>
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="shrink-0 text-[10px] font-bold uppercase text-[#AAA]">Giáo viên</dt>
                <dd className="m-0 flex flex-col items-end gap-2">
                  {gvList.length > 0 ? (
                    gvList.map((gv) => (
                      <div key={gv.id} className="flex max-w-[min(100%,240px)] flex-col items-end gap-0.5 text-right">
                        <span className="flex items-center gap-2">
                          <NsAvatar name={gv.full_name} src={gv.avatar} size={28} />
                          <span className="font-bold text-pink-500">{gv.full_name}</span>
                        </span>
                        {gv.email?.trim() ? (
                          <a
                            href={`mailto:${gv.email.trim()}`}
                            className="break-all text-[11px] font-medium leading-snug text-[#64748b] underline-offset-2 hover:text-[#BC8AF9] hover:underline"
                          >
                            {gv.email.trim()}
                          </a>
                        ) : (
                          <span className="text-[11px] text-[#CCCCCC]">—</span>
                        )}
                      </div>
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
              <div className="flex items-start justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase text-[#AAA]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/messenger-group-chat.png" alt="" width={16} height={16} className="rounded-full" />
                  Group messenger
                </dt>
                <dd className="m-0 min-w-0 break-all text-right text-[12px] font-semibold text-gray-800">
                  {item.group_chat_messenger?.trim() ? (
                    <a
                      href={item.group_chat_messenger.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2563eb] underline-offset-2 hover:underline"
                    >
                      {item.group_chat_messenger.trim()}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
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
              <div className="flex justify-between gap-2 border-t border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Đăng ký HV mới</dt>
                <dd className="m-0">
                  {item.is_active ? (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                      Đang mở đăng ký
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                      Đã đóng đăng ký
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {gvList.length > 0 ? (
          <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
            <div className="mb-2">
              <p className="m-0 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: DS.teacher }}>
                Portfolio giáo viên
              </p>
            </div>
            <div className="space-y-2.5">
              {gvList.map((gv) => (
                <TeacherPortfolioEditor key={gv.id} teacher={gv} />
              ))}
            </div>
          </div>
        ) : null}

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
  levelHinhHoaOptions,
  onLevelHinhHoaOptionsChange,
}: {
  open: boolean;
  onClose: () => void;
  monList: MonOpt[];
  pickerNhanSuList: NsOpt[];
  chiNhanhList: ChiOpt[];
  defaultChiNhanhId: number | null;
  levelHinhHoaOptions: string[];
  onLevelHinhHoaOptionsChange: (next: string[]) => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createLopHoc, null as LopHocFormState | null);
  const [createTeachers, setCreateTeachers] = useState<string[]>([]);
  const [createSpecial, setCreateSpecial] = useState(false);
  const [createTinhTrang, setCreateTinhTrang] = useState(true);
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createMonHoc, setCreateMonHoc] = useState("");
  const [createLevelHinhHoa, setCreateLevelHinhHoa] = useState("");

  useEffect(() => {
    if (!open) return;
    setCreateMonHoc("");
    setCreateLevelHinhHoa("");
  }, [open]);

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
              <select
                name="mon_hoc"
                className={inpClass()}
                value={createMonHoc}
                onChange={(e) => setCreateMonHoc(e.target.value)}
              >
                <option value="">— Chọn môn học —</option>
                {monList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.ten_mon_hoc ?? `#${m.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Loại lớp</div>
              <LevelHinhHoaMultiPicker
                options={levelHinhHoaOptions}
                value={createLevelHinhHoa}
                onChange={setCreateLevelHinhHoa}
                onOptionsChange={onLevelHinhHoaOptionsChange}
              />
              <input type="hidden" name="level_hinh_hoa" value={createLevelHinhHoa} />
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
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/messenger-group-chat.png" alt="" width={18} height={18} className="shrink-0 rounded-full" />
                Group messenger
              </div>
              <input name="group_chat_messenger" className={inpClass()} placeholder="https://m.me/j/…" inputMode="url" autoComplete="off" />
            </div>
            <AdminCfImageInput label="Ảnh lớp" name="avatar" defaultValue="" />
            {/* Toggles */}
            <div className="flex flex-col gap-2">
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
              <button
                type="button"
                onClick={() => setCreateIsActive((v) => !v)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-[12px] font-semibold transition-colors",
                  createIsActive
                    ? "border-sky-300/60 bg-sky-50 text-sky-800"
                    : "border-amber-300/70 bg-amber-50 text-amber-900",
                )}
              >
                <span>{createIsActive ? "Mở đăng ký" : "Đóng đăng ký"}</span>
                <span className={cn(
                  "ml-2 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                  createIsActive ? "border-sky-500 bg-sky-500" : "border-amber-500 bg-amber-500",
                )} />
              </button>
            </div>
            <input type="hidden" name="special" value={createSpecial ? "1" : ""} />
            <input type="hidden" name="tinh_trang" value={createTinhTrang ? "1" : ""} />
            <input type="hidden" name="is_active" value={createIsActive ? "1" : "0"} />
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
  listState,
  totalAllLop,
  tongDangHoc,
  tongDaNghi,
  monList,
  nhanSuList,
  pickerNhanSuList,
  chiNhanhList,
  statsByLopId,
  defaultChiNhanhId,
  levelHinhHoaOptions,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(960);
  const [qDraft, setQDraft] = useState(listState.filters.q);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "row">("grid");
  const [lhhOptions, setLhhOptions] = useState<string[]>(levelHinhHoaOptions);
  const router = useRouter();
  const qDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLhhOptions((prev) => {
      const seen = new Set(prev);
      const merged = [...prev];
      for (const opt of levelHinhHoaOptions) {
        if (!seen.has(opt)) {
          seen.add(opt);
          merged.push(opt);
        }
      }
      return merged.length === prev.length ? prev : merged;
    });
  }, [levelHinhHoaOptions]);

  useEffect(() => {
    setQDraft(listState.filters.q);
  }, [listState.filters.q]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (qDraft === listState.filters.q) return;
    if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    qDebounceRef.current = setTimeout(() => {
      qDebounceRef.current = null;
      const href = lopHocListHref(
        { q: qDraft, page: 1 },
        { page: listState.page, filters: listState.filters }
      );
      router.replace(href);
    }, 350);
    return () => {
      if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    };
  }, [qDraft, listState.filters.q, listState.page, router]);

  const isMobile = w < 580;

  const lopTotalPages = Math.max(1, Math.ceil(listState.total / Math.max(1, listState.pageSize)));
  function hrefFor(patch: Partial<LopHocListFilters & { page: number }>) {
    return lopHocListHref(patch, { page: listState.page, filters: listState.filters });
  }

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
              {totalAllLop} lớp · {tongDangHoc} học viên đang học
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
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                placeholder="Tìm tên lớp, giáo viên…"
                className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-white pl-9 pr-9 text-xs text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
              />
              {qDraft ? (
                <button
                  type="button"
                  aria-label="Xóa tìm"
                  onClick={() => {
                    setQDraft("");
                    router.replace(hrefFor({ q: "", page: 1 }));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/60"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1">
              <Link
                href={hrefFor({ mon: null, page: 1 })}
                scroll={false}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  listState.filters.mon == null
                    ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]"
                    : "border-[#EAEAEA] text-black/50"
                )}
              >
                Tất cả
              </Link>
              {monList.map((m) => (
                <Link
                  key={m.id}
                  href={hrefFor({ mon: listState.filters.mon === m.id ? null : m.id, page: 1 })}
                  scroll={false}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    listState.filters.mon === m.id
                      ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]"
                      : "border-[#EAEAEA] text-black/50"
                  )}
                >
                  {m.ten_mon_hoc ?? `#${m.id}`}
                </Link>
              ))}
            </div>
            {/* Filter row 2 — cấp tốc + tình trạng */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCCCCC]">Lọc:</span>
              {/* Cấp tốc toggle */}
              <Link
                href={hrefFor({ special: !listState.filters.special, page: 1 })}
                scroll={false}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  listState.filters.special
                    ? "border-orange-300 bg-gradient-to-r from-orange-400/20 to-red-400/20 text-orange-600"
                    : "border-[#EAEAEA] text-black/50 hover:border-orange-200 hover:text-orange-500",
                )}
              >
                <Zap size={10} strokeWidth={2.5} fill={listState.filters.special ? "currentColor" : "none"} />
                Cấp tốc
              </Link>
              {/* Tình trạng hoạt động */}
              <Link
                href={hrefFor({
                  tinhTrang: listState.filters.tinhTrang === "active" ? "" : "active",
                  page: 1,
                })}
                scroll={false}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  listState.filters.tinhTrang === "active"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-[#EAEAEA] text-black/50 hover:border-emerald-200 hover:text-emerald-600",
                )}
              >
                ✓ Đang HĐ
              </Link>
              <Link
                href={hrefFor({
                  tinhTrang: listState.filters.tinhTrang === "inactive" ? "" : "inactive",
                  page: 1,
                })}
                scroll={false}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  listState.filters.tinhTrang === "inactive"
                    ? "border-gray-400 bg-gray-100 text-gray-600"
                    : "border-[#EAEAEA] text-black/50 hover:border-gray-300 hover:text-gray-500",
                )}
              >
                Ngừng HĐ
              </Link>
              {/* Reset tất cả filter */}
              {(listState.filters.special ||
                listState.filters.tinhTrang !== "" ||
                listState.filters.mon != null ||
                listState.filters.q) ? (
                <Link
                  href={LOP_HOC_BASE}
                  scroll={false}
                  className="ml-1 flex items-center gap-1 rounded-full border border-[#EAEAEA] px-2 py-1 text-[11px] text-black/40 transition-colors hover:border-red-200 hover:text-red-500"
                >
                  <X size={10} /> Xóa tất cả
                </Link>
              ) : null}
              {/* Đếm kết quả */}
              <span className="ml-auto text-[11px] tabular-nums text-[#AAAAAA]">
                {listState.total} / {totalAllLop} lớp
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
            {listState.total === 0 ? (
              <div className="flex flex-col items-center gap-2 pt-12 text-center">
                <span className="text-4xl">🏫</span>
                <p className="m-0 text-sm text-[#888]">
                  {listState.filters.q ||
                  listState.filters.mon != null ||
                  listState.filters.special ||
                  listState.filters.tinhTrang !== ""
                    ? "Không tìm thấy lớp phù hợp"
                    : "Chưa có lớp học nào. Nhấn «Lớp học mới»."}
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className={cn("grid gap-3.5 pb-2 pt-1", isMobile ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(220px,1fr))]")}>
                {rows.map((item) => {
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
                {rows.map((item) => {
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
            {listState.total > listState.pageSize ? (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#EAEAEA] bg-slate-50/90 px-4 py-2 text-[11px] text-slate-600">
                <span className="tabular-nums">
                  {(listState.page - 1) * listState.pageSize + 1}–
                  {Math.min(listState.page * listState.pageSize, listState.total)} / {listState.total}
                </span>
                <div className="flex items-center gap-1">
                  {listState.page <= 1 ? (
                    <span className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-slate-600 opacity-40">
                      <ChevronLeft size={14} />
                    </span>
                  ) : (
                    <Link
                      href={hrefFor({ page: listState.page - 1 })}
                      scroll={false}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-slate-600"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft size={14} />
                    </Link>
                  )}
                  <span className="min-w-[4.75rem] text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Trang <span className="text-slate-800">{listState.page}</span> / {lopTotalPages}
                  </span>
                  {listState.page >= lopTotalPages ? (
                    <span className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-slate-600 opacity-40">
                      <ChevronRight size={14} />
                    </span>
                  ) : (
                    <Link
                      href={hrefFor({ page: listState.page + 1 })}
                      scroll={false}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-slate-600"
                      aria-label="Trang sau"
                    >
                      <ChevronRight size={14} />
                    </Link>
                  )}
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
                levelHinhHoaOptions={lhhOptions}
                onLevelHinhHoaOptionsChange={setLhhOptions}
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
            levelHinhHoaOptions={lhhOptions}
            onLevelHinhHoaOptionsChange={setLhhOptions}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
