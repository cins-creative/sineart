"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCopy,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import {
  createNhanSu,
  deleteHrBangTinhLuongFull,
  syncHrNhanSuPhong,
  updateNhanSuAvatar,
  updateNhanSuLuongVaLienHe,
  updateNhanSuThongTin,
} from "@/app/admin/dashboard/quan-ly-nhan-su/actions";
import { bangHasLichDiemDanh, PayrollPayslipCard } from "@/app/admin/dashboard/quan-ly-nhan-su/PayrollPayslipCard";
import { TaoBangTinhLuongModal } from "@/app/admin/dashboard/quan-ly-nhan-su/TaoBangTinhLuongModal";
import type {
  AdminBangTinhLuongListItem,
  AdminNhanSuRow,
  AdminPhongOption,
} from "@/lib/data/admin-quan-ly-nhan-su";
import { normalizeHrStaffStatusDisplayLabel } from "@/lib/admin/staff-employment-status";
import { copyDomAsPngToClipboard } from "@/lib/copy-dom-png-clipboard";
import { cn } from "@/lib/utils";

type Props = {
  staff: AdminNhanSuRow[];
  chiNhanhById: Record<number, string>;
  banById: Record<number, string>;
  phongBanByStaffId: Record<number, string>;
  phongIdsByStaffId: Record<number, number[]>;
  allPhongOptions: AdminPhongOption[];
  /** `hr_phong.ban` → id ban (để suy ra ban từ phòng đang chọn). */
  phongToBanId: Record<number, number>;
  /** Ban hiển thị theo nhân sự: `hr_nhan_su.ban` + ban từ các phòng đã gán. */
  banIdsByStaffId: Record<number, number[]>;
  bangTinhLuongByStaffId: Record<number, AdminBangTinhLuongListItem[]>;
  usedMinimalSelect: boolean;
};

/** Giống Framer — `VAI_TRO_LABEL` / màu pill. */
const VAI_TRO_LABEL: Record<string, string> = {
  admin: "Admin",
  quan_ly: "Quản lý",
  nhan_vien: "Nhân viên",
};

const VAI_TRO_PILL: Record<string, { bg: string; text: string; border: string }> = {
  admin: { bg: "bg-[#EEF3FF]", text: "text-[#3B5BDB]", border: "border-[#BAC8FF]" },
  quan_ly: { bg: "bg-[#FFF7E6]", text: "text-[#B76E00]", border: "border-[#FFD88A]" },
  nhan_vien: { bg: "bg-[#F5F7F7]", text: "text-[#888888]", border: "border-[#EAEAEA]" },
};

const STATUS_PILL: Record<string, { bg: string; text: string; border: string }> = {
  "Đang làm": { bg: "bg-[#E8F9F0]", text: "text-[#1A9A5C]", border: "border-[#A8E6C8]" },
  "Thử việc": { bg: "bg-[#FFF7E6]", text: "text-[#B76E00]", border: "border-[#FFD88A]" },
  Nghỉ: { bg: "bg-[#FFF0F3]", text: "text-[#C0244E]", border: "border-[#FFCDD2]" },
};

type StatusFilterKey = "all" | "Đang làm" | "Thử việc" | "Nghỉ";

type ColKey =
  | "avatar"
  | "name"
  | "id"
  | "status"
  | "branch"
  | "role"
  | "dept"
  | "ban"
  | "salaryType"
  | "base"
  | "allowance"
  | "bhxh"
  | "rateCb"
  | "rateHv"
  | "maxLeave"
  | "dob"
  | "start"
  | "phone"
  | "bank"
  | "email"
  | "fb"
  | "contract"
  | "other";

const COLUMN_META: { key: ColKey; label: string }[] = [
  { key: "avatar", label: "Ảnh" },
  { key: "name", label: "Tên nhân viên" },
  { key: "id", label: "ID" },
  { key: "status", label: "Tình trạng" },
  { key: "branch", label: "Chi nhánh" },
  { key: "role", label: "Vai trò" },
  { key: "dept", label: "Phòng ban" },
  { key: "ban", label: "Thuộc ban" },
  { key: "salaryType", label: "Hình thức lương" },
  { key: "base", label: "Lương cơ bản" },
  { key: "allowance", label: "Trợ cấp" },
  { key: "bhxh", label: "BHXH" },
  { key: "rateCb", label: "Hệ số CB" },
  { key: "rateHv", label: "Hệ số HV" },
  { key: "maxLeave", label: "Nghỉ tối đa" },
  { key: "dob", label: "Ngày sinh" },
  { key: "start", label: "Ngày vào" },
  { key: "phone", label: "SĐT" },
  { key: "bank", label: "STK lương" },
  { key: "email", label: "Email" },
  { key: "fb", label: "Facebook" },
  { key: "contract", label: "HĐLĐ" },
  { key: "other", label: "Thông tin khác" },
];

const DEFAULT_COLS: Record<ColKey, boolean> = {
  avatar: true,
  name: true,
  id: true,
  status: true,
  branch: true,
  role: true,
  dept: true,
  ban: true,
  salaryType: true,
  base: true,
  allowance: true,
  bhxh: true,
  rateCb: true,
  rateHv: true,
  maxLeave: true,
  dob: true,
  start: true,
  phone: true,
  bank: true,
  email: true,
  fb: true,
  contract: true,
  other: true,
};

/** Giới hạn số dòng render trong bảng danh sách (giảm DOM). */
const STAFF_LIST_PAGE_SIZE = 10;

/** Lưu trạng thái ẩn/hiện cột bảng — đọc lại sau reload. */
const COLUMN_VISIBILITY_STORAGE_KEY = "sineart:admin:quan-ly-nhan-su:columnVisibility";

function loadColumnVisibility(): Record<ColKey, boolean> {
  if (typeof window === "undefined") return DEFAULT_COLS;
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY) ?? "null") as unknown;
    if (typeof raw !== "object" || raw === null) return DEFAULT_COLS;
    const o = raw as Partial<Record<ColKey, unknown>>;
    const next = { ...DEFAULT_COLS };
    for (const k of Object.keys(DEFAULT_COLS) as ColKey[]) {
      if (typeof o[k] === "boolean") next[k] = o[k];
    }
    return next;
  } catch {
    return DEFAULT_COLS;
  }
}

function persistColumnVisibility(cols: Record<ColKey, boolean>): void {
  try {
    localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(cols));
  } catch {
    /* quota / private mode */
  }
}

function vaiTroNormKey(raw: string | null): keyof typeof VAI_TRO_LABEL | "other" {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "admin") return "admin";
  if (s === "quan_ly" || s === "quản lý" || s === "quan ly") return "quan_ly";
  if (s === "nhan_vien" || s === "nhân viên" || s === "nhan vien") return "nhan_vien";
  if (!s) return "nhan_vien";
  return "other";
}

function vaiTroLabel(raw: string | null): string {
  const k = vaiTroNormKey(raw);
  if (k === "other") return raw?.trim() || "—";
  return (VAI_TRO_LABEL[k] ?? raw?.trim()) || "—";
}

function statusNormLabel(raw: string | null): string {
  return normalizeHrStaffStatusDisplayLabel(raw);
}

function statusFilterKey(raw: string | null): StatusFilterKey {
  const l = statusNormLabel(raw);
  if (l === "Đang làm" || l === "Thử việc" || l === "Nghỉ") return l;
  return "all";
}

function ChiNhanhPill({ label }: { label: string }) {
  if (!label || label === "—") return <span className="text-[12px] text-[#AAA]">—</span>;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        "border-[#A8E6C8] bg-[#E8F9F0] text-[#1A9A5C]"
      )}
    >
      <MapPin size={10} className="shrink-0 opacity-90" aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

function BanPill({ label }: { label: string }) {
  if (!label || label === "—") return <span className="text-[12px] text-[#AAA]">—</span>;
  return (
    <span className="inline-flex max-w-full truncate rounded-md border border-[#BAC8FF] bg-[#EEF3FF] px-2 py-0.5 text-[11px] font-semibold text-[#3B5BDB]">
      {label}
    </span>
  );
}

function BansCell({ ids, banById }: { ids: number[]; banById: Record<number, string> }) {
  if (!ids.length) return <span className="text-[12px] text-[#AAA]">—</span>;
  return (
    <div className="flex max-w-[220px] flex-wrap gap-1">
      {ids.map((id) => (
        <BanPill key={id} label={banById[id] ?? `Ban #${id}`} />
      ))}
    </div>
  );
}

function HinhThucLuongPill({ text }: { text: string }) {
  if (!text || text === "—") return <span className="text-[12px] text-[#AAA]">—</span>;
  return (
    <span className="inline-flex max-w-full truncate rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
      {text}
    </span>
  );
}

function VaiTroPillDisplay({ raw }: { raw: string | null }) {
  const k = vaiTroNormKey(raw);
  const text = vaiTroLabel(raw);
  if (text === "—") return <span className="text-[12px] text-[#AAA]">—</span>;
  const st = k !== "other" ? VAI_TRO_PILL[k] : { bg: "bg-[#F5F7F7]", text: "text-[#555]", border: "border-[#EAEAEA]" };
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
        st.bg,
        st.text,
        st.border
      )}
    >
      {text}
    </span>
  );
}

function StatusPillDisplay({ raw }: { raw: string | null }) {
  const label = statusNormLabel(raw);
  if (label === "—") return <span className="text-[12px] text-[#AAA]">—</span>;
  const st = STATUS_PILL[label] ?? {
    bg: "bg-[#F5F7F7]",
    text: "text-[#555]",
    border: "border-[#EAEAEA]",
  };
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
        st.bg,
        st.text,
        st.border
      )}
    >
      {label}
    </span>
  );
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "—";
    return x.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function fmtVnd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Math.round(Number(n));
  return `${v.toLocaleString("vi-VN")} đ`;
}

function displayStk(r: AdminNhanSuRow): string {
  const a = r.bank_stk?.trim();
  const b = r.stk_nhan_luong?.trim();
  if (a && b && a !== b) return `${a} · ${b}`;
  return a || b || "";
}

function PhongBanCell({ text }: { text: string }) {
  if (!text || text === "—")
    return <span className="text-[12px] text-[#AAA]">—</span>;
  return (
    <div className="max-w-[220px] rounded-lg border border-[#EAEAEA] bg-[#F5F7F7] px-2 py-1.5 text-left text-[11px] font-medium leading-snug text-[#555]">
      <span className="line-clamp-3">{text}</span>
    </div>
  );
}

function StkLuongCell({ row }: { row: AdminNhanSuRow }) {
  const bank = row.bank_name?.trim();
  const stk = displayStk(row);
  const name = row.full_name?.trim();
  if (!bank && !stk) return <span className="text-[12px] text-[#AAA]">—</span>;
  return (
    <div className="max-w-[160px] space-y-0.5 text-[11px] leading-snug text-[#444]">
      {bank ? <div className="font-semibold text-[#1a1a2e]">{bank}</div> : null}
      {stk ? <div className="tabular-nums">{stk}</div> : null}
      {name ? <div className="text-[10px] font-medium uppercase tracking-wide text-[#888]">{name}</div> : null}
    </div>
  );
}

function LinkXem({ href, label = "Xem" }: { href: string | null | undefined; label?: string }) {
  const u = href?.trim();
  if (!u)
    return <span className="text-[12px] text-[#AAA]">—</span>;
  const full = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  return (
    <a
      href={full}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3B5BDB] underline-offset-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink size={12} className="shrink-0 opacity-80" aria-hidden />
      {label}
    </a>
  );
}

type StaffDetailTab = "info" | "salary" | "contact" | "payroll";

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-3 border-t border-black/[0.06] pt-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#AAA] first:mt-0 first:border-t-0 first:pt-0">
      {children}
    </h3>
  );
}

function ReadField({ value, multiline }: { value: string; multiline?: boolean }) {
  return (
    <div
      className={cn(
        "w-full rounded-xl bg-[#F5F7F7] px-3 py-2.5 text-[13px] font-medium text-[#1a1a2e]",
        multiline && "whitespace-pre-wrap leading-relaxed"
      )}
    >
      {value || "—"}
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-5">
      <div className="shrink-0 sm:w-[34%]">
        <div className="text-[12px] font-semibold text-[#888]">{label}</div>
        {hint ? <p className="mt-0.5 text-[10px] font-medium leading-snug text-[#AAA]">{hint}</p> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const inpEdit =
  "w-full rounded-xl border border-black/[0.08] bg-[#F5F7F7] px-3 py-2.5 text-[13px] font-medium text-[#1a1a2e] outline-none transition focus:border-[#BC8AF9] focus:bg-white";

const STATUS_FORM_OPTIONS = ["Đang làm", "Thử việc", "Nghỉ"] as const;

/** Giống Framer — `HINH_THUC_COLOR` / form tạo NV. */
const HINH_THUC_FORM_OPTIONS = ["Fulltime", "Theo buổi", "Theo sản phẩm"] as const;

function statusForForm(raw: string | null): string {
  const s = statusNormLabel(raw);
  if (STATUS_FORM_OPTIONS.includes(s as (typeof STATUS_FORM_OPTIONS)[number])) return s;
  return "Đang làm";
}

function vaiTroForForm(raw: string | null): string {
  const k = vaiTroNormKey(raw);
  if (k === "admin") return "admin";
  if (k === "quan_ly") return "quan_ly";
  return "nhan_vien";
}

type InfoDraft = {
  full_name: string;
  chi_nhanh_id: string;
  vai_tro: string;
  status: string;
  ngay_sinh: string;
  sa_startdate: string;
  thong_tin_khac: string;
  hinh_thuc_tinh_luong: string;
};

function buildInfoDraft(r: AdminNhanSuRow): InfoDraft {
  return {
    full_name: r.full_name?.trim() ?? "",
    chi_nhanh_id: r.chi_nhanh_id != null && r.chi_nhanh_id > 0 ? String(r.chi_nhanh_id) : "",
    vai_tro: vaiTroForForm(r.vai_tro),
    status: statusForForm(r.status),
    ngay_sinh: r.ngay_sinh?.trim().slice(0, 10) ?? "",
    sa_startdate: r.sa_startdate?.trim().slice(0, 10) ?? "",
    thong_tin_khac: r.thong_tin_khac?.trim() ?? "",
    hinh_thuc_tinh_luong: r.hinh_thuc_tinh_luong?.trim() ?? "",
  };
}

type SalaryDraft = {
  luong_co_ban: string;
  tro_cap: string;
  bhxh: string;
  rate_thuong_co_ban: string;
  rate_thuong_hoc_vien: string;
  so_buoi_nghi_toi_da: string;
};

type ContactDraft = {
  sdt: string;
  email: string;
  facebook: string;
  bank_name: string;
  bank_stk: string;
  stk_nhan_luong: string;
  hop_dong_lao_dong: string;
};

function moneyDraftStr(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "";
  return String(Math.round(Number(v)));
}

function buildSalaryDraft(r: AdminNhanSuRow): SalaryDraft {
  return {
    luong_co_ban: moneyDraftStr(r.luong_co_ban),
    tro_cap: moneyDraftStr(r.tro_cap),
    bhxh: moneyDraftStr(r.bhxh),
    rate_thuong_co_ban:
      r.rate_thuong_co_ban != null && Number.isFinite(Number(r.rate_thuong_co_ban))
        ? String(r.rate_thuong_co_ban)
        : "",
    rate_thuong_hoc_vien:
      r.rate_thuong_hoc_vien != null && Number.isFinite(Number(r.rate_thuong_hoc_vien))
        ? String(r.rate_thuong_hoc_vien)
        : "",
    so_buoi_nghi_toi_da:
      r.so_buoi_nghi_toi_da != null && Number.isFinite(Number(r.so_buoi_nghi_toi_da))
        ? String(Math.trunc(Number(r.so_buoi_nghi_toi_da)))
        : "",
  };
}

function buildContactDraft(r: AdminNhanSuRow): ContactDraft {
  return {
    sdt: r.sdt?.trim() ?? "",
    email: r.email?.trim() ?? "",
    facebook: r.facebook?.trim() ?? "",
    bank_name: r.bank_name?.trim() ?? "",
    bank_stk: r.bank_stk?.trim() ?? "",
    stk_nhan_luong: r.stk_nhan_luong?.trim() ?? "",
    hop_dong_lao_dong: r.hop_dong_lao_dong?.trim() ?? "",
  };
}

function parseMoneyInt(s: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = s.trim();
  if (t === "") return { ok: true, value: null };
  const n = Math.round(Number(t));
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Giá trị tiền (đ) không hợp lệ." };
  return { ok: true, value: n };
}

function parseRateOptional(s: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = s.trim().replace(",", ".");
  if (t === "") return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Hệ số thưởng không hợp lệ." };
  return { ok: true, value: n };
}

function parseMaxLeaveOptional(s: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = s.trim();
  if (t === "") return { ok: true, value: null };
  if (!/^\d+$/.test(t)) return { ok: false, error: "Nghỉ tối đa / năm phải là số nguyên ≥ 0." };
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Nghỉ tối đa / năm không hợp lệ." };
  return { ok: true, value: n };
}

type StaffDetailInfoTabHandle = {
  save: () => Promise<boolean>;
};

const StaffDetailInfoTab = forwardRef<
  StaffDetailInfoTabHandle,
  {
    row: AdminNhanSuRow;
    chiNhanhById: Record<number, string>;
    banById: Record<number, string>;
    displayBanIds: number[];
    phongDraftIds: number[];
    setPhongDraftIds: Dispatch<SetStateAction<number[]>>;
    allPhongOptions: AdminPhongOption[];
    readOnly: boolean;
    onAvatarSaved: (avatar: string | null) => void;
    onStaffUpdated: (patch: Partial<AdminNhanSuRow>) => void;
  }
>(function StaffDetailInfoTab(
  {
    row,
    chiNhanhById,
    banById,
    displayBanIds,
    phongDraftIds,
    setPhongDraftIds,
    allPhongOptions,
    readOnly,
    onAvatarSaved,
    onStaffUpdated,
  },
  ref
) {
  const [draft, setDraft] = useState<InfoDraft>(() => buildInfoDraft(row));
  const [saveErr, setSaveErr] = useState<string | null>(null);
  /** Danh sách đầy đủ phòng (checkbox); khi false chỉ xem chip phòng đã chọn. */
  const [phongListOpen, setPhongListOpen] = useState(false);

  const branchOptions = useMemo(
    () =>
      Object.entries(chiNhanhById)
        .map(([id, ten]) => ({ id: Number(id), ten }))
        .filter((x) => Number.isFinite(x.id) && x.id > 0)
        .sort((a, b) => a.ten.localeCompare(b.ten, "vi")),
    [chiNhanhById]
  );

  const branchLabel =
    draft.chi_nhanh_id.trim() !== "" && Number.isFinite(Number(draft.chi_nhanh_id))
      ? chiNhanhById[Number(draft.chi_nhanh_id)] ?? `ID #${draft.chi_nhanh_id}`
      : "—";
  const phongTen = useCallback(
    (pid: number) => allPhongOptions.find((p) => p.id === pid)?.ten ?? `Phòng #${pid}`,
    [allPhongOptions]
  );

  const phongOrphanIds = useMemo(
    () => phongDraftIds.filter((id) => !allPhongOptions.some((p) => p.id === id)),
    [phongDraftIds, allPhongOptions]
  );

  const togglePhongId = useCallback((id: number, nextChecked: boolean) => {
    setPhongDraftIds((xs) => {
      const has = xs.includes(id);
      if (nextChecked && !has) return [...xs, id];
      if (!nextChecked && has) return xs.filter((x) => x !== id);
      return xs;
    });
  }, [setPhongDraftIds]);

  const rowSyncKey = useMemo(
    () =>
      [
        row.id,
        row.full_name ?? "",
        row.chi_nhanh_id ?? "",
        row.vai_tro ?? "",
        row.status ?? "",
        row.ngay_sinh ?? "",
        row.sa_startdate ?? "",
        row.thong_tin_khac ?? "",
        row.hinh_thuc_tinh_luong ?? "",
      ].join("|"),
    [
      row.id,
      row.full_name,
      row.chi_nhanh_id,
      row.vai_tro,
      row.status,
      row.ngay_sinh,
      row.sa_startdate,
      row.thong_tin_khac,
      row.hinh_thuc_tinh_luong,
    ]
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDraft(buildInfoDraft(row));
      setSaveErr(null);
    });
    return () => cancelAnimationFrame(id);
    // rowSyncKey gom các trường đồng bộ form — không dùng [row] (tham chiếu không ổn định).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync theo rowSyncKey
  }, [rowSyncKey]);

  useEffect(() => {
    if (readOnly) setPhongListOpen(false);
  }, [readOnly]);

  const runSave = useCallback(async (): Promise<boolean> => {
    if (readOnly) return true;
    setSaveErr(null);
    const chi = draft.chi_nhanh_id.trim() === "" ? null : Number(draft.chi_nhanh_id);
    if (draft.chi_nhanh_id.trim() !== "" && !Number.isFinite(chi)) {
      setSaveErr("Chi nhánh không hợp lệ.");
      return false;
    }
    const r = await updateNhanSuThongTin({
      id: row.id,
      full_name: draft.full_name,
      chi_nhanh_id: chi,
      vai_tro: draft.vai_tro.trim() || null,
      status: draft.status.trim() || null,
      ngay_sinh: draft.ngay_sinh.trim() || null,
      sa_startdate: draft.sa_startdate.trim() || null,
      thong_tin_khac: draft.thong_tin_khac.trim() || null,
      hinh_thuc_tinh_luong: draft.hinh_thuc_tinh_luong.trim() || null,
    });
    if (!r.ok) {
      setSaveErr(r.error);
      return false;
    }
    onStaffUpdated({
      full_name: draft.full_name.trim() || null,
      chi_nhanh_id: chi,
      vai_tro: draft.vai_tro.trim() || null,
      status: draft.status.trim() || null,
      ngay_sinh: draft.ngay_sinh.trim() ? draft.ngay_sinh.trim().slice(0, 10) : null,
      sa_startdate: draft.sa_startdate.trim() ? draft.sa_startdate.trim().slice(0, 10) : null,
      thong_tin_khac: draft.thong_tin_khac.trim() || null,
      hinh_thuc_tinh_luong: draft.hinh_thuc_tinh_luong.trim() || null,
    });
    return true;
  }, [draft, readOnly, row.id, onStaffUpdated]);

  useImperativeHandle(ref, () => ({ save: () => runSave() }), [runSave]);

  return (
    <div className="space-y-4">
      <SectionTitle>Cơ bản</SectionTitle>
      <FieldRow label="Tên nhân viên">
        {readOnly ? (
          <ReadField value={draft.full_name} />
        ) : (
          <input
            className={inpEdit}
            value={draft.full_name}
            onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
            autoComplete="name"
          />
        )}
      </FieldRow>
      <FieldRow label="Ảnh đại diện">
        <StaffAvatarField
          key={`${row.id}|${row.avatar ?? ""}`}
          row={row}
          readOnly={readOnly}
          onAvatarSaved={onAvatarSaved}
        />
      </FieldRow>
      <FieldRow label="Chi nhánh">
        {readOnly ? (
          <ReadField value={branchLabel} />
        ) : (
          <select
            className={cn(inpEdit, "bg-white")}
            value={draft.chi_nhanh_id}
            onChange={(e) => setDraft((d) => ({ ...d, chi_nhanh_id: e.target.value }))}
          >
            <option value="">— Chưa gán —</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.ten}
              </option>
            ))}
          </select>
        )}
      </FieldRow>
      <FieldRow label="Vai trò">
        {readOnly ? (
          <ReadField value={vaiTroLabel(draft.vai_tro)} />
        ) : (
          <select
            className={cn(inpEdit, "bg-white")}
            value={draft.vai_tro}
            onChange={(e) => setDraft((d) => ({ ...d, vai_tro: e.target.value }))}
          >
            <option value="nhan_vien">Nhân viên</option>
            <option value="quan_ly">Quản lý</option>
            <option value="admin">Admin</option>
          </select>
        )}
      </FieldRow>
      <FieldRow label="Tình trạng">
        {readOnly ? (
          <ReadField value={draft.status} />
        ) : (
          <select
            className={cn(inpEdit, "bg-white")}
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          >
            {STATUS_FORM_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </FieldRow>
      <FieldRow label="Hình thức lương">
        {readOnly ? (
          <ReadField value={draft.hinh_thuc_tinh_luong} />
        ) : (
          <input
            className={inpEdit}
            value={draft.hinh_thuc_tinh_luong}
            onChange={(e) => setDraft((d) => ({ ...d, hinh_thuc_tinh_luong: e.target.value }))}
            placeholder="Ví dụ: Fulltime"
          />
        )}
      </FieldRow>

      <SectionTitle>Phòng ban</SectionTitle>
      <FieldRow label="Thuộc phòng">
        <div className="space-y-2">
          {readOnly ? (
            <div className="flex flex-wrap gap-1.5">
              {phongDraftIds.length === 0 ? (
                <span className="text-[12px] text-[#AAA]">—</span>
              ) : (
                phongDraftIds.map((pid) => (
                  <span
                    key={pid}
                    className="inline-flex items-center gap-1 rounded-full border border-[#F8C4DC] bg-[#FFF5F9] px-2.5 py-1 text-[11px] font-bold text-[#C2185B]"
                  >
                    {phongTen(pid)}
                  </span>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1 flex flex-wrap gap-1.5">
                  {phongDraftIds.length === 0 ? (
                    <span className="text-[12px] leading-8 text-[#AAA]">Chưa chọn phòng</span>
                  ) : (
                    phongDraftIds.map((pid) => (
                      <span
                        key={pid}
                        className="inline-flex items-center gap-1 rounded-full border border-[#F8C4DC] bg-[#FFF5F9] px-2.5 py-1 text-[11px] font-bold text-[#C2185B]"
                      >
                        {phongTen(pid)}
                        <button
                          type="button"
                          aria-label={`Bỏ ${phongTen(pid)}`}
                          className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[#C2185B] hover:bg-[#F8C4DC]/60"
                          onClick={() => togglePhongId(pid, false)}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  aria-expanded={phongListOpen}
                  aria-controls={`phong-checkbox-${row.id}`}
                  title={phongListOpen ? "Thu gọn danh sách phòng" : "Chọn hoặc sửa phòng"}
                  aria-label={phongListOpen ? "Thu gọn danh sách phòng" : "Chọn hoặc sửa phòng"}
                  onClick={() => setPhongListOpen((o) => !o)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-[#555] shadow-sm transition hover:bg-[#fafafa]"
                >
                  {phongListOpen ? (
                    <ChevronUp size={18} className="opacity-80" aria-hidden />
                  ) : (
                    <Pencil size={16} className="opacity-80" aria-hidden />
                  )}
                </button>
              </div>
              {phongListOpen ? (
                <div
                  id={`phong-checkbox-${row.id}`}
                  className="max-h-[min(40vh,260px)] overflow-y-auto rounded-xl border border-black/[0.08] bg-white px-1 py-1.5"
                  role="group"
                  aria-label="Chọn phòng"
                >
                  {allPhongOptions.length === 0 && phongOrphanIds.length === 0 ? (
                    <p className="m-0 px-2 py-2 text-[12px] text-[#AAA]">Chưa có danh sách phòng.</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                      {phongOrphanIds.map((id) => (
                        <li key={`orphan-${id}`}>
                          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#F5F7F7]">
                            <input
                              type="checkbox"
                              checked
                              onChange={() => togglePhongId(id, false)}
                              className="h-4 w-4 shrink-0 rounded border-[#CCC] accent-[#E91E8C]"
                            />
                            <span className="min-w-0 font-medium text-[#1a1a2e]">{phongTen(id)}</span>
                          </label>
                        </li>
                      ))}
                      {allPhongOptions.map((p) => {
                        const checked = phongDraftIds.includes(p.id);
                        return (
                          <li key={p.id}>
                            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#F5F7F7]">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => togglePhongId(p.id, e.target.checked)}
                                className="h-4 w-4 shrink-0 rounded border-[#CCC] accent-[#E91E8C]"
                              />
                              <span className="min-w-0 font-medium text-[#1a1a2e]">{p.ten}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </FieldRow>
      <FieldRow label="Thuộc ban">
        <div className="flex flex-wrap gap-1.5">
          {displayBanIds.length === 0 ? (
            <span className="text-[12px] text-[#AAA]">—</span>
          ) : (
            displayBanIds.map((bid) => <BanPill key={bid} label={banById[bid] ?? `Ban #${bid}`} />)
          )}
        </div>
      </FieldRow>

      <SectionTitle>Thời gian</SectionTitle>
      <FieldRow label="Ngày sinh">
        {readOnly ? (
          <ReadField value={fmtDate(draft.ngay_sinh.trim() ? draft.ngay_sinh : null)} />
        ) : (
          <input
            type="date"
            className={cn(inpEdit, "bg-white")}
            value={draft.ngay_sinh}
            onChange={(e) => setDraft((d) => ({ ...d, ngay_sinh: e.target.value }))}
          />
        )}
      </FieldRow>
      <FieldRow label="Ngày vào Sine Art">
        {readOnly ? (
          <ReadField value={fmtDate(draft.sa_startdate.trim() ? draft.sa_startdate : null)} />
        ) : (
          <input
            type="date"
            className={cn(inpEdit, "bg-white")}
            value={draft.sa_startdate}
            onChange={(e) => setDraft((d) => ({ ...d, sa_startdate: e.target.value }))}
          />
        )}
      </FieldRow>

      <SectionTitle>Ghi chú</SectionTitle>
      <FieldRow label="Thông tin khác">
        {readOnly ? (
          <ReadField value={draft.thong_tin_khac} multiline />
        ) : (
          <textarea
            className={cn(inpEdit, "min-h-[88px] resize-y bg-white")}
            value={draft.thong_tin_khac}
            onChange={(e) => setDraft((d) => ({ ...d, thong_tin_khac: e.target.value }))}
            rows={4}
          />
        )}
      </FieldRow>

      {saveErr ? <p className="m-0 text-[11px] font-semibold text-red-600">{saveErr}</p> : null}
    </div>
  );
});

StaffDetailInfoTab.displayName = "StaffDetailInfoTab";

/** `key` từ cha nên gồm `row.avatar` để sau khi lưu / refresh đồng bộ lại state cục bộ. */
function StaffAvatarField({
  row,
  onAvatarSaved,
  readOnly,
}: {
  row: AdminNhanSuRow;
  onAvatarSaved: (avatar: string | null) => void;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(() => row.avatar ?? "");
  const [saveErr, setSaveErr] = useState<string | null>(null);

  if (readOnly) {
    return (
      <div className="flex items-start gap-3" aria-label="Ảnh đại diện (chỉ xem)">
        {row.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.avatar}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full border-2 border-[#EAEAEA] object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F8A568] to-[#EE5CA2] text-lg font-bold text-white">
            {(row.full_name ?? "?").trim().charAt(0).toUpperCase() || "?"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AdminCfImageInput
        label="Ảnh đại diện"
        preview="avatar"
        compact
        syncKey={row.id}
        value={avatarUrl}
        onValueChange={(u) => {
          const prev = avatarUrl;
          setSaveErr(null);
          setAvatarUrl(u);
          void (async () => {
            const nextDb = u.trim() === "" ? null : u.trim();
            const r = await updateNhanSuAvatar(row.id, nextDb);
            if (!r.ok) {
              setAvatarUrl(prev);
              setSaveErr(r.error);
              return;
            }
            onAvatarSaved(nextDb);
            router.refresh();
          })();
        }}
      />
      {saveErr ? <p className="m-0 text-[11px] font-semibold text-red-600">{saveErr}</p> : null}
    </div>
  );
}

/** Modal tạo `hr_nhan_su` + `hr_nhan_su_phong` — flow tương đương Framer `createNhanSu` / `setPhongForNhanSu`. */
function StaffCreateModal({
  onClose,
  onCreated,
  chiNhanhById,
  banById,
  phongToBanId,
  allPhongOptions,
}: {
  onClose: () => void;
  onCreated: (row: AdminNhanSuRow) => void;
  chiNhanhById: Record<number, string>;
  banById: Record<number, string>;
  phongToBanId: Record<number, number>;
  allPhongOptions: AdminPhongOption[];
}) {
  const [fullName, setFullName] = useState("");
  const [chiNhanhId, setChiNhanhId] = useState<string>("");
  const [vaiTro, setVaiTro] = useState("nhan_vien");
  const [status, setStatus] = useState<string>("Đang làm");
  const [hinhThuc, setHinhThuc] = useState<string>("Fulltime");
  const [ngaySinh, setNgaySinh] = useState("");
  const [saStart, setSaStart] = useState("");
  const [email, setEmail] = useState("");
  const [sdt, setSdt] = useState("");
  const [phongDraftIds, setPhongDraftIds] = useState<number[]>([]);
  const [phongListOpen, setPhongListOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const branchOptions = useMemo(
    () =>
      Object.entries(chiNhanhById)
        .map(([id, ten]) => ({ id: Number(id), ten }))
        .filter((x) => Number.isFinite(x.id) && x.id > 0)
        .sort((a, b) => a.ten.localeCompare(b.ten, "vi")),
    [chiNhanhById],
  );

  const displayBanIds = useMemo(() => {
    const set = new Set<number>();
    for (const pid of phongDraftIds) {
      const b = phongToBanId[pid];
      if (b != null && b > 0) set.add(b);
    }
    return [...set].sort((a, b) => a - b);
  }, [phongDraftIds, phongToBanId]);

  const phongTen = useCallback(
    (pid: number) => allPhongOptions.find((p) => p.id === pid)?.ten ?? `Phòng #${pid}`,
    [allPhongOptions],
  );

  const phongOrphanIds = useMemo(
    () => phongDraftIds.filter((id) => !allPhongOptions.some((p) => p.id === id)),
    [phongDraftIds, allPhongOptions],
  );

  const togglePhongId = useCallback((id: number, nextChecked: boolean) => {
    setPhongDraftIds((xs) => {
      const has = xs.includes(id);
      if (nextChecked && !has) return [...xs, id];
      if (!nextChecked && has) return xs.filter((x) => x !== id);
      return xs;
    });
  }, []);

  const submit = async () => {
    if (!fullName.trim()) {
      setErr("Nhập họ tên nhân viên.");
      return;
    }
    setBusy(true);
    setErr(null);
    const chi = chiNhanhId.trim() === "" ? null : Number(chiNhanhId);
    if (chiNhanhId.trim() !== "" && !Number.isFinite(chi)) {
      setErr("Chi nhánh không hợp lệ.");
      setBusy(false);
      return;
    }
    const r = await createNhanSu({
      full_name: fullName.trim(),
      chi_nhanh_id: chi,
      vai_tro: vaiTro,
      status,
      hinh_thuc_tinh_luong: hinhThuc,
      phong_ids: phongDraftIds,
      ngay_sinh: ngaySinh.trim() || null,
      sa_startdate: saStart.trim() || null,
      email: email.trim() || null,
      sdt: sdt.trim() || null,
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    onCreated(r.row);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className="flex max-h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)] sm:max-h-[92vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold text-[#1a1a2e]">Thêm nhân viên mới</div>
            <div className="mt-0.5 text-[11px] text-[#888]">Lưu vào bảng hr_nhan_su — có thể chỉnh lương / bảng lương sau.</div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EAEAEA] bg-[#fafafa] text-[#666] transition hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-[13px]">
          <SectionTitle>Cơ bản</SectionTitle>
          <FieldRow label="Tên nhân viên *">
            <input
              className={inpEdit}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Họ và tên"
              autoComplete="name"
            />
          </FieldRow>
          <FieldRow label="Chi nhánh">
            <select
              className={cn(inpEdit, "bg-white")}
              value={chiNhanhId}
              onChange={(e) => setChiNhanhId(e.target.value)}
            >
              <option value="">— Chưa gán —</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.ten}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Vai trò">
            <select className={cn(inpEdit, "bg-white")} value={vaiTro} onChange={(e) => setVaiTro(e.target.value)}>
              <option value="nhan_vien">Nhân viên</option>
              <option value="quan_ly">Quản lý</option>
              <option value="admin">Admin</option>
            </select>
          </FieldRow>
          <FieldRow label="Tình trạng">
            <select className={cn(inpEdit, "bg-white")} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FORM_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Hình thức lương">
            <select className={cn(inpEdit, "bg-white")} value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value)}>
              {HINH_THUC_FORM_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FieldRow>

          <SectionTitle>Liên hệ</SectionTitle>
          <FieldRow label="SĐT">
            <input className={inpEdit} value={sdt} onChange={(e) => setSdt(e.target.value)} inputMode="tel" />
          </FieldRow>
          <FieldRow label="Email">
            <input className={inpEdit} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </FieldRow>

          <SectionTitle>Thời gian</SectionTitle>
          <FieldRow label="Ngày sinh">
            <input type="date" className={cn(inpEdit, "bg-white")} value={ngaySinh} onChange={(e) => setNgaySinh(e.target.value)} />
          </FieldRow>
          <FieldRow label="Ngày vào Sine Art">
            <input type="date" className={cn(inpEdit, "bg-white")} value={saStart} onChange={(e) => setSaStart(e.target.value)} />
          </FieldRow>

          <SectionTitle>Phòng ban</SectionTitle>
          <FieldRow label="Thuộc phòng">
            <div className="space-y-2">
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {phongDraftIds.length === 0 ? (
                    <span className="text-[12px] leading-8 text-[#AAA]">Chưa chọn phòng</span>
                  ) : (
                    phongDraftIds.map((pid) => (
                      <span
                        key={pid}
                        className="inline-flex items-center gap-1 rounded-full border border-[#F8C4DC] bg-[#FFF5F9] px-2.5 py-1 text-[11px] font-bold text-[#C2185B]"
                      >
                        {phongTen(pid)}
                        <button
                          type="button"
                          aria-label={`Bỏ ${phongTen(pid)}`}
                          className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[#C2185B] hover:bg-[#F8C4DC]/60"
                          onClick={() => togglePhongId(pid, false)}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  aria-expanded={phongListOpen}
                  title={phongListOpen ? "Thu gọn" : "Chọn phòng"}
                  onClick={() => setPhongListOpen((o) => !o)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-[#555] shadow-sm transition hover:bg-[#fafafa]"
                >
                  {phongListOpen ? <ChevronUp size={18} className="opacity-80" aria-hidden /> : <Pencil size={16} className="opacity-80" aria-hidden />}
                </button>
              </div>
              {phongListOpen ? (
                <div
                  className="max-h-[min(40vh,260px)] overflow-y-auto rounded-xl border border-black/[0.08] bg-white px-1 py-1.5"
                  role="group"
                  aria-label="Chọn phòng"
                >
                  {allPhongOptions.length === 0 && phongOrphanIds.length === 0 ? (
                    <p className="m-0 px-2 py-2 text-[12px] text-[#AAA]">Chưa có danh sách phòng.</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                      {phongOrphanIds.map((id) => (
                        <li key={`orphan-${id}`}>
                          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#F5F7F7]">
                            <input
                              type="checkbox"
                              checked
                              onChange={() => togglePhongId(id, false)}
                              className="h-4 w-4 shrink-0 rounded border-[#CCC] accent-[#E91E8C]"
                            />
                            <span className="min-w-0 font-medium text-[#1a1a2e]">{phongTen(id)}</span>
                          </label>
                        </li>
                      ))}
                      {allPhongOptions.map((p) => {
                        const checked = phongDraftIds.includes(p.id);
                        return (
                          <li key={p.id}>
                            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#F5F7F7]">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => togglePhongId(p.id, e.target.checked)}
                                className="h-4 w-4 shrink-0 rounded border-[#CCC] accent-[#E91E8C]"
                              />
                              <span className="min-w-0 font-medium text-[#1a1a2e]">{p.ten}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </FieldRow>
          <FieldRow label="Thuộc ban (suy ra từ phòng)">
            <div className="flex flex-wrap gap-1.5">
              {displayBanIds.length === 0 ? (
                <span className="text-[12px] text-[#AAA]">—</span>
              ) : (
                displayBanIds.map((bid) => <BanPill key={bid} label={banById[bid] ?? `Ban #${bid}`} />)
              )}
            </div>
          </FieldRow>

          {err ? <p className="m-0 text-[11px] font-semibold text-red-600">{err}</p> : null}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa] px-5 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-bold text-[#555] shadow-sm transition hover:bg-white disabled:opacity-45"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-3 py-2 text-[12px] font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-45"
          >
            <Plus size={15} aria-hidden />
            {busy ? "Đang tạo…" : "Tạo nhân viên"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StaffDetailPanel({
  row,
  chiNhanhById,
  banById,
  phongIdsForStaff,
  phongToBanId,
  allPhongOptions,
  usedMinimalSelect,
  bangLuongRows,
  onClose,
  onAvatarSaved,
  onStaffUpdated,
}: {
  row: AdminNhanSuRow;
  chiNhanhById: Record<number, string>;
  banById: Record<number, string>;
  phongIdsForStaff: number[];
  phongToBanId: Record<number, number>;
  allPhongOptions: AdminPhongOption[];
  usedMinimalSelect: boolean;
  bangLuongRows: AdminBangTinhLuongListItem[];
  onClose: () => void;
  onAvatarSaved: (avatar: string | null) => void;
  onStaffUpdated: (patch: Partial<AdminNhanSuRow>) => void;
}) {
  const router = useRouter();
  const { canDelete: staffMayDeleteRecords } = useAdminDashboardAbilities();
  const infoTabRef = useRef<StaffDetailInfoTabHandle>(null);
  const [taoLuongOpen, setTaoLuongOpen] = useState(false);
  const [taoLuongKey, setTaoLuongKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saveAllBusy, setSaveAllBusy] = useState(false);
  const [panelSaveErr, setPanelSaveErr] = useState<string | null>(null);
  const [draftResetKey, setDraftResetKey] = useState(0);
  const [salaryDraft, setSalaryDraft] = useState<SalaryDraft>(() => buildSalaryDraft(row));
  const [contactDraft, setContactDraft] = useState<ContactDraft>(() => buildContactDraft(row));
  const phongSortedKey = useMemo(
    () => [...phongIdsForStaff].sort((a, b) => a - b).join(","),
    [phongIdsForStaff]
  );
  const [phongDraftIds, setPhongDraftIds] = useState<number[]>(() => [...phongIdsForStaff]);
  const [tab, setTab] = useState<StaffDetailTab>("info");
  /** Dòng bảng lương đang xem phiếu (chỉ hiện phiếu khi chọn dòng hoặc sau khi tạo xong lịch điểm danh). */
  const [payrollSlipBangId, setPayrollSlipBangId] = useState<number | null>(null);
  const [payrollDeletingId, setPayrollDeletingId] = useState<number | null>(null);
  const [payrollDeleteTarget, setPayrollDeleteTarget] = useState<AdminBangTinhLuongListItem | null>(null);
  const payslipCardRef = useRef<HTMLDivElement>(null);
  const [payrollCopyBusy, setPayrollCopyBusy] = useState(false);
  const [payrollCopyNotice, setPayrollCopyNotice] = useState<string | null>(null);

  const displayBanIds = useMemo(() => {
    const set = new Set<number>();
    if (row.ban != null && row.ban > 0) set.add(row.ban);
    for (const pid of phongDraftIds) {
      const b = phongToBanId[pid];
      if (b != null && b > 0) set.add(b);
    }
    return [...set].sort((a, b) => a - b);
  }, [row.ban, phongDraftIds, phongToBanId]);

  const branch =
    row.chi_nhanh_id != null ? chiNhanhById[row.chi_nhanh_id] ?? `ID #${row.chi_nhanh_id}` : "—";

  const canEdit = !usedMinimalSelect;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setEditing(false);
    setDraftResetKey((k) => k + 1);
    setPanelSaveErr(null);
    setPayrollSlipBangId(null);
    setPayrollDeleteTarget(null);
  }, [row.id]);

  useEffect(() => {
    if (!staffMayDeleteRecords) setPayrollDeleteTarget(null);
  }, [staffMayDeleteRecords]);

  useEffect(() => {
    if (payrollSlipBangId == null) return;
    if (!bangLuongRows.some((b) => b.id === payrollSlipBangId)) {
      setPayrollSlipBangId(null);
    }
  }, [bangLuongRows, payrollSlipBangId]);

  useEffect(() => {
    setPayrollCopyNotice(null);
  }, [payrollSlipBangId]);

  useEffect(() => {
    if (!payrollCopyNotice) return;
    const t = window.setTimeout(() => setPayrollCopyNotice(null), 4500);
    return () => window.clearTimeout(t);
  }, [payrollCopyNotice]);

  useEffect(() => {
    const ids =
      phongSortedKey === "" ? [] : phongSortedKey.split(",").map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
    setPhongDraftIds(ids);
  }, [row.id, phongSortedKey]);

  useEffect(() => {
    if (editing) return;
    setSalaryDraft(buildSalaryDraft(row));
    setContactDraft(buildContactDraft(row));
  }, [row, editing]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setDraftResetKey((k) => k + 1);
    setSalaryDraft(buildSalaryDraft(row));
    setContactDraft(buildContactDraft(row));
    setPhongDraftIds(
      phongSortedKey === "" ? [] : phongSortedKey.split(",").map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
    );
    setPanelSaveErr(null);
  }, [row, phongSortedKey]);

  const confirmPayrollBangDelete = useCallback(async () => {
    const bl = payrollDeleteTarget;
    if (!bl || !canEdit || !staffMayDeleteRecords) return;
    setPayrollDeletingId(bl.id);
    try {
      const r = await deleteHrBangTinhLuongFull(bl.id);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      setPayrollSlipBangId((cur) => (cur === bl.id ? null : cur));
      setPayrollDeleteTarget(null);
      void router.refresh();
    } finally {
      setPayrollDeletingId(null);
    }
  }, [canEdit, payrollDeleteTarget, router, staffMayDeleteRecords]);

  const copyPayrollPayslipImage = useCallback(async () => {
    const el = payslipCardRef.current;
    if (!el || payrollCopyBusy) return;
    setPayrollCopyBusy(true);
    setPayrollCopyNotice(null);
    try {
      const r = await copyDomAsPngToClipboard(el);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      setPayrollCopyNotice("Đã sao chép ảnh phiếu lương — mở Zalo/Messenger và dán (Ctrl+V).");
    } finally {
      setPayrollCopyBusy(false);
    }
  }, [payrollCopyBusy]);

  const runSaveAll = useCallback(async () => {
    if (!editing) return;
    setPanelSaveErr(null);
    setSaveAllBusy(true);
    try {
      const okInfo = (await infoTabRef.current?.save()) ?? false;
      if (!okInfo) return;

      const rPhong = await syncHrNhanSuPhong({ nhan_su_id: row.id, phong_ids: phongDraftIds });
      if (!rPhong.ok) {
        setPanelSaveErr(rPhong.error);
        return;
      }

      const mLcb = parseMoneyInt(salaryDraft.luong_co_ban);
      if (!mLcb.ok) {
        setPanelSaveErr(mLcb.error);
        return;
      }
      const mTc = parseMoneyInt(salaryDraft.tro_cap);
      if (!mTc.ok) {
        setPanelSaveErr(mTc.error);
        return;
      }
      const mBhxh = parseMoneyInt(salaryDraft.bhxh);
      if (!mBhxh.ok) {
        setPanelSaveErr(mBhxh.error);
        return;
      }
      const rCb = parseRateOptional(salaryDraft.rate_thuong_co_ban);
      if (!rCb.ok) {
        setPanelSaveErr(rCb.error);
        return;
      }
      const rHv = parseRateOptional(salaryDraft.rate_thuong_hoc_vien);
      if (!rHv.ok) {
        setPanelSaveErr(rHv.error);
        return;
      }
      const mLeave = parseMaxLeaveOptional(salaryDraft.so_buoi_nghi_toi_da);
      if (!mLeave.ok) {
        setPanelSaveErr(mLeave.error);
        return;
      }

      const res = await updateNhanSuLuongVaLienHe({
        id: row.id,
        luong_co_ban: mLcb.value,
        tro_cap: mTc.value,
        bhxh: mBhxh.value,
        rate_thuong_co_ban: rCb.value,
        rate_thuong_hoc_vien: rHv.value,
        so_buoi_nghi_toi_da: mLeave.value,
        sdt: contactDraft.sdt.trim() || null,
        email: contactDraft.email.trim() || null,
        facebook: contactDraft.facebook.trim() || null,
        bank_name: contactDraft.bank_name.trim() || null,
        bank_stk: contactDraft.bank_stk.trim() || null,
        stk_nhan_luong: contactDraft.stk_nhan_luong.trim() || null,
        hop_dong_lao_dong: contactDraft.hop_dong_lao_dong.trim() || null,
      });
      if (!res.ok) {
        setPanelSaveErr(res.error);
        return;
      }

      onStaffUpdated({
        luong_co_ban: mLcb.value,
        tro_cap: mTc.value,
        bhxh: mBhxh.value,
        rate_thuong_co_ban: rCb.value,
        rate_thuong_hoc_vien: rHv.value,
        so_buoi_nghi_toi_da: mLeave.value,
        sdt: contactDraft.sdt.trim() || null,
        email: contactDraft.email.trim() || null,
        facebook: contactDraft.facebook.trim() || null,
        bank_name: contactDraft.bank_name.trim() || null,
        bank_stk: contactDraft.bank_stk.trim() || null,
        stk_nhan_luong: contactDraft.stk_nhan_luong.trim() || null,
        hop_dong_lao_dong: contactDraft.hop_dong_lao_dong.trim() || null,
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaveAllBusy(false);
    }
  }, [contactDraft, editing, onStaffUpdated, phongDraftIds, router, row.id, salaryDraft]);

  const tabs: { id: StaffDetailTab; label: string }[] = [
    { id: "info", label: "Thông tin" },
    { id: "salary", label: "Lương & Hệ số" },
    { id: "contact", label: "Liên hệ & HĐ" },
    { id: "payroll", label: "Bảng lương" },
  ];

  const minimalHint = usedMinimalSelect ? (
    <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
      Dữ liệu chỉ tải tối thiểu — một số trường có thể thiếu.
    </p>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className="flex max-h-[100dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)] sm:max-h-[92vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {row.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.avatar}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full border-2 border-[#EAEAEA] object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F8A568] to-[#EE5CA2] text-lg font-bold text-white">
                {(row.full_name ?? "?").trim().charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] font-extrabold text-[#1a1a2e]">
                {row.full_name?.trim() || `Nhân sự #${row.id}`}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <StatusPillDisplay raw={row.status} />
                {branch !== "—" ? <ChiNhanhPill label={branch} /> : null}
                <VaiTroPillDisplay raw={row.vai_tro} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEdit ? (
              editing ? (
                <>
                  <button
                    type="button"
                    disabled={saveAllBusy}
                    onClick={cancelEditing}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-bold text-[#555] shadow-sm transition hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={saveAllBusy}
                    onClick={() => void runSaveAll()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-3 py-2 text-[12px] font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Save size={15} aria-hidden />
                    {saveAllBusy ? "Đang lưu…" : "Lưu"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={saveAllBusy}
                  title="Chỉnh sửa hồ sơ"
                  aria-label="Chỉnh sửa hồ sơ"
                  onClick={() => {
                    setEditing(true);
                    setPanelSaveErr(null);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#EAEAEA] bg-white text-[#555] shadow-sm transition hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Pencil size={16} aria-hidden />
                </button>
              )
            ) : null}
            <button
              type="button"
              aria-label="Đóng"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EAEAEA] bg-[#fafafa] text-[#666] transition hover:bg-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 gap-0 border-b border-black/[0.06] px-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative min-w-0 flex-1 px-2 py-3 text-center text-[12px] font-bold transition-colors",
                tab === t.id ? "text-[#E91E8C]" : "text-[#888] hover:text-[#555]"
              )}
            >
              {t.label}
              {tab === t.id ? (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-[#f8a668] to-[#ee5b9f]" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-[13px]">
          {minimalHint}
          {/* Luôn mount tab Thông tin để `infoTabRef` còn khi Lưu từ tab Lương / Liên hệ / Bảng lương. */}
          <div className={tab === "info" ? "block" : "hidden"} aria-hidden={tab !== "info"}>
            <StaffDetailInfoTab
              key={`${row.id}-${draftResetKey}`}
              ref={infoTabRef}
              row={row}
              chiNhanhById={chiNhanhById}
              banById={banById}
              displayBanIds={displayBanIds}
              phongDraftIds={phongDraftIds}
              setPhongDraftIds={setPhongDraftIds}
              allPhongOptions={allPhongOptions}
              readOnly={!editing}
              onAvatarSaved={onAvatarSaved}
              onStaffUpdated={onStaffUpdated}
            />
          </div>

          {tab === "salary" ? (
            <div className="space-y-4">
              <SectionTitle>Lương cơ bản</SectionTitle>
              <FieldRow label="Lương cơ bản (đ)" hint={editing ? "Số nguyên (đ), để trống = chưa gán" : undefined}>
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={cn(inpEdit, "bg-white tabular-nums")}
                    value={salaryDraft.luong_co_ban}
                    onChange={(e) => setSalaryDraft((d) => ({ ...d, luong_co_ban: e.target.value }))}
                  />
                ) : (
                  <ReadField value={fmtVnd(row.luong_co_ban)} />
                )}
              </FieldRow>
              <FieldRow label="Trợ cấp (đ)">
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={cn(inpEdit, "bg-white tabular-nums")}
                    value={salaryDraft.tro_cap}
                    onChange={(e) => setSalaryDraft((d) => ({ ...d, tro_cap: e.target.value }))}
                  />
                ) : (
                  <ReadField value={fmtVnd(row.tro_cap)} />
                )}
              </FieldRow>
              <FieldRow label="BHXH (đ)">
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={cn(inpEdit, "bg-white tabular-nums")}
                    value={salaryDraft.bhxh}
                    onChange={(e) => setSalaryDraft((d) => ({ ...d, bhxh: e.target.value }))}
                  />
                ) : (
                  <ReadField value={fmtVnd(row.bhxh)} />
                )}
              </FieldRow>
              <SectionTitle>Hệ số thưởng</SectionTitle>
              <FieldRow label="Hệ số thưởng cơ bản" hint={editing ? "Dấu thập phân: dùng . hoặc ," : undefined}>
                {editing ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className={cn(inpEdit, "bg-white tabular-nums")}
                    value={salaryDraft.rate_thuong_co_ban}
                    onChange={(e) => setSalaryDraft((d) => ({ ...d, rate_thuong_co_ban: e.target.value }))}
                  />
                ) : (
                  <ReadField value={row.rate_thuong_co_ban != null ? String(row.rate_thuong_co_ban) : "—"} />
                )}
              </FieldRow>
              <FieldRow label="Hệ số thưởng học viên">
                {editing ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className={cn(inpEdit, "bg-white tabular-nums")}
                    value={salaryDraft.rate_thuong_hoc_vien}
                    onChange={(e) => setSalaryDraft((d) => ({ ...d, rate_thuong_hoc_vien: e.target.value }))}
                  />
                ) : (
                  <ReadField value={row.rate_thuong_hoc_vien != null ? String(row.rate_thuong_hoc_vien) : "—"} />
                )}
              </FieldRow>
              <SectionTitle>Nghỉ phép</SectionTitle>
              <FieldRow label="Nghỉ tối đa / năm" hint={editing ? "Số nguyên ≥ 0, để trống = chưa gán" : undefined}>
                {editing ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    className={cn(inpEdit, "bg-white tabular-nums")}
                    value={salaryDraft.so_buoi_nghi_toi_da}
                    onChange={(e) => setSalaryDraft((d) => ({ ...d, so_buoi_nghi_toi_da: e.target.value }))}
                  />
                ) : (
                  <ReadField value={row.so_buoi_nghi_toi_da != null ? String(row.so_buoi_nghi_toi_da) : "—"} />
                )}
              </FieldRow>
            </div>
          ) : null}

          {tab === "contact" ? (
            <div className="space-y-4">
              <SectionTitle>Liên hệ</SectionTitle>
              <FieldRow label="SĐT">
                {editing ? (
                  <input
                    className={inpEdit}
                    value={contactDraft.sdt}
                    onChange={(e) => setContactDraft((d) => ({ ...d, sdt: e.target.value }))}
                    autoComplete="tel"
                  />
                ) : (
                  <ReadField value={row.sdt ?? ""} />
                )}
              </FieldRow>
              <FieldRow label="Email">
                {editing ? (
                  <input
                    type="email"
                    className={inpEdit}
                    value={contactDraft.email}
                    onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
                    autoComplete="email"
                  />
                ) : (
                  <ReadField value={row.email ?? ""} />
                )}
              </FieldRow>
              <FieldRow label="Facebook">
                {editing ? (
                  <textarea
                    className={cn(inpEdit, "min-h-[60px] resize-y bg-white whitespace-pre-wrap")}
                    rows={2}
                    value={contactDraft.facebook}
                    onChange={(e) => setContactDraft((d) => ({ ...d, facebook: e.target.value }))}
                    placeholder="URL hoặc tên trang"
                  />
                ) : row.facebook?.trim() ? (
                  <ReadField
                    value={
                      /^https?:\/\//i.test(row.facebook.trim())
                        ? row.facebook.trim()
                        : `https://${row.facebook.trim()}`
                    }
                  />
                ) : (
                  <ReadField value="" />
                )}
              </FieldRow>
              <SectionTitle>Ngân hàng</SectionTitle>
              <FieldRow label="Tên ngân hàng">
                {editing ? (
                  <textarea
                    className={cn(inpEdit, "min-h-[72px] resize-y bg-white whitespace-pre-wrap")}
                    rows={3}
                    value={contactDraft.bank_name}
                    onChange={(e) => setContactDraft((d) => ({ ...d, bank_name: e.target.value }))}
                  />
                ) : (
                  <ReadField value={row.bank_name?.trim() ?? ""} multiline />
                )}
              </FieldRow>
              <FieldRow label="STK (bank_stk)">
                {editing ? (
                  <textarea
                    className={cn(inpEdit, "min-h-[72px] resize-y bg-white whitespace-pre-wrap")}
                    rows={3}
                    value={contactDraft.bank_stk}
                    onChange={(e) => setContactDraft((d) => ({ ...d, bank_stk: e.target.value }))}
                  />
                ) : (
                  <ReadField value={row.bank_stk?.trim() ?? ""} multiline />
                )}
              </FieldRow>
              <FieldRow label="STK nhận lương (stk_nhan_luong)" hint={editing ? "Có thể trùng hoặc khác STK trên" : undefined}>
                {editing ? (
                  <textarea
                    className={cn(inpEdit, "min-h-[72px] resize-y bg-white whitespace-pre-wrap")}
                    rows={3}
                    value={contactDraft.stk_nhan_luong}
                    onChange={(e) => setContactDraft((d) => ({ ...d, stk_nhan_luong: e.target.value }))}
                  />
                ) : (
                  <ReadField value={row.stk_nhan_luong?.trim() ?? ""} multiline />
                )}
              </FieldRow>
              {!editing ? (
                <FieldRow label="Tóm tắt hiển thị">
                  <div className="space-y-1 rounded-xl bg-[#F5F7F7] px-3 py-2.5 text-[13px] font-medium text-[#1a1a2e]">
                    <div>{row.bank_name?.trim() || "—"}</div>
                    <div className="tabular-nums">{displayStk(row) || "—"}</div>
                    <div className="text-[12px] text-[#666]">{row.full_name?.trim() || "—"}</div>
                  </div>
                </FieldRow>
              ) : null}
              <SectionTitle>Hợp đồng</SectionTitle>
              <FieldRow label="HĐLĐ (URL)">
                {editing ? (
                  <textarea
                    className={cn(inpEdit, "min-h-[72px] resize-y bg-white whitespace-pre-wrap")}
                    rows={3}
                    value={contactDraft.hop_dong_lao_dong}
                    onChange={(e) => setContactDraft((d) => ({ ...d, hop_dong_lao_dong: e.target.value }))}
                    placeholder="https://…"
                  />
                ) : row.hop_dong_lao_dong?.trim() ? (
                  <ReadField value={row.hop_dong_lao_dong.trim()} />
                ) : (
                  <ReadField value="" />
                )}
              </FieldRow>
            </div>
          ) : null}

          {tab === "payroll" ? (
            <div className="min-h-0 overflow-hidden">
              <motion.div
                className="flex"
                style={{ width: "200%" }}
                initial={false}
                animate={{ x: payrollSlipBangId != null ? "-50%" : "0%" }}
                transition={{ type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Cột 1: danh sách bảng lương */}
                <div className="w-1/2 min-w-0 shrink-0 pr-1">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#AAA]">
                        Bảng tính lương ({bangLuongRows.length})
                      </h3>
                      <p className="mt-1 m-0 text-[10px] font-medium leading-snug text-[#AAA]">
                        Bấm một dòng để xem phiếu lương (chỉ đủ dữ liệu sau khi đã tạo lịch điểm danh). Khi tạo xong trong modal,
                        phiếu của bảng vừa tạo mở sẵn.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!canEdit}
                      title={!canEdit ? "Chỉ khả dụng khi tải đủ dữ liệu nhân sự" : "Tạo bảng tính lương mới"}
                      onClick={() => {
                        setTaoLuongKey((k) => k + 1);
                        setTaoLuongOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-3 py-1.5 text-[11px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Plus size={14} />
                      Tạo bảng lương
                    </button>
                  </div>
                  {bangLuongRows.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#EAEAEA] bg-[#fafafa] py-8 text-center text-[12px] font-medium text-[#AAA]">
                      Chưa có bản ghi <code className="rounded bg-[#f0f0f0] px-1">hr_bang_tinh_luong</code> cho nhân sự này.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#EAEAEA]">
                      <table className="w-full min-w-[360px] border-collapse text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-[#EAEAEA] bg-[#F5F7F7]">
                            <th className="px-2 py-2 font-extrabold text-[#888]">ID</th>
                            <th className="px-2 py-2 font-extrabold text-[#888]">Kỳ</th>
                            <th className="px-2 py-2 font-extrabold text-[#888]">Tạm ứng</th>
                            <th className="px-2 py-2 font-extrabold text-[#888]">Thưởng</th>
                            <th className="px-2 py-2 font-extrabold text-[#888]">Buổi làm</th>
                            <th className="w-12 px-2 py-2 text-right font-extrabold text-[#888]"> </th>
                          </tr>
                        </thead>
                        <tbody>
                          {bangLuongRows.map((bl) => {
                            const ky =
                              bl.ky_thang || bl.ky_nam
                                ? [bl.ky_thang, bl.ky_nam].filter(Boolean).join(" ")
                                : "—";
                            const hasLich = bangHasLichDiemDanh(bl);
                            const selected = payrollSlipBangId === bl.id;
                            return (
                              <tr
                                key={bl.id}
                                role="button"
                                tabIndex={0}
                                title={hasLich ? "Xem phiếu lương" : "Xem trạng thái — chưa có lịch điểm danh"}
                                onClick={() => setPayrollSlipBangId((cur) => (cur === bl.id ? null : bl.id))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setPayrollSlipBangId((cur) => (cur === bl.id ? null : bl.id));
                                  }
                                }}
                                className={cn(
                                  "border-b border-[#f0f0f0] last:border-0 transition-colors",
                                  "cursor-pointer hover:bg-[#fafafa]",
                                  selected && "bg-[#FFF5F9]",
                                  !hasLich && "opacity-80"
                                )}
                              >
                                <td className="px-2 py-2 font-mono text-[11px] text-[#555]">#{bl.id}</td>
                                <td className="px-2 py-2 font-medium text-[#323232]">{ky}</td>
                                <td className="px-2 py-2 tabular-nums text-[#555]">{fmtVnd(bl.tam_ung)}</td>
                                <td className="px-2 py-2 tabular-nums text-[#555]">{fmtVnd(bl.thuong)}</td>
                                <td className="px-2 py-2 tabular-nums text-[#555]">
                                  {bl.so_buoi_lam_viec != null ? String(bl.so_buoi_lam_viec) : "—"}
                                </td>
                                <td className="w-12 px-1 py-1 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                                  {staffMayDeleteRecords ? (
                                    <button
                                      type="button"
                                      disabled={!canEdit || payrollDeletingId != null}
                                      title="Xóa bảng lương và lịch điểm danh"
                                      aria-label={`Xóa bảng lương #${bl.id}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPayrollDeleteTarget(bl);
                                      }}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50/90 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <Trash2 size={14} aria-hidden />
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {/* Cột 2: phiếu lương — trượt từ phải sang, thay toàn bộ vùng xem khi đã chọn dòng */}
                <div className="w-1/2 min-w-0 shrink-0 pl-2">
                  {payrollSlipBangId != null ? (
                    <>
                      {(() => {
                        const bl = bangLuongRows.find((b) => b.id === payrollSlipBangId);
                        if (!bl) return null;
                        const hasLich = bangHasLichDiemDanh(bl);
                        return (
                          <>
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPayrollSlipBangId(null)}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#555] transition hover:bg-[#fafafa]"
                                aria-label="Quay lại danh sách bảng lương"
                              >
                                <ChevronLeft size={18} className="shrink-0" aria-hidden />
                                Bảng lương
                              </button>
                              {hasLich ? (
                                <button
                                  type="button"
                                  disabled={payrollCopyBusy}
                                  title="Chụp phiếu lương thành ảnh PNG vào clipboard — dán gửi nhân viên (Zalo, Messenger…)"
                                  onClick={() => void copyPayrollPayslipImage()}
                                  className="inline-flex items-center gap-1 rounded-xl border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#323232] transition hover:bg-[#fafafa] disabled:cursor-wait disabled:opacity-60"
                                >
                                  <ClipboardCopy size={16} className="shrink-0 text-[#555]" aria-hidden />
                                  {payrollCopyBusy ? "Đang tạo ảnh…" : "Sao chép ảnh"}
                                </button>
                              ) : null}
                            </div>
                            {payrollCopyNotice ? (
                              <p className="mb-2 m-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-900">
                                {payrollCopyNotice}
                              </p>
                            ) : null}
                            {!hasLich ? (
                              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] font-medium text-amber-900">
                                Bảng lương #{bl.id} chưa có lịch điểm danh — hoàn tất bước «Điểm danh» khi tạo mới hoặc thêm lịch trong
                                hệ thống cũ.
                              </div>
                            ) : (
                              <PayrollPayslipCard ref={payslipCardRef} nv={row} bl={bl} />
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="min-h-[120px]" aria-hidden />
                  )}
                </div>
              </motion.div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-black/[0.06] bg-[#fafafa] px-5 py-3">
          {panelSaveErr ? (
            <p className="mb-2 m-0 text-[11px] font-semibold text-red-600">{panelSaveErr}</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled
              title="Chưa hỗ trợ xóa từ đây"
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-[12px] font-bold text-red-600 opacity-50"
            >
              <Trash2 size={15} />
              Xóa
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-bold text-[#555]"
            >
              <X size={15} />
              Đóng
            </button>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {taoLuongOpen ? (
          <TaoBangTinhLuongModal
            key={taoLuongKey}
            row={row}
            onClose={() => setTaoLuongOpen(false)}
            onSuccess={(bangId) => {
              setTab("payroll");
              setPayrollSlipBangId(bangId);
              void router.refresh();
            }}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {staffMayDeleteRecords && payrollDeleteTarget != null ? (
          <motion.div
            key="payroll-delete-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
            onClick={() => {
              if (payrollDeletingId == null) setPayrollDeleteTarget(null);
            }}
            role="presentation"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              className="w-full max-w-[420px] rounded-2xl border border-amber-200 bg-white p-4 shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="payroll-delete-title"
              aria-describedby="payroll-delete-desc"
            >
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                  <AlertTriangle size={22} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="payroll-delete-title" className="m-0 text-[15px] font-extrabold text-[#1a1a2e]">
                    Xóa bảng lương?
                  </h3>
                  <p id="payroll-delete-desc" className="mt-2 m-0 text-[12px] font-medium leading-relaxed text-[#555]">
                    Bạn sắp xóa bảng lương{" "}
                    <span className="font-mono font-bold text-[#323232]">#{payrollDeleteTarget.id}</span>
                    {payrollDeleteTarget.ky_thang || payrollDeleteTarget.ky_nam ? (
                      <>
                        {" "}
                        (
                        {[payrollDeleteTarget.ky_thang, payrollDeleteTarget.ky_nam].filter(Boolean).join(" ")})
                      </>
                    ) : null}
                    . Toàn bộ <strong className="font-semibold text-[#C0244E]">lịch điểm danh</strong> gắn bảng này sẽ bị xóa
                    theo. <strong className="font-semibold">Không thể hoàn tác.</strong>
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.06] pt-3">
                <button
                  type="button"
                  disabled={payrollDeletingId != null}
                  onClick={() => setPayrollDeleteTarget(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-[#fafafa] px-3 py-2 text-[12px] font-bold text-[#555] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={payrollDeletingId != null}
                  onClick={() => void confirmPayrollBangDelete()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-600 px-3 py-2 text-[12px] font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={14} aria-hidden />
                  {payrollDeletingId != null ? "Đang xóa…" : "Xóa bảng lương"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export default function QuanLyNhanSuView({
  staff,
  chiNhanhById,
  banById,
  phongBanByStaffId,
  phongIdsByStaffId,
  allPhongOptions,
  phongToBanId,
  banIdsByStaffId,
  bangTinhLuongByStaffId,
  usedMinimalSelect,
}: Props) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [branchId, setBranchId] = useState<number | "all">("all");
  const [selected, setSelected] = useState<AdminNhanSuRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const [staffListPage, setStaffListPage] = useState(1);
  const [cols, setCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  const [colsHydrated, setColsHydrated] = useState(false);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setCols(loadColumnVisibility());
      setColsHydrated(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!colsHydrated) return;
    persistColumnVisibility(cols);
  }, [cols, colsHydrated]);

  useEffect(() => {
    if (!colMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [colMenuOpen]);

  const statusCounts = useMemo(() => {
    let dang = 0;
    let thu = 0;
    let nghi = 0;
    for (const r of staff) {
      const k = statusFilterKey(r.status);
      if (k === "Đang làm") dang += 1;
      else if (k === "Thử việc") thu += 1;
      else if (k === "Nghỉ") nghi += 1;
    }
    return { dang, thu, nghi };
  }, [staff]);

  const branchOptions = useMemo(() => {
    return Object.entries(chiNhanhById)
      .map(([id, ten]) => ({ id: Number(id), ten }))
      .filter((x) => Number.isFinite(x.id) && x.id > 0)
      .sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  }, [chiNhanhById]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = staff;
    if (t) {
      list = list.filter((r) => {
        const idStr = String(r.id);
        const banHay = (banIdsByStaffId[r.id] ?? [])
          .map((bid) => banById[bid])
          .filter(Boolean)
          .join(" ");
        const hay = [
          r.full_name,
          r.email,
          r.sdt,
          r.bio,
          r.ghi_chu,
          r.status,
          r.hinh_thuc_tinh_luong,
          r.facebook,
          vaiTroLabel(r.vai_tro),
          statusNormLabel(r.status),
          phongBanByStaffId[r.id] ?? "",
          r.chi_nhanh_id != null ? chiNhanhById[r.chi_nhanh_id] : "",
          banHay,
          idStr,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(t) || idStr.includes(t);
      });
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => statusNormLabel(r.status) === statusFilter);
    }
    if (branchId !== "all") {
      list = list.filter((r) => r.chi_nhanh_id === branchId);
    }
    return list;
  }, [staff, q, chiNhanhById, banById, banIdsByStaffId, phongBanByStaffId, statusFilter, branchId]);

  const staffListTotalPages = Math.max(1, Math.ceil(filtered.length / STAFF_LIST_PAGE_SIZE));
  const staffListPageSafe = Math.min(staffListPage, staffListTotalPages);

  const filteredListPage = useMemo(() => {
    const start = (staffListPageSafe - 1) * STAFF_LIST_PAGE_SIZE;
    return filtered.slice(start, start + STAFF_LIST_PAGE_SIZE);
  }, [filtered, staffListPageSafe]);

  const showCol = (k: ColKey) => cols[k];

  return (
    <div className="-m-4 flex h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] min-h-0 flex-col overflow-hidden bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <header className="flex shrink-0 flex-col gap-2 border-b border-[#EAEAEA] bg-white px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:px-5 sm:py-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
              <Users className="text-white" size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="m-0 text-[16px] font-bold leading-tight tracking-tight text-[#323232]">Quản lý nhân sự</h1>
              <p className="mt-0.5 text-[11px] leading-tight text-[#999]">
                <span className="font-semibold tabular-nums text-[#555]">{filtered.length}</span>
                <span className="text-[#CCC]"> / </span>
                <span className="tabular-nums">{staff.length}</span>
                <span className="text-[#AAA]"> nhân viên</span>
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:max-w-[55%] sm:justify-end">
            <label className="sr-only" htmlFor="qlns-branch">
              Chi nhánh
            </label>
            <select
              id="qlns-branch"
              value={branchId === "all" ? "all" : String(branchId)}
              onChange={(e) => {
                const v = e.target.value;
                setBranchId(v === "all" ? "all" : Number(v));
                setStaffListPage(1);
              }}
              className="h-9 min-w-0 max-w-full flex-1 rounded-lg border border-[#EAEAEA] bg-[#fafafa] px-2.5 text-[12px] font-semibold text-[#444] outline-none transition focus:border-[#BC8AF9] focus:bg-white sm:max-w-[200px] sm:flex-none"
            >
              <option value="all">Tất cả chi nhánh</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.ten}
                </option>
              ))}
            </select>
            <div className="relative shrink-0" ref={colMenuRef}>
              <button
                type="button"
                onClick={() => setColMenuOpen((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAEAEA] bg-white px-2.5 text-[12px] font-bold text-[#555] hover:bg-[#fafafa]"
              >
                <Settings size={14} />
                Cột
              </button>
              {colMenuOpen ? (
                <div className="absolute right-0 z-50 mt-1 w-[min(100vw-2rem,280px)] rounded-xl border border-[#EAEAEA] bg-white p-2 shadow-lg">
                  <div className="mb-1 px-1 text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">Hiển thị cột</div>
                  <div className="max-h-[min(60vh,320px)] space-y-0.5 overflow-y-auto pr-1">
                    {COLUMN_META.map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] hover:bg-[#fafafa]"
                      >
                        <input
                          type="checkbox"
                          checked={cols[key]}
                          onChange={() => setCols((c) => ({ ...c, [key]: !c[key] }))}
                          className="rounded border-[#ccc]"
                        />
                        <span className="font-medium text-[#444]">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setCreateOpen(true);
              }}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-3 text-[12px] font-bold text-white hover:opacity-95"
            >
              <Plus size={15} strokeWidth={2.5} />
              Thêm NV
            </button>
          </div>
        </div>

        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#AAA]" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setStaffListPage(1);
            }}
            placeholder="Tìm tên hoặc ID…"
            className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-[#fafafa] pl-9 pr-3 text-[13px] outline-none transition focus:border-[#BC8AF9] focus:bg-white"
          />
        </div>

        <div
          className="flex flex-wrap gap-1.5 border-t border-black/[0.06] pt-2 sm:border-t-0 sm:pt-0"
          role="group"
          aria-label="Lọc theo tình trạng"
        >
          {(
            [
              { key: "all" as const, label: "Tất cả", count: staff.length, dot: "bg-slate-400" },
              { key: "Đang làm" as const, label: "Đang làm", count: statusCounts.dang, dot: "bg-[#1A9A5C]" },
              { key: "Thử việc" as const, label: "Thử việc", count: statusCounts.thu, dot: "bg-[#D4A017]" },
              { key: "Nghỉ" as const, label: "Nghỉ", count: statusCounts.nghi, dot: "bg-[#C0244E]" },
            ] as const
          ).map((pill) => {
            const active =
              pill.key === "all" ? statusFilter === "all" : statusFilter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => {
                  setStatusFilter(pill.key);
                  setStaffListPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors",
                  active
                    ? "border-[#BC8AF9] bg-[#BC8AF9]/10 text-[#8B4AAB]"
                    : "border-[#EAEAEA] bg-white text-[#666] hover:border-[#ddd]"
                )}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", pill.dot)} aria-hidden />
                {pill.label}
                <span className="tabular-nums text-[#AAA]">{pill.count}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-6 pt-3 sm:px-6">
        {usedMinimalSelect ? (
          <div className="mb-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            Chỉ tải được các cột tối thiểu — kiểm tra quyền service role hoặc schema <code className="rounded bg-amber-100/80 px-1">hr_nhan_su</code>.
          </div>
        ) : null}

        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            {filtered.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-12 text-[#AAA]">
                <User size={40} className="text-[#DDDDDD]" />
                <div className="text-sm">{staff.length === 0 ? "Chưa có nhân viên" : "Không khớp bộ lọc"}</div>
              </div>
            ) : (
              <table className="w-full min-w-[1680px] border-collapse text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#EAEAEA] bg-[#F9FAFB] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#888]">
                    <th className="sticky left-0 z-10 whitespace-nowrap border-r border-[#EAEAEA] bg-[#F9FAFB] px-2 py-2.5 pl-3">#</th>
                    {showCol("avatar") ? (
                      <th className="whitespace-nowrap px-2 py-2.5 text-center">Avatar</th>
                    ) : null}
                    {showCol("name") ? <th className="min-w-[160px] whitespace-nowrap px-2 py-2.5">Tên nhân viên</th> : null}
                    {showCol("id") ? <th className="whitespace-nowrap px-2 py-2.5">ID</th> : null}
                    {showCol("status") ? <th className="whitespace-nowrap px-2 py-2.5">Tình trạng</th> : null}
                    {showCol("branch") ? <th className="whitespace-nowrap px-2 py-2.5">Chi nhánh</th> : null}
                    {showCol("role") ? <th className="whitespace-nowrap px-2 py-2.5">Vai trò</th> : null}
                    {showCol("dept") ? <th className="min-w-[200px] whitespace-nowrap px-2 py-2.5">Phòng ban</th> : null}
                    {showCol("ban") ? <th className="whitespace-nowrap px-2 py-2.5">Thuộc ban</th> : null}
                    {showCol("salaryType") ? <th className="whitespace-nowrap px-2 py-2.5">Hình thức lương</th> : null}
                    {showCol("base") ? (
                      <th className="whitespace-nowrap border-l border-[#EAEAEA] bg-slate-100/80 px-2 py-2.5">Lương cơ bản</th>
                    ) : null}
                    {showCol("allowance") ? (
                      <th className="whitespace-nowrap bg-slate-100/80 px-2 py-2.5">Trợ cấp</th>
                    ) : null}
                    {showCol("bhxh") ? <th className="whitespace-nowrap px-2 py-2.5">BHXH</th> : null}
                    {showCol("rateCb") ? <th className="whitespace-nowrap px-2 py-2.5">Hệ số CB</th> : null}
                    {showCol("rateHv") ? <th className="whitespace-nowrap px-2 py-2.5">Hệ số HV</th> : null}
                    {showCol("maxLeave") ? <th className="whitespace-nowrap px-2 py-2.5">Nghỉ tối đa</th> : null}
                    {showCol("dob") ? <th className="whitespace-nowrap px-2 py-2.5">Ngày sinh</th> : null}
                    {showCol("start") ? <th className="whitespace-nowrap px-2 py-2.5">Ngày vào</th> : null}
                    {showCol("phone") ? <th className="whitespace-nowrap px-2 py-2.5">SĐT</th> : null}
                    {showCol("bank") ? <th className="min-w-[140px] whitespace-nowrap px-2 py-2.5">STK lương</th> : null}
                    {showCol("email") ? <th className="min-w-[180px] whitespace-nowrap px-2 py-2.5">Email</th> : null}
                    {showCol("fb") ? <th className="whitespace-nowrap px-2 py-2.5">Facebook</th> : null}
                    {showCol("contract") ? <th className="whitespace-nowrap px-2 py-2.5">HĐLĐ</th> : null}
                    {showCol("other") ? <th className="min-w-[200px] whitespace-nowrap px-2 py-2.5 pr-3">Thông tin khác</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredListPage.map((r, idx) => {
                    const cnLabel =
                      r.chi_nhanh_id != null ? chiNhanhById[r.chi_nhanh_id] ?? `ID #${r.chi_nhanh_id}` : "—";
                    const banIdsRow = banIdsByStaffId[r.id] ?? [];
                    const phongLabel = phongBanByStaffId[r.id] ?? "—";
                    const rowOrdinal = (staffListPageSafe - 1) * STAFF_LIST_PAGE_SIZE + idx + 1;
                    return (
                      <tr
                        key={r.id}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        className={cn(
                          "group cursor-pointer border-b border-[#f3f3f3] transition-colors last:border-0",
                          "hover:bg-[#fafafa]"
                        )}
                        onClick={() => {
                          setCreateOpen(false);
                          setSelected(r);
                        }}
                      >
                        <td className="sticky left-0 z-[1] whitespace-nowrap border-r border-[#f0f0f0] bg-white px-2 py-2.5 pl-3 text-[11px] tabular-nums text-[#AAA] group-hover:bg-[#fafafa]">
                          {rowOrdinal}
                        </td>
                        {showCol("avatar") ? (
                          <td className="px-2 py-2 text-center align-middle">
                            {r.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.avatar}
                                alt=""
                                className="mx-auto h-9 w-9 rounded-full border-2 border-[#EAEAEA] object-cover"
                              />
                            ) : (
                              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#EAEAEA] bg-[#F5F7F7] text-[11px] font-bold text-[#CCC]">
                                {(r.full_name ?? "?").trim().charAt(0).toUpperCase()}
                              </span>
                            )}
                          </td>
                        ) : null}
                        {showCol("name") ? (
                          <td className="max-w-[220px] px-2 py-2.5 align-middle">
                            <span className="line-clamp-2 font-semibold text-[#1a1a2e]">
                              {r.full_name?.trim() || `— #${r.id}`}
                            </span>
                          </td>
                        ) : null}
                        {showCol("id") ? (
                          <td className="whitespace-nowrap px-2 py-2.5 align-middle tabular-nums text-[#666]">{r.id}</td>
                        ) : null}
                        {showCol("status") ? (
                          <td className="px-2 py-2.5 align-middle">
                            <StatusPillDisplay raw={r.status} />
                          </td>
                        ) : null}
                        {showCol("branch") ? (
                          <td className="max-w-[140px] px-2 py-2.5 align-middle">
                            <ChiNhanhPill label={cnLabel} />
                          </td>
                        ) : null}
                        {showCol("role") ? (
                          <td className="px-2 py-2.5 align-middle">
                            <VaiTroPillDisplay raw={r.vai_tro} />
                          </td>
                        ) : null}
                        {showCol("dept") ? (
                          <td className="px-2 py-2.5 align-middle">
                            <PhongBanCell text={phongLabel} />
                          </td>
                        ) : null}
                        {showCol("ban") ? (
                          <td className="max-w-[220px] px-2 py-2.5 align-middle">
                            <BansCell ids={banIdsRow} banById={banById} />
                          </td>
                        ) : null}
                        {showCol("salaryType") ? (
                          <td className="px-2 py-2.5 align-middle">
                            <HinhThucLuongPill text={r.hinh_thuc_tinh_luong ?? "—"} />
                          </td>
                        ) : null}
                        {showCol("base") ? (
                          <td className="whitespace-nowrap border-l border-[#f0f0f0] bg-slate-50/90 px-2 py-2.5 align-middle font-semibold tabular-nums text-[#1a1a2e]">
                            {fmtVnd(r.luong_co_ban)}
                          </td>
                        ) : null}
                        {showCol("allowance") ? (
                          <td className="whitespace-nowrap bg-slate-50/90 px-2 py-2.5 align-middle font-semibold tabular-nums text-[#1a1a2e]">
                            {fmtVnd(r.tro_cap)}
                          </td>
                        ) : null}
                        {showCol("bhxh") ? (
                          <td className="whitespace-nowrap px-2 py-2.5 align-middle tabular-nums text-[#555]">{fmtVnd(r.bhxh)}</td>
                        ) : null}
                        {showCol("rateCb") ? (
                          <td className="px-2 py-2.5 align-middle tabular-nums text-[#555]">
                            {r.rate_thuong_co_ban != null ? r.rate_thuong_co_ban : "—"}
                          </td>
                        ) : null}
                        {showCol("rateHv") ? (
                          <td className="px-2 py-2.5 align-middle tabular-nums text-[#555]">
                            {r.rate_thuong_hoc_vien != null ? r.rate_thuong_hoc_vien : "—"}
                          </td>
                        ) : null}
                        {showCol("maxLeave") ? (
                          <td className="px-2 py-2.5 align-middle tabular-nums text-[#555]">
                            {r.so_buoi_nghi_toi_da != null ? r.so_buoi_nghi_toi_da : "—"}
                          </td>
                        ) : null}
                        {showCol("dob") ? (
                          <td className="whitespace-nowrap px-2 py-2.5 align-middle text-[#555]">{fmtDate(r.ngay_sinh)}</td>
                        ) : null}
                        {showCol("start") ? (
                          <td className="whitespace-nowrap px-2 py-2.5 align-middle text-[#555]">{fmtDate(r.sa_startdate)}</td>
                        ) : null}
                        {showCol("phone") ? (
                          <td className="max-w-[120px] px-2 py-2.5 align-middle text-[#555]">
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <Phone size={11} className="shrink-0 text-[#CCC]" aria-hidden />
                              <span className="truncate">{r.sdt ?? "—"}</span>
                            </span>
                          </td>
                        ) : null}
                        {showCol("bank") ? (
                          <td className="px-2 py-2.5 align-middle">
                            <StkLuongCell row={r} />
                          </td>
                        ) : null}
                        {showCol("email") ? (
                          <td className="max-w-[200px] px-2 py-2.5 align-middle text-[#555]">
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <Mail size={11} className="shrink-0 text-[#CCC]" aria-hidden />
                              <span className="truncate">{r.email ?? "—"}</span>
                            </span>
                          </td>
                        ) : null}
                        {showCol("fb") ? (
                          <td className="px-2 py-2.5 align-middle">
                            <LinkXem href={r.facebook} />
                          </td>
                        ) : null}
                        {showCol("contract") ? (
                          <td className="px-2 py-2.5 align-middle">
                            <LinkXem href={r.hop_dong_lao_dong} />
                          </td>
                        ) : null}
                        {showCol("other") ? (
                          <td className="max-w-[240px] px-2 py-2.5 pr-3 align-middle">
                            {r.thong_tin_khac?.trim() ? (
                              <span className="line-clamp-3 text-[11px] leading-snug text-[#555]">{r.thong_tin_khac.trim()}</span>
                            ) : (
                              <span className="text-[#AAA]">—</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {filtered.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-[11px] font-medium text-[#666]">
              <span className="tabular-nums">
                Hiển thị {(staffListPageSafe - 1) * STAFF_LIST_PAGE_SIZE + 1}–
                {Math.min(staffListPageSafe * STAFF_LIST_PAGE_SIZE, filtered.length)} / {filtered.length}
              </span>
              {staffListTotalPages > 1 ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={staffListPageSafe <= 1}
                    onClick={() =>
                      setStaffListPage((p) => Math.max(1, Math.min(p, staffListTotalPages) - 1))
                    }
                    aria-label="Trang trước"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-[#555] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} aria-hidden />
                  </button>
                  <span className="min-w-[3.5rem] text-center font-bold tabular-nums text-[#323232]">
                    {staffListPageSafe}/{staffListTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={staffListPageSafe >= staffListTotalPages}
                    onClick={() =>
                      setStaffListPage((p) => Math.min(staffListTotalPages, Math.min(p, staffListTotalPages) + 1))
                    }
                    aria-label="Trang sau"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-[#555] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {createOpen ? (
          <StaffCreateModal
            key="create-staff"
            onClose={() => setCreateOpen(false)}
            onCreated={(row) => {
              setCreateOpen(false);
              setSelected(row);
              void router.refresh();
            }}
            chiNhanhById={chiNhanhById}
            banById={banById}
            phongToBanId={phongToBanId}
            allPhongOptions={allPhongOptions}
          />
        ) : null}
        {selected ? (
          <StaffDetailPanel
            row={selected}
            chiNhanhById={chiNhanhById}
            banById={banById}
            phongIdsForStaff={phongIdsByStaffId[selected.id] ?? []}
            phongToBanId={phongToBanId}
            allPhongOptions={allPhongOptions}
            usedMinimalSelect={usedMinimalSelect}
            bangLuongRows={bangTinhLuongByStaffId[selected.id] ?? []}
            onClose={() => setSelected(null)}
            onAvatarSaved={(avatar) => {
              setSelected((s) => (s ? { ...s, avatar } : null));
            }}
            onStaffUpdated={(patch) => {
              setSelected((s) => (s ? { ...s, ...patch } : null));
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
