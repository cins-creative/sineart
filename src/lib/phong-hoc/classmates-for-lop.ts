import type { SupabaseClient } from "@supabase/supabase-js";

/** Một dòng học viên trong lớp — dùng tab Lớp / Qlý (ClassroomClient). */
export type ClassmateListRow = {
  /** `ql_quan_ly_hoc_vien.id` — khớp `hv_chatbox.name` khi HV gửi chat. */
  enrollmentId: number;
  hvId: number;
  n: string;
  i: string;
  c: string;
  st: true | false | "late";
  sub: boolean;
  /** Nhãn «Bài 7» / «Bài 3.2» từ `bai_so` hoặc fallback tên ngắn. */
  ex: string | null;
  /** `ten_bai_tap` — hiển thị kèm: «Bài 7 - Phân tích cấu trúc». */
  exTitle: string | null;
  /** Tên môn (dự phòng khi không có tên bài). */
  exMon: string | null;
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

type QlhvRow = { id: unknown; hoc_vien_id: unknown; tien_do_hoc: unknown };

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
    .select("id, hoc_vien_id, tien_do_hoc")
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

  const hvIds = uniqueRows.map((r) => Number(r.hoc_vien_id)).filter(Number.isFinite);
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
      uniqueRows
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

  const out: ClassmateListRow[] = [];
  for (const r of uniqueRows) {
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
    out.push({
      enrollmentId: Number.isFinite(enrollmentId) && enrollmentId > 0 ? enrollmentId : 0,
      hvId,
      n,
      i: initialFromName(n),
      c: colorForHvId(hvId),
      st: true,
      sub: false,
      ex,
      exTitle,
      exMon,
    });
  }

  out.sort((a, b) => a.n.localeCompare(b.n, "vi"));
  return out;
}
