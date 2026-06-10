import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeOverallStatus,
  deriveEnrollmentStatus,
} from "@/lib/data/admin-qlhv-tinh-trang";
import type {
  AdminQlhvEnrollment,
  AdminQlhvLopBrief,
  AdminQlhvStudent,
} from "@/lib/data/admin-quan-ly-hoc-vien";
import { fetchAdminQuanLyHocVienBundle } from "@/lib/data/admin-quan-ly-hoc-vien";

const ISO_YMD = /^\d{4}-\d{2}-\d{2}$/;

export type HvTrackingBucket = {
  key: string;
  label: string;
  startYmd: string;
  endYmd: string;
  moi: number;
  nghi: number;
  net: number;
};

export type HvTrackingMonOption = { id: number; ten: string };
export type HvTrackingLopOption = { id: number; ten: string; monHocId: number | null };

export type HvTrackingGranularity = "day" | "month";

export type HvEnrollmentTrackingResult = {
  series: HvTrackingBucket[];
  totals: { moi: number; nghi: number; net: number };
  /** Ghi danh còn trong kỳ HP hôm nay — snapshot, không phụ thuộc khoảng lọc. */
  activeEnrollments: number;
  /** Hồ sơ mới (created_at) trong khoảng — chỉ toàn trung tâm. */
  newProfilesInRange: number;
  rangeLabel: string;
  granularity: HvTrackingGranularity;
  /** `center` = toàn TT; `enrollment` = lọc môn/lớp. */
  mode: "center" | "enrollment";
  filters: {
    monHoc: HvTrackingMonOption[];
    lopHoc: HvTrackingLopOption[];
  };
};

function isoDateFromCreatedAt(v: string | null | undefined): string | null {
  if (!v) return null;
  const ymd = v.trim().slice(0, 10);
  return ISO_YMD.test(ymd) ? ymd : null;
}

function dateInInclusiveRange(ymd: string | null, start: string, end: string): boolean {
  if (!ymd || !ISO_YMD.test(ymd)) return false;
  return ymd >= start && ymd <= end;
}

function maxNgayCuoiKy(khs: AdminQlhvEnrollment[]): string | null {
  let maxD: string | null = null;
  for (const k of khs) {
    const d = k.ngay_cuoi_ky?.trim().slice(0, 10);
    if (!d || !ISO_YMD.test(d)) continue;
    if (!maxD || d > maxD) maxD = d;
  }
  return maxD;
}

function ngayKetThucHienThi(khs: AdminQlhvEnrollment[]): string | null {
  if (computeOverallStatus(khs) !== "Nghỉ") return null;
  return maxNgayCuoiKy(khs);
}

/** Đồng bộ logic thống kê «nghỉ» trên Quản lý học viên. */
export function quitStatsReferenceYmd(hv: AdminQlhvStudent, khs: AdminQlhvEnrollment[]): string | null {
  if (hv.trang_thai_tu_van !== "nghi") return null;
  const fromProfile = isoDateFromCreatedAt(hv.ngay_ket_thuc);
  if (fromProfile) return fromProfile;
  const k = ngayKetThucHienThi(khs);
  if (k) return k;
  return maxNgayCuoiKy(khs);
}

function formatYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daySpanInclusive(startYmd: string, endYmd: string): number {
  const s = parseYmd(startYmd);
  const e = parseYmd(endYmd);
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

function formatDayLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${dd}/${mm}`;
}

function formatMonthLabel(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  if (!y || !m) return ymd;
  return `T${m}/${y}`;
}

function todayYmdLocal(): string {
  return formatYMDLocal(new Date());
}

/** Chỉ tính sự kiện đã xảy ra — bỏ ngày kết thúc/đầu kỳ tương lai trên hồ sơ. */
function isRealizedEventYmd(ymd: string | null, todayYmd: string): boolean {
  if (!ymd || !ISO_YMD.test(ymd)) return false;
  return ymd <= todayYmd;
}

/** Tuần / tháng / quý → theo ngày; năm / tất cả → theo tháng. */
export function resolveTrackingGranularity(
  preset: "all" | "week" | "month" | "quarter" | "year" | "custom",
  startYmd: string,
  endYmd: string,
): HvTrackingGranularity {
  if (preset === "year" || preset === "all") return "month";
  if (preset === "week" || preset === "month" || preset === "quarter") return "day";
  const span = daySpanInclusive(startYmd, endYmd);
  return span <= 120 ? "day" : "month";
}

export function buildTrackingBuckets(
  startYmd: string,
  endYmd: string,
  todayYmd: string = todayYmdLocal(),
  granularity: HvTrackingGranularity = "day",
): Omit<HvTrackingBucket, "moi" | "nghi" | "net">[] {
  if (!ISO_YMD.test(startYmd) || !ISO_YMD.test(endYmd) || startYmd > endYmd) return [];

  const effectiveEnd = endYmd > todayYmd ? todayYmd : endYmd;
  if (startYmd > effectiveEnd) return [];

  const useDaily = granularity === "day";

  if (useDaily) {
    const out: Omit<HvTrackingBucket, "moi" | "nghi" | "net">[] = [];
    for (let d = parseYmd(startYmd); ; d.setDate(d.getDate() + 1)) {
      const ymd = formatYMDLocal(d);
      out.push({ key: ymd, label: formatDayLabel(ymd), startYmd: ymd, endYmd: ymd });
      if (ymd >= effectiveEnd) break;
    }
    return out;
  }

  const out: Omit<HvTrackingBucket, "moi" | "nghi" | "net">[] = [];
  let cursor = parseYmd(startYmd);
  cursor.setDate(1);
  const end = parseYmd(effectiveEnd);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const mo = cursor.getMonth();
    const monthStart = formatYMDLocal(new Date(y, mo, 1));
    const monthEnd = formatYMDLocal(new Date(y, mo + 1, 0));
    const bucketStart = monthStart < startYmd ? startYmd : monthStart;
    const bucketEnd = monthEnd > effectiveEnd ? effectiveEnd : monthEnd;
    const key = `${y}-${String(mo + 1).padStart(2, "0")}`;
    out.push({
      key,
      label: formatMonthLabel(bucketStart),
      startYmd: bucketStart,
      endYmd: bucketEnd,
    });
    cursor = new Date(y, mo + 1, 1);
  }
  return out;
}

function lopDisplayName(lop: AdminQlhvLopBrief | null | undefined): string {
  if (!lop) return "—";
  return lop.class_full_name || lop.class_name || `Lớp #${lop.id}`;
}

function enrollmentMatchesFilter(
  e: AdminQlhvEnrollment,
  monHocId: number | null,
  lopHocId: number | null,
): boolean {
  if (lopHocId != null && e.lop_hoc !== lopHocId) return false;
  if (monHocId != null && e.lop?.mon_hoc !== monHocId) return false;
  return true;
}

function enrollmentQuitYmd(e: AdminQlhvEnrollment): string | null {
  if (deriveEnrollmentStatus(e) !== "Nghỉ") return null;
  const d = e.ngay_cuoi_ky?.trim().slice(0, 10);
  return d && ISO_YMD.test(d) ? d : null;
}

export function computeHvEnrollmentTracking(params: {
  students: AdminQlhvStudent[];
  enrollments: AdminQlhvEnrollment[];
  lopById: Record<string, AdminQlhvLopBrief>;
  monHocNames: Map<number, string>;
  startYmd: string;
  endYmd: string;
  preset: "all" | "week" | "month" | "quarter" | "year" | "custom";
  monHocId: number | null;
  lopHocId: number | null;
}): HvEnrollmentTrackingResult {
  const {
    students,
    enrollments,
    lopById,
    monHocNames,
    startYmd,
    endYmd,
    preset,
    monHocId,
    lopHocId,
  } = params;

  const mauIds = new Set(students.filter((s) => s.is_hoc_vien_mau).map((s) => s.id));
  const byHv = new Map<number, AdminQlhvEnrollment[]>();
  for (const e of enrollments) {
    const list = byHv.get(e.hoc_vien_id) ?? [];
    list.push(e);
    byHv.set(e.hoc_vien_id, list);
  }

  const filteredEnrollments = enrollments.filter(
    (e) => !mauIds.has(e.hoc_vien_id) && enrollmentMatchesFilter(e, monHocId, lopHocId),
  );

  const centerMode = monHocId == null && lopHocId == null;
  const todayYmd = todayYmdLocal();
  const chartEndYmd = endYmd > todayYmd ? todayYmd : endYmd;
  const granularity = resolveTrackingGranularity(preset, startYmd, endYmd);
  const bucketDefs = buildTrackingBuckets(startYmd, endYmd, todayYmd, granularity);
  const enrollmentsForStats = centerMode
    ? enrollments.filter((e) => !mauIds.has(e.hoc_vien_id))
    : filteredEnrollments;

  const series: HvTrackingBucket[] = bucketDefs.map((b) => {
    let moi = 0;
    let nghi = 0;

    for (const e of enrollmentsForStats) {
      const created = enrollmentNewYmd(e);
      if (isRealizedEventYmd(created, todayYmd) && dateInInclusiveRange(created, b.startYmd, b.endYmd)) moi++;
      if (!centerMode) {
        const quitD = enrollmentQuitYmd(e);
        if (isRealizedEventYmd(quitD, todayYmd) && dateInInclusiveRange(quitD, b.startYmd, b.endYmd)) nghi++;
      }
    }

    if (centerMode) {
      for (const hv of students) {
        if (hv.is_hoc_vien_mau) continue;
        const khs = byHv.get(hv.id) ?? [];
        const quitD = quitStatsReferenceYmd(hv, khs);
        if (isRealizedEventYmd(quitD, todayYmd) && dateInInclusiveRange(quitD, b.startYmd, b.endYmd)) nghi++;
      }
    }

    return { ...b, moi, nghi, net: moi - nghi };
  });

  let newProfilesInRange = 0;
  if (centerMode) {
    for (const hv of students) {
      if (hv.is_hoc_vien_mau) continue;
      const created = isoDateFromCreatedAt(hv.created_at);
      if (isRealizedEventYmd(created, todayYmd) && dateInInclusiveRange(created, startYmd, chartEndYmd)) {
        newProfilesInRange++;
      }
    }
  }

  const activeEnrollments = countActiveEnrollments(enrollments, mauIds);

  const totals = series.reduce(
    (acc, row) => ({
      moi: acc.moi + row.moi,
      nghi: acc.nghi + row.nghi,
      net: acc.net + row.net,
    }),
    { moi: 0, nghi: 0, net: 0 },
  );

  const monIds = new Set<number>();
  for (const lop of Object.values(lopById)) {
    if (lop.mon_hoc != null && lop.mon_hoc > 0) monIds.add(lop.mon_hoc);
  }
  const monHoc: HvTrackingMonOption[] = [...monIds]
    .sort((a, b) => a - b)
    .map((id) => ({ id, ten: monHocNames.get(id) ?? `Môn #${id}` }));

  const lopHoc: HvTrackingLopOption[] = Object.values(lopById)
    .filter((l) => (monHocId == null ? true : l.mon_hoc === monHocId))
    .map((l) => ({
      id: l.id,
      ten: lopDisplayName(l),
      monHocId: l.mon_hoc,
    }))
    .sort((a, b) => a.ten.localeCompare(b.ten, "vi"));

  const rangeLabel =
    chartEndYmd < endYmd
      ? `${formatDayLabel(startYmd)} → ${formatDayLabel(chartEndYmd)} (đến hôm nay)`
      : `${formatDayLabel(startYmd)} → ${formatDayLabel(endYmd)}`;

  return {
    series,
    totals,
    activeEnrollments,
    newProfilesInRange,
    rangeLabel,
    granularity,
    mode: centerMode ? "center" : "enrollment",
    filters: { monHoc, lopHoc },
  };
}

function enrollmentNewYmd(e: AdminQlhvEnrollment): string | null {
  return isoDateFromCreatedAt(e.created_at) ?? isoDateFromCreatedAt(e.ngay_dau_ky);
}

function startOfIsoWeekMonday(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Khoảng thời gian — đồng bộ «Quản lý học viên» (kỳ hiện tại), không dùng kỳ -1 như marketing. */
export function resolveHvTrackingRange(
  preset: "all" | "week" | "month" | "quarter" | "year" | "custom",
  customFrom: string,
  customTo: string,
  ref: Date = new Date(),
): { startYmd: string; endYmd: string } {
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const todayYmd = formatYMDLocal(today);

  if (preset === "all") {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 35);
    start.setDate(1);
    return { startYmd: formatYMDLocal(start), endYmd: todayYmd };
  }
  if (preset === "custom") {
    let from = customFrom.trim().slice(0, 10);
    let to = customTo.trim().slice(0, 10);
    if (!from && !to) return { startYmd: todayYmd, endYmd: todayYmd };
    if (!from) from = to || todayYmd;
    if (!to) to = from || todayYmd;
    if (from > to) [from, to] = [to, from];
    return { startYmd: from, endYmd: to };
  }

  if (preset === "week") {
    const mon = startOfIsoWeekMonday(today);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    return { startYmd: formatYMDLocal(mon), endYmd: formatYMDLocal(sun) };
  }
  if (preset === "month") {
    const y = today.getFullYear();
    const mo = today.getMonth();
    return {
      startYmd: formatYMDLocal(new Date(y, mo, 1)),
      endYmd: formatYMDLocal(new Date(y, mo + 1, 0)),
    };
  }
  if (preset === "quarter") {
    const y = today.getFullYear();
    const mo = today.getMonth();
    const q = Math.floor(mo / 3);
    const m0 = q * 3;
    return {
      startYmd: formatYMDLocal(new Date(y, m0, 1)),
      endYmd: formatYMDLocal(new Date(y, m0 + 3, 0)),
    };
  }
  const y = today.getFullYear();
  return {
    startYmd: formatYMDLocal(new Date(y, 0, 1)),
    endYmd: formatYMDLocal(new Date(y, 11, 31)),
  };
}

export function countActiveEnrollments(
  enrollments: AdminQlhvEnrollment[],
  mauStudentIds: Set<number>,
): number {
  let n = 0;
  for (const e of enrollments) {
    if (mauStudentIds.has(e.hoc_vien_id)) continue;
    if (deriveEnrollmentStatus(e) === "Đang học") n += 1;
  }
  return n;
}

async function fetchMonHocNames(supabase: SupabaseClient): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const { data, error } = await supabase.from("ql_mon_hoc").select("id, ten_mon_hoc").order("ten_mon_hoc");
  if (error || !data) return map;
  for (const raw of data as { id?: unknown; ten_mon_hoc?: unknown }[]) {
    const id = Number(raw.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    map.set(id, String(raw.ten_mon_hoc ?? "").trim() || `Môn #${id}`);
  }
  return map;
}

export async function fetchHvEnrollmentTracking(
  supabase: SupabaseClient,
  opts: {
    preset: "all" | "week" | "month" | "quarter" | "year" | "custom";
    customFrom?: string;
    customTo?: string;
    monHocId?: number | null;
    lopHocId?: number | null;
  },
): Promise<{ ok: true; data: HvEnrollmentTrackingResult } | { ok: false; error: string }> {
  const bundle = await fetchAdminQuanLyHocVienBundle(supabase);
  if (bundle.error) return { ok: false, error: bundle.error };

  const monHocNames = await fetchMonHocNames(supabase);
  const { startYmd, endYmd } = resolveHvTrackingRange(
    opts.preset,
    opts.customFrom ?? "",
    opts.customTo ?? "",
  );

  const data = computeHvEnrollmentTracking({
    students: bundle.students,
    enrollments: bundle.enrollments,
    lopById: bundle.lopById,
    monHocNames,
    startYmd,
    endYmd,
    preset: opts.preset,
    monHocId: opts.monHocId ?? null,
    lopHocId: opts.lopHocId ?? null,
  });

  return { ok: true, data };
}
