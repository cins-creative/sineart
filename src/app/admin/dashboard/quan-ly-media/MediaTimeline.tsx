"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";

import AdminMinhHoaDropzone, {
  minhHoaUrlsFromSlots,
  slotsFromMinhHoaUrls,
  type MinhHoaUploadSlot,
} from "@/app/admin/_components/AdminMinhHoaDropzone";
import { updateMktMediaProjectDetail } from "@/app/admin/dashboard/quan-ly-media/actions";
import { htmlToPlainText, sanitizeAdminRichHtml } from "@/lib/admin/sanitize-admin-html";
import type {
  HrNhanSuStaffOption,
  MktMediaProjectRow as Project,
  StaffAvatarById,
  StaffNameById,
} from "@/lib/data/admin-quan-ly-media";
import { MKT_MEDIA_STATUS_OPTIONS, MKT_MEDIA_TYPE_OPTIONS } from "@/lib/data/mkt-media-form";

type MediaTimelineProps = {
  initialProjects: Project[];
  staffNameById?: StaffNameById;
  staffAvatarById?: StaffAvatarById;
  mediaTeamStaff?: HrNhanSuStaffOption[];
  /** Nhân sự ban Media — lọc timeline theo người làm. */
  mediaBanStaffFilter?: HrNhanSuStaffOption[];
};

type ViewMode = "data" | "week" | "month" | "year";

const LS_KEY = "sineart-admin-media-timeline:v2";

const STATUS_ORDER = ["Đang làm", "Chờ xác nhận", "Hoàn thành", "Hủy dự án"];

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  "Đang làm": { label: "Đang làm", color: "#2563EB", dot: "#3B82F6" },
  "Chờ xác nhận": { label: "Chờ xác nhận", color: "#D97706", dot: "#F59E0B" },
  "Hoàn thành": { label: "Hoàn thành", color: "#059669", dot: "#10B981" },
  "Hủy dự án": { label: "Hủy dự án", color: "#6B7280", dot: "#9CA3AF" },
};

const TYPE_COLOR: Record<string, string> = {
  "Album ảnh": "#F8A568",
  "Ảnh": "#EE5CA2",
  "Video 16x9": "#BB89F8",
  "Short 9x16": "#818CF8",
  Web: "#34D399",
  "Micro interactive": "#FB923C",
};

const BORDER = "#EAEAEA";
const TEXT = "#323232";
const TEXT_MUTED = "#888888";
const HEADER_BG = "#fafafa";
const GROUP_BG = "#f5f5f6";
const ROW_ALT = "#fafafa";

const MIN_LABEL_W = 140;
const MAX_LABEL_W = 440;
const DEFAULT_LABEL_W = 220;
const MIN_PX_PER_DAY = 2;
const MAX_PX_PER_DAY = 48;
const DEFAULT_PX_PER_DAY = 8;
const MIN_TRACK_W = 640;

/** Số dự án tối đa vẽ trên timeline (giảm tải DOM). */
const MAX_TIMELINE_PROJECTS = 20;

type PersistShape = {
  labelWidth?: number;
  pixelsPerDay?: number;
  collapsed?: string[];
  viewMode?: ViewMode;
};

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, mo, da] = t.split("-").map(Number);
    const d = new Date(y, mo - 1, da);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function barFlatColor(project: Project): string {
  const t = project.type ?? "";
  if (TYPE_COLOR[t]) return TYPE_COLOR[t];
  const st = project.status ?? "";
  return STATUS_META[st]?.color ?? "#94a3b8";
}

/** Khoảng thời gian hiển thị: dữ liệu + padding; theo chế độ tuần/tháng/năm; mở rộng khi zoom (px/ngày nhỏ). */
function computeBounds(
  projects: Project[],
  viewMode: ViewMode,
  pixelsPerDay: number,
  /** Hai ngày hợp lệ → đầu/cuối timeline đúng theo người dùng (bỏ qua min span / zoom padding). */
  rangeOverride?: { start: Date; end: Date } | null,
) {
  if (rangeOverride) {
    let ts = startOfLocalDay(rangeOverride.start);
    let te = startOfLocalDay(rangeOverride.end);
    if (ts.getTime() > te.getTime()) {
      const x = ts;
      ts = te;
      te = x;
    }
    const totalDays = Math.max(1, daysBetween(ts, te));
    return { timelineStart: ts, timelineEnd: te, totalDays };
  }

  const today = startOfLocalDay(new Date());
  const dates = projects
    .flatMap((p) => [parseDate(p.start_date), parseDate(p.end_date)])
    .filter(Boolean) as Date[];
  let dataMin = dates.length ? startOfLocalDay(new Date(Math.min(...dates.map((d) => d.getTime())))) : today;
  let dataMax = dates.length ? startOfLocalDay(new Date(Math.max(...dates.map((d) => d.getTime())))) : today;
  if (dataMin > dataMax) [dataMin, dataMax] = [dataMax, dataMin];

  const pad = 7;
  let coreStart = addDays(dataMin, -pad);
  let coreEnd = addDays(dataMax, pad);

  const minSpan =
    viewMode === "week" ? 84 : viewMode === "month" ? 210 : viewMode === "year" ? 800 : 0;
  if (minSpan > 0) {
    const half = Math.floor(minSpan / 2);
    const ws = addDays(today, -half);
    const we = addDays(today, half);
    if (ws.getTime() < coreStart.getTime()) coreStart = ws;
    if (we.getTime() > coreEnd.getTime()) coreEnd = we;
  }

  const coreSpan = Math.max(1, daysBetween(coreStart, coreEnd));
  const zoomExpand = Math.max(1, DEFAULT_PX_PER_DAY / Math.max(MIN_PX_PER_DAY, pixelsPerDay));
  const extra = Math.round((coreSpan * (zoomExpand - 1)) / 2);
  const timelineStart = addDays(coreStart, -extra);
  const timelineEnd = addDays(coreEnd, extra);
  const totalDays = Math.max(1, daysBetween(timelineStart, timelineEnd));
  return { timelineStart, timelineEnd, totalDays };
}

function buildTicks(viewMode: ViewMode, timelineStart: Date, timelineEnd: Date, totalDays: number) {
  const ticks: { label: string; pct: number }[] = [];
  const pctAt = (d: Date) => (daysBetween(timelineStart, d) / totalDays) * 100;

  /** Mốc Tuần: mỗi ngày — nhãn chỉ số ngày (trong tháng). */
  if (viewMode === "week") {
    const cur = new Date(
      timelineStart.getFullYear(),
      timelineStart.getMonth(),
      timelineStart.getDate(),
    );
    while (cur <= timelineEnd) {
      const p = pctAt(cur);
      if (p >= -1 && p <= 101) {
        ticks.push({
          label: String(cur.getDate()),
          pct: p,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
  } else if (viewMode === "month") {
    /** Mốc Tháng: mỗi tuần (thứ Hai) — nhãn tuần + tháng. */
    const c = new Date(timelineStart);
    const dow = c.getDay();
    const deltaToMon = dow === 0 ? -6 : 1 - dow;
    c.setDate(c.getDate() + deltaToMon);
    while (c.getTime() < timelineStart.getTime()) c.setDate(c.getDate() + 7);
    while (c <= timelineEnd) {
      const p = pctAt(c);
      if (p >= -1 && p <= 101) {
        const sun = addDays(c, 6);
        const wFrom = `${String(c.getDate()).padStart(2, "0")}/${String(c.getMonth() + 1).padStart(2, "0")}`;
        const wTo = `${String(sun.getDate()).padStart(2, "0")}/${String(sun.getMonth() + 1).padStart(2, "0")}`;
        const monthBit = c.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" });
        ticks.push({
          label: `Tuần ${wFrom}–${wTo} · ${monthBit}`,
          pct: p,
        });
      }
      c.setDate(c.getDate() + 7);
    }
  } else if (viewMode === "year") {
    /** Mốc Năm: một tick mỗi tháng (mồng 1). */
    const c = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    while (c <= timelineEnd) {
      const p = pctAt(c);
      if (p >= -2 && p <= 101) {
        ticks.push({
          label: c.toLocaleDateString("vi-VN", { month: "long", year: "numeric" }),
          pct: p,
        });
      }
      c.setMonth(c.getMonth() + 1);
    }
  } else {
    const c = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    while (c <= timelineEnd) {
      const p = pctAt(c);
      if (p >= -1 && p <= 101) {
        ticks.push({
          label: c.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" }),
          pct: p,
        });
      }
      c.setMonth(c.getMonth() + 1);
    }
  }
  return ticks;
}

function Tooltip({ project, x, y }: { project: Project; x: number; y: number }) {
  const fill = barFlatColor(project);
  return (
    <div style={{ position: "fixed", left: x + 14, top: y - 6, zIndex: 100, pointerEvents: "none", maxWidth: 280 }}>
      <div
        style={{
          background: "#fff",
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: "12px 14px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
        }}
      >
        {project.type ? (
          <span
            style={{
              background: `${fill}18`,
              color: fill,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {project.type}
          </span>
        ) : null}
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.4, marginTop: 6 }}>
          {project.project_name}
        </div>
        {project.brief ? (
          <div
            style={{
              fontSize: 11,
              color: TEXT_MUTED,
              marginTop: 6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {htmlToPlainText(project.brief)}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: TEXT_MUTED }}>
          <span>▶ {formatDate(project.start_date)}</span>
          <span>⏹ {formatDate(project.end_date)}</span>
        </div>
      </div>
    </div>
  );
}

function detailSectionTitle(text: string) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: TEXT_MUTED,
        marginBottom: 6,
      }}
    >
      {text}
    </div>
  );
}

function metaLbl(text: string) {
  return (
    <span style={{ color: TEXT_MUTED, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{text}</span>
  );
}

function resolveStaffRich(id: number | null, staffNameById: StaffNameById): ReactNode {
  if (id == null) return "—";
  const name = staffNameById[String(id)];
  if (!name) return `ID ${id}`;
  return (
    <>
      <span style={{ fontWeight: 600 }}>{name}</span>
      <span style={{ color: TEXT_MUTED, fontWeight: 500, fontSize: 11, marginLeft: 4 }}>#{id}</span>
    </>
  );
}

function staffInitialFromName(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

/** Một dòng người làm: avatar + tên (không hiển thị #id). */
function StaffAssigneeFace({
  staffId,
  staffNameById,
  staffAvatarById,
}: {
  staffId: number;
  staffNameById: StaffNameById;
  staffAvatarById: StaffAvatarById;
}) {
  const name = staffNameById[String(staffId)] ?? "";
  const label = name.replace(/\s*#\d+\s*$/u, "").trim() || name || "Nhân sự";
  const url = (staffAvatarById[String(staffId)] ?? "").trim() || null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          overflow: "hidden",
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${BORDER}`,
          background: url ? "#fff" : "linear-gradient(135deg, #f8a668, #ee5b9f)",
          fontSize: 11,
          fontWeight: 800,
          color: "#fff",
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL Cloudflare động
          <img src={url} alt="" width={28} height={28} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span aria-hidden>{staffInitialFromName(label)}</span>
        )}
      </span>
      <span style={{ fontWeight: 600, fontSize: 12, color: TEXT, lineHeight: 1.4 }}>{label}</span>
    </span>
  );
}

function resolveStaffIdsRich(
  ids: number[] | null | undefined,
  staffNameById: StaffNameById,
  staffAvatarById: StaffAvatarById,
): ReactNode {
  if (!ids?.length) return "—";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ids.map((id) => (
        <div key={id} style={{ display: "flex", alignItems: "center" }}>
          <StaffAssigneeFace staffId={id} staffNameById={staffNameById} staffAvatarById={staffAvatarById} />
        </div>
      ))}
    </div>
  );
}

function typePill(text: string) {
  const c = TYPE_COLOR[text] ?? "#64748b";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        background: `${c}18`,
        color: c,
      }}
    >
      {text}
    </span>
  );
}

function statusPill(status: string | null) {
  const m = STATUS_META[status ?? ""] ?? { label: status ?? "—", color: "#64748b" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        background: `${m.color}16`,
        color: m.color,
      }}
    >
      {m.label}
    </span>
  );
}

/** Số ngày từ đầu hôm nay (local) đến hết ngày kết thúc — dùng trong modal chi tiết. */
function remainingDaysLabel(endDateStr: string | null): string {
  const end = parseDate(endDateStr);
  if (!end) return "—";
  const today = startOfLocalDay(new Date());
  const endDay = startOfLocalDay(end);
  const n = daysBetween(today, endDay);
  if (n > 0) return `Còn ${n} ngày`;
  if (n === 0) return "Hôm nay";
  return `Quá hạn ${-n} ngày`;
}

/** Chuẩn hóa từ DB / ISO → `YYYY-MM-DD` (nội bộ). */
function projectDateToYmdInput(s: string | null): string {
  if (!s) return "";
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  return ymd(startOfLocalDay(d));
}

/** `YYYY-MM-DD` → `dd/mm/yy` (ô nhập trong modal). */
function ymdIsoToDdMmYy(ymdIso: string): string {
  const t = ymdIso.trim();
  if (!t) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return "";
  const y = Number(t.slice(0, 4));
  const mo = t.slice(5, 7);
  const d = t.slice(8, 10);
  if (!Number.isFinite(y)) return "";
  const yy = String(y % 100).padStart(2, "0");
  return `${d}/${mo}/${yy}`;
}

/** `dd/mm/yy` hoặc `dd/mm/yyyy` → `YYYY-MM-DD` hoặc null. Năm 2 chữ số: 70–99 → 19xx, còn lại → 20xx. */
function parseDdMmYyToYmd(s: string): string | null {
  const raw = s.trim();
  if (!raw) return null;
  const m4 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  const m2 = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(raw);
  const m = m4 ?? m2;
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y)) return null;
  if (m2) y = y >= 70 ? 1900 + y : 2000 + y;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Khi blur: chấp nhận dán `YYYY-MM-DD` và chuẩn hóa về `dd/mm/yy`. */
function normalizeDateDisplayAfterBlur(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return ymdIsoToDdMmYy(t.slice(0, 10));
  const ymd = parseDdMmYyToYmd(t);
  return ymd ? ymdIsoToDdMmYy(ymd) : raw;
}

const DATE_IN: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
  fontSize: 12,
  fontWeight: 600,
  color: TEXT,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  background: "#fff",
};

const SELECT_IN: React.CSSProperties = { ...DATE_IN, cursor: "pointer", fontWeight: 600 };

const TEXT_IN: React.CSSProperties = { ...DATE_IN, fontWeight: 600 };

const TEXTAREA_IN: React.CSSProperties = {
  ...DATE_IN,
  minHeight: 88,
  resize: "vertical" as const,
  lineHeight: 1.45,
  fontWeight: 500,
};

function coerceMediaStatusLabel(s: string | null | undefined): string {
  const t = (s ?? "").trim();
  if ((MKT_MEDIA_STATUS_OPTIONS as readonly string[]).includes(t)) return t;
  return "Chờ xác nhận";
}

function ProjectDetailModal({
  project,
  staffNameById,
  staffAvatarById,
  mediaTeamStaff,
  onClose,
  onSaved,
}: {
  project: Project;
  staffNameById: StaffNameById;
  staffAvatarById: StaffAvatarById;
  mediaTeamStaff: HrNhanSuStaffOption[];
  onClose: () => void;
  onSaved: (p: Project) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [startDdMmYy, setStartDdMmYy] = useState(() =>
    ymdIsoToDdMmYy(projectDateToYmdInput(project.start_date)),
  );
  const [endDdMmYy, setEndDdMmYy] = useState(() => ymdIsoToDdMmYy(projectDateToYmdInput(project.end_date)));
  const [lamSet, setLamSet] = useState<Set<number>>(() => new Set(project.nguoi_lam ?? []));
  const [projectName, setProjectName] = useState(() => project.project_name || "");
  const [projectType, setProjectType] = useState(() => project.project_type?.trim() ?? "");
  const [typeVal, setTypeVal] = useState(() => project.type?.trim() ?? "");
  const [statusVal, setStatusVal] = useState(() => coerceMediaStatusLabel(project.status));
  const [briefDraft, setBriefDraft] = useState(() => project.brief ?? "");
  const [minhHoaSlots, setMinhHoaSlots] = useState<MinhHoaUploadSlot[]>(() =>
    slotsFromMinhHoaUrls(project.minh_hoa),
  );
  const [nguoiTao, setNguoiTao] = useState<number | null>(() => project.nguoi_tao ?? null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [savePending, startSaveTransition] = useTransition();

  useEffect(() => {
    setStartDdMmYy(ymdIsoToDdMmYy(projectDateToYmdInput(project.start_date)));
    setEndDdMmYy(ymdIsoToDdMmYy(projectDateToYmdInput(project.end_date)));
    setLamSet(new Set(project.nguoi_lam ?? []));
    setProjectName(project.project_name || "");
    setProjectType(project.project_type?.trim() ?? "");
    setTypeVal(project.type?.trim() ?? "");
    setStatusVal(coerceMediaStatusLabel(project.status));
    setBriefDraft(project.brief ?? "");
    setMinhHoaSlots(slotsFromMinhHoaUrls(project.minh_hoa));
    setNguoiTao(project.nguoi_tao ?? mediaTeamStaff[0]?.id ?? null);
    setFormErr(null);
  }, [
    project.id,
    project.start_date,
    project.end_date,
    project.nguoi_lam,
    project.project_name,
    project.project_type,
    project.type,
    project.status,
    project.brief,
    project.minh_hoa,
    project.nguoi_tao,
    mediaTeamStaff,
  ]);

  useEffect(() => {
    setEditing(false);
  }, [project.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editing) {
        e.preventDefault();
        setStartDdMmYy(ymdIsoToDdMmYy(projectDateToYmdInput(project.start_date)));
        setEndDdMmYy(ymdIsoToDdMmYy(projectDateToYmdInput(project.end_date)));
        setLamSet(new Set(project.nguoi_lam ?? []));
        setProjectName(project.project_name || "");
        setProjectType(project.project_type?.trim() ?? "");
        setTypeVal(project.type?.trim() ?? "");
        setStatusVal(coerceMediaStatusLabel(project.status));
        setBriefDraft(project.brief ?? "");
        setMinhHoaSlots(slotsFromMinhHoaUrls(project.minh_hoa));
        setNguoiTao(project.nguoi_tao ?? mediaTeamStaff[0]?.id ?? null);
        setFormErr(null);
        setEditing(false);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    onClose,
    editing,
    project.start_date,
    project.end_date,
    project.nguoi_lam,
    project.project_name,
    project.project_type,
    project.type,
    project.status,
    project.brief,
    project.minh_hoa,
    project.nguoi_tao,
    mediaTeamStaff,
  ]);

  const cancelEdit = () => {
    setStartDdMmYy(ymdIsoToDdMmYy(projectDateToYmdInput(project.start_date)));
    setEndDdMmYy(ymdIsoToDdMmYy(projectDateToYmdInput(project.end_date)));
    setLamSet(new Set(project.nguoi_lam ?? []));
    setProjectName(project.project_name || "");
    setProjectType(project.project_type?.trim() ?? "");
    setTypeVal(project.type?.trim() ?? "");
    setStatusVal(coerceMediaStatusLabel(project.status));
    setBriefDraft(project.brief ?? "");
    setMinhHoaSlots(slotsFromMinhHoaUrls(project.minh_hoa));
    setNguoiTao(project.nguoi_tao ?? mediaTeamStaff[0]?.id ?? null);
    setFormErr(null);
    setEditing(false);
  };

  const staffPickOptions = useMemo(() => {
    const m = new Map<number, HrNhanSuStaffOption>();
    for (const s of mediaTeamStaff) m.set(s.id, s);
    for (const id of project.nguoi_lam ?? []) {
      if (!m.has(id)) {
        m.set(id, {
          id,
          full_name: `${staffNameById[String(id)] ?? `Nhân sự #${id}`} (đã gán trước — ngoài Marketing/Media)`,
        });
      }
    }
    return [...m.values()].sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
  }, [mediaTeamStaff, project.nguoi_lam, staffNameById]);

  const creatorPickOptions = useMemo(() => {
    const m = new Map<number, HrNhanSuStaffOption>();
    for (const s of mediaTeamStaff) m.set(s.id, s);
    const tid = project.nguoi_tao;
    if (tid && !m.has(tid)) {
      m.set(tid, {
        id: tid,
        full_name: `${staffNameById[String(tid)] ?? `Nhân sự #${tid}`} (người tạo — ngoài Marketing/Media)`,
      });
    }
    return [...m.values()].sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
  }, [mediaTeamStaff, project.nguoi_tao, staffNameById]);

  const imgs = (project.minh_hoa ?? []).filter(Boolean);

  const toggleLam = (id: number) => {
    setLamSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSave = () => {
    if (!editing) return;
    setFormErr(null);
    if (!projectName.trim()) {
      setFormErr("Nhập tên dự án.");
      return;
    }
    const startYmd = parseDdMmYyToYmd(startDdMmYy);
    const endYmd = parseDdMmYyToYmd(endDdMmYy);
    if (!startYmd || !endYmd) {
      setFormErr("Nhập đủ ngày hợp lệ (định dạng dd/mm/yy).");
      return;
    }
    const ds = parseDate(startYmd);
    const de = parseDate(endYmd);
    if (ds && de && de.getTime() < ds.getTime()) {
      setFormErr("Ngày kết thúc phải sau hoặc trùng ngày bắt đầu.");
      return;
    }
    if (minhHoaSlots.some((s) => s.uploading)) {
      setFormErr("Đợi ảnh minh họa tải xong rồi mới lưu.");
      return;
    }
    if (minhHoaSlots.some((s) => s.error && !s.url)) {
      setFormErr("Có ảnh minh họa lỗi — xóa ảnh lỗi hoặc tải lại.");
      return;
    }
    const minh_hoa = minhHoaUrlsFromSlots(minhHoaSlots);
    startSaveTransition(async () => {
      const res = await updateMktMediaProjectDetail(project.id, {
        project_name: projectName.trim(),
        project_type: projectType.trim() || null,
        type: typeVal.trim() || null,
        status: statusVal,
        brief: briefDraft.trim() || null,
        minh_hoa,
        nguoi_tao: nguoiTao,
        start_date: startYmd,
        end_date: endYmd,
        nguoi_lam_ids: [...lamSet],
      });
      if (!res.ok) {
        setFormErr(res.error);
        return;
      }
      const nextLam = lamSet.size ? [...lamSet].sort((a, b) => a - b) : null;
      const briefNext = briefDraft.trim() ? sanitizeAdminRichHtml(briefDraft) : null;
      onSaved({
        ...project,
        project_name: projectName.trim(),
        project_type: projectType.trim() || null,
        type: typeVal.trim() || null,
        status: statusVal,
        brief: briefNext,
        minh_hoa: minh_hoa.length ? minh_hoa : null,
        nguoi_tao: nguoiTao,
        start_date: startYmd,
        end_date: endYmd,
        nguoi_lam: nextLam,
      });
      setEditing(false);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="media-detail-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(15,15,18,0.5)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 100%)",
          maxHeight: "min(90vh, 720px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#fff",
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            position: "relative",
            flexShrink: 0,
            padding: "12px 108px 12px 14px",
            background: "linear-gradient(180deg, #eceeee 0%, #f5f6f6 38%, #fafbfb 100%)",
            borderBottom: `1px solid ${BORDER}`,
            color: TEXT,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "#fff",
                  background: "linear-gradient(135deg, #f8a668, #ee5ca2)",
                  boxShadow: "0 2px 8px rgba(238,92,162,0.25)",
                }}
              >
                Sửa
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `1px solid ${BORDER}`,
                background: "#fff",
                color: TEXT_MUTED,
                fontSize: 18,
                lineHeight: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#f3f3f3";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#fff";
              }}
            >
              ×
            </button>
          </div>
          <p
            id="media-detail-title"
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: TEXT_MUTED,
            }}
          >
            Chi tiết dự án media
          </p>
          {editing ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Tên dự án"
              style={{
                ...TEXT_IN,
                marginTop: 6,
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            />
          ) : (
            <h2
              style={{
                margin: "6px 0 0",
                fontSize: 18,
                fontWeight: 800,
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
                color: TEXT,
              }}
            >
              {project.project_name || "—"}
            </h2>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#fff",
                border: `1px solid ${BORDER}`,
                color: TEXT_MUTED,
              }}
            >
              ID {project.id}
            </span>
            {!editing && project.project_type ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "#fff",
                  border: `1px solid ${BORDER}`,
                  color: TEXT,
                }}
              >
                {project.project_type}
              </span>
            ) : null}
            {!editing && project.type ? typePill(project.type) : null}
            {!editing ? statusPill(project.status) : null}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 14px 14px", background: "#fafafa" }}>
          <div
            style={{
              background: "#fff",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "8px 10px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "max-content 1fr max-content 1fr",
                columnGap: 10,
                rowGap: 5,
                alignItems: "baseline",
              }}
            >
              {metaLbl("Định dạng")}
              <div style={{ minWidth: 0 }}>
                {editing ? (
                  <select value={typeVal} onChange={(e) => setTypeVal(e.target.value)} style={SELECT_IN}>
                    <option value="">—</option>
                    {MKT_MEDIA_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : project.type ? (
                  typePill(project.type)
                ) : (
                  "—"
                )}
              </div>
              {metaLbl("Loại dự án")}
              <div style={{ minWidth: 0, wordBreak: "break-word" }}>
                {editing ? (
                  <input
                    type="text"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    placeholder="VD: Sine Art"
                    style={TEXT_IN}
                  />
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{project.project_type || "—"}</span>
                )}
              </div>

              {metaLbl("Trạng thái")}
              <div style={{ gridColumn: "2 / -1", minWidth: 0 }}>
                {editing ? (
                  <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} style={SELECT_IN}>
                    {MKT_MEDIA_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  statusPill(project.status)
                )}
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  marginTop: 2,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "#f3f5f5",
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: TEXT_MUTED,
                    marginBottom: 6,
                  }}
                >
                  Thời gian dự án
                </div>
                {editing ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px 12px",
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4 }}>Bắt đầu</div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="dd/mm/yy"
                        value={startDdMmYy}
                        onChange={(e) => setStartDdMmYy(e.target.value)}
                        onBlur={() => setStartDdMmYy((v) => normalizeDateDisplayAfterBlur(v))}
                        style={DATE_IN}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4 }}>Kết thúc</div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="dd/mm/yy"
                        value={endDdMmYy}
                        onChange={(e) => setEndDdMmYy(e.target.value)}
                        onBlur={() => setEndDdMmYy((v) => normalizeDateDisplayAfterBlur(v))}
                        style={DATE_IN}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px 12px",
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4 }}>Bắt đầu</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{formatDate(project.start_date)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4 }}>Kết thúc</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{formatDate(project.end_date)}</div>
                    </div>
                  </div>
                )}
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: `1px dashed ${BORDER}`,
                    fontSize: 12,
                    fontWeight: 600,
                    color: TEXT,
                  }}
                >
                  <span style={{ color: TEXT_MUTED, fontWeight: 600, marginRight: 8 }}>Số ngày còn lại</span>
                  {remainingDaysLabel(editing ? parseDdMmYyToYmd(endDdMmYy) : project.end_date)}
                </div>
              </div>

              {metaLbl("Người tạo")}
              <div style={{ gridColumn: "2 / -1", minWidth: 0 }}>
                {editing ? (
                  <select
                    value={nguoiTao != null ? String(nguoiTao) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNguoiTao(v === "" ? null : Number(v));
                    }}
                    style={SELECT_IN}
                  >
                    {creatorPickOptions.length === 0 ? (
                      <option value="">—</option>
                    ) : null}
                    {creatorPickOptions.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: 12, color: TEXT }}>{resolveStaffRich(project.nguoi_tao, staffNameById)}</span>
                )}
              </div>

              {metaLbl("Người làm")}
              <div style={{ gridColumn: "2 / -1", minWidth: 0 }}>
                {editing ? (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6, lineHeight: 1.4 }}>
                      Chọn từ ban Marketing / Media. Người đã gán trước (ngoài ban) vẫn hiện để bỏ chọn nếu cần.
                    </div>
                    <div
                      style={{
                        maxHeight: 160,
                        overflow: "auto",
                        border: `1px solid ${BORDER}`,
                        borderRadius: 8,
                        padding: "8px 10px",
                        background: "#fff",
                      }}
                    >
                      {staffPickOptions.length === 0 ? (
                        <span style={{ fontSize: 12, color: TEXT_MUTED }}>Chưa có danh sách nhân sự.</span>
                      ) : (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {staffPickOptions.map((s) => (
                            <li key={s.id} style={{ marginBottom: 6 }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  color: TEXT,
                                  minWidth: 0,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={lamSet.has(s.id)}
                                  onChange={() => toggleLam(s.id)}
                                  style={{ width: 14, height: 14, flexShrink: 0 }}
                                />
                                <StaffAssigneeFace
                                  staffId={s.id}
                                  staffNameById={{
                                    ...staffNameById,
                                    [String(s.id)]: s.full_name,
                                  }}
                                  staffAvatarById={staffAvatarById}
                                />
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.5 }}>
                    {resolveStaffIdsRich(project.nguoi_lam, staffNameById, staffAvatarById)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            {detailSectionTitle("Brief")}
            {editing ? (
              <>
                <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, color: TEXT_MUTED, lineHeight: 1.4 }}>
                  HTML được lọc khi lưu (script/style bị loại).
                </p>
                <textarea
                  value={briefDraft}
                  onChange={(e) => setBriefDraft(e.target.value)}
                  rows={8}
                  style={{ ...TEXTAREA_IN, width: "100%", minHeight: 140 }}
                />
              </>
            ) : project.brief?.trim() ? (
              <div
                className="[&_a]:text-blue-600 [&_a]:underline [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "#fff",
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: TEXT,
                  wordBreak: "break-word",
                }}
                // eslint-disable-next-line react/no-danger -- HTML brief đã qua sanitize nội bộ admin
                dangerouslySetInnerHTML={{ __html: sanitizeAdminRichHtml(project.brief) }}
              />
            ) : (
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "#fff",
                  fontSize: 13,
                  color: TEXT_MUTED,
                }}
              >
                Chưa có brief.
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            {detailSectionTitle("Minh họa")}
            {editing ? (
              <AdminMinhHoaDropzone slots={minhHoaSlots} setSlots={setMinhHoaSlots} />
            ) : null}
            {!editing && !imgs.length ? (
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "#fff",
                  fontSize: 13,
                  color: TEXT_MUTED,
                }}
              >
                Chưa có minh họa.
              </div>
            ) : null}
            {!editing && imgs.length ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
                  gap: 8,
                }}
              >
                {imgs.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: `1px solid ${BORDER}`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.02)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
                    }}
                  >
                    <img
                      src={url}
                      alt="Minh họa dự án"
                      style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                    />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {formErr ? (
            <div
              style={{
                marginTop: 10,
                borderRadius: 10,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                padding: "10px 12px",
                fontSize: 12,
                color: "#991b1b",
              }}
            >
              {formErr}
            </div>
          ) : null}

          {editing ? (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                disabled={savePending}
                onClick={onSave}
                style={{
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: savePending ? "wait" : "pointer",
                  color: "#fff",
                  background: "linear-gradient(135deg, #f8a668, #ee5ca2)",
                  opacity: savePending ? 0.75 : 1,
                }}
              >
                {savePending ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
              <button
                type="button"
                disabled={savePending}
                onClick={cancelEdit}
                style={{
                  ...BTN,
                  padding: "7px 16px",
                  fontWeight: 700,
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savePending}
                onClick={onClose}
                style={{
                  ...BTN,
                  padding: "7px 16px",
                  fontWeight: 700,
                }}
              >
                Đóng
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TimelineBar({
  project,
  timelineStart,
  totalDays,
  trackPx,
  onOpenDetail,
}: {
  project: Project;
  timelineStart: Date;
  totalDays: number;
  trackPx: number;
  onOpenDetail?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const start = parseDate(project.start_date);
  const end = parseDate(project.end_date);
  const startIdx = start ? Math.max(0, Math.min(totalDays, daysBetween(timelineStart, start))) : 0;
  const endInclusive = end
    ? Math.max(startIdx, Math.min(totalDays, daysBetween(timelineStart, end)))
    : startIdx;

  const widthDays = Math.max(1, endInclusive - startIdx + 1);
  const leftPx = (startIdx / totalDays) * trackPx;
  const widthPx = (widthDays / totalDays) * trackPx;

  const fill = barFlatColor(project);
  const borderColor = "rgba(0,0,0,0.14)";

  return (
    <>
      <div
        onMouseEnter={(ev) => {
          setHover(true);
          setMouse({ x: ev.clientX, y: ev.clientY });
        }}
        onMouseMove={(ev) => setMouse({ x: ev.clientX, y: ev.clientY })}
        onMouseLeave={() => setHover(false)}
        style={{
          height: 36,
          position: "relative",
          borderBottom: `1px solid ${BORDER}`,
          padding: "4px 0",
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenDetail?.();
            }
          }}
          style={{
            position: "absolute",
            left: leftPx,
            width: Math.max(8, widthPx),
            height: 28,
            top: "50%",
            transform: "translateY(-50%)",
            borderRadius: 6,
            background: fill,
            border: `1px solid ${borderColor}`,
            boxShadow: hover ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            cursor: "default",
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenDetail?.();
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              paddingLeft: 10,
              paddingRight: 10,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textShadow: "0 1px 2px rgba(0,0,0,0.25)",
              pointerEvents: "none",
            }}
          >
            {project.project_name}
          </span>
        </div>
      </div>
      {hover ? <Tooltip project={project} x={mouse.x} y={mouse.y} /> : null}
    </>
  );
}

const BTN: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: "#fff",
  color: TEXT,
  cursor: "pointer",
};

/** Cuộn vẫn hoạt động; thanh cuộn ẩn (đồng bộ cột nhãn ↔ track). */
const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0";

export default function MediaTimeline({
  initialProjects,
  staffNameById = {},
  staffAvatarById = {},
  mediaTeamStaff = [],
  mediaBanStaffFilter = [],
}: MediaTimelineProps) {
  const [localProjects, setLocalProjects] = useState<Project[]>(initialProjects);
  const [filterLamId, setFilterLamId] = useState<number | "">("");
  /** Lọc theo `project.status` (nhiều mục: giữ Shift + bấm); rỗng = tất cả. */
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  /** `YYYY-MM-DD` — cả hai hợp lệ thì timeline scale theo khoảng này. */
  const [rangeStartStr, setRangeStartStr] = useState("");
  const [rangeEndStr, setRangeEndStr] = useState("");
  const [labelWidth, setLabelWidth] = useState(DEFAULT_LABEL_W);
  const [pixelsPerDay, setPixelsPerDay] = useState(DEFAULT_PX_PER_DAY);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  const trackScrollRef = useRef<HTMLDivElement>(null);
  const labelScrollRef = useRef<HTMLDivElement>(null);
  const scrollSyncLockRef = useRef(false);
  const labelResize = useRef<{ startX: number; startW: number } | null>(null);
  const zoomFromWheelRef = useRef(false);
  const wheelViewportAnchorRef = useRef(0);

  useEffect(() => {
    setLocalProjects(initialProjects);
  }, [initialProjects]);

  const poolAfterAssignee = useMemo(() => {
    if (filterLamId === "") return localProjects;
    return localProjects.filter((p) => (p.nguoi_lam ?? []).includes(filterLamId));
  }, [localProjects, filterLamId]);

  const statusCounts = useMemo(() => {
    const o: Record<string, number> = {};
    for (const s of STATUS_ORDER) o[s] = 0;
    for (const p of poolAfterAssignee) {
      const st = p.status ?? "";
      if (st in o) o[st]++;
    }
    return o;
  }, [poolAfterAssignee]);

  const visibleProjects = useMemo(() => {
    let list = poolAfterAssignee;
    if (filterStatuses.length > 0) {
      const want = new Set(filterStatuses.filter((s) => STATUS_ORDER.includes(s)));
      if (want.size > 0) list = list.filter((p) => want.has(p.status ?? ""));
    }
    const sorted = [...list].sort((a, b) => {
      const da = parseDate(a.start_date)?.getTime() ?? 0;
      const db = parseDate(b.start_date)?.getTime() ?? 0;
      if (da !== db) return da - db;
      return a.id - b.id;
    });
    return sorted.slice(0, MAX_TIMELINE_PROJECTS);
  }, [poolAfterAssignee, filterStatuses]);

  const customTimelineRange = useMemo(() => {
    const a = parseDate(rangeStartStr.trim() || null);
    const b = parseDate(rangeEndStr.trim() || null);
    if (!a || !b) return null;
    return { start: a, end: b };
  }, [rangeStartStr, rangeEndStr]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      if (!raw) {
        setHydrated(true);
        return;
      }
      const p = JSON.parse(raw) as PersistShape;
      if (typeof p.labelWidth === "number") {
        setLabelWidth(Math.min(MAX_LABEL_W, Math.max(MIN_LABEL_W, Math.round(p.labelWidth))));
      }
      if (typeof p.pixelsPerDay === "number") {
        setPixelsPerDay(Math.min(MAX_PX_PER_DAY, Math.max(MIN_PX_PER_DAY, p.pixelsPerDay)));
      }
      if (Array.isArray(p.collapsed)) {
        setCollapsed(new Set(p.collapsed.filter((x) => STATUS_ORDER.includes(x))));
      }
      if (p.viewMode === "week" || p.viewMode === "month" || p.viewMode === "year" || p.viewMode === "data") {
        setViewMode(p.viewMode);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const payload: PersistShape = {
      labelWidth,
      pixelsPerDay,
      collapsed: [...collapsed],
      viewMode,
    };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [labelWidth, pixelsPerDay, collapsed, viewMode, hydrated]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!labelResize.current) return;
      const dx = e.clientX - labelResize.current.startX;
      setLabelWidth(
        Math.min(MAX_LABEL_W, Math.max(MIN_LABEL_W, Math.round(labelResize.current.startW + dx))),
      );
    };
    const onUp = () => {
      labelResize.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const bounds = useMemo(
    () => computeBounds(visibleProjects, viewMode, pixelsPerDay, customTimelineRange),
    [visibleProjects, viewMode, pixelsPerDay, customTimelineRange],
  );
  const { timelineStart, timelineEnd, totalDays } = bounds;
  const trackPx = Math.max(MIN_TRACK_W, Math.round(totalDays * pixelsPerDay));

  const monthTicks = useMemo(
    () => buildTicks(viewMode, timelineStart, timelineEnd, totalDays),
    [viewMode, timelineStart, timelineEnd, totalDays],
  );

  const today = startOfLocalDay(new Date());
  const todayOff = Math.max(0, Math.min(totalDays, daysBetween(timelineStart, today)));
  const todayPct = totalDays > 0 ? (todayOff / totalDays) * 100 : 50;
  const showToday = todayPct >= 0 && todayPct <= 100;

  const grouped = useMemo(() => {
    return STATUS_ORDER.reduce<Record<string, Project[]>>((acc, s) => {
      acc[s] = visibleProjects.filter((p) => p.status === s);
      return acc;
    }, {});
  }, [visibleProjects]);

  useLayoutEffect(() => {
    if (!zoomFromWheelRef.current) return;
    zoomFromWheelRef.current = false;
    const sc = trackScrollRef.current;
    if (!sc) return;
    const b = computeBounds(visibleProjects, viewMode, pixelsPerDay, customTimelineRange);
    const tp = Math.max(MIN_TRACK_W, b.totalDays * pixelsPerDay);
    const off = Math.max(0, Math.min(b.totalDays, daysBetween(b.timelineStart, startOfLocalDay(new Date()))));
    const todayX = b.totalDays > 0 ? (off / b.totalDays) * tp : 0;
    const newScroll = todayX - wheelViewportAnchorRef.current;
    const maxScroll = Math.max(0, sc.scrollWidth - sc.clientWidth);
    sc.scrollLeft = Math.max(0, Math.min(newScroll, maxScroll));
  }, [pixelsPerDay, viewMode, visibleProjects, customTimelineRange]);

  useEffect(() => {
    const el = trackScrollRef.current;
    if (!el) return;
    const fn = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      const sc = trackScrollRef.current;
      if (!sc) return;
      const dir = e.deltaY > 0 ? -1 : 1;
      const raw = Math.abs(e.deltaY);
      const step = Math.min(22, Math.max(8, Math.round(raw / 25)));
      const oldPpd = pixelsPerDay;
      const newPpd = Math.min(MAX_PX_PER_DAY, Math.max(MIN_PX_PER_DAY, oldPpd + dir * step));
      if (newPpd === oldPpd) return;

      const bOld = computeBounds(visibleProjects, viewMode, oldPpd, customTimelineRange);
      const oldTrackPx = Math.max(MIN_TRACK_W, bOld.totalDays * oldPpd);
      const offOld = Math.max(0, Math.min(bOld.totalDays, daysBetween(bOld.timelineStart, startOfLocalDay(new Date()))));
      const oldTodayX = bOld.totalDays > 0 ? (offOld / bOld.totalDays) * oldTrackPx : 0;
      wheelViewportAnchorRef.current = oldTodayX - sc.scrollLeft;
      zoomFromWheelRef.current = true;
      setPixelsPerDay(newPpd);
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [pixelsPerDay, viewMode, visibleProjects, customTimelineRange]);

  const scrollTodayCenter = useCallback(() => {
    const sc = trackScrollRef.current;
    if (!sc) return;
    const b = computeBounds(visibleProjects, viewMode, pixelsPerDay, customTimelineRange);
    const tp = Math.max(MIN_TRACK_W, b.totalDays * pixelsPerDay);
    const off = Math.max(0, Math.min(b.totalDays, daysBetween(b.timelineStart, startOfLocalDay(new Date()))));
    const todayX = b.totalDays > 0 ? (off / b.totalDays) * tp : 0;
    const vw = sc.clientWidth;
    const maxScroll = Math.max(0, sc.scrollWidth - sc.clientWidth);
    sc.scrollLeft = Math.max(0, Math.min(todayX - vw / 2, maxScroll));
  }, [visibleProjects, viewMode, pixelsPerDay, customTimelineRange]);

  const onLabelScrollSync = useCallback(() => {
    const label = labelScrollRef.current;
    const track = trackScrollRef.current;
    if (!label || !track || scrollSyncLockRef.current) return;
    if (track.scrollTop === label.scrollTop) return;
    scrollSyncLockRef.current = true;
    track.scrollTop = label.scrollTop;
    requestAnimationFrame(() => {
      scrollSyncLockRef.current = false;
    });
  }, []);

  const onTrackScrollSync = useCallback(() => {
    const label = labelScrollRef.current;
    const track = trackScrollRef.current;
    if (!label || !track || scrollSyncLockRef.current) return;
    if (label.scrollTop === track.scrollTop) return;
    scrollSyncLockRef.current = true;
    label.scrollTop = track.scrollTop;
    requestAnimationFrame(() => {
      scrollSyncLockRef.current = false;
    });
  }, []);

  const ROW_H = 36;
  const GROUP_H = 28;
  const HEADER_ROW = 32;

  const toggleCollapse = (status: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const startLabelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    labelResize.current = { startX: e.clientX, startW: labelWidth };
  };

  const modeBtn = (active: boolean): React.CSSProperties => ({
    ...BTN,
    background: active ? "linear-gradient(135deg,#F8A568,#EE5CA2)" : "#fff",
    color: active ? "#fff" : TEXT,
    border: active ? "none" : `1px solid ${BORDER}`,
  });

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        background: "#fff",
        color: TEXT,
        borderRadius: 16,
        overflow: "visible",
        border: `1px solid ${BORDER}`,
        minHeight: "max(360px, calc(100dvh - 10.5rem))",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          padding: "16px 20px 12px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: HEADER_BG,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>
              Media timeline
            </h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TEXT_MUTED }}>
              <span style={{ whiteSpace: "nowrap" }}>Người làm (ban Media):</span>
              <select
                value={filterLamId === "" ? "" : String(filterLamId)}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterLamId(v === "" ? "" : Number(v));
                }}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: TEXT,
                  padding: "5px 8px",
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: "#fff",
                  minWidth: 160,
                  maxWidth: 220,
                }}
              >
                <option value="">Tất cả</option>
                {mediaBanStaffFilter.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.full_name} #{s.id}
                  </option>
                ))}
              </select>
            </label>
            <span style={{ fontSize: 11, color: TEXT_MUTED, marginRight: 4 }}>Đơn vị:</span>
            {(
              [
                ["week", "Tuần"],
                ["month", "Tháng"],
                ["year", "Năm"],
                ["data", "Dữ liệu"],
              ] as const
            ).map(([m, lab]) => (
              <button
                key={m}
                type="button"
                style={modeBtn(viewMode === m)}
                onClick={() => setViewMode(m)}
              >
                {lab}
              </button>
            ))}
            <button
              type="button"
              style={{
                ...BTN,
                marginLeft: 4,
                borderColor: "#F8A568",
                color: "#c2410c",
                fontWeight: 700,
              }}
              onClick={scrollTodayCenter}
            >
              Hôm nay
            </button>
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                color: TEXT_MUTED,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              Từ
              <input
                type="date"
                value={rangeStartStr}
                onChange={(e) => setRangeStartStr(e.target.value)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: TEXT,
                  padding: "4px 6px",
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: "#fff",
                }}
              />
              đến
              <input
                type="date"
                value={rangeEndStr}
                onChange={(e) => setRangeEndStr(e.target.value)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: TEXT,
                  padding: "4px 6px",
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: "#fff",
                }}
              />
              {(rangeStartStr || rangeEndStr) && (
                <button
                  type="button"
                  style={{ ...BTN, fontSize: 11, padding: "4px 8px" }}
                  onClick={() => {
                    setRangeStartStr("");
                    setRangeEndStr("");
                  }}
                >
                  Theo dữ liệu
                </button>
              )}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>Trạng thái:</span>
          <span style={{ fontSize: 10, color: "#aaa", fontWeight: 500 }}>(Shift + bấm: chọn nhiều)</span>
          {STATUS_ORDER.map((s) => {
            const m = STATUS_META[s];
            const count = statusCounts[s] ?? 0;
            const active = filterStatuses.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  if (e.shiftKey) {
                    setFilterStatuses((prev) => {
                      if (prev.includes(s)) return prev.filter((x) => x !== s);
                      return [...prev, s];
                    });
                  } else {
                    setFilterStatuses((prev) => {
                      if (prev.length === 1 && prev[0] === s) return [];
                      return [s];
                    });
                  }
                }}
                title={
                  active
                    ? "Bấm: chỉ còn mục này rồi bỏ lọc · Shift+bấm: bật/tắt thêm mục"
                    : "Bấm: lọc một trạng thái · Shift+bấm: thêm vào lọc nhiều trạng thái"
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: active ? TEXT : TEXT_MUTED,
                  fontWeight: active ? 700 : 500,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: active ? `1px solid ${m.color}` : `1px solid ${BORDER}`,
                  background: active ? `${m.color}14` : "#fff",
                  cursor: "pointer",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, display: "inline-block" }} />
                {m.label}
                <span style={{ color: active ? m.color : "#bbb" }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {toast ? (
        <div
          style={{
            padding: "10px 16px",
            fontSize: 12,
            color: "#b45309",
            background: "#fffbeb",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          {toast}
        </div>
      ) : null}

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div
          ref={labelScrollRef}
          onScroll={onLabelScrollSync}
          className={SCROLL_HIDE}
          style={{
            width: labelWidth,
            minWidth: labelWidth,
            flexShrink: 0,
            borderRight: `2px solid ${BORDER}`,
            position: "relative",
            overflow: "auto",
            background: "#fff",
          }}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={startLabelResize}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 6,
              cursor: "col-resize",
              zIndex: 5,
            }}
          />
          <div style={{ height: HEADER_ROW }} />

          {STATUS_ORDER.map((status, gidx) => {
            const rows = grouped[status];
            if (!rows?.length) return null;
            const meta = STATUS_META[status];
            const isCollapsed = collapsed.has(status);
            return (
              <div key={status}>
                <button
                  type="button"
                  onClick={() => toggleCollapse(status)}
                  style={{
                    width: "100%",
                    height: GROUP_H,
                    padding: "0 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: GROUP_BG,
                    borderTop: `1px solid ${BORDER}`,
                    borderBottom: `1px solid ${BORDER}`,
                    borderLeft: "none",
                    borderRight: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    font: "inherit",
                  }}
                >
                  <span style={{ fontSize: 10, color: TEXT_MUTED, width: 14 }}>{isCollapsed ? "▶" : "▼"}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: meta.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: "auto" }}>{rows.length}</span>
                </button>
                {!isCollapsed
                  ? rows.map((p, i) => (
                      <div
                        key={p.id}
                        style={{
                          height: ROW_H,
                          padding: "0 14px",
                          display: "flex",
                          alignItems: "center",
                          borderBottom: `1px solid ${BORDER}`,
                          gap: 6,
                          background: (gidx + i) % 2 === 0 ? "#fff" : ROW_ALT,
                        }}
                      >
                        {p.type ? (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: TYPE_COLOR[p.type] || "#6B7280",
                              background: `${TYPE_COLOR[p.type] || "#6B7280"}14`,
                              padding: "2px 5px",
                              borderRadius: 3,
                              flexShrink: 0,
                            }}
                          >
                            {p.type}
                          </span>
                        ) : null}
                        <span
                          style={{
                            fontSize: 12,
                            color: TEXT,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {p.project_name}
                        </span>
                      </div>
                    ))
                  : null}
              </div>
            );
          })}
        </div>

        <div
          ref={trackScrollRef}
          onScroll={onTrackScrollSync}
          className={SCROLL_HIDE}
          style={{ flex: 1, overflow: "auto", minWidth: 0, background: "#fff" }}
          tabIndex={0}
          title="Shift + cuộn: zoom (neo Hôm nay). Nút Hôm nay: căn giữa."
        >
          <div style={{ width: trackPx, minHeight: 200, position: "relative" }}>
            <div
              style={{
                height: HEADER_ROW,
                position: "relative",
                borderBottom: `1px solid ${BORDER}`,
                background: HEADER_BG,
              }}
            >
              {monthTicks.map((t, i) => (
                <div
                  key={`${t.label}-${i}`}
                  style={{
                    position: "absolute",
                    left: `${t.pct}%`,
                    fontSize: 10,
                    color: TEXT_MUTED,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    textTransform: "none",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    top: 10,
                  }}
                >
                  {t.label}
                </div>
              ))}
              {showToday ? (
                <div
                  style={{
                    position: "absolute",
                    left: `${todayPct}%`,
                    top: 4,
                    fontSize: 9,
                    color: "#ea580c",
                    fontWeight: 700,
                    transform: "translateX(-50%)",
                  }}
                >
                  Hôm nay
                </div>
              ) : null}
            </div>

            {monthTicks.map((t, i) => (
              <div
                key={`g-${t.label}-${i}`}
                style={{
                  position: "absolute",
                  left: `${t.pct}%`,
                  top: HEADER_ROW,
                  bottom: 0,
                  width: 1,
                  background: BORDER,
                  pointerEvents: "none",
                }}
              />
            ))}

            {showToday ? (
              <div
                style={{
                  position: "absolute",
                  left: `${todayPct}%`,
                  top: HEADER_ROW,
                  bottom: 0,
                  width: 2,
                  background: "#F8A568",
                  pointerEvents: "none",
                  zIndex: 4,
                  opacity: 0.9,
                }}
              />
            ) : null}

            {STATUS_ORDER.map((status) => {
              const rows = grouped[status];
              if (!rows?.length) return null;
              const isCollapsed = collapsed.has(status);
              return (
                <div key={status}>
                  <div
                    style={{
                      height: GROUP_H,
                      borderTop: `1px solid ${BORDER}`,
                      borderBottom: `1px solid ${BORDER}`,
                      background: GROUP_BG,
                    }}
                  />
                  {!isCollapsed
                    ? rows.map((p) => (
                        <TimelineBar
                          key={p.id}
                          project={p}
                          timelineStart={timelineStart}
                          totalDays={totalDays}
                          trackPx={trackPx}
                          onOpenDetail={() => setDetailProject(p)}
                        />
                      ))
                    : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {detailProject ? (
        <ProjectDetailModal
          project={detailProject}
          staffNameById={staffNameById}
          staffAvatarById={staffAvatarById}
          mediaTeamStaff={mediaTeamStaff}
          onClose={() => setDetailProject(null)}
          onSaved={(p) => {
            setLocalProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
            setDetailProject(p);
          }}
        />
      ) : null}
    </div>
  );
}
