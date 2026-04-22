import type { SupabaseClient } from "@supabase/supabase-js";

export type ExerciseItem = {
  id: number;
  so: string;
  tenBai: string;
  mon: string;
  thumb: string | null;
  order: number;
};

export type StudentManageRow = {
  enrollmentId: number;
  studentId: number;
  name: string;
  email: string;
  namThi: string;
  className: string;
  status: string;
  tienDoId: number | null;
  currentEx: ExerciseItem | null;
  latest: Record<string, ExerciseItem>;
  /** `null` = đang tải từ `ql_hv_truong_nganh`; `[]` = chưa khai báo. */
  truongNganhPairs: { truong: string; nganh: string }[] | null;
};

export function buildExerciseModel(rows: unknown[]): {
  exMap: Record<number, ExerciseItem>;
  bySubject: Record<string, ExerciseItem[]>;
  totalBySubject: Record<string, number>;
} {
  const exMap: Record<number, ExerciseItem> = {};
  const bySubject: Record<string, ExerciseItem[]> = {};
  const totalBySubject: Record<string, number> = {};

  for (const raw of rows) {
    const r = raw as {
      id: unknown;
      ten_bai_tap?: unknown;
      bai_so?: unknown;
      thumbnail?: unknown;
      mon_hoc?: { ten_mon_hoc?: unknown } | null;
    };
    const id = Number(r.id);
    if (!Number.isFinite(id)) continue;
    const mon: string =
      r.mon_hoc != null && typeof r.mon_hoc === "object" && "ten_mon_hoc" in r.mon_hoc
        ? String((r.mon_hoc as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim() ||
          "Chưa phân loại"
        : "Chưa phân loại";
    const so = r.bai_so ?? null;
    const order =
      parseFloat(String(so ?? "").replace(/[^0-9.]/g, "")) || 9999;
    const ex: ExerciseItem = {
      id,
      so: String(so ?? ""),
      tenBai: String(r.ten_bai_tap ?? ""),
      mon,
      thumb: r.thumbnail != null ? String(r.thumbnail) : null,
      order,
    };
    exMap[id] = ex;
    if (!bySubject[mon]) bySubject[mon] = [];
    bySubject[mon].push(ex);
  }

  for (const m of Object.keys(bySubject)) {
    bySubject[m].sort((a, b) => a.order - b.order);
    const valid = bySubject[m].map((e) => e.order).filter((n) => n !== 9999);
    totalBySubject[m] = valid.length ? Math.max(...valid) : bySubject[m].length;
  }

  return { exMap, bySubject, totalBySubject };
}

function buildStudentRows(
  enrollments: { id: unknown; hoc_vien_id: unknown; tien_do_hoc: unknown; status?: unknown }[],
  profileByHv: Map<number, { full_name: string; email: string; nam_thi: string | null }>,
  exMap: Record<number, ExerciseItem>,
  className: string,
  statusFallback: string
): StudentManageRow[] {
  const out: StudentManageRow[] = [];
  for (const r of enrollments) {
    const eid = Number(r.id);
    const hvId = Number(r.hoc_vien_id);
    if (!Number.isFinite(eid) || !Number.isFinite(hvId)) continue;
    const prof = profileByHv.get(hvId);
    const name = prof?.full_name?.trim() || "—";
    const email = prof?.email ?? "";
    const namThi = prof?.nam_thi != null ? String(prof.nam_thi) : "—";
    const td = r.tien_do_hoc != null && r.tien_do_hoc !== "" ? Number(r.tien_do_hoc) : null;
    const tienDoObj =
      td != null && Number.isFinite(td) ? exMap[td] ?? null : null;
    const latest: Record<string, ExerciseItem> = {};
    if (tienDoObj) latest[tienDoObj.mon] = tienDoObj;
    const st =
      r.status != null && String(r.status).trim() !== ""
        ? String(r.status)
        : statusFallback;

    out.push({
      enrollmentId: eid,
      studentId: hvId,
      name,
      email,
      namThi,
      className,
      status: st,
      tienDoId: td != null && Number.isFinite(td) ? td : null,
      currentEx: tienDoObj,
      latest,
      truongNganhPairs: null,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  return out;
}

/** Bài tập toàn hệ thống (kèm tên môn). */
export async function fetchExercisesForManage(supabase: SupabaseClient): Promise<unknown[]> {
  const { data, error } = await supabase
    .from("hv_he_thong_bai_tap")
    .select("id, ten_bai_tap, bai_so, thumbnail, mon_hoc ( ten_mon_hoc )")
    .order("bai_so", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** `ql_mon_hoc.ten_mon_hoc` của lớp — dùng để chỉ hiện bài tập đúng môn lớp. */
export async function fetchTenMonHocForLop(
  supabase: SupabaseClient,
  lopHocId: number
): Promise<string | null> {
  const { data, error } = await supabase
    .from("ql_lop_hoc")
    .select("mon_hoc ( ten_mon_hoc )")
    .eq("id", lopHocId)
    .maybeSingle();

  if (error) return null;
  const row = data as { mon_hoc?: { ten_mon_hoc?: unknown } | null } | null;
  const t = String(row?.mon_hoc?.ten_mon_hoc ?? "").trim();
  return t || null;
}

/**
 * Khớp tên môn từ DB lớp với key trong `exBySubject` (trùng chuỗi hoặc gần đúng).
 */
export function resolveExerciseSubjectKey(
  tenMonHoc: string | null | undefined,
  exBySubject: Record<string, ExerciseItem[]>,
  allSubjects: string[]
): string | null {
  const raw = tenMonHoc?.trim();
  if (!raw) return null;
  if ((exBySubject[raw]?.length ?? 0) > 0) return raw;
  const lower = raw.toLowerCase();
  const exact = allSubjects.find((m) => m.toLowerCase() === lower);
  if (exact && (exBySubject[exact]?.length ?? 0) > 0) return exact;
  const fuzzy = allSubjects.find(
    (m) => m.toLowerCase().includes(lower) || lower.includes(m.toLowerCase())
  );
  if (fuzzy && (exBySubject[fuzzy]?.length ?? 0) > 0) return fuzzy;
  return null;
}

/**
 * Ghi danh lớp hiện tại + hồ sơ HV. Không dùng cột `status` nếu DB không có (fallback "Đang học").
 */
export async function fetchStudentsForClassManage(
  supabase: SupabaseClient,
  lopHocId: number,
  classDisplayName: string
): Promise<StudentManageRow[]> {
  let rows: { id: unknown; hoc_vien_id: unknown; tien_do_hoc: unknown; status?: unknown }[] =
    [];

  const res = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("id, hoc_vien_id, tien_do_hoc, status")
    .eq("lop_hoc", lopHocId);

  if (res.error) {
    const res2 = await supabase
      .from("ql_quan_ly_hoc_vien")
      .select("id, hoc_vien_id, tien_do_hoc")
      .eq("lop_hoc", lopHocId);
    if (res2.error) throw new Error(res2.error.message);
    rows = (res2.data ?? []) as typeof rows;
  } else {
    rows = (res.data ?? []) as typeof rows;
  }

  if (!rows.length) return [];

  const hvIds = [...new Set(rows.map((r) => Number(r.hoc_vien_id)).filter(Number.isFinite))];
  const { data: profiles, error: pErr } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select("id, full_name, email, nam_thi")
    .in("id", hvIds);

  if (pErr) throw new Error(pErr.message);

  const profileByHv = new Map<number, { full_name: string; email: string; nam_thi: string | null }>();
  for (const p of profiles ?? []) {
    const id = Number((p as { id: unknown }).id);
    if (!Number.isFinite(id)) continue;
    profileByHv.set(id, {
      full_name: String((p as { full_name?: unknown }).full_name ?? ""),
      email: String((p as { email?: unknown }).email ?? ""),
      nam_thi:
        (p as { nam_thi?: unknown }).nam_thi != null
          ? String((p as { nam_thi?: unknown }).nam_thi)
          : null,
    });
  }

  const exRows = await fetchExercisesForManage(supabase);
  const { exMap } = buildExerciseModel(exRows);

  return buildStudentRows(rows, profileByHv, exMap, classDisplayName, "Đang học");
}

export async function fetchStudentUniMajor(
  supabase: SupabaseClient,
  hocVienId: number
): Promise<{ truong: string; nganh: string }> {
  const { data, error } = await supabase
    .from("ql_hv_truong_nganh")
    .select("truong_dai_hoc ( ten_truong_dai_hoc ), nganh_dao_tao ( ten_nganh )")
    .eq("hoc_vien", hocVienId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return { truong: "—", nganh: "—" };
  const row = data as {
    truong_dai_hoc?: { ten_truong_dai_hoc?: unknown } | null;
    nganh_dao_tao?: { ten_nganh?: unknown } | null;
  };
  return {
    truong: String(row.truong_dai_hoc?.ten_truong_dai_hoc ?? "").trim() || "—",
    nganh: String(row.nganh_dao_tao?.ten_nganh ?? "").trim() || "—",
  };
}

/**
 * Giáo viên cập nhật `ql_quan_ly_hoc_vien.tien_do_hoc` — đi qua API service role
 * vì RLS chỉ cho anon SELECT. API tự verify `teacherHrId` là chủ nhiệm lớp + bài
 * tập cùng môn với lớp. Truyền `baiTapId = null` để xoá tiến độ.
 */
export async function patchEnrollmentProgress(args: {
  lopHocId: number;
  enrollmentId: number;
  teacherHrId: number;
  baiTapId: number | null;
}): Promise<void> {
  const res = await fetch("/api/phong-hoc/save-student-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lopHocId: args.lopHocId,
      enrollmentQlhvId: args.enrollmentId,
      teacherHrId: args.teacherHrId,
      baiTapId: args.baiTapId,
    }),
  });
  type SaveProgressResponse = { ok?: boolean; error?: string };
  let payload: SaveProgressResponse | null = null;
  try {
    payload = (await res.json()) as SaveProgressResponse;
  } catch {
    /* ignore */
  }
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error || `Lưu tiến độ thất bại (HTTP ${res.status}).`);
  }
}
