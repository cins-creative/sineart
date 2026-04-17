"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit2,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import AdminDongHocPhiModal from "@/app/admin/dashboard/quan-ly-hoc-vien/AdminDongHocPhiModal";
import type {
  AdminQlhvBaiTapBrief,
  AdminQlhvEnrollment,
  AdminQlhvStudent,
  AdminQlhvTruongNganhItem,
} from "@/lib/data/admin-quan-ly-hoc-vien";
import {
  adminReplaceQlHvTruongNganhRows,
  createEnrollment,
  createHocVien,
  deleteEnrollment,
  deleteHocVien,
  toggleHocVienMau,
  updateEnrollmentGhiChu,
  updateEnrollmentTienDoHoc,
  updateHpChiTietKyForEnrollment,
  updateHocVienProfile,
  updateQlHvTruongNganhRow,
} from "@/app/admin/dashboard/quan-ly-hoc-vien/actions";
import type { DhpDhCatalog } from "@/lib/donghocphi/dh-catalog";
import StudentAvatarCircle from "@/components/StudentAvatarCircle";
import { cn } from "@/lib/utils";

const TT_ORDER: Record<string, number> = {
  "Đang học": 0,
  "Chưa học": 1,
  Nghỉ: 2,
};

const TT_COLOR: Record<string, { bg: string; text: string }> = {
  "Đang học": { bg: "#dcfce7", text: "#16a34a" },
  "Chưa học": { bg: "#e2e8f0", text: "#475569" },
  Nghỉ: { bg: "#fee2e2", text: "#dc2626" },
};

type LopOpt = { id: number; name: string; mon_hoc: number | null };

/** Lọc danh sách theo `computeOverallStatus` (gộp mọi khoá của HV). */
type QuanLyHvStatusFilter = "all" | "Đang học" | "Chưa học" | "Nghỉ";

/** Lọc theo số khoá đang còn hạn (`deriveEnrollmentStatus === "Đang học"`). */
type QuanLyHvDangKhoaBucket = null | "1" | "2" | "3+";

const LOAI_KHOA_OPTIONS = ["Luyện thi", "Digital", "Kids", "Bổ trợ"] as const;
const SEX_OPTIONS = ["Nam", "Nữ", "Khác"] as const;

type Props = {
  students: AdminQlhvStudent[];
  enrollments: AdminQlhvEnrollment[];
  lopOptions: LopOpt[];
  baiTapById: Record<string, AdminQlhvBaiTapBrief>;
  truongNganhByHvId: Record<string, AdminQlhvTruongNganhItem[]>;
  /** Danh mục trường–ngành (`dh_*`) — giống bước 1 trang đóng học phí. */
  dhCatalog: DhpDhCatalog | null;
  /** Nhân viên đang đăng nhập admin — mặc định «người tạo đơn» thu học phí. */
  adminStaffId: number;
};

type SortDir = "asc" | "desc" | null;

const HV_PAGE_SIZE = 10;

function s2l(v: unknown): string {
  return String(v ?? "").toLowerCase();
}

function daysLeft(d: string | null): number {
  if (!d) return 0;
  try {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const e = new Date(d);
    e.setHours(0, 0, 0, 0);
    return Math.round((e.getTime() - t.getTime()) / 86400000);
  } catch {
    return 0;
  }
}

/** Tổng «ngày còn» (mỗi lớp một kỳ): cộng `daysLeft(ngay_cuoi_ky)` từ `hp_thu_hp_chi_tiet` (đã resolve server). */
function totalDaysLeftAllKhoa(khs: AdminQlhvEnrollment[]): number {
  if (!khs?.length) return 0;
  return khs.reduce((sum, kh) => sum + daysLeft(kh.ngay_cuoi_ky ?? null), 0);
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

/** Bỏ dấu ngoặc / quote thừa thường gặp khi nhập SĐT (`ql_thong_tin_hoc_vien.sdt`). */
function displaySdt(raw: string | number | null | undefined): string {
  if (raw == null) return "—";
  const t = String(raw).replace(/^[\s"'`]+|[\s"'`]+$/g, "").trim();
  return t || "—";
}

/** Chỉ hiển thị khi đã có cả ngày bắt đầu và ngày kết thúc trong hồ sơ. */
function soThangHoc(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  try {
    const e = new Date(end);
    const s = new Date(start);
    const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    return m >= 0 ? `${m} tháng` : "";
  } catch {
    return "";
  }
}

function isoDateInput(d: string | null): string {
  if (!d) return "";
  const s = d.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

const ISO_YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Đã có kỳ học phí trên `hp_thu_hp_chi_tiet` (đủ ngày đầu + cuối kỳ). */
function hasHpTuitionKy(k: AdminQlhvEnrollment): boolean {
  const dau = (k.ngay_dau_ky ?? "").trim().slice(0, 10);
  const cuoi = (k.ngay_cuoi_ky ?? "").trim().slice(0, 10);
  return ISO_YMD.test(dau) && ISO_YMD.test(cuoi);
}

/** Tình trạng khoá từ kỳ HP (`hp_thu_hp_chi_tiet`); chưa có kỳ → «Chưa học». */
function deriveEnrollmentStatus(k: AdminQlhvEnrollment): "Chưa học" | "Đang học" | "Nghỉ" {
  if (!hasHpTuitionKy(k)) return "Chưa học";
  try {
    const e = new Date((k.ngay_cuoi_ky ?? "").trim().slice(0, 10));
    e.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return e.getTime() >= t.getTime() ? "Đang học" : "Nghỉ";
  } catch {
    return "Chưa học";
  }
}

function computeOverallStatus(khs: AdminQlhvEnrollment[]): string {
  if (!khs?.length) return "Nghỉ";
  const statuses = khs.map(deriveEnrollmentStatus);
  if (statuses.includes("Đang học")) return "Đang học";
  if (statuses.includes("Chưa học")) return "Chưa học";
  return "Nghỉ";
}

/** Lấy phần ngày YYYY-MM-DD từ `timestamptz` / chuỗi ISO. */
function isoDateFromCreatedAt(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  const d = String(raw).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function todayIsoDate(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const da = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/** Ngày cuối kỳ muộn nhất trong các lớp (chuỗi so sánh được). */
function maxNgayCuoiKy(khs: AdminQlhvEnrollment[]): string | null {
  let maxD: string | null = null;
  for (const k of khs) {
    const d = k.ngay_cuoi_ky?.trim().slice(0, 10);
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (!maxD || d > maxD) maxD = d;
  }
  return maxD;
}

/**
 * Ngày kết thúc hiển thị: khi mọi lớp đều hết hạn kỳ (trạng thái «Nghỉ») → max `ngay_cuoi_ky`;
 * khi còn lớp còn hạn → không có (đang học).
 */
function ngayKetThucHienThi(khs: AdminQlhvEnrollment[]): string | null {
  if (computeOverallStatus(khs) !== "Nghỉ") return null;
  return maxNgayCuoiKy(khs);
}

/**
 * Số tháng từ tạo tài khoản đến hôm nay (đang học) hoặc đến max ngày cuối kỳ (đã nghỉ).
 * Không trừ các giai đoạn nghỉ rồi quay lại — cần bảng lịch sử nếu muốn cộng dồn từng đợt «đang học».
 */
function thangHocTaiSineArt(createdAt: string | null, khs: AdminQlhvEnrollment[]): string {
  const start = isoDateFromCreatedAt(createdAt);
  if (!start) return "—";
  const tt = computeOverallStatus(khs);
  const end = tt === "Nghỉ" ? maxNgayCuoiKy(khs) : todayIsoDate();
  if (!end) return "—";
  return soThangHoc(start, end) || "—";
}

function lopDisplayName(lop: AdminQlhvEnrollment["lop"]): string {
  if (!lop) return "—";
  return lop.class_full_name || lop.class_name || `Lớp #${lop.id}`;
}

function TinhTrangBadge({ value }: { value: string }) {
  const cfg = TT_COLOR[value] ?? { bg: "#f3f4f6", text: "#6b7280" };
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {value || "—"}
    </span>
  );
}

/** Hết kỳ (âm ngày) = đã «Nghỉ» — không hiển thị «nợ», chỉ dấu gạch. */
function DaysLabel({ days }: { days: number }) {
  if (days < 0) {
    return <span className="text-xs font-bold text-slate-400">—</span>;
  }
  const color = days <= 5 ? "#F8A568" : "#16a34a";
  return (
    <span className="text-xs font-bold" style={{ color }}>
      {days} ngày
    </span>
  );
}

function HocVienMauBadge({ small }: { small?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-300 font-bold text-amber-900",
        small ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]"
      )}
      style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)" }}
    >
      <Star size={small ? 8 : 9} className="fill-amber-500 text-amber-500" />
      Mẫu
    </span>
  );
}

function ClassFilterDropdown({
  classes,
  active,
  onSelect,
}: {
  classes: string[];
  active: string;
  onSelect: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400"
        style={{ color: active ? "#BC8AF9" : undefined }}
      >
        Lớp học
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
        {active ? (
          <span className="ml-0.5 rounded bg-[#BC8AF9] px-1.5 py-px text-[9px] font-extrabold text-white">{active}</span>
        ) : null}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 top-[calc(100%+6px)] z-[200] max-h-60 min-w-[160px] overflow-y-auto rounded-[10px] border border-[#EAEAEA] bg-white shadow-lg"
          >
            <button
              type="button"
              className="block w-full border-b border-slate-100 px-3.5 py-2 text-left text-xs hover:bg-slate-50"
              style={{ fontWeight: active ? 500 : 700, color: active ? "#64748b" : "#BC8AF9" }}
              onClick={() => {
                onSelect("");
                setOpen(false);
              }}
            >
              Tất cả lớp
            </button>
            {classes.map((c) => (
              <button
                key={c}
                type="button"
                className="block w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50"
                style={{
                  fontWeight: active === c ? 700 : 400,
                  color: active === c ? "#BC8AF9" : "#1e293b",
                  background: active === c ? "rgba(188,138,249,0.08)" : undefined,
                }}
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                }}
              >
                {c}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600">
      {label}
      <span className="text-[9px]">{active ? (dir === "asc" ? "▲" : dir === "desc" ? "▼" : "") : ""}</span>
    </button>
  );
}

function baiTapSelectOptions(
  catalog: Record<string, AdminQlhvBaiTapBrief>,
  monId: number | null | undefined,
  currentId: number | null
): AdminQlhvBaiTapBrief[] {
  const all = Object.values(catalog);
  let rows =
    monId != null && Number.isFinite(monId) && monId > 0
      ? all.filter((b) => b.mon_hoc === monId)
      : [...all];
  if (currentId != null && currentId > 0 && !rows.some((b) => b.id === currentId)) {
    const cur = catalog[String(currentId)];
    if (cur) rows = [cur, ...rows];
  }
  rows.sort((a, b) => {
    const ao = a.bai_so ?? 99999;
    const bo = b.bai_so ?? 99999;
    if (ao !== bo) return ao - bo;
    return a.ten_bai_tap.localeCompare(b.ten_bai_tap, "vi");
  });
  return rows;
}

function baiTapOptionLabel(b: AdminQlhvBaiTapBrief): string {
  if (b.bai_so != null && Number.isFinite(b.bai_so)) {
    return `Bài ${b.bai_so}: ${b.ten_bai_tap}`;
  }
  return b.ten_bai_tap;
}

function MiniProgress({ tenBai, so, thumb }: { tenBai: string; so: string; thumb: string }) {
  if (!tenBai && !so) {
    return <span className="text-[10px] text-slate-200">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px]">📘</div>
      )}
      <div className="min-w-0">
        <p className="line-clamp-2 break-words text-[10px] font-semibold text-slate-600">{tenBai || "—"}</p>
        {so ? <p className="text-[9px] text-slate-400">Bài {so}</p> : null}
      </div>
    </div>
  );
}

function EnrollmentCard({
  kh,
  baiTap,
  baiTapById,
  onRefresh,
}: {
  kh: AdminQlhvEnrollment;
  baiTap: AdminQlhvBaiTapBrief | null;
  baiTapById: Record<string, AdminQlhvBaiTapBrief>;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [ghiChu, setGhiChu] = useState(kh.ghi_chu || "");
  const [editGc, setEditGc] = useState(false);
  const [editKy, setEditKy] = useState(false);
  const [ngayDauKy, setNgayDauKy] = useState(() => isoDateInput(kh.ngay_dau_ky));
  const [ngayCuoiKy, setNgayCuoiKy] = useState(() => isoDateInput(kh.ngay_cuoi_ky));
  const [gcBusy, startGcTransition] = useTransition();
  const [kyBusy, startKyTransition] = useTransition();
  const [tdBusy, startTdTransition] = useTransition();
  const [refreshListPending, startRefreshList] = useTransition();
  const [delBusy, setDelBusy] = useState(false);
  const [showDeletedOk, setShowDeletedOk] = useState(false);
  const [editTd, setEditTd] = useState(false);
  const [pendingTd, setPendingTd] = useState(() => (kh.tien_do_hoc != null ? String(kh.tien_do_hoc) : ""));

  const tdOptions = useMemo(
    () => baiTapSelectOptions(baiTapById, kh.lop?.mon_hoc ?? null, kh.tien_do_hoc),
    [baiTapById, kh.lop?.mon_hoc, kh.tien_do_hoc]
  );

  useEffect(() => {
    setGhiChu(kh.ghi_chu || "");
    setNgayDauKy(isoDateInput(kh.ngay_dau_ky));
    setNgayCuoiKy(isoDateInput(kh.ngay_cuoi_ky));
    setEditKy(false);
    setPendingTd(kh.tien_do_hoc != null ? String(kh.tien_do_hoc) : "");
    setEditTd(false);
  }, [kh]);

  const tinhTrangKy = deriveEnrollmentStatus(kh);
  const lopName = lopDisplayName(kh.lop);
  const daysPersisted = daysLeft(kh.ngay_cuoi_ky ?? null);
  const canDelete = kh.ngay_cuoi_ky === null || daysPersisted <= 0;
  const daysKyPreview = daysLeft(editKy ? (ngayCuoiKy.trim() || null) : kh.ngay_cuoi_ky ?? null);
  const cfg = TT_COLOR[tinhTrangKy] ?? { bg: "#f3f4f6", text: "#6b7280" };

  function saveGc() {
    startGcTransition(async () => {
      const r = await updateEnrollmentGhiChu(kh.id, ghiChu);
      if (!r.ok) window.alert(r.error);
      else {
        setEditGc(false);
        onRefresh();
      }
    });
  }

  function saveKyHoc() {
    startKyTransition(async () => {
      const dau = ngayDauKy.trim() === "" ? null : ngayDauKy.trim().slice(0, 10);
      const cuoi = ngayCuoiKy.trim() === "" ? null : ngayCuoiKy.trim().slice(0, 10);
      const r = await updateHpChiTietKyForEnrollment(kh.id, dau, cuoi);
      if (!r.ok) window.alert(r.error);
      else {
        setEditKy(false);
        onRefresh();
      }
    });
  }

  function saveTienDo() {
    startTdTransition(async () => {
      const raw = pendingTd.trim();
      const n = raw === "" ? null : Number(raw);
      if (raw !== "" && (!Number.isFinite(n) || n == null || n <= 0)) {
        window.alert("Chọn bài tập hợp lệ hoặc để trống để xóa tiến độ.");
        return;
      }
      const r = await updateEnrollmentTienDoHoc(kh.id, n);
      if (!r.ok) window.alert(r.error);
      else {
        setEditTd(false);
        onRefresh();
      }
    });
  }

  async function remove() {
    if (!canDelete) return;
    if (!window.confirm(`Xóa khoá học «${lopName}» khỏi học viên?`)) return;
    setDelBusy(true);
    const t0 = performance.now();
    let ok = false;
    try {
      const r = await deleteEnrollment(kh.id);
      if (!r.ok) window.alert(r.error);
      else ok = true;
      if (ok) {
        const minMs = 480;
        const elapsed = performance.now() - t0;
        if (elapsed < minMs) await new Promise((res) => setTimeout(res, minMs - elapsed));
      }
    } finally {
      setDelBusy(false);
    }
    if (!ok) return;
    setShowDeletedOk(true);
    await new Promise((res) => setTimeout(res, 650));
    setShowDeletedOk(false);
    startRefreshList(() => {
      onRefresh();
    });
  }

  const deleteUiBusy = delBusy || showDeletedOk || refreshListPending;

  return (
    <div
      className="overflow-hidden rounded-xl border-[1.5px] border-[#EAEAEA] bg-white"
      data-supabase-table="ql_quan_ly_hoc_vien"
      data-row-id={kh.id}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-2.5 py-2.5 text-left transition-colors hover:bg-slate-50"
        style={{ background: expanded ? "#f8fafc" : "#fff" }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.text }} />
        <div className="min-w-0 flex-1">
          <span className="block break-words text-[13px] font-bold text-slate-900">{lopName}</span>
          {kh.ghi_chu && !expanded ? (
            <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-[10px] font-semibold text-amber-600">📝 {kh.ghi_chu}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TinhTrangBadge value={tinhTrangKy} />
          {tinhTrangKy === "Chưa học" ? (
            <span className="text-[10px] font-bold text-slate-400">—</span>
          ) : (
            <DaysLabel days={daysPersisted} />
          )}
          {canDelete ? (
            <button
              type="button"
              title={
                delBusy
                  ? "Đang xóa…"
                  : showDeletedOk
                    ? "Đã xóa"
                    : refreshListPending
                      ? "Đang cập nhật danh sách…"
                      : "Xóa khoá học"
              }
              disabled={deleteUiBusy}
              onClick={(e) => {
                e.stopPropagation();
                void remove();
              }}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md border text-red-500 transition-colors",
                showDeletedOk
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  : "border-red-200 bg-red-50 hover:bg-red-100"
              )}
            >
              {delBusy ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : showDeletedOk ? (
                <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              ) : refreshListPending ? (
                <Loader2 className="h-3 w-3 animate-spin text-slate-500" aria-hidden />
              ) : (
                <Trash2 size={11} />
              )}
            </button>
          ) : (
            <div title="Còn ngày học, không thể xóa" className="flex h-6 w-6 cursor-not-allowed items-center justify-center rounded-md border border-[#EAEAEA] opacity-40">
              <Trash2 size={11} className="text-slate-400" />
            </div>
          )}
          <ChevronDown size={13} className={cn("text-slate-400 transition-transform", expanded && "rotate-180")} />
        </div>
      </button>
      <AnimatePresence>
        {expanded ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[#EAEAEA]">
            <div className="flex flex-col gap-2 px-2.5 py-2.5">
              <div className="space-y-1.5 border-b border-slate-100 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">Kỳ học phí</span>
                  {!editKy ? (
                    <button
                      type="button"
                      disabled={kyBusy}
                      className="shrink-0 text-[10px] font-semibold text-[#BC8AF9] disabled:opacity-40"
                      onClick={() => setEditKy(true)}
                    >
                      Sửa
                    </button>
                  ) : (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={kyBusy}
                        className="text-[10px] text-slate-500 disabled:opacity-40"
                        onClick={() => {
                          setEditKy(false);
                          setNgayDauKy(isoDateInput(kh.ngay_dau_ky));
                          setNgayCuoiKy(isoDateInput(kh.ngay_cuoi_ky));
                        }}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={kyBusy}
                        className="text-[10px] font-bold text-emerald-600 disabled:opacity-40"
                        onClick={saveKyHoc}
                      >
                        {kyBusy ? "Đang lưu…" : "Lưu"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Ngày đầu kỳ
                    </span>
                    {editKy ? (
                      <input
                        type="date"
                        value={ngayDauKy}
                        disabled={kyBusy}
                        onChange={(e) => setNgayDauKy(e.target.value)}
                        className="min-w-0 rounded-lg border border-[#EAEAEA] px-1.5 py-0.5 text-[11px] outline-none focus:border-[#BC8AF9] disabled:opacity-50"
                      />
                    ) : (
                      <span className="break-words text-right font-semibold text-slate-800">{fmtDate(kh.ngay_dau_ky)}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Ngày cuối kỳ
                    </span>
                    {editKy ? (
                      <input
                        type="date"
                        value={ngayCuoiKy}
                        disabled={kyBusy}
                        onChange={(e) => setNgayCuoiKy(e.target.value)}
                        className="min-w-0 rounded-lg border border-[#EAEAEA] px-1.5 py-0.5 text-[11px] outline-none focus:border-[#BC8AF9] disabled:opacity-50"
                      />
                    ) : (
                      <span className="break-words text-right font-semibold text-slate-800">{fmtDate(kh.ngay_cuoi_ky)}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-0.5">
                  {!editKy && tinhTrangKy === "Chưa học" ? (
                    <span className="text-[10px] font-bold text-slate-400">—</span>
                  ) : (
                    <DaysLabel days={daysKyPreview} />
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Ghi chú</span>
                  {!editGc ? (
                    <button
                      type="button"
                      disabled={gcBusy}
                      className="text-[10px] font-semibold text-[#BC8AF9] disabled:opacity-40"
                      onClick={() => setEditGc(true)}
                    >
                      Sửa
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={gcBusy}
                        className="text-[10px] text-slate-500 disabled:opacity-40"
                        onClick={() => setEditGc(false)}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={gcBusy}
                        className="text-[10px] font-bold text-emerald-600 disabled:opacity-40"
                        onClick={saveGc}
                      >
                        {gcBusy ? "Đang lưu…" : "Lưu"}
                      </button>
                    </div>
                  )}
                </div>
                {editGc ? (
                  <textarea
                    value={ghiChu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#EAEAEA] p-2 text-xs"
                    placeholder="Nhập ghi chú…"
                  />
                ) : (
                  <p className="break-words text-xs font-medium text-amber-700">{ghiChu || "—"}</p>
                )}
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-amber-600">Tiến độ bài tập</span>
                  {!editTd ? (
                    <button
                      type="button"
                      disabled={tdBusy}
                      className="text-[10px] font-semibold text-[#BC8AF9] disabled:opacity-40"
                      onClick={() => setEditTd(true)}
                    >
                      Sửa
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={tdBusy}
                        className="text-[10px] text-slate-500 disabled:opacity-40"
                        onClick={() => {
                          setEditTd(false);
                          setPendingTd(kh.tien_do_hoc != null ? String(kh.tien_do_hoc) : "");
                        }}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={tdBusy}
                        className="text-[10px] font-bold text-emerald-600 disabled:opacity-40"
                        onClick={saveTienDo}
                      >
                        {tdBusy ? "Đang lưu…" : "Lưu"}
                      </button>
                    </div>
                  )}
                </div>
                {editTd ? (
                  <select
                    value={pendingTd}
                    disabled={tdBusy}
                    onChange={(e) => setPendingTd(e.target.value)}
                    className="w-full rounded-lg border border-[#EAEAEA] bg-white px-2 py-1.5 text-[11px] font-medium text-slate-800 outline-none focus:border-[#BC8AF9] disabled:opacity-50"
                  >
                    <option value="">— Chưa chọn —</option>
                    {tdOptions.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {baiTapOptionLabel(b)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <MiniProgress
                    tenBai={baiTap?.ten_bai_tap ?? ""}
                    so={baiTap?.bai_so != null ? String(baiTap.bai_so) : ""}
                    thumb={baiTap?.thumbnail ?? ""}
                  />
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function HvInfoRow({
  label,
  value,
  valueProps,
}: {
  label: string;
  value: ReactNode;
  valueProps?: ComponentPropsWithoutRef<"div">;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 border-b border-[#f0f0f0] py-1 last:border-0">
      <div className="w-[5.5rem] shrink-0 pt-px text-[9px] font-bold uppercase leading-tight text-[#AAA]">{label}</div>
      <div
        className="min-w-0 flex-1 break-words text-left text-[12px] font-semibold leading-snug text-gray-800"
        {...valueProps}
      >
        {value}
      </div>
    </div>
  );
}

function CreateStudentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [sdt, setSdt] = useState("");
  const [facebook, setFacebook] = useState("");
  const [sex, setSex] = useState("");
  const [loai, setLoai] = useState("");
  const [nbd, setNbd] = useState("");
  const [nkt, setNkt] = useState("");
  const [namThi, setNamThi] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setErr(null);
    const namNum = namThi.trim() === "" ? null : Number(namThi);
    const payload = {
      full_name: full_name.trim(),
      email: email.trim() || null,
      sdt: sdt.trim() || null,
      facebook: facebook.trim() || null,
      sex: sex.trim() || null,
      loai_khoa_hoc: loai.trim() || null,
      ngay_bat_dau: nbd.trim() || null,
      ngay_ket_thuc: nkt.trim() || null,
      nam_thi: namNum != null && Number.isFinite(namNum) ? Math.trunc(namNum) : null,
    };
    const r = await createHocVien(payload);
    setSaving(false);
    if (!r.ok) setErr(r.error);
    else {
      onSaved();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="m-0 text-sm font-extrabold text-slate-900">Thêm học viên mới</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto px-5 py-4">
          {err ? <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{err}</p> : null}
          <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            Họ tên
            <input
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-[#EAEAEA] px-3 text-sm font-semibold outline-none focus:border-[#BC8AF9]"
            />
          </label>
          <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 h-10 w-full rounded-lg border border-[#EAEAEA] px-3 text-sm outline-none focus:border-[#BC8AF9]"
            />
          </label>
          <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            SĐT
            <input
              value={sdt}
              onChange={(e) => setSdt(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-[#EAEAEA] px-3 text-sm outline-none focus:border-[#BC8AF9]"
            />
          </label>
          <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            Facebook
            <input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-[#EAEAEA] px-3 text-sm outline-none focus:border-[#BC8AF9]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              Giới tính
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#EAEAEA] bg-white px-2 text-sm outline-none focus:border-[#BC8AF9]"
              >
                <option value="">—</option>
                {SEX_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              Loại khoá
              <select
                value={loai}
                onChange={(e) => setLoai(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#EAEAEA] bg-white px-2 text-sm outline-none focus:border-[#BC8AF9]"
              >
                <option value="">—</option>
                {LOAI_KHOA_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              Ngày bắt đầu
              <input
                type="date"
                value={nbd}
                onChange={(e) => setNbd(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#EAEAEA] px-2 text-sm outline-none focus:border-[#BC8AF9]"
              />
            </label>
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              Ngày kết thúc
              <input
                type="date"
                value={nkt}
                onChange={(e) => setNkt(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#EAEAEA] px-2 text-sm outline-none focus:border-[#BC8AF9]"
              />
            </label>
          </div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            Năm thi
            <input
              type="number"
              value={namThi}
              onChange={(e) => setNamThi(e.target.value)}
              min={2000}
              max={2100}
              className="mt-1 h-10 w-full rounded-lg border border-[#EAEAEA] px-3 text-sm outline-none focus:border-[#BC8AF9]"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Tạo học viên"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const inpProfile =
  "mt-1 w-full rounded-lg border border-[#EAEAEA] px-2 py-1.5 text-[12px] font-medium text-[#1a1a2e] outline-none focus:border-[#BC8AF9]";

function TruongNganhRowEditor({
  nv,
  profileEditing,
  onSaved,
}: {
  nv: AdminQlhvTruongNganhItem;
  profileEditing: boolean;
  onSaved: () => void;
}) {
  const [namThi, setNamThi] = useState(nv.nam_thi != null ? String(nv.nam_thi) : "");
  const [ghiChu, setGhiChu] = useState(nv.ghi_chu ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setNamThi(nv.nam_thi != null ? String(nv.nam_thi) : "");
      setGhiChu(nv.ghi_chu ?? "");
    });
  }, [nv.id, nv.nam_thi, nv.ghi_chu]);

  async function saveRow() {
    setBusy(true);
    const n = namThi.trim() === "" ? null : Number(namThi);
    const r = await updateQlHvTruongNganhRow(nv.id, {
      nam_thi: n != null && Number.isFinite(n) ? Math.trunc(n) : null,
      ghi_chu: ghiChu.trim() || null,
    });
    setBusy(false);
    if (!r.ok) window.alert(r.error);
    else onSaved();
  }

  if (!profileEditing) {
    return (
      <li className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs">
        <p className="m-0 font-bold text-slate-900">{nv.ten_truong}</p>
        <p className="m-0 mt-0.5 text-slate-600">{nv.ten_nganh}</p>
        {nv.nam_thi != null ? <p className="m-0 mt-1 text-[10px] font-semibold text-slate-500">Năm thi: {nv.nam_thi}</p> : null}
        {nv.ghi_chu ? <p className="m-0 mt-1 text-[10px] text-amber-800">📝 {nv.ghi_chu}</p> : null}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">
      <p className="m-0 font-bold text-slate-900">{nv.ten_truong}</p>
      <p className="m-0 mt-0.5 text-slate-600">{nv.ten_nganh}</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block text-[9px] font-bold uppercase text-slate-400">
          Năm thi
          <input
            type="number"
            min={2000}
            max={2100}
            value={namThi}
            onChange={(e) => setNamThi(e.target.value)}
            className={inpProfile}
          />
        </label>
        <label className="block text-[9px] font-bold uppercase text-slate-400 sm:col-span-2">
          Ghi chú
          <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} className={inpProfile} placeholder="—" />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void saveRow()}
        className="mt-2 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-3 py-1 text-[10px] font-bold text-white disabled:opacity-50"
      >
        {busy ? "Đang lưu…" : "Lưu dòng"}
      </button>
    </li>
  );
}

type QlhvNvDraftRow = {
  key: string;
  truongId: "" | number;
  nganhId: "" | number;
};

function qlhvMkEmptyNvDraft(): QlhvNvDraftRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    truongId: "",
    nganhId: "",
  };
}

function qlhvNvListSig(nvList: AdminQlhvTruongNganhItem[]): string {
  return nvList
    .map((x) => `${x.id}:${x.truong_dai_hoc ?? ""}:${x.nganh_dao_tao ?? ""}:${x.nam_thi ?? ""}:${x.ghi_chu ?? ""}`)
    .join("|");
}

function qlhvNvDraftFromList(nvList: AdminQlhvTruongNganhItem[]): QlhvNvDraftRow[] {
  if (!nvList.length) return [qlhvMkEmptyNvDraft()];
  return nvList.map((nv) => ({
    key: `db-${nv.id}`,
    truongId: nv.truong_dai_hoc != null && nv.truong_dai_hoc > 0 ? nv.truong_dai_hoc : "",
    nganhId: nv.nganh_dao_tao != null && nv.nganh_dao_tao > 0 ? nv.nganh_dao_tao : "",
  }));
}

/** Giữ `nam_thi` / `ghi_chu` từ DB khi cặp trường–ngành trùng (form không còn 2 ô đó). */
function qlhvNvMetaFromList(
  nvList: AdminQlhvTruongNganhItem[],
  truongId: number,
  nganhId: number
): { nam_thi: number | null; ghi_chu: string | null } {
  const m = nvList.find((nv) => nv.truong_dai_hoc === truongId && nv.nganh_dao_tao === nganhId);
  const gc = m?.ghi_chu != null ? String(m.ghi_chu).trim() : "";
  return {
    nam_thi: m?.nam_thi ?? null,
    ghi_chu: gc.length > 0 ? gc : null,
  };
}

/** Chuỗi ổn định để so sánh tập cặp trường–ngành (bỏ qua thứ tự dòng). */
function qlhvNvPairsSigFromRows(rows: QlhvNvDraftRow[]): string {
  return rows
    .filter((r) => typeof r.truongId === "number" && r.truongId > 0 && typeof r.nganhId === "number" && r.nganhId > 0)
    .map((r) => `${r.truongId},${r.nganhId}`)
    .sort()
    .join("|");
}

function qlhvNvPairsSigFromNvList(nvList: AdminQlhvTruongNganhItem[]): string {
  return nvList
    .filter((nv) => (nv.truong_dai_hoc ?? 0) > 0 && (nv.nganh_dao_tao ?? 0) > 0)
    .map((nv) => `${nv.truong_dai_hoc},${nv.nganh_dao_tao}`)
    .sort()
    .join("|");
}

/**
 * Khối «trường & ngành» cho học viên Luyện thi — chọn cặp theo `dh_truong_nganh`; lưu tự động sau khi chỉnh (debounce).
 */
function QlhvNguyenVongAdminBlock({
  studentId,
  nvList,
  dhCatalog,
  profileEditing,
  onSaved,
}: {
  studentId: number;
  nvList: AdminQlhvTruongNganhItem[];
  dhCatalog: DhpDhCatalog;
  profileEditing: boolean;
  onSaved: () => void;
}) {
  const truongPickOptions = useMemo(() => {
    const withNganh = new Set(Object.keys(dhCatalog.nganhByTruongId));
    return dhCatalog.truong.filter((t) => withNganh.has(String(t.id)));
  }, [dhCatalog]);

  const nvSig = useMemo(() => qlhvNvListSig(nvList), [nvList]);
  const [rows, setRows] = useState<QlhvNvDraftRow[]>(() => qlhvNvDraftFromList(nvList));
  const [nvBusy, setNvBusy] = useState(false);
  const [nvErr, setNvErr] = useState<string | null>(null);
  const nvListRef = useRef(nvList);
  nvListRef.current = nvList;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const syncGenRef = useRef(0);

  useEffect(() => {
    syncGenRef.current += 1;
    queueMicrotask(() => {
      setRows(qlhvNvDraftFromList(nvList));
      setNvErr(null);
    });
    /* Đồng bộ khi server đổi: `nvSig` gom nội dung `nvList`; bỏ `nvList` khỏi deps vì `?? []` có thể tạo mảng mới mỗi render. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, nvSig]);

  const fieldLbl = "mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#aaa]";
  const fieldInp =
    "w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#F8A568] focus:ring-[3px] focus:ring-[#F8A568]/15 disabled:cursor-not-allowed disabled:opacity-55";

  useEffect(() => {
    if (!profileEditing) return;
    const genAtSchedule = syncGenRef.current;
    const t = window.setTimeout(() => {
      if (syncGenRef.current !== genAtSchedule) return;
      const nv = nvListRef.current;
      if (qlhvNvPairsSigFromRows(rows) === qlhvNvPairsSigFromNvList(nv)) return;
      void (async () => {
        setNvErr(null);
        const payload = rows
          .filter((r) => typeof r.truongId === "number" && r.truongId > 0 && typeof r.nganhId === "number" && r.nganhId > 0)
          .map((r) => {
            const tr = r.truongId as number;
            const ng = r.nganhId as number;
            const meta = qlhvNvMetaFromList(nv, tr, ng);
            return {
              truong_dai_hoc: tr,
              nganh_dao_tao: ng,
              nam_thi: meta.nam_thi,
              ghi_chu: meta.ghi_chu,
            };
          });
        setNvBusy(true);
        const res = await adminReplaceQlHvTruongNganhRows(studentId, payload);
        setNvBusy(false);
        if (syncGenRef.current !== genAtSchedule) return;
        if (!res.ok) setNvErr(res.error);
        else onSavedRef.current();
      })();
    }, 550);
    return () => window.clearTimeout(t);
  }, [rows, profileEditing, studentId]);

  return (
    <div className="mt-1 border-t border-[#f0f0f0] pt-3">
      {nvBusy ? (
        <p className="mb-2 m-0 text-[10px] font-semibold text-[#888]">Đang lưu…</p>
      ) : null}
      {nvErr ? <p className="mb-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700">{nvErr}</p> : null}

      {!profileEditing ? (
        nvList.length === 0 ? (
          <p className="m-0 py-1 text-center text-xs font-medium text-slate-400">Chưa khai báo trường / ngành</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {nvList.map((nv) => (
              <li key={nv.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs">
                <p className="m-0 font-bold text-slate-900">{nv.ten_truong}</p>
                <p className="m-0 mt-0.5 text-slate-600">{nv.ten_nganh}</p>
                {nv.nam_thi != null ? (
                  <p className="m-0 mt-1 text-[10px] font-semibold text-slate-500">Năm thi: {nv.nam_thi}</p>
                ) : null}
                {nv.ghi_chu ? <p className="m-0 mt-1 text-[10px] text-amber-800">📝 {nv.ghi_chu}</p> : null}
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {rows.map((row, idx) => {
              const nganhOpts =
                row.truongId === "" ? [] : dhCatalog.nganhByTruongId[String(row.truongId)] ?? [];
              return (
                <div
                  key={row.key}
                  className="rounded-[12px] border border-[#eaeaea] bg-[#fafafa] p-2.5 sm:grid sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:gap-2"
                >
                  <div className="mb-2 sm:mb-0">
                    <label className={fieldLbl} htmlFor={`qlhv-nv-tr-${row.key}`}>
                      Trường
                    </label>
                    <select
                      id={`qlhv-nv-tr-${row.key}`}
                      className={fieldInp}
                      disabled={nvBusy}
                      value={row.truongId === "" ? "" : String(row.truongId)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) => {
                          const next = [...prev];
                          const cur = next[idx];
                          if (!cur) return prev;
                          next[idx] =
                            v === ""
                              ? { ...cur, truongId: "", nganhId: "" }
                              : { ...cur, truongId: Number(v), nganhId: "" };
                          return next;
                        });
                      }}
                    >
                      <option value="">— Chọn trường —</option>
                      {truongPickOptions.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.ten}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2 sm:mb-0">
                    <label className={fieldLbl} htmlFor={`qlhv-nv-ng-${row.key}`}>
                      Ngành
                    </label>
                    <select
                      id={`qlhv-nv-ng-${row.key}`}
                      className={fieldInp}
                      value={row.nganhId === "" ? "" : String(row.nganhId)}
                      disabled={nvBusy || row.truongId === ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) => {
                          const next = [...prev];
                          const cur = next[idx];
                          if (!cur) return prev;
                          next[idx] = { ...cur, nganhId: v === "" ? "" : Number(v) };
                          return next;
                        });
                      }}
                    >
                      <option value="">
                        {row.truongId === "" ? "Chọn trường trước" : "— Chọn ngành —"}
                      </option>
                      {nganhOpts.map((n) => (
                        <option key={n.id} value={String(n.id)}>
                          {n.ten}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={nvBusy}
                    className="mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-45 sm:mb-0"
                    aria-label={`Xóa dòng ${idx + 1}`}
                    onClick={() => {
                      setRows((prev) => {
                        if (prev.length <= 1) return [qlhvMkEmptyNvDraft()];
                        return prev.filter((_, j) => j !== idx);
                      });
                    }}
                  >
                    <X size={16} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            disabled={nvBusy}
            className="mt-2 w-full rounded-[10px] border border-dashed border-[#ccc] bg-white py-2 text-[12px] font-semibold text-[#666] hover:border-[#F8A568] hover:text-[#1a1a2e] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:px-4"
            onClick={() => setRows((prev) => [...prev, qlhvMkEmptyNvDraft()])}
          >
            + Thêm trường / ngành
          </button>
        </>
      )}
    </div>
  );
}

export type StudentDetailBodyHandle = {
  saveProfile: () => Promise<boolean>;
  cancelEdit: () => void;
};

type StudentDetailBodyProps = {
  student: AdminQlhvStudent;
  enrollments: AdminQlhvEnrollment[];
  nvList: AdminQlhvTruongNganhItem[];
  khoaCount: number;
  onAddKhoa: () => void;
  childrenEnrollments: ReactNode;
  profileEditing: boolean;
  onProfileEditingChange: (v: boolean) => void;
  onProfileSaved: () => void;
  dhCatalog: DhpDhCatalog | null;
};

/**
 * Chi tiết học viên — map Supabase:
 * - `student` → `ql_thong_tin_hoc_vien`
 * - `nvList` → `ql_hv_truong_nganh` (+ tên từ `dh_truong_dai_hoc`, `dh_nganh_dao_tao`)
 * - Khối khoá học / `childrenEnrollments` → `ql_quan_ly_hoc_vien` (join `ql_lop_hoc`, ngày kỳ từ HP nếu có)
 *
 * Sửa / Hủu / Lưu hồ sơ nằm trên thanh drawer (`QuanLyHocVienView`) — gọi qua ref.
 */
const StudentDetailBody = forwardRef<StudentDetailBodyHandle, StudentDetailBodyProps>(function StudentDetailBody(
  {
    student,
    enrollments,
    nvList,
    khoaCount,
    onAddKhoa,
    childrenEnrollments,
    profileEditing,
    onProfileEditingChange,
    onProfileSaved,
    dhCatalog,
  },
  ref
) {
  const fb = student.facebook?.trim() || "";
  const ngayBatDauTaiKhoan = isoDateFromCreatedAt(student.created_at);
  const ngayKetThucTinh = ngayKetThucHienThi(enrollments);
  const soThangTaiSine = thangHocTaiSineArt(student.created_at, enrollments);

  const [full_name, setFullName] = useState(student.full_name);
  const [email, setEmail] = useState(student.email ?? "");
  const [sdt, setSdt] = useState(student.sdt ?? "");
  const [facebook, setFacebook] = useState(student.facebook ?? "");
  const [sex, setSex] = useState(student.sex ?? "");
  const [loai, setLoai] = useState(student.loai_khoa_hoc ?? "");
  const [namThi, setNamThi] = useState(student.nam_thi != null ? String(student.nam_thi) : "");
  const [saveBusy, setSaveBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const studentSyncKey = `${student.id}|${student.full_name}|${student.email ?? ""}|${student.sdt ?? ""}|${student.facebook ?? ""}|${student.sex ?? ""}|${student.loai_khoa_hoc ?? ""}|${student.ngay_bat_dau ?? ""}|${student.ngay_ket_thuc ?? ""}|${student.nam_thi ?? ""}|${student.created_at ?? ""}`;

  useEffect(() => {
    queueMicrotask(() => {
      setFullName(student.full_name);
      setEmail(student.email ?? "");
      setSdt(student.sdt ?? "");
      setFacebook(student.facebook ?? "");
      setSex(student.sex ?? "");
      setLoai(student.loai_khoa_hoc ?? "");
      setNamThi(student.nam_thi != null ? String(student.nam_thi) : "");
      setFormErr(null);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `studentSyncKey` gom các trường cần đồng bộ form
  }, [profileEditing, studentSyncKey]);

  const resetDraftFromStudent = useCallback(() => {
    setFullName(student.full_name);
    setEmail(student.email ?? "");
    setSdt(student.sdt ?? "");
    setFacebook(student.facebook ?? "");
    setSex(student.sex ?? "");
    setLoai(student.loai_khoa_hoc ?? "");
    setNamThi(student.nam_thi != null ? String(student.nam_thi) : "");
    setFormErr(null);
  }, [student]);

  const saveProfile = useCallback(async (): Promise<boolean> => {
    setSaveBusy(true);
    setFormErr(null);
    const namNum = namThi.trim() === "" ? null : Number(namThi);
    const nbd = isoDateInput(student.ngay_bat_dau).trim();
    const nkt = isoDateInput(student.ngay_ket_thuc).trim();
    const payload = {
      full_name: full_name.trim(),
      email: email.trim() || null,
      sdt: sdt.trim() || null,
      facebook: facebook.trim() || null,
      sex: sex.trim() || null,
      loai_khoa_hoc: loai.trim() || null,
      ngay_bat_dau: nbd || null,
      ngay_ket_thuc: nkt || null,
      nam_thi: namNum != null && Number.isFinite(namNum) ? Math.trunc(namNum) : null,
    };
    const r = await updateHocVienProfile(student.id, payload);
    setSaveBusy(false);
    if (!r.ok) {
      setFormErr(r.error);
      return false;
    }
    onProfileEditingChange(false);
    onProfileSaved();
    return true;
  }, [
    student.id,
    student.ngay_bat_dau,
    student.ngay_ket_thuc,
    full_name,
    email,
    sdt,
    facebook,
    sex,
    loai,
    namThi,
    onProfileEditingChange,
    onProfileSaved,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      saveProfile: () => saveProfile(),
      cancelEdit: () => {
        resetDraftFromStudent();
        onProfileEditingChange(false);
      },
    }),
    [saveProfile, resetDraftFromStudent, onProfileEditingChange]
  );

  return (
    <div className="w-full min-w-0 space-y-3 text-[12px] leading-normal text-[#1a1a2e]">
      {khoaCount === 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50/90 px-3 py-2.5 text-xs font-semibold text-red-800">
          <Trash2 size={14} className="mt-0.5 shrink-0 opacity-70" />
          <span>Học viên này chưa có khoá học nào — có thể xóa.</span>
        </div>
      ) : null}

      <div
        className="rounded-xl border border-black/[0.06] bg-white p-2.5"
        data-supabase-table="ql_thong_tin_hoc_vien"
      >
        <div className="mb-2">
          <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-[#BC8AF9]">Thông tin cá nhân</p>
        </div>
        {formErr ? <p className="mb-2 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-700">{formErr}</p> : null}
        {!profileEditing ? (
          <>
            <HvInfoRow label="Họ tên" value={student.full_name?.trim() || "—"} />
            <HvInfoRow label="Email" value={student.email?.trim() || "—"} />
            <HvInfoRow
              label="SĐT"
              value={displaySdt(student.sdt)}
              valueProps={{ "data-supabase-column": "sdt" }}
            />
            <HvInfoRow
              label="Facebook"
              value={
                fb ? (
                  /^https?:\/\//i.test(fb) ? (
                    <a href={fb} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-[#BC8AF9] underline">
                      {fb}
                    </a>
                  ) : (
                    fb
                  )
                ) : (
                  "—"
                )
              }
            />
            <HvInfoRow label="Giới tính" value={student.sex?.trim() || "—"} />
            <HvInfoRow label="Loại khoá" value={student.loai_khoa_hoc?.trim() || "—"} />
            <HvInfoRow
              label="Ngày bắt đầu"
              value={ngayBatDauTaiKhoan ? fmtDate(ngayBatDauTaiKhoan) : "—"}
            />
            <HvInfoRow
              label="Ngày kết thúc"
              value={(() => {
                const overall = computeOverallStatus(enrollments);
                if (ngayKetThucTinh) return fmtDate(ngayKetThucTinh);
                if (overall === "Đang học") return "Đang học";
                if (overall === "Chưa học") return "Chưa học";
                return "—";
              })()}
            />
            <HvInfoRow label="Số tháng học" value={soThangTaiSine} />
            <HvInfoRow label="Năm thi" value={student.nam_thi != null ? String(student.nam_thi) : "—"} />
            <p className="mt-1.5 text-[9px] leading-snug text-slate-400">
              Ngày bắt đầu: ngày tạo tài khoản trên Supabase. Ngày kết thúc và số tháng: khi cả lớp đều hết hạn kỳ (0 ngày
              còn). Nghỉ rồi học lại — chưa tách từng đợt «đang học» nếu chưa có lịch sử trạng thái.
            </p>
          </>
        ) : (
          <div className="space-y-2.5">
            <label className="block text-[9px] font-bold uppercase text-slate-400">
              Họ tên *
              <input
                value={full_name}
                disabled={saveBusy}
                onChange={(e) => setFullName(e.target.value)}
                className={inpProfile}
              />
            </label>
            <label className="block text-[9px] font-bold uppercase text-slate-400">
              Email
              <input
                type="email"
                value={email}
                disabled={saveBusy}
                onChange={(e) => setEmail(e.target.value)}
                className={inpProfile}
              />
            </label>
            <label className="block text-[9px] font-bold uppercase text-slate-400">
              SĐT
              <input value={sdt} disabled={saveBusy} onChange={(e) => setSdt(e.target.value)} className={inpProfile} />
            </label>
            <label className="block text-[9px] font-bold uppercase text-slate-400">
              Facebook
              <input
                value={facebook}
                disabled={saveBusy}
                onChange={(e) => setFacebook(e.target.value)}
                className={inpProfile}
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-[9px] font-bold uppercase text-slate-400">
                Giới tính
                <select
                  value={sex}
                  disabled={saveBusy}
                  onChange={(e) => setSex(e.target.value)}
                  className={cn(inpProfile, "bg-white")}
                >
                  <option value="">—</option>
                  {SEX_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[9px] font-bold uppercase text-slate-400">
                Loại khoá
                <select
                  value={loai}
                  disabled={saveBusy}
                  onChange={(e) => setLoai(e.target.value)}
                  className={cn(inpProfile, "bg-white")}
                >
                  <option value="">—</option>
                  {LOAI_KHOA_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="m-0 text-[10px] text-slate-400">
              Số tháng (theo tài khoản và kỳ lớp):{" "}
              <span className="font-semibold text-slate-600">{thangHocTaiSineArt(student.created_at, enrollments)}</span>
            </p>
            <label className="block text-[9px] font-bold uppercase text-slate-400">
              Năm thi
              <input
                type="number"
                min={2000}
                max={2100}
                value={namThi}
                disabled={saveBusy}
                onChange={(e) => setNamThi(e.target.value)}
                className={inpProfile}
              />
            </label>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-black/[0.06] bg-white p-3.5" data-supabase-table="ql_hv_truong_nganh">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-[#BC8AF9]" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#BC8AF9]">Trường & ngành thi</span>
          </div>
        </div>
        {student.loai_khoa_hoc?.trim() === "Luyện thi" && dhCatalog ? (
          <QlhvNguyenVongAdminBlock
            studentId={student.id}
            nvList={nvList}
            dhCatalog={dhCatalog}
            profileEditing={profileEditing}
            onSaved={onProfileSaved}
          />
        ) : nvList.length === 0 ? (
          <p className="m-0 py-2 text-center text-xs font-medium text-slate-400">Chưa đăng ký trường nào</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {nvList.map((nv) => (
              <TruongNganhRowEditor
                key={nv.id}
                nv={nv}
                profileEditing={profileEditing}
                onSaved={onProfileSaved}
              />
            ))}
          </ul>
        )}
      </div>

      <div data-supabase-table="ql_quan_ly_hoc_vien">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[#BC8AF9]" />
            <h3 className="m-0 text-[10px] font-extrabold uppercase tracking-widest text-[#BC8AF9]">
              Khoá học ({khoaCount})
            </h3>
          </div>
          <button
            type="button"
            onClick={onAddKhoa}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-3 py-1.5 text-[11px] font-bold text-white"
          >
            <Plus size={14} />
            Thêm khoá
          </button>
        </div>
        <div className="space-y-2">{childrenEnrollments}</div>
      </div>
    </div>
  );
});

StudentDetailBody.displayName = "StudentDetailBody";

function AddKhoaModal({
  open,
  hvName,
  hvId,
  lopOptions,
  onClose,
  onDone,
}: {
  open: boolean;
  hvName: string;
  hvId: number;
  lopOptions: LopOpt[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [lopId, setLopId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  async function submit() {
    if (!lopId) {
      setErr("Vui lòng chọn Lớp học");
      return;
    }
    setSaving(true);
    setErr(null);
    const r = await createEnrollment(hvId, Number(lopId));
    setSaving(false);
    if (!r.ok) setErr(r.error);
    else {
      onDone();
      onClose();
    }
  }
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full max-w-[400px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-[#BC8AF9]">Thêm khoá học</p>
            <h2 className="m-0 text-base font-extrabold text-slate-900">{hvName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 text-slate-500">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-5 py-4">
          {err ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{err}</p> : null}
          <p className="m-0 text-[11px] text-slate-500">Ngày đầu/cuối kỳ sẽ hiển thị sau khi có đơn học phí «Đã thanh toán».</p>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Lớp học *</label>
            <select
              value={lopId}
              onChange={(e) => setLopId(e.target.value)}
              className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] px-3 py-2 text-sm outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
            >
              <option value="">— Chọn lớp —</option>
              {lopOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Đang thêm…" : "Thêm khoá học"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

type QlhvStatCardTone = "slate" | "emerald" | "amber" | "rose" | "violet" | "sky";

function QlhvStatCard({
  label,
  value,
  tone = "slate",
  title,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  tone?: QlhvStatCardTone;
  /** Tooltip — mô tả thêm khi cần. */
  title?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const toneCls =
    tone === "emerald"
      ? "border-emerald-200/90 bg-emerald-50/50"
      : tone === "amber"
        ? "border-amber-200/90 bg-amber-50/45"
        : tone === "rose"
          ? "border-rose-200/90 bg-rose-50/45"
          : tone === "violet"
            ? "border-violet-200/90 bg-violet-50/40"
            : tone === "sky"
              ? "border-sky-200/90 bg-sky-50/45"
              : "border-slate-200/90 bg-white";
  const ring = active ? "ring-2 ring-[#BC8AF9] ring-offset-1 ring-offset-white" : "";
  const base = cn(
    "flex min-h-[3.25rem] w-full min-w-0 flex-col justify-center rounded-lg border px-2 py-1.5 text-left shadow-sm sm:min-h-[3.5rem]",
    onClick ? "cursor-pointer transition hover:brightness-[0.97] active:brightness-95" : "cursor-default",
    toneCls,
    ring
  );
  const tip = title ?? label;
  const inner = (
    <>
      <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-slate-600">{label}</p>
      <p className="mt-1 text-base font-extrabold tabular-nums leading-none text-slate-900 sm:text-lg">{value}</p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={base} onClick={onClick} title={tip}>
        {inner}
      </button>
    );
  }
  return (
    <div className={base} title={tip}>
      {inner}
    </div>
  );
}

export default function QuanLyHocVienView({
  students,
  enrollments,
  lopOptions,
  baiTapById,
  truongNganhByHvId,
  dhCatalog,
  adminStaffId,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1200);
  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState<QuanLyHvStatusFilter>("all");
  const [filterMau, setFilterMau] = useState(false);
  const [filterDangKhoaBucket, setFilterDangKhoaBucket] = useState<QuanLyHvDangKhoaBucket>(null);
  const [sortTT, setSortTT] = useState<SortDir>("asc");
  const [sortDays, setSortDays] = useState<SortDir>(null);
  const [selected, setSelected] = useState<AdminQlhvStudent | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaveBusy, setProfileSaveBusy] = useState(false);
  const detailBodyRef = useRef<StudentDetailBodyHandle>(null);
  const [mauBusy, setMauBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [hvPage, setHvPage] = useState(1);
  const [dhpOpen, setDhpOpen] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Sau `router.refresh()`, giữ học viên đang chọn khớp bản mới từ server (tránh state cũ lệch dữ liệu). */
  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return null;
      return students.find((s) => s.id === prev.id) ?? null;
    });
  }, [students]);

  useEffect(() => {
    if (!selected) setDhpOpen(false);
  }, [selected]);

  useEffect(() => {
    setProfileEditing(false);
    setProfileSaveBusy(false);
  }, [selected?.id]);

  const isMobile = w < 580;
  const detailW = Math.min(520, Math.max(300, w * 0.42));

  const byHv = useMemo(() => {
    const m = new Map<number, AdminQlhvEnrollment[]>();
    for (const e of enrollments) {
      const hid = Number(e.hoc_vien_id);
      if (!Number.isFinite(hid) || hid <= 0) continue;
      if (!m.has(hid)) m.set(hid, []);
      m.get(hid)!.push(e);
    }
    return m;
  }, [enrollments]);

  const allClasses = useMemo(() => {
    const s = new Set<string>();
    for (const e of enrollments) {
      const n = lopDisplayName(e.lop);
      if (n && n !== "—") s.add(n);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "vi"));
  }, [enrollments]);

  const filtered = useMemo(() => {
    let list = students;
    if (filterMau) list = list.filter((hv) => hv.is_hoc_vien_mau);
    if (filterStatus !== "all") {
      list = list.filter((hv) => computeOverallStatus(byHv.get(hv.id) ?? []) === filterStatus);
    }
    if (filterDangKhoaBucket) {
      list = list.filter((hv) => {
        const n = (byHv.get(hv.id) ?? []).filter((k) => deriveEnrollmentStatus(k) === "Đang học").length;
        if (filterDangKhoaBucket === "1") return n === 1;
        if (filterDangKhoaBucket === "2") return n === 2;
        return n >= 3;
      });
    }
    if (filterClass.trim()) {
      list = list.filter((hv) =>
        (byHv.get(hv.id) ?? []).some((kh) => lopDisplayName(kh.lop) === filterClass)
      );
    }
    if (query.trim()) {
      const q = s2l(query);
      list = list.filter(
        (hv) => s2l(hv.full_name).includes(q) || s2l(hv.email).includes(q) || s2l(hv.sdt).includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortTT !== null) {
        const oa = TT_ORDER[computeOverallStatus(byHv.get(a.id) ?? [])] ?? 99;
        const ob = TT_ORDER[computeOverallStatus(byHv.get(b.id) ?? [])] ?? 99;
        if (oa !== ob) return sortTT === "asc" ? oa - ob : ob - oa;
      }
      if (sortDays !== null) {
        const da = totalDaysLeftAllKhoa(byHv.get(a.id) ?? []);
        const db = totalDaysLeftAllKhoa(byHv.get(b.id) ?? []);
        return sortDays === "asc" ? da - db : db - da;
      }
      return 0;
    });
    return list;
  }, [students, filterMau, filterStatus, filterDangKhoaBucket, filterClass, query, sortTT, sortDays, byHv]);

  const activeLopEnrollmentCount = useMemo(() => {
    let n = 0;
    for (const row of enrollments) {
      if (deriveEnrollmentStatus(row) === "Đang học") n += 1;
    }
    return n;
  }, [enrollments]);

  /** Số học viên theo số lớp (khoá) đang còn hạn — mỗi khoá `deriveEnrollmentStatus === "Đang học"`. */
  const hvDangHocLopBuckets = useMemo(() => {
    let oneLop = 0;
    let twoLop = 0;
    let threePlusLop = 0;
    for (const hv of students) {
      const khs = byHv.get(hv.id) ?? [];
      const nActive = khs.filter((k) => deriveEnrollmentStatus(k) === "Đang học").length;
      if (nActive === 1) oneLop += 1;
      else if (nActive === 2) twoLop += 1;
      else if (nActive >= 3) threePlusLop += 1;
    }
    return { oneLop, twoLop, threePlusLop };
  }, [students, byHv]);

  useEffect(() => {
    setHvPage(1);
  }, [query, filterClass, filterMau, filterStatus, filterDangKhoaBucket, sortTT, sortDays]);

  const hvTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / HV_PAGE_SIZE)),
    [filtered.length]
  );

  useEffect(() => {
    setHvPage((p) => Math.min(Math.max(1, p), hvTotalPages));
  }, [hvTotalPages]);

  const pagedFiltered = useMemo(() => {
    const start = (hvPage - 1) * HV_PAGE_SIZE;
    return filtered.slice(start, start + HV_PAGE_SIZE);
  }, [filtered, hvPage]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "Đang học": 0, "Chưa học": 0, Nghỉ: 0 };
    for (const hv of students) {
      const tt = computeOverallStatus(byHv.get(hv.id) ?? []);
      if (tt in c) c[tt]++;
    }
    return c;
  }, [students, byHv]);

  const mauCount = useMemo(() => students.filter((h) => h.is_hoc_vien_mau).length, [students]);

  const extractRow = useCallback(
    (hv: AdminQlhvStudent) => {
      const khs = byHv.get(hv.id) ?? [];
      const activeKh =
        khs.find((k) => deriveEnrollmentStatus(k) === "Đang học") ??
        khs.find((k) => deriveEnrollmentStatus(k) === "Chưa học") ??
        khs[0] ??
        null;
      const tdId = activeKh?.tien_do_hoc;
      const curBai = tdId ? baiTapById[String(tdId)] ?? null : null;
      return {
        tinhTrang: computeOverallStatus(khs),
        lopName: activeKh ? lopDisplayName(activeKh.lop) : "",
        khs,
        curBaiTap: curBai,
        ghiChu: activeKh?.ghi_chu || "",
      };
    },
    [byHv, baiTapById]
  );

  async function onToggleMau() {
    if (!selected) return;
    setMauBusy(true);
    const r = await toggleHocVienMau(selected.id, !selected.is_hoc_vien_mau);
    setMauBusy(false);
    if (!r.ok) window.alert(r.error);
    else router.refresh();
  }

  async function onDeleteHocVien() {
    if (!selected) return;
    const khs = byHv.get(selected.id) ?? [];
    if (khs.length > 0) {
      window.alert("Học viên còn khoá học — xóa ghi danh trước hoặc dùng xóa khoá từng lớp.");
      return;
    }
    if (!window.confirm(`Xóa vĩnh viễn học viên «${selected.full_name}»? Thao tác không hoàn tác.`)) return;
    setDeleteBusy(true);
    try {
      const r = await deleteHocVien(selected.id);
      if (!r.ok) window.alert(r.error);
      else {
        setSelected(null);
        router.refresh();
      }
    } finally {
      setDeleteBusy(false);
    }
  }

  const enrollmentListNode =
    selected != null ? (
      (byHv.get(selected.id) ?? []).length === 0 ? (
        <p
          className="rounded-xl border border-dashed border-slate-200 bg-white py-6 text-center text-sm text-slate-400"
          data-supabase-table="ql_quan_ly_hoc_vien"
          data-empty="true"
        >
          Chưa đăng ký khoá nào
        </p>
      ) : (
        (byHv.get(selected.id) ?? []).map((kh) => (
          <EnrollmentCard
            key={kh.id}
            kh={kh}
            baiTap={kh.tien_do_hoc ? baiTapById[String(kh.tien_do_hoc)] ?? null : null}
            baiTapById={baiTapById}
            onRefresh={() => router.refresh()}
          />
        ))
      )
    ) : null;

  return (
    <div
      ref={containerRef}
      className="-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6 md:w-[calc(100%+3rem)]"
    >
      <header className="relative z-20 overflow-visible border-b border-[#EAEAEA] bg-white px-3 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sm:px-5 sm:py-3">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 overflow-visible">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
                <Users size={18} strokeWidth={2} className="text-white" />
              </div>
              <h1 className="m-0 text-[16px] font-bold tracking-tight text-[#323232]">Quản lý học viên</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateStudent(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-95"
            >
              <Plus size={14} strokeWidth={2.5} />
              Thêm học viên
            </button>
          </div>
          <p className="m-0 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Chạm thẻ để lọc (trừ «Khoá đang học»)</p>
          <div className="grid grid-cols-5 grid-rows-2 gap-1.5 overflow-visible">
            <QlhvStatCard
              label="Tổng học viên"
              value={students.length}
              tone="slate"
              title="Xoá lọc tình trạng / số lớp / mẫu — giữ tìm kiếm và lọc theo tên lớp"
              active={filterStatus === "all" && !filterMau && !filterDangKhoaBucket}
              onClick={() => {
                setFilterStatus("all");
                setFilterMau(false);
                setFilterDangKhoaBucket(null);
              }}
            />
            <QlhvStatCard
              label="Đang học"
              value={counts["Đang học"]}
              tone="emerald"
              title="Lọc theo tình trạng tổng: đang học (bấm lại để bỏ lọc)"
              active={filterStatus === "Đang học" && !filterMau && !filterDangKhoaBucket}
              onClick={() => {
                setFilterMau(false);
                setFilterDangKhoaBucket(null);
                setFilterStatus((s) => (s === "Đang học" ? "all" : "Đang học"));
              }}
            />
            <QlhvStatCard
              label="Chưa học"
              value={counts["Chưa học"]}
              tone="amber"
              title="Lọc theo tình trạng tổng: chưa có kỳ học phí đủ trên mọi lớp"
              active={filterStatus === "Chưa học" && !filterMau && !filterDangKhoaBucket}
              onClick={() => {
                setFilterMau(false);
                setFilterDangKhoaBucket(null);
                setFilterStatus((s) => (s === "Chưa học" ? "all" : "Chưa học"));
              }}
            />
            <QlhvStatCard
              label="Nghỉ"
              value={counts["Nghỉ"]}
              tone="rose"
              title="Lọc theo tình trạng tổng: đã hết hạn mọi khoá"
              active={filterStatus === "Nghỉ" && !filterMau && !filterDangKhoaBucket}
              onClick={() => {
                setFilterMau(false);
                setFilterDangKhoaBucket(null);
                setFilterStatus((s) => (s === "Nghỉ" ? "all" : "Nghỉ"));
              }}
            />
            <QlhvStatCard
              label="Khoá đang học"
              value={activeLopEnrollmentCount}
              tone="violet"
              title="Tổng số ghi danh còn trong kỳ học phí (chỉ xem, không lọc)"
            />
            <QlhvStatCard
              label="Một lớp còn hạn"
              value={hvDangHocLopBuckets.oneLop}
              tone="sky"
              title="Học viên có đúng một khoá đang còn hạn"
              active={filterDangKhoaBucket === "1"}
              onClick={() => {
                setFilterMau(false);
                setFilterStatus("all");
                setFilterDangKhoaBucket((b) => (b === "1" ? null : "1"));
              }}
            />
            <QlhvStatCard
              label="Hai lớp còn hạn"
              value={hvDangHocLopBuckets.twoLop}
              tone="sky"
              title="Học viên có đúng hai khoá đang còn hạn"
              active={filterDangKhoaBucket === "2"}
              onClick={() => {
                setFilterMau(false);
                setFilterStatus("all");
                setFilterDangKhoaBucket((b) => (b === "2" ? null : "2"));
              }}
            />
            <QlhvStatCard
              label="Ba lớp trở lên"
              value={hvDangHocLopBuckets.threePlusLop}
              tone="sky"
              title="Học viên có từ ba khoá đang còn hạn trở lên"
              active={filterDangKhoaBucket === "3+"}
              onClick={() => {
                setFilterMau(false);
                setFilterStatus("all");
                setFilterDangKhoaBucket((b) => (b === "3+" ? null : "3+"));
              }}
            />
            <QlhvStatCard
              label="Học viên mẫu"
              value={mauCount}
              tone="amber"
              title="Chỉ hiện học viên được gắn sao mẫu"
              active={filterMau && !filterDangKhoaBucket}
              onClick={() => {
                setFilterDangKhoaBucket(null);
                setFilterStatus("all");
                setFilterMau((m) => !m);
              }}
            />
            <div className="min-h-[3.25rem] min-w-0 rounded-lg border border-transparent sm:min-h-[3.5rem]" aria-hidden />
          </div>
          <div className="flex flex-wrap items-center gap-2 overflow-visible pt-0.5">
            <div className="relative min-h-[36px] min-w-0 flex-1 basis-[min(100%,18rem)]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tên, email, SĐT…"
                className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-white py-0 pl-8 pr-8 text-xs text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Xóa tìm"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/60"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center rounded-lg border border-[#EAEAEA] bg-slate-50/80 px-2 py-1">
              <ClassFilterDropdown classes={allClasses} active={filterClass} onSelect={setFilterClass} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full max-w-full min-w-0 flex-col">
        <div className="w-full max-w-full min-w-0 px-[10px] pb-6 pt-3">
        <div className="mx-auto flex min-h-[min(64vh,560px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
              <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col px-[10px] pb-6 pt-3">
                <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-[#EAEAEA] bg-white">
            {!isMobile ? (
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <div className="w-7 shrink-0">#</div>
                <div className="w-[160px] shrink-0">Họ tên</div>
                <div className="w-[100px] shrink-0">
                  <SortableHeader
                    label="Tình trạng"
                    active={sortTT !== null}
                    dir={sortTT}
                    onClick={() => setSortTT((p) => (p === "asc" ? "desc" : p === "desc" ? null : "asc"))}
                  />
                </div>
                <div className="w-[130px] shrink-0">Email</div>
                <div className="w-[180px] shrink-0">
                  <SortableHeader
                    label="Tổng ngày còn (mọi lớp)"
                    active={sortDays !== null}
                    dir={sortDays}
                    onClick={() => setSortDays((p) => (p === null ? "asc" : p === "asc" ? "desc" : null))}
                  />
                </div>
                <div className="w-[120px] shrink-0">Tiến độ</div>
                <div className="min-w-0 flex-1">Ghi chú</div>
                <div className="w-[100px] shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">Lớp</div>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-slate-500">
                  <span className="text-2xl">{filterMau ? "⭐" : "🔍"}</span>
                  {filterMau
                    ? "Chưa có học viên mẫu nào"
                    : query.trim()
                      ? "Không tìm thấy kết quả"
                      : filterStatus !== "all" || filterClass.trim() || filterDangKhoaBucket
                        ? "Không có học viên khớp bộ lọc"
                        : "Không tìm thấy kết quả"}
                </div>
              ) : isMobile ? (
                <div className="p-3">
                  {pagedFiltered.map((hv) => {
                    const { tinhTrang, lopName, khs, ghiChu } = extractRow(hv);
                    return (
                      <button
                        key={hv.id}
                        type="button"
                        onClick={() => setSelected(hv)}
                        className={cn(
                          "mb-2 w-full rounded-xl border p-3.5 text-left transition-shadow hover:shadow-md",
                          hv.is_hoc_vien_mau ? "border-amber-200 bg-amber-50/50" : "border-[#EAEAEA] bg-white"
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <StudentAvatarCircle
                            fullName={hv.full_name}
                            email={hv.email}
                            storedAvatar={hv.avatar}
                            size={32}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[13px] font-bold text-slate-900">{hv.full_name}</span>
                              {hv.is_hoc_vien_mau ? <HocVienMauBadge small /> : null}
                            </div>
                            <span className="text-[11px] text-slate-500">{lopName || "—"}</span>
                          </div>
                          <TinhTrangBadge value={tinhTrang} />
                        </div>
                        {ghiChu ? <p className="mb-2 text-[11px] font-semibold text-amber-700">📝 {ghiChu}</p> : null}
                        {khs.length > 0 ? (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {khs.slice(0, 3).map((kh, ki) => {
                              const name = lopDisplayName(kh.lop);
                              const ttKh = deriveEnrollmentStatus(kh);
                              const d = daysLeft(kh.ngay_cuoi_ky);
                              const cfg = TT_COLOR[ttKh] ?? { bg: "#f3f4f6", text: "#6b7280" };
                              const daysBit = ttKh === "Chưa học" || d < 0 ? "—" : `${d}`;
                              return (
                                <span key={ki} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
                                  <span className="h-1 w-1 rounded-full" style={{ background: cfg.text }} />
                                  {name} · {daysBit}
                                </span>
                              );
                            })}
                            {khs.length > 3 ? <span className="self-center text-[9px] text-slate-400">+{khs.length - 3}</span> : null}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                pagedFiltered.map((hv, i) => {
                  const { tinhTrang, khs, curBaiTap, ghiChu } = extractRow(hv);
                  const rowNum = (hvPage - 1) * HV_PAGE_SIZE + i + 1;
                  return (
                    <div
                      key={hv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(hv)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(hv);
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 border-b border-slate-50 px-4 py-2 text-left transition-colors hover:bg-slate-50",
                        hv.is_hoc_vien_mau && "bg-amber-50/40"
                      )}
                    >
                      <div className="w-7 shrink-0 text-[10px] font-semibold text-slate-300">{rowNum}</div>
                      <div className="flex w-[160px] shrink-0 items-center gap-2 overflow-hidden">
                        <StudentAvatarCircle
                          fullName={hv.full_name}
                          email={hv.email}
                          storedAvatar={hv.avatar}
                          size={26}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="truncate text-xs font-semibold text-slate-900">{hv.full_name}</span>
                            {hv.is_hoc_vien_mau ? <HocVienMauBadge small /> : null}
                          </div>
                          {khs.length > 1 ? (
                            <span className="text-[9px] font-bold text-[#BC8AF9]">{khs.length} khoá</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="w-[100px] shrink-0">
                        <TinhTrangBadge value={tinhTrang} />
                      </div>
                      <div className="w-[130px] shrink-0 truncate text-[11px] text-slate-500">{hv.email || "—"}</div>
                      <div className="flex w-[180px] shrink-0 flex-col gap-1 overflow-hidden">
                        {khs.length === 0 ? <span className="text-[10px] text-slate-200">—</span> : null}
                        {khs.slice(0, 2).map((kh, ki) => {
                          const name = lopDisplayName(kh.lop);
                          const tt = deriveEnrollmentStatus(kh);
                          const d = daysLeft(kh.ngay_cuoi_ky);
                          const cfg = TT_COLOR[tt] ?? { bg: "#f3f4f6", text: "#6b7280" };
                          const daysText = tt === "Chưa học" || d < 0 ? "—" : `${d}`;
                          const dColor =
                            daysText === "—" ? "#94a3b8" : d <= 5 ? "#F8A568" : "#16a34a";
                          return (
                            <div key={ki} className="flex min-w-0 items-center gap-1">
                              <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: cfg.text }} />
                              <span className="min-w-0 flex-1 truncate text-[10px] text-slate-600">{name}</span>
                              <span className="shrink-0 text-[10px] font-bold" style={{ color: dColor }}>
                                {daysText}
                              </span>
                              <span className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
                                {tt}
                              </span>
                            </div>
                          );
                        })}
                        {khs.length > 2 ? <span className="text-[9px] text-slate-400">+{khs.length - 2} khoá khác</span> : null}
                      </div>
                      <div className="w-[120px] shrink-0">
                        <MiniProgress
                          tenBai={curBaiTap?.ten_bai_tap ?? ""}
                          so={curBaiTap?.bai_so != null ? String(curBaiTap.bai_so) : ""}
                          thumb={curBaiTap?.thumbnail ?? ""}
                        />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        {ghiChu ? (
                          <span className="block truncate text-[11px] font-semibold text-amber-700">📝 {ghiChu}</span>
                        ) : (
                          <span className="text-[11px] text-slate-200">—</span>
                        )}
                      </div>
                      <div className="w-[100px] shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
            {filtered.length > 0 ? (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/90 px-4 py-2 text-[11px] text-slate-600">
                <span className="tabular-nums">
                  {(hvPage - 1) * HV_PAGE_SIZE + 1}–{Math.min(hvPage * HV_PAGE_SIZE, filtered.length)} / {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={hvPage <= 1}
                    onClick={() => setHvPage((p) => Math.max(1, p - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="min-w-[4.75rem] text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Trang <span className="text-slate-800">{hvPage}</span> / {hvTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={hvPage >= hvTotalPages}
                    onClick={() => setHvPage((p) => Math.min(hvTotalPages, p + 1))}
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
        </div>

      {!isMobile ? (
        <div
          className={cn(
            "fixed bottom-0 right-0 top-14 z-[100] flex flex-col overflow-hidden border-l border-[#EAEAEA] bg-[#fafafa] shadow-[-8px_0_32px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:rounded-l-xl",
            selected ? "translate-x-0" : "translate-x-full pointer-events-none"
          )}
          style={{ width: detailW }}
          aria-hidden={!selected}
        >
          {selected ? (
            <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#fafafa] px-[10px]">
              <div
                className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-black/[0.06] px-0 py-3.5"
                style={{ background: "linear-gradient(135deg,#BC8AF910,#ED5C9D08)" }}
              >
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-[#888] hover:bg-white"
                  aria-label="Đóng"
                >
                  <ChevronLeft size={16} />
                </button>
                <StudentAvatarCircle
                  fullName={selected.full_name}
                  email={selected.email}
                  storedAvatar={selected.avatar}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="m-0 break-words text-[15px] font-extrabold leading-snug text-[#1a1a2e]">{selected.full_name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {selected.is_hoc_vien_mau ? <HocVienMauBadge /> : null}
                    <TinhTrangBadge value={computeOverallStatus(byHv.get(selected.id) ?? [])} />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/[0.06] bg-[#fafafa] px-0 py-2.5">
                <button
                  type="button"
                  disabled={deleteBusy || (byHv.get(selected.id) ?? []).length > 0}
                  onClick={() => void onDeleteHocVien()}
                  title={(byHv.get(selected.id) ?? []).length > 0 ? "Còn khoá học — không xóa được học viên." : undefined}
                  className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleteBusy ? "Đang xóa…" : "Xóa HV"}
                </button>
                <button
                  type="button"
                  disabled={mauBusy}
                  onClick={() => void onToggleMau()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#666] disabled:opacity-50"
                >
                  <Star size={11} className={selected.is_hoc_vien_mau ? "fill-amber-500 text-amber-500" : ""} />
                  {mauBusy ? "…" : selected.is_hoc_vien_mau ? "Bỏ mẫu" : "Đặt mẫu"}
                </button>
                <button
                  type="button"
                  onClick={() => setDhpOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-2.5 py-1.5 text-[11px] font-bold text-white hover:opacity-95"
                >
                  <CreditCard size={12} />
                  Đóng học phí
                </button>
                {!profileEditing ? (
                  <button
                    type="button"
                    onClick={() => setProfileEditing(true)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#666]"
                  >
                    <Edit2 size={12} />
                    Sửa
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={profileSaveBusy}
                      onClick={() => detailBodyRef.current?.cancelEdit()}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={profileSaveBusy}
                      onClick={() => {
                        void (async () => {
                          setProfileSaveBusy(true);
                          try {
                            await detailBodyRef.current?.saveProfile();
                          } finally {
                            setProfileSaveBusy(false);
                          }
                        })();
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 disabled:opacity-50"
                    >
                      {profileSaveBusy ? "Đang lưu…" : "Lưu"}
                    </button>
                  </>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0 py-3">
                <StudentDetailBody
                  ref={detailBodyRef}
                  student={selected}
                  enrollments={byHv.get(selected.id) ?? []}
                  nvList={truongNganhByHvId[String(selected.id)] ?? []}
                  khoaCount={(byHv.get(selected.id) ?? []).length}
                  onAddKhoa={() => setShowAdd(true)}
                  childrenEnrollments={enrollmentListNode}
                  profileEditing={profileEditing}
                  onProfileEditingChange={setProfileEditing}
                  onProfileSaved={() => router.refresh()}
                  dhCatalog={dhCatalog}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {isMobile && selected ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#fafafa]">
          <div className="flex shrink-0 flex-col gap-2 border-b border-black/[0.06] bg-gradient-to-br from-[#BC8AF9]/10 to-[#ED5C9D]/5 px-4 py-3">
            <div className="flex flex-wrap items-start gap-2">
              <button type="button" onClick={() => setSelected(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white">
                <ChevronLeft size={16} />
              </button>
              <StudentAvatarCircle
                fullName={selected.full_name}
                email={selected.email}
                storedAvatar={selected.avatar}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 min-w-0 break-words text-[15px] font-extrabold leading-snug text-slate-900">{selected.full_name}</h2>
                  {selected.is_hoc_vien_mau ? <HocVienMauBadge /> : null}
                </div>
                <TinhTrangBadge value={computeOverallStatus(byHv.get(selected.id) ?? [])} />
                <button
                  type="button"
                  disabled={deleteBusy || (byHv.get(selected.id) ?? []).length > 0}
                  onClick={() => void onDeleteHocVien()}
                  className="mt-2 w-full max-w-[200px] rounded-lg border border-red-200 bg-white py-1.5 text-[11px] font-bold text-red-600 disabled:opacity-40"
                >
                  {deleteBusy ? "Đang xóa…" : "Xóa HV"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={mauBusy}
                onClick={() => void onToggleMau()}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-700 min-[400px]:flex-none min-[400px]:px-3"
              >
                <Star size={11} className={selected.is_hoc_vien_mau ? "fill-amber-500 text-amber-500" : ""} />
                {mauBusy ? "…" : selected.is_hoc_vien_mau ? "Bỏ mẫu" : "Đặt mẫu"}
              </button>
              <button
                type="button"
                onClick={() => setDhpOpen(true)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] py-2 text-[11px] font-bold text-white hover:opacity-95 min-[400px]:flex-none min-[400px]:px-3"
              >
                <CreditCard size={12} />
                Đóng học phí
              </button>
              {!profileEditing ? (
                <button
                  type="button"
                  onClick={() => setProfileEditing(true)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-700 min-[400px]:flex-none min-[400px]:px-3"
                >
                  <Edit2 size={12} />
                  Sửa
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={profileSaveBusy}
                    onClick={() => detailBodyRef.current?.cancelEdit()}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 py-2 text-[11px] font-bold text-amber-900 min-[400px]:flex-none min-[400px]:px-3 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={profileSaveBusy}
                    onClick={() => {
                      void (async () => {
                        setProfileSaveBusy(true);
                        try {
                          await detailBodyRef.current?.saveProfile();
                        } finally {
                          setProfileSaveBusy(false);
                        }
                      })();
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-[11px] font-bold text-emerald-800 min-[400px]:flex-none min-[400px]:px-3 disabled:opacity-50"
                  >
                    {profileSaveBusy ? "Đang lưu…" : "Lưu"}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <StudentDetailBody
              ref={detailBodyRef}
              student={selected}
              enrollments={byHv.get(selected.id) ?? []}
              nvList={truongNganhByHvId[String(selected.id)] ?? []}
              khoaCount={(byHv.get(selected.id) ?? []).length}
              onAddKhoa={() => setShowAdd(true)}
              childrenEnrollments={enrollmentListNode}
              profileEditing={profileEditing}
              onProfileEditingChange={setProfileEditing}
              onProfileSaved={() => router.refresh()}
              dhCatalog={dhCatalog}
            />
          </div>
        </div>
      ) : null}
      </div>

      {showCreateStudent ? (
        <CreateStudentModal
          key="hv-create"
          onClose={() => setShowCreateStudent(false)}
          onSaved={() => router.refresh()}
        />
      ) : null}

      <AddKhoaModal
        open={showAdd && !!selected}
        hvName={selected?.full_name ?? ""}
        hvId={selected?.id ?? 0}
        lopOptions={lopOptions}
        onClose={() => setShowAdd(false)}
        onDone={() => router.refresh()}
      />

      {selected ? (
        <AdminDongHocPhiModal
          open={dhpOpen}
          onClose={(didRefresh) => {
            setDhpOpen(false);
            if (didRefresh) router.refresh();
          }}
          student={selected}
          enrollments={byHv.get(selected.id) ?? []}
          defaultNguoiTaoId={adminStaffId}
        />
      ) : null}
    </div>
  );
}
