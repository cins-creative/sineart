import type { SupabaseClient } from "@supabase/supabase-js";

/** Bài tập `hv_he_thong_bai_tap` thuộc đúng `mon_hoc` của lớp — đã sắp xếp thứ tự học. */
export type LopCurriculumExercise = {
  id: number;
  ten_bai_tap: string;
  bai_so: number | null;
  thumbnail: string | null;
};

/**
 * Lấy toàn bộ bài tập của môn học của lớp (`ql_lop_hoc.mon_hoc` → `hv_he_thong_bai_tap`).
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

  const { data: mh } = await supabase
    .from("ql_mon_hoc")
    .select("ten_mon_hoc")
    .eq("id", monId)
    .maybeSingle();

  const subjectName =
    mh && typeof (mh as { ten_mon_hoc?: unknown }).ten_mon_hoc === "string"
      ? String((mh as { ten_mon_hoc: string }).ten_mon_hoc).trim() || null
      : null;

  const { data: rows, error: e2 } = await supabase
    .from("hv_he_thong_bai_tap")
    .select("id, ten_bai_tap, bai_so, thumbnail")
    .eq("mon_hoc", monId);

  if (e2) throw new Error(e2.message);

  const exercises: LopCurriculumExercise[] = (rows ?? [])
    .map((raw) => {
      const r = raw as {
        id: unknown;
        ten_bai_tap?: unknown;
        bai_so?: unknown;
        thumbnail?: unknown;
      };
      const id = Number(r.id);
      const bs = r.bai_so != null && Number.isFinite(Number(r.bai_so)) ? Number(r.bai_so) : null;
      return {
        id,
        ten_bai_tap: String(r.ten_bai_tap ?? "").trim() || "Bài tập",
        bai_so: bs,
        thumbnail: r.thumbnail != null ? String(r.thumbnail).trim() || null : null,
      };
    })
    .filter((x) => Number.isFinite(x.id));

  exercises.sort((a, b) => {
    const ao = a.bai_so ?? Number.MAX_SAFE_INTEGER;
    const bo = b.bai_so ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.id - b.id;
  });

  return { exercises, subjectName, monHocId: monId };
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
