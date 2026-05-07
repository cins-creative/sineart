import { collectHeThongBaiTapIdsForMon } from "@/lib/data/htbt-linked-to-mon";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Bài tập thuộc môn của lớp (`ql_lop_hoc.mon_hoc`):
 * - hàng trong `hv_he_thong_bai_tap_mon_hoc` với `mon_hoc_id` = môn lớp, và/hoặc
 * - `hv_he_thong_bai_tap.mon_hoc` legacy (cột scalar / MIN từ trigger).
 */
export type LopCurriculumExercise = {
  id: number;
  ten_bai_tap: string;
  bai_so: number | null;
  thumbnail: string | null;
  /** Cột scalar `hv_he_thong_bai_tap.mon_hoc` (MIN / môn chính khi bài có nhiều môn). */
  mon_hoc: number | null;
  /** Tên môn tương ứng `mon_hoc` — hiển thị lọc. */
  ten_mon_hoc_goc: string | null;
};

/**
 * Lấy toàn bộ bài tập của một `ql_mon_hoc.id` (junction + cột `mon_hoc` legacy).
 * Dùng khi không có `ql_lop_hoc` hoặc cần mở full chương trình Luyện thi theo môn.
 */
export async function fetchCurriculumExercisesForMonHocId(
  supabase: SupabaseClient,
  monId: number
): Promise<{
  exercises: LopCurriculumExercise[];
  subjectName: string | null;
  monHocId: number | null;
}> {
  if (!Number.isFinite(monId) || monId <= 0) {
    return { exercises: [], subjectName: null, monHocId: null };
  }

  const { data: mh } = await supabase
    .from("ql_mon_hoc")
    .select("ten_mon_hoc")
    .eq("id", monId)
    .maybeSingle();

  const subjectName =
    mh && typeof (mh as { ten_mon_hoc?: unknown }).ten_mon_hoc === "string"
      ? String((mh as { ten_mon_hoc: string }).ten_mon_hoc).trim() || null
      : null;

  const ids = await collectHeThongBaiTapIdsForMon(supabase, monId);

  if (ids.length === 0) {
    return { exercises: [], subjectName, monHocId: monId };
  }
  const CHUNK = 120;
  const rows: {
    id: unknown;
    ten_bai_tap?: unknown;
    bai_so?: unknown;
    thumbnail?: unknown;
    mon_hoc?: unknown;
  }[] = [];

  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data: chunkRows, error: e2 } = await supabase
      .from("hv_he_thong_bai_tap")
      .select("id, ten_bai_tap, bai_so, thumbnail, mon_hoc")
      .in("id", slice);
    if (e2) throw new Error(e2.message);
    rows.push(...(chunkRows ?? []));
  }

  let exercises: LopCurriculumExercise[] = rows
    .map((raw) => {
      const r = raw as {
        id: unknown;
        ten_bai_tap?: unknown;
        bai_so?: unknown;
        thumbnail?: unknown;
        mon_hoc?: unknown;
      };
      const id = Number(r.id);
      const bs = r.bai_so != null && Number.isFinite(Number(r.bai_so)) ? Number(r.bai_so) : null;
      const mid = r.mon_hoc != null && Number.isFinite(Number(r.mon_hoc)) ? Number(r.mon_hoc) : null;
      return {
        id,
        ten_bai_tap: String(r.ten_bai_tap ?? "").trim() || "Bài tập",
        bai_so: bs,
        thumbnail: r.thumbnail != null ? String(r.thumbnail).trim() || null : null,
        mon_hoc: mid != null && mid > 0 ? mid : null,
        ten_mon_hoc_goc: null as string | null,
      };
    })
    .filter((x) => Number.isFinite(x.id));

  const distinctMonIds = [
    ...new Set(exercises.map((e) => e.mon_hoc).filter((m): m is number => m != null && m > 0)),
  ];
  if (distinctMonIds.length > 0) {
    const { data: monRows, error: monErr } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .in("id", distinctMonIds);
    if (!monErr && monRows?.length) {
      const labelById = new Map<number, string>();
      for (const mr of monRows) {
        const id = Number((mr as { id?: unknown }).id);
        const t = String((mr as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim();
        if (Number.isFinite(id) && id > 0 && t) labelById.set(id, t);
      }
      exercises = exercises.map((e) =>
        e.mon_hoc != null && labelById.has(e.mon_hoc)
          ? { ...e, ten_mon_hoc_goc: labelById.get(e.mon_hoc) ?? null }
          : e
      );
    }
  }

  exercises.sort((a, b) => {
    const ao = a.bai_so ?? Number.MAX_SAFE_INTEGER;
    const bo = b.bai_so ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.id - b.id;
  });

  return { exercises, subjectName, monHocId: monId };
}

/**
 * Lấy toàn bộ bài tập của môn học của lớp (junction + cột `mon_hoc` legacy).
 * Sắp xếp: `bai_so` tăng dần (null xếp sau), tie-break `id`.
 */
export async function fetchLopCurriculumExercises(
  supabase: SupabaseClient,
  lopHocId: number
): Promise<{
  exercises: LopCurriculumExercise[];
  subjectName: string | null;
  monHocId: number | null;
}> {
  const { data: lop, error: e1 } = await supabase
    .from("ql_lop_hoc")
    .select("mon_hoc")
    .eq("id", lopHocId)
    .maybeSingle();

  if (e1 || !lop) return { exercises: [], subjectName: null, monHocId: null };

  const monId = Number((lop as { mon_hoc?: unknown }).mon_hoc);
  if (!Number.isFinite(monId)) return { exercises: [], subjectName: null, monHocId: null };

  return fetchCurriculumExercisesForMonHocId(supabase, monId);
}

/**
 * Chỉ số bài đang mở (theo `ql_quan_ly_hoc_vien.tien_do_hoc` = `hv_he_thong_bai_tap.id` trong danh sách đã sort).
 * Trả về `-1` nếu chưa gán hoặc không khớp danh sách.
 */
export function curriculumProgressIndex(
  exercises: LopCurriculumExercise[],
  tien_do_hoc: number | null
): number {
  if (tien_do_hoc == null || !Number.isFinite(tien_do_hoc)) return -1;
  const i = exercises.findIndex((e) => e.id === tien_do_hoc);
  return i;
}

export function formatLessonLabel(ex: LopCurriculumExercise, listIndex: number): string {
  if (ex.bai_so != null && Number.isFinite(ex.bai_so)) return `Bài ${ex.bai_so}`;
  return `Bài ${listIndex + 1}`;
}
