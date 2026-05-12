import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminLopRow } from "@/types/admin-lop-hoc";
import { parseTeacherIds } from "@/lib/utils/parse-teacher-ids";

/** Số card mỗi trang — trang đầu chỉ query tối đa nhiêu đây bản ghi. */
export const LOP_LIST_PAGE_SIZE = 6;

const LOP_SELECT_FULL =
  "id, class_name, class_full_name, mon_hoc, teacher, chi_nhanh_id, avatar, lich_hoc, url_class, url_google_meet, group_chat_messenger, device, special, tinh_trang, is_active, level_hinh_hoa";
const LOP_SELECT_MIN =
  "id, class_name, class_full_name, mon_hoc, teacher, chi_nhanh_id, avatar, lich_hoc, url_class, group_chat_messenger, device, special, tinh_trang, is_active";

export type LopHocListFilters = {
  q: string;
  mon: number | null;
  special: boolean;
  tinhTrang: "" | "active" | "inactive";
};

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function mapRawToAdminLopRow(raw: Record<string, unknown>): AdminLopRow {
  const id = Number(raw.id);
  const teacherIds = parseTeacherIds(raw.teacher);
  return {
    id: Number.isFinite(id) && id > 0 ? id : 0,
    class_name: raw.class_name != null ? String(raw.class_name).trim() || null : null,
    class_full_name: raw.class_full_name != null ? String(raw.class_full_name).trim() || null : null,
    mon_hoc: raw.mon_hoc != null && Number.isFinite(Number(raw.mon_hoc)) ? Number(raw.mon_hoc) : null,
    teacher: teacherIds,
    chi_nhanh_id:
      raw.chi_nhanh_id != null && Number.isFinite(Number(raw.chi_nhanh_id)) ? Number(raw.chi_nhanh_id) : null,
    avatar: raw.avatar != null ? String(raw.avatar).trim() || null : null,
    lich_hoc: raw.lich_hoc != null ? String(raw.lich_hoc).trim() || null : null,
    url_class: raw.url_class != null ? String(raw.url_class).trim() || null : null,
    url_google_meet: raw.url_google_meet != null ? String(raw.url_google_meet).trim() || null : null,
    group_chat_messenger:
      raw.group_chat_messenger != null && String(raw.group_chat_messenger).trim() !== ""
        ? String(raw.group_chat_messenger).trim()
        : null,
    device: raw.device != null ? String(raw.device).trim() || null : null,
    special: raw.special != null && String(raw.special).trim() !== "",
    tinh_trang: raw.tinh_trang !== false,
    is_active: raw.is_active !== false,
    level_hinh_hoa:
      raw.level_hinh_hoa != null && String(raw.level_hinh_hoa).trim() !== ""
        ? String(raw.level_hinh_hoa).trim()
        : null,
  };
}

export function parseLopHocListSearchParams(
  sp: Record<string, string | string[] | undefined>
): { page: number; filters: LopHocListFilters } {
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const n = Number(rawPage);
  const page = Math.max(1, Number.isFinite(n) ? Math.floor(n) : 1);

  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (rawQ ?? "").trim();

  const rawMon = Array.isArray(sp.mon) ? sp.mon[0] : sp.mon;
  const monN = Number(rawMon);
  const mon = rawMon != null && rawMon !== "" && Number.isFinite(monN) && monN > 0 ? monN : null;

  const rawSp = Array.isArray(sp.special) ? sp.special[0] : sp.special;
  const special = rawSp === "1" || rawSp === "true";

  const rawTt = Array.isArray(sp.tt) ? sp.tt[0] : sp.tt;
  let tinhTrang: "" | "active" | "inactive" = "";
  if (rawTt === "active" || rawTt === "inactive") tinhTrang = rawTt;

  return { page, filters: { q, mon, special, tinhTrang } };
}

function buildListQuery(
  supabase: SupabaseClient,
  select: string,
  filters: LopHocListFilters,
  teacherIdsMatchingQ: number[]
) {
  let q = supabase.from("ql_lop_hoc").select(select, { count: "exact" }).order("class_full_name", { ascending: true });

  if (filters.mon != null) {
    q = q.eq("mon_hoc", filters.mon);
  }
  if (filters.special) {
    q = q.eq("special", "Cấp tốc");
  }
  if (filters.tinhTrang === "active") {
    q = q.eq("tinh_trang", true);
  } else if (filters.tinhTrang === "inactive") {
    q = q.eq("tinh_trang", false);
  }

  const qq = filters.q.trim();
  if (qq) {
    const esc = escapeIlike(qq);
    const orParts: string[] = [`class_name.ilike.%${esc}%`, `class_full_name.ilike.%${esc}%`];
    const tids = teacherIdsMatchingQ.filter((tid) => Number.isFinite(tid) && tid > 0);
    if (tids.length) {
      orParts.push(`teacher.ov.{${tids.join(",")}}`);
    }
    q = q.or(orParts.join(","));
  }

  return q;
}

export async function resolveTeacherIdsForSearch(
  supabase: SupabaseClient,
  q: string
): Promise<number[]> {
  const qq = q.trim();
  if (!qq) return [];
  const esc = escapeIlike(qq);
  const { data, error } = await supabase.from("hr_nhan_su").select("id").ilike("full_name", `%${esc}%`);
  if (error || !data?.length) return [];
  const ids = (data as { id?: unknown }[])
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  return [...new Set(ids)];
}

export type FetchLopHocPageResult =
  | {
      ok: true;
      rows: AdminLopRow[];
      page: number;
      pageSize: number;
      total: number;
      usedMinSelect: boolean;
    }
  | { ok: false; error: string };

/**
 * Một trang lớp học (range + count) + bộ lọc URL.
 * `teacher.cs.{id}` cần cột `teacher` dạng mảng; nếu lỗi schema, thử lại không gõ theo GV (chỉ tên lớp).
 */
export async function fetchLopHocPage(
  supabase: SupabaseClient,
  page: number,
  filters: LopHocListFilters
): Promise<FetchLopHocPageResult> {
  const pageSize = LOP_LIST_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const teacherIds = await resolveTeacherIdsForSearch(supabase, filters.q);

  const run = async (select: string): Promise<FetchLopHocPageResult> => {
    const query = buildListQuery(supabase, select, filters, teacherIds);
    const { data, error, count } = await query.range(from, to);
    if (error) {
      return { ok: false, error: error.message };
    }
    const rows = (Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : []).map(mapRawToAdminLopRow).filter((r) => r.id > 0);
    return {
      ok: true,
      rows,
      page,
      pageSize,
      total: count ?? 0,
      usedMinSelect: select === LOP_SELECT_MIN,
    };
  };

  let res = await run(LOP_SELECT_FULL);
  if (!res.ok) {
    const msg = res.error.toLowerCase();
    if (msg.includes("column") || msg.includes("schema")) {
      res = await run(LOP_SELECT_MIN);
    }
  }

  if (!res.ok && filters.q.trim()) {
    res = await fetchLopHocPageNameOnly(supabase, page, filters, LOP_SELECT_FULL);
    if (!res.ok) {
      const msg = res.error.toLowerCase();
      if (msg.includes("column") || msg.includes("schema")) {
        res = await fetchLopHocPageNameOnly(supabase, page, filters, LOP_SELECT_MIN);
      }
    }
  }

  return res;
}

/** Giống fetchLopHocPage nhưng bỏ nhánh tìm theo GV (chỉ class_name / class_full_name). */
async function fetchLopHocPageNameOnly(
  supabase: SupabaseClient,
  page: number,
  filters: LopHocListFilters,
  select: string
): Promise<FetchLopHocPageResult> {
  const f: LopHocListFilters = { ...filters, q: filters.q };
  const pageSize = LOP_LIST_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase.from("ql_lop_hoc").select(select, { count: "exact" }).order("class_full_name", { ascending: true });
  if (f.mon != null) q = q.eq("mon_hoc", f.mon);
  if (f.special) q = q.eq("special", "Cấp tốc");
  if (f.tinhTrang === "active") q = q.eq("tinh_trang", true);
  else if (f.tinhTrang === "inactive") q = q.eq("tinh_trang", false);
  const qq = f.q.trim();
  if (qq) {
    const esc = escapeIlike(qq);
    q = q.or(`class_name.ilike.%${esc}%,class_full_name.ilike.%${esc}%`);
  }
  const { data, error, count } = await q.range(from, to);
  if (error) return { ok: false, error: error.message };
  const rows = (Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : []).map(mapRawToAdminLopRow).filter((r) => r.id > 0);
  return { ok: true, rows, page, pageSize, total: count ?? 0, usedMinSelect: select === LOP_SELECT_MIN };
}

/** Đếm tổng số lớp trong DB (không filter) — hiển thị subtitle. */
export async function fetchTotalLopCountUnfiltered(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase.from("ql_lop_hoc").select("id", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

/** Lấy toàn bộ id lớp (nhẹ) để gọi thống kê HV toàn hệ thống. */
export async function fetchAllLopIds(supabase: SupabaseClient): Promise<number[]> {
  const out: number[] = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await supabase.from("ql_lop_hoc").select("id").order("id", { ascending: true }).range(from, from + PAGE - 1);
    if (error) break;
    const chunk = (data ?? []) as { id?: unknown }[];
    if (!chunk.length) break;
    for (const r of chunk) {
      const id = Number(r.id);
      if (Number.isFinite(id) && id > 0) out.push(id);
    }
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return out;
}
