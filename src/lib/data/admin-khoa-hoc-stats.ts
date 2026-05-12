import type { SupabaseClient } from "@supabase/supabase-js";

import { buildCourseSlugIndex, normalizeClassSlug, slugifyTenMonHoc } from "@/lib/data/courses-page";
import { fetchKyByKhoaHocVienIds } from "@/lib/data/hp-thu-hp-chi-tiet-ky";

const PAGE = 1000;
const IN_CHUNK = 200;

/** Ghi danh còn trong kỳ theo ngày cuối kỳ trên `hp_thu_hp_chi_tiet`. */
function enrollmentCountsAsActive(ngay_cuoi_ky: string | null): boolean {
  if (ngay_cuoi_ky == null || ngay_cuoi_ky.trim() === "") return true;
  try {
    const e = new Date(ngay_cuoi_ky.trim().slice(0, 10));
    e.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return e.getTime() >= t.getTime();
  } catch {
    return true;
  }
}

async function fetchAllLopsWithMon(
  supabase: SupabaseClient
): Promise<{ id: number; mon_hoc: number }[]> {
  const out: { id: number; mon_hoc: number }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ql_lop_hoc")
      .select("id, mon_hoc")
      .not("mon_hoc", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    for (const raw of data as { id?: unknown; mon_hoc?: unknown }[]) {
      const id = Number(raw.id);
      const mon = Number(raw.mon_hoc);
      if (Number.isFinite(id) && id > 0 && Number.isFinite(mon) && mon > 0) {
        out.push({ id, mon_hoc: mon });
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function fetchEnrollmentsForLopIds(
  supabase: SupabaseClient,
  lopIds: number[]
): Promise<{ lop_hoc: number; hoc_vien_id: string; ok: boolean }[]> {
  const rows: { lop_hoc: number; hoc_vien_id: string; qlId: number }[] = [];
  const unique = [...new Set(lopIds)].filter((id) => Number.isFinite(id) && id > 0);
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const chunk = unique.slice(i, i + IN_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("ql_quan_ly_hoc_vien")
        .select("id, lop_hoc, hoc_vien_id")
        .in("lop_hoc", chunk)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error || !data?.length) break;
      for (const raw of data as {
        id?: unknown;
        lop_hoc?: unknown;
        hoc_vien_id?: unknown;
      }[]) {
        const lid = Number(raw.lop_hoc);
        const hv = raw.hoc_vien_id;
        const hvKey = hv != null && String(hv).trim() !== "" ? String(hv).trim() : "";
        const qlId = Number(raw.id);
        if (!Number.isFinite(lid) || lid <= 0 || !hvKey || !Number.isFinite(qlId) || qlId <= 0) continue;
        rows.push({ lop_hoc: lid, hoc_vien_id: hvKey, qlId });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const kyMap = await fetchKyByKhoaHocVienIds(
    supabase,
    rows.map((r) => r.qlId)
  );

  return rows.map((r) => ({
    lop_hoc: r.lop_hoc,
    hoc_vien_id: r.hoc_vien_id,
    ok: enrollmentCountsAsActive(kyMap.get(r.qlId)?.ngay_cuoi_ky ?? null),
  }));
}

/**
 * Theo mỗi `ql_mon_hoc.id`: số lớp (`ql_lop_hoc.mon_hoc`) và số học viên distinct
 * (`ql_quan_ly_hoc_vien.hoc_vien_id`) đang ghi danh hoạt động trên các lớp đó.
 */
export async function fetchMonHocLopAndStudentCounts(
  supabase: SupabaseClient,
  monIds: number[]
): Promise<Map<number, { soLop: number; soHocVien: number }>> {
  const map = new Map<number, { soLop: number; soHocVien: number }>();
  const validMon = new Set(monIds.filter((id) => Number.isFinite(id) && id > 0));
  for (const id of validMon) {
    map.set(id, { soLop: 0, soHocVien: 0 });
  }

  const lops = await fetchAllLopsWithMon(supabase);
  const lopToMon = new Map<number, number>();
  for (const l of lops) {
    if (!validMon.has(l.mon_hoc)) continue;
    lopToMon.set(l.id, l.mon_hoc);
    const cur = map.get(l.mon_hoc);
    if (cur) cur.soLop += 1;
  }

  const lopIds = [...lopToMon.keys()];
  if (!lopIds.length) return map;

  const enrollments = await fetchEnrollmentsForLopIds(supabase, lopIds);
  const hvByMon = new Map<number, Set<string>>();
  for (const id of validMon) hvByMon.set(id, new Set());

  for (const e of enrollments) {
    if (!e.ok) continue;
    const monId = lopToMon.get(e.lop_hoc);
    if (monId == null || !hvByMon.has(monId)) continue;
    hvByMon.get(monId)!.add(e.hoc_vien_id);
  }

  for (const id of validMon) {
    const cur = map.get(id);
    if (cur) cur.soHocVien = hvByMon.get(id)?.size ?? 0;
  }

  return map;
}

/**
 * Slug đường dẫn `/khoa-hoc/[slug]` cho từng môn — ưu tiên `url_class` lớp (khớp site),
 * fallback `idToSlug` từ `buildCourseSlugIndex` (tên môn).
 */
export async function fetchPublicKhoaSlugByMonIds(
  supabase: SupabaseClient,
  mons: { id: number; ten_mon_hoc: string }[],
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const valid = mons.filter((m) => Number.isFinite(m.id) && m.id > 0);
  if (!valid.length) return out;

  const forIndex = valid.map(
    (m) =>
      ({
        id: m.id,
        ten_mon_hoc: m.ten_mon_hoc,
        thumbnail: null,
        loai_khoa_hoc: null,
        thu_tu_hien_thi: 0,
        is_featured: false,
      }) as import("@/types/homepage").MonHoc,
  );
  const { idToSlug } = buildCourseSlugIndex(forIndex);

  const monSet = new Set(valid.map((m) => m.id));
  const lopSlugsByMon = new Map<number, Set<string>>();

  const monIds = [...monSet];
  for (let i = 0; i < monIds.length; i += IN_CHUNK) {
    const chunk = monIds.slice(i, i + IN_CHUNK);
    const { data, error } = await supabase
      .from("ql_lop_hoc")
      .select("mon_hoc, url_class")
      .in("mon_hoc", chunk)
      .not("url_class", "is", null);
    if (error) break;
    for (const raw of (data ?? []) as { mon_hoc?: unknown; url_class?: unknown }[]) {
      const mid = Number(raw.mon_hoc);
      if (!Number.isFinite(mid) || mid <= 0 || !monSet.has(mid)) continue;
      const s = normalizeClassSlug(raw.url_class != null ? String(raw.url_class) : "");
      if (!s) continue;
      if (!lopSlugsByMon.has(mid)) lopSlugsByMon.set(mid, new Set());
      lopSlugsByMon.get(mid)!.add(s);
    }
  }

  for (const m of valid) {
    const nameSlug = idToSlug.get(m.id) ?? slugifyTenMonHoc(m.ten_mon_hoc);
    const cand = lopSlugsByMon.get(m.id);
    let slug = nameSlug;
    if (cand?.size) {
      if (cand.has(nameSlug)) slug = nameSlug;
      else slug = [...cand].sort((a, b) => a.localeCompare(b, "vi"))[0] ?? nameSlug;
    }
    out.set(m.id, slug);
  }

  return out;
}
