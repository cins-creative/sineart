import { isWrongLopFkColumnError } from "@/app/api/phong-hoc/hv-chatbox/lop-column";
import { fetchKyByKhoaHocVienIds } from "@/lib/data/hp-thu-hp-chi-tiet-ky";
import { qlhvConNgayHocFromKyMap } from "@/lib/phong-hoc/enrollment-con-ngay-hoc";
import { vnCalendarDateString } from "@/lib/phong-hoc/diem-danh";
import type { SupabaseClient } from "@supabase/supabase-js";

/** GV: học viên ghi danh trong vòng vài ngày — nổi bật ở sidebar «Online trong lớp». */
export const ENROLLMENT_NEW_HIGHLIGHT_MAX_DAYS = 7;

/** Một dòng học viên trong lớp — dùng tab Lớp / Qlý (ClassroomClient). */
export type ClassmateListRow = {
  /** `ql_quan_ly_hoc_vien.id` — khớp `hv_chatbox.name` khi HV gửi chat. */
  enrollmentId: number;
  hvId: number;
  n: string;
  i: string;
  c: string;
  st: true | false | "late";
  /** Hôm nay (lịch VN) đã có bản ghi nộp `hv_bai_hoc_vien` cho `tien_do_hoc` trong lớp này. */
  sub: boolean;
  /** Nhãn «Bài 7» / «Bài 3.2» từ `bai_so` hoặc fallback tên ngắn. */
  ex: string | null;
  /** `ten_bai_tap` — hiển thị kèm: «Bài 7 - Phân tích cấu trúc». */
  exTitle: string | null;
  /** Tên môn (dự phòng khi không có tên bài). */
  exMon: string | null;
  /** ISO `ql_quan_ly_hoc_vien.created_at` — mốc đăng ký lớp (hiển thị thời gian học). */
  enrollmentCreatedAt: string | null;
};

const AVATAR_COLORS = [
  "#4f8ef7",
  "#f6ad55",
  "#48bb78",
  "#f87171",
  "#a78bfa",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
];

function colorForHvId(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

function initialFromName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

function labelBai(task: {
  ten_bai_tap: string | null;
  bai_so: number | null;
}): string | null {
  if (task.bai_so != null && Number.isFinite(task.bai_so)) {
    return `Bài ${task.bai_so}`;
  }
  const t = task.ten_bai_tap?.trim();
  return t || null;
}

/** Một dòng mô tả tiến độ dưới tên HV: «Bài 7 - Phân tích cấu trúc». */
export function formatClassmateProgressLine(s: ClassmateListRow): string {
  if (!s.ex && !s.exTitle) return "Chưa có bài";
  const title = s.exTitle?.trim() ?? "";
  const label = s.ex?.trim() ?? "";
  if (label && title) {
    if (label === title) return label;
    return `${label} - ${title}`;
  }
  if (title) return title;
  if (label && s.exMon) return `${label} · ${s.exMon}`;
  return label || "Chưa có bài";
}

function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Số ngày lịch (VN) từ ngày ghi danh đến hôm nay; cùng ngày → 0. */
export function enrollmentCalendarDaysSince(isoCreatedAt: string | null | undefined): number | null {
  if (isoCreatedAt == null || String(isoCreatedAt).trim() === "") return null;
  const startYmd = vnCalendarDateString(new Date(isoCreatedAt));
  const todayYmd = vnCalendarDateString();
  const a = parseLocalYmd(startYmd);
  const b = parseLocalYmd(todayYmd);
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

function calendarAgeParts(start: Date, end: Date): { years: number; months: number; days: number } {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months--;
    const lastPrev = new Date(end.getFullYear(), end.getMonth(), 0);
    days += lastPrev.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months, days };
}

/** «Đã học 1 năm, 2 tháng, 12 ngày» — mốc `ql_quan_ly_hoc_vien.created_at`, lịch VN. */
export function formatEnrollmentStudyDurationLabel(enrollmentIso: string | null | undefined): string {
  if (enrollmentIso == null || String(enrollmentIso).trim() === "") return "—";
  const enrollYmd = vnCalendarDateString(new Date(enrollmentIso));
  const todayYmd = vnCalendarDateString();
  const start = parseLocalYmd(enrollYmd);
  const end = parseLocalYmd(todayYmd);
  if (start > end) return "—";
  if (enrollYmd === todayYmd) return "Đã học hôm nay";
  const { years, months, days } = calendarAgeParts(start, end);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} năm`);
  if (months > 0) parts.push(`${months} tháng`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ngày`);
  return `Đã học ${parts.join(", ")}`;
}

/** Sidebar GV «Online trong lớp»: một dòng mô tả dưới tên HV. */
export function formatClassmateEnrollmentStudyLine(s: ClassmateListRow): string {
  return formatEnrollmentStudyDurationLabel(s.enrollmentCreatedAt);
}

/** Chat / badge — HV «mới» khi ghi danh lớp chưa đủ 7 ngày (lịch VN). */
export function enrollmentHighlightNewFromIso(iso: string | null | undefined): boolean {
  const n = enrollmentCalendarDaysSince(iso);
  return n !== null && n >= 0 && n < ENROLLMENT_NEW_HIGHLIGHT_MAX_DAYS;
}

export function classmateEnrollmentShouldHighlightNew(s: ClassmateListRow): boolean {
  return enrollmentHighlightNewFromIso(s.enrollmentCreatedAt);
}

type QlhvRow = { id: unknown; hoc_vien_id: unknown; tien_do_hoc: unknown; created_at?: unknown };

/**
 * Học viên ghi danh `lop_hoc` + tên + tiến độ (`tien_do_hoc` → hv_he_thong_bai_tap + ql_mon_hoc).
 * Không FK-join PostgREST — gộp bằng map trong JS.
 */
export async function fetchClassmatesForLop(
  supabase: SupabaseClient,
  lopHocId: number
): Promise<ClassmateListRow[]> {
  const { data: enrollments, error } = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("id, hoc_vien_id, tien_do_hoc, created_at")
    .eq("lop_hoc", lopHocId);

  if (error || !enrollments?.length) return [];

  const rows = enrollments as QlhvRow[];
  const byHv = new Map<number, QlhvRow>();
  for (const r of rows) {
    const hv = Number(r.hoc_vien_id);
    if (!Number.isFinite(hv)) continue;
    const prev = byHv.get(hv);
    if (!prev || Number(r.id) > Number(prev.id)) byHv.set(hv, r);
  }
  const uniqueRows = [...byHv.values()];

  const qlhvIds = uniqueRows
    .map((r) => Number((r as QlhvRow).id))
    .filter((n) => Number.isFinite(n) && n > 0);
  const kyMap = await fetchKyByKhoaHocVienIds(supabase, qlhvIds);
  const rosterRows = uniqueRows.filter((r) => {
    const eid = Number((r as QlhvRow).id);
    return Number.isFinite(eid) && eid > 0 && qlhvConNgayHocFromKyMap(kyMap, eid);
  });
  if (!rosterRows.length) return [];

  const hvIds = rosterRows.map((r) => Number(r.hoc_vien_id)).filter(Number.isFinite);
  if (!hvIds.length) return [];

  const { data: profiles } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select("id, full_name")
    .in("id", hvIds);

  const nameByHv = new Map<number, string>();
  for (const p of profiles ?? []) {
    const id = Number((p as { id: unknown }).id);
    if (!Number.isFinite(id)) continue;
    const fn = String((p as { full_name?: unknown }).full_name ?? "").trim();
    nameByHv.set(id, fn || "Học viên");
  }

  const taskIds = [
    ...new Set(
      rosterRows
        .map((r) => r.tien_do_hoc)
        .filter((x) => x != null && x !== "")
        .map((x) => Number(x))
        .filter(Number.isFinite)
    ),
  ];

  const taskMeta = new Map<
    number,
    { ten_bai_tap: string | null; bai_so: number | null; mon_hoc: number | null }
  >();

  if (taskIds.length) {
    const { data: tasks } = await supabase
      .from("hv_he_thong_bai_tap")
      .select("id, ten_bai_tap, bai_so, mon_hoc")
      .in("id", taskIds);

    for (const t of tasks ?? []) {
      const row = t as {
        id: unknown;
        ten_bai_tap?: unknown;
        bai_so?: unknown;
        mon_hoc?: unknown;
      };
      const id = Number(row.id);
      if (!Number.isFinite(id)) continue;
      taskMeta.set(id, {
        ten_bai_tap: row.ten_bai_tap != null ? String(row.ten_bai_tap) : null,
        bai_so: row.bai_so != null ? Number(row.bai_so) : null,
        mon_hoc: row.mon_hoc != null ? Number(row.mon_hoc) : null,
      });
    }
  }

  const monIds = new Set<number>();
  for (const meta of taskMeta.values()) {
    if (meta.mon_hoc != null && Number.isFinite(meta.mon_hoc)) monIds.add(meta.mon_hoc);
  }
  const monNameById = new Map<number, string>();
  if (monIds.size) {
    const { data: mons } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .in("id", [...monIds]);
    for (const m of mons ?? []) {
      const id = Number((m as { id: unknown }).id);
      if (!Number.isFinite(id)) continue;
      monNameById.set(id, String((m as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim());
    }
  }

  /** Cặp `hocVienId:thuocBaiTapId` đã nộp **trong ngày hôm nay** (Asia/Ho_Chi_Minh). */
  const submittedKey = new Set<string>();
  const ymd = vnCalendarDateString();
  const vnDayStart = new Date(`${ymd}T00:00:00+07:00`);
  const vnDayEndExcl = new Date(vnDayStart.getTime() + 24 * 60 * 60 * 1000);
  const fromIso = vnDayStart.toISOString();
  const toIso = vnDayEndExcl.toISOString();

  if (hvIds.length) {
    const tryWorks = async (lopCol: "lop_hoc" | "class") => {
      const { data, error } = await supabase
        .from("hv_bai_hoc_vien")
        .select(`ten_hoc_vien, thuoc_bai_tap, ${lopCol}, created_at`)
        .in("ten_hoc_vien", hvIds)
        .eq(lopCol, lopHocId)
        .gte("created_at", fromIso)
        .lt("created_at", toIso);
      if (error) return error;
      for (const w of data ?? []) {
        const row = w as {
          ten_hoc_vien?: unknown;
          thuoc_bai_tap?: unknown;
        };
        const hv = Number(row.ten_hoc_vien);
        const bt = Number(row.thuoc_bai_tap);
        if (!Number.isFinite(hv) || !Number.isFinite(bt)) continue;
        submittedKey.add(`${hv}:${bt}`);
      }
      return null;
    };
    const errLop = await tryWorks("lop_hoc");
    if (errLop && isWrongLopFkColumnError(errLop)) {
      await tryWorks("class");
    }
  }

  const out: ClassmateListRow[] = [];
  for (const r of rosterRows) {
    const enrollmentId = Number((r as QlhvRow).id);
    const hvId = Number(r.hoc_vien_id);
    if (!Number.isFinite(hvId)) continue;
    const n = nameByHv.get(hvId) ?? "Học viên";
    const td = r.tien_do_hoc != null && r.tien_do_hoc !== "" ? Number(r.tien_do_hoc) : null;
    let ex: string | null = null;
    let exTitle: string | null = null;
    let exMon: string | null = null;
    if (td != null && Number.isFinite(td)) {
      const meta = taskMeta.get(td);
      if (meta) {
        ex = labelBai(meta);
        const rawTitle = meta.ten_bai_tap?.trim() ?? "";
        exTitle = rawTitle || null;
        if (meta.mon_hoc != null && Number.isFinite(meta.mon_hoc)) {
          exMon = monNameById.get(meta.mon_hoc) ?? null;
        }
      }
    }
    const sub = td != null && Number.isFinite(td) && submittedKey.has(`${hvId}:${td}`);
    const createdRaw = (r as QlhvRow).created_at;
    const enrollmentCreatedAt =
      createdRaw != null && String(createdRaw).trim() !== "" ? String(createdRaw) : null;
    out.push({
      enrollmentId: Number.isFinite(enrollmentId) && enrollmentId > 0 ? enrollmentId : 0,
      hvId,
      n,
      i: initialFromName(n),
      c: colorForHvId(hvId),
      st: true,
      sub,
      ex,
      exTitle,
      exMon,
      enrollmentCreatedAt,
    });
  }

  out.sort((a, b) => a.n.localeCompare(b.n, "vi"));
  return out;
}
