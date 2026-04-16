import { isWrongLopFkColumnError } from "@/app/api/phong-hoc/hv-chatbox/lop-column";
import type { SupabaseClient } from "@supabase/supabase-js";

const HV_SELECT = `
  id, photo, score, bai_mau, thuoc_bai_tap,
  ten_hoc_vien:ql_thong_tin_hoc_vien(id, full_name),
  bai_tap:hv_he_thong_bai_tap(ten_bai_tap, bai_so, mon_hoc:ql_mon_hoc(id, ten_mon_hoc))
`;

/** Cùng embed + cột lớp (một trong hai có thể không tồn tại tùy schema). */
const HV_SELECT_LOP_A = `${HV_SELECT.trim()},\n  lop_hoc, class`;
const HV_SELECT_LOP_B = `${HV_SELECT.trim()},\n  class`;

type HvGalleryRawRow = {
  id: unknown;
  photo: unknown;
  score: unknown;
  bai_mau?: unknown;
  thuoc_bai_tap?: unknown;
  lop_hoc?: unknown;
  class?: unknown;
  bai_tap?: {
    ten_bai_tap?: unknown;
    bai_so?: unknown;
    mon_hoc?: { id?: unknown; ten_mon_hoc?: unknown } | null;
  } | null;
  ten_hoc_vien?: { id?: unknown; full_name?: unknown } | null;
};

function mapHvRowToClassroomGalleryRow(row: HvGalleryRawRow): ClassroomGalleryRow {
  const id = Number(row.id);
  const hvStudentId = Number(row.ten_hoc_vien?.id);
  const rawSc = row.score;
  const score =
    rawSc != null && rawSc !== "" && Number.isFinite(Number(rawSc)) ? Number(rawSc) : null;
  const name =
    typeof row.ten_hoc_vien?.full_name === "string"
      ? row.ten_hoc_vien.full_name.trim() || "Học viên"
      : "Học viên";
  const photo = typeof row.photo === "string" && row.photo.trim() !== "" ? row.photo.trim() : null;
  const exId = Number(row.thuoc_bai_tap);
  const exOrder = Number(row.bai_tap?.bai_so);
  const exTitleRaw = typeof row.bai_tap?.ten_bai_tap === "string" ? row.bai_tap.ten_bai_tap.trim() : "";
  const exLabel = exOrder > 0 ? `Bài ${exOrder}` : null;
  const monEmb = row.bai_tap?.mon_hoc;
  const monId = monEmb != null && typeof monEmb === "object" ? Number((monEmb as { id?: unknown }).id) : NaN;
  const tenMonRaw =
    monEmb != null && typeof monEmb === "object"
      ? String((monEmb as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim()
      : "";
  return {
    hvId: Number.isFinite(id) ? id : 0,
    studentId: Number.isFinite(hvStudentId) && hvStudentId > 0 ? hvStudentId : null,
    studentName: name,
    mau: Boolean(row.bai_mau),
    score,
    photo,
    exerciseId: Number.isFinite(exId) && exId > 0 ? exId : null,
    exerciseLabel: exLabel,
    exerciseOrder: Number.isFinite(exOrder) && exOrder > 0 ? exOrder : null,
    exerciseTitle: exTitleRaw.length > 0 ? exTitleRaw : null,
    monHocId: Number.isFinite(monId) && monId > 0 ? monId : null,
    tenMonHoc: tenMonRaw.length > 0 ? tenMonRaw : null,
  };
}

function lopIdFromHvRow(row: HvGalleryRawRow): number | null {
  const a = Number(row.lop_hoc);
  if (Number.isFinite(a) && a > 0) return a;
  const b = Number(row.class);
  if (Number.isFinite(b) && b > 0) return b;
  return null;
}

async function fetchLopClassLabels(sb: SupabaseClient, ids: number[]): Promise<Map<number, string>> {
  const uniq = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  if (!uniq.length) return new Map();
  const { data, error } = await sb
    .from("ql_lop_hoc")
    .select("id, class_name, class_full_name")
    .in("id", uniq);
  if (error || !data?.length) return new Map();
  const m = new Map<number, string>();
  for (const r of data as { id: unknown; class_name?: unknown; class_full_name?: unknown }[]) {
    const id = Number(r.id);
    if (!Number.isFinite(id)) continue;
    const cn = String(r.class_name ?? "").trim();
    const cf = String(r.class_full_name ?? "").trim();
    m.set(id, cf || cn || "—");
  }
  return m;
}

export type ClassroomGalleryRow = {
  hvId: number;
  studentId: number | null;
  studentName: string;
  mau: boolean;
  score: number | null;
  photo: string | null;
  exerciseId: number | null;
  /** `bai_so` > 0 → "Bài N" */
  exerciseLabel: string | null;
  exerciseOrder: number | null;
  /** `hv_he_thong_bai_tap.ten_bai_tap` */
  exerciseTitle: string | null;
  /** `hv_he_thong_bai_tap.mon_hoc` → `ql_mon_hoc` */
  monHocId: number | null;
  tenMonHoc: string | null;
};

/** Bài hoàn thiện của một học viên (mọi lớp) — tab Bài vẽ trang cá nhân. */
export type StudentProfileGalleryRow = ClassroomGalleryRow & {
  classLabel: string;
};

const EMOJI_POOL = ["🎨", "🖌️", "✏️", "🎭", "🖼️", "🌸", "🖍️", "✨"];

function fallbackEmoji(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % EMOJI_POOL.length;
  return EMOJI_POOL[h] ?? "🎨";
}

/**
 * Tác phẩm `hv_bai_hoc_vien` của một lớp (Phòng học).
 * Anon RLS: chỉ `status = Hoàn thiện`. Cột lớp: thử `lop_hoc` rồi `class`.
 */
export async function fetchClassroomGalleryForLop(
  sb: SupabaseClient,
  lopHocId: number
): Promise<ClassroomGalleryRow[]> {
  if (!Number.isFinite(lopHocId) || lopHocId <= 0) return [];

  const run = async (col: "lop_hoc" | "class") => {
    return sb
      .from("hv_bai_hoc_vien")
      .select(HV_SELECT)
      .eq("status", "Hoàn thiện")
      .eq(col, lopHocId)
      .order("score", { ascending: false, nullsFirst: false });
  };

  let { data, error } = await run("lop_hoc");
  if (error && isWrongLopFkColumnError(error)) {
    ({ data, error } = await run("class"));
  } else if (!error && (!data || data.length === 0)) {
    const r2 = await run("class");
    if (!r2.error && r2.data && r2.data.length > 0) {
      data = r2.data;
    }
  }
  if (error) throw error;

  const rows = (data ?? []) as unknown as HvGalleryRawRow[];
  return rows.map((row) => mapHvRowToClassroomGalleryRow(row));
}

/**
 * Tác phẩm `hv_bai_hoc_vien` của một học viên (`ten_hoc_vien` = `ql_thong_tin_hoc_vien.id`), mọi lớp.
 * Anon RLS: chỉ `status = Hoàn thiện`.
 */
export async function fetchClassroomGalleryForStudentHv(
  sb: SupabaseClient,
  hocVienId: number
): Promise<StudentProfileGalleryRow[]> {
  if (!Number.isFinite(hocVienId) || hocVienId <= 0) return [];

  const run = (sel: string) =>
    sb
      .from("hv_bai_hoc_vien")
      .select(sel)
      .eq("status", "Hoàn thiện")
      .eq("ten_hoc_vien", hocVienId)
      .order("id", { ascending: false });

  let { data, error } = await run(HV_SELECT_LOP_A);
  if (error) {
    ({ data, error } = await run(HV_SELECT_LOP_B));
  }
  if (error) {
    ({ data, error } = await run(HV_SELECT));
  }
  if (error) throw error;

  const rawRows = (data ?? []) as unknown as HvGalleryRawRow[];
  const lopIds = rawRows.map((r) => lopIdFromHvRow(r)).filter((x): x is number => x != null);
  const labelByLop = await fetchLopClassLabels(sb, lopIds);

  return rawRows.map((row) => {
    const base = mapHvRowToClassroomGalleryRow(row);
    const lid = lopIdFromHvRow(row);
    const classLabel = lid != null ? labelByLop.get(lid) ?? "—" : "—";
    return { ...base, classLabel };
  });
}

export function classroomGalleryEmoji(name: string): string {
  return fallbackEmoji(name);
}

export type EnrolledMonOption = { id: number; ten_mon_hoc: string };

/**
 * Các môn (`ql_mon_hoc`) từ lớp học viên đang ghi danh (`ql_quan_ly_hoc_vien` → `ql_lop_hoc.mon_hoc`).
 */
export async function fetchEnrolledMonHocForStudent(
  sb: SupabaseClient,
  hocVienId: number
): Promise<EnrolledMonOption[]> {
  if (!Number.isFinite(hocVienId) || hocVienId <= 0) return [];
  const pk = String(hocVienId);

  const { data: enRows, error } = await sb.from("ql_quan_ly_hoc_vien").select("lop_hoc").eq("hoc_vien_id", pk);

  if (error || !enRows?.length) return [];

  const lopIds = [
    ...new Set(
      (enRows as { lop_hoc?: unknown }[])
        .map((r) => Number(r.lop_hoc))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  if (!lopIds.length) return [];

  const { data: lopRows, error: lErr } = await sb
    .from("ql_lop_hoc")
    .select("mon_hoc")
    .in("id", lopIds);

  if (lErr || !lopRows?.length) return [];

  const monIds = new Set<number>();
  for (const r of lopRows as { mon_hoc?: unknown }[]) {
    const m = Number(r.mon_hoc);
    if (Number.isFinite(m) && m > 0) monIds.add(m);
  }
  if (!monIds.size) return [];

  const { data: mons, error: mErr } = await sb
    .from("ql_mon_hoc")
    .select("id, ten_mon_hoc")
    .in("id", [...monIds])
    .order("ten_mon_hoc", { ascending: true });

  if (mErr || !mons?.length) return [];

  return (mons as { id: unknown; ten_mon_hoc?: unknown }[])
    .map((m) => ({
      id: Number(m.id),
      ten_mon_hoc: String(m.ten_mon_hoc ?? "").trim() || "—",
    }))
    .filter((x) => Number.isFinite(x.id) && x.id > 0);
}
