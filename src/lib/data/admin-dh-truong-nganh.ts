import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DH_MON_THI_ARRAY_MAX_COUNT,
  DH_MON_THI_ITEM_MAX_LEN,
} from "@/lib/agent/dh-exam-profiles";
import { slugifyVi } from "@/lib/admin/tra-cuu-schema";
import { isEnrollmentDangHocByKy } from "@/lib/data/admin-qlhv-tinh-trang";
import { fetchKyByKhoaHocVienIds } from "@/lib/data/hp-thu-hp-chi-tiet-ky";

export type AdminDhTruongLookup = {
  id: number;
  ten: string;
  /** `dh_truong_dai_hoc.score` — điểm chuẩn / thang ưu tiên trường (thấp hơn = ưu tiên cao hơn). */
  score: number | null;
};

/** Thẻ danh sách trường admin — thêm số HV đang học (đăng ký thi) & số ngành từ `dh_truong_nganh`. */
export type AdminDhTruongListCard = AdminDhTruongLookup & {
  /** Học viên distinct có ít nhất một ghi danh «Đang học» theo kỳ HP (`isEnrollmentDangHocByKy`, không dùng cột `status` trên `ql_quan_ly_hoc_vien`) và có ≥1 dòng `ql_hv_truong_nganh` cho trường này. */
  hocVienDangKyThi: number;
  /** Số dòng `dh_truong_nganh` (= ngành đào tạo gắn với trường). */
  soNganhDaoTao: number;
};

export type AdminDhTruongNganhRow = {
  truong_id: number;
  ten_truong: string;
  /** Copy từ `dh_truong_dai_hoc.score` — chỉ để hiển thị & sắp xếp. */
  truong_score: number | null;
  nganh_id: number;
  ten_nganh: string;
  mon_thi: string[];
  details: string | null;
};

/**
 * Một dòng nguyện vọng dự thi của học viên (`ql_hv_truong_nganh` join
 * `ql_thong_tin_hoc_vien` + `dh_nganh_dao_tao`). Một học viên có thể xuất hiện
 * nhiều dòng nếu đăng ký nhiều ngành.
 */
export type AdminDhStudentExamRow = {
  /** `ql_hv_truong_nganh.id` — duy nhất theo dòng nguyện vọng. */
  id: number;
  hoc_vien_id: number;
  full_name: string;
  sdt: string | null;
  email: string | null;
  facebook: string | null;
  truong_id: number;
  ten_truong: string;
  nganh_id: number | null;
  ten_nganh: string;
  nam_thi: number | null;
  ghi_chu: string | null;
  /** `ql_hv_truong_nganh.score` — điểm thi tư vấn nhập sau khi có kết quả. */
  score: number | null;
  /** `ql_hv_truong_nganh.mon_thi_chon` — môn/hình thức đăng thi (khớp catalog `dh_truong_nganh.mon_thi`). */
  mon_thi_chon: string | null;
};

/** Một mốc trong `dh_moc_lich_tuyen_sinh`. */
export type AdminDhMocLichRow = {
  id: number;
  truong_dai_hoc: number;
  nam_tuyen_sinh: number;
  ten_moc: string | null;
  thoi_gian_mo_ta: string;
  ghi_chu: string | null;
  nguon_thong_bao: string | null;
  thu_tu: number;
  cap_nhat_luc: string | null;
};

/** Admin: giữ mọi nhãn hợp lệ (gợi ý + tùy chỉnh), giới hạn độ dài & số phần tử. */
function parseMonThiArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    let t = x.trim();
    if (!t) continue;
    if (t.length > DH_MON_THI_ITEM_MAX_LEN) t = t.slice(0, DH_MON_THI_ITEM_MAX_LEN);
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= DH_MON_THI_ARRAY_MAX_COUNT) break;
  }
  return out;
}

function parseTruongScore(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Sắp xếp: score tăng dần = trường ưu tiên trước; thiếu score xếp sau. */
function sortKeyScore(v: number | null): number {
  return v == null || !Number.isFinite(v) ? Number.POSITIVE_INFINITY : v;
}

/** Client/server — dropdown & API: điểm thấp trước, không có điểm cuối cùng. */
export function sortDhTruongLookupByScore<T extends AdminDhTruongLookup>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const sa = sortKeyScore(a.score);
    const sb = sortKeyScore(b.score);
    if (sa !== sb) return sa - sb;
    return a.ten.localeCompare(b.ten, "vi");
  });
}

export async function fetchDhTruongLookupOrdered(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: AdminDhTruongLookup[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.from("dh_truong_dai_hoc").select("id, ten_truong_dai_hoc, score");

  if (error) return { ok: false, error: error.message };

  const rows: AdminDhTruongLookup[] = [];
  for (const r of data ?? []) {
    const row = r as { id?: unknown; ten_truong_dai_hoc?: unknown; score?: unknown };
    const id = Number(row.id);
    const ten = String(row.ten_truong_dai_hoc ?? "").trim();
    if (!Number.isFinite(id) || id <= 0 || !ten) continue;
    rows.push({ id, ten, score: parseTruongScore(row.score) });
  }
  return { ok: true, rows: sortDhTruongLookupByScore(rows) };
}

/**
 * Danh sách cặp trường–ngành (`dh_truong_nganh`). Thứ tự: theo `dh_truong_dai_hoc.score` tăng dần
 * (điểm càng thấp càng ưu tiên), rồi tên ngành.
 * @param truongFilterId — chỉ lấy một trường; `null` = tất cả.
 */
export async function fetchAdminDhTruongNganhRows(
  supabase: SupabaseClient,
  truongFilterId: number | null,
): Promise<{ ok: true; rows: AdminDhTruongNganhRow[] } | { ok: false; error: string }> {
  let q = supabase.from("dh_truong_nganh").select(
    `
      truong_dai_hoc,
      nganh_dao_tao,
      mon_thi,
      details,
      dh_truong_dai_hoc ( id, ten_truong_dai_hoc, score ),
      dh_nganh_dao_tao ( id, ten_nganh )
    `,
  );

  if (truongFilterId != null && Number.isFinite(truongFilterId) && truongFilterId > 0) {
    q = q.eq("truong_dai_hoc", truongFilterId);
  }

  const { data, error } = await q;

  if (error) return { ok: false, error: error.message };

  const mapped: AdminDhTruongNganhRow[] = [];
  for (const raw of data ?? []) {
    const r = raw as Record<string, unknown>;
    const tr = r.dh_truong_dai_hoc as { ten_truong_dai_hoc?: string; score?: unknown } | null;
    const ng = r.dh_nganh_dao_tao as { ten_nganh?: string } | null;
    const tid = Number(r.truong_dai_hoc);
    const nid = Number(r.nganh_dao_tao);
    if (!Number.isFinite(tid) || !Number.isFinite(nid)) continue;

    const truongScore = tr != null ? parseTruongScore(tr.score) : null;

    mapped.push({
      truong_id: tid,
      ten_truong: String(tr?.ten_truong_dai_hoc ?? "").trim() || `Trường #${tid}`,
      truong_score: truongScore,
      nganh_id: nid,
      ten_nganh: String(ng?.ten_nganh ?? "").trim() || `Ngành #${nid}`,
      mon_thi: parseMonThiArray(r.mon_thi),
      details: typeof r.details === "string" && r.details.trim() ? r.details.trim() : null,
    });
  }

  mapped.sort((a, b) => {
    const sa = sortKeyScore(a.truong_score);
    const sb = sortKeyScore(b.truong_score);
    if (sa !== sb) return sa - sb;
    const tc = a.ten_truong.localeCompare(b.ten_truong, "vi");
    if (tc !== 0) return tc;
    return a.ten_nganh.localeCompare(b.ten_nganh, "vi");
  });

  return { ok: true, rows: mapped };
}

const STUDENT_PAGE = 1000;

function nIdLoose(v: unknown): number | null {
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Gom nhanh cho thẻ danh sách trường: HV distinct theo `truong_dai_hoc` trong `ql_hv_truong_nganh`,
 * **chỉ** học viên có ít nhất một ghi danh «Đang học» theo kỳ HP (`fetchKyByKhoaHocVienIds` + `isEnrollmentDangHocByKy`, cùng Quản lý học viên — không dùng cột `status` trên `ql_quan_ly_hoc_vien`);
 * và số ngành (số dòng `dh_truong_nganh`) theo từng trường.
 */
export async function fetchAdminDhTruongListCardAggregates(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; hvCountByTruong: Map<number, number>; nganhCountByTruong: Map<number, number> }
  | { ok: false; error: string }
> {
  const activeHvIds = new Set<number>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ql_quan_ly_hoc_vien")
      .select("id, hoc_vien_id")
      .range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;

    const qlIds = batch
      .map((r) => nIdLoose(r.id))
      .filter((id): id is number => id != null);
    const kyMap = await fetchKyByKhoaHocVienIds(supabase, qlIds);

    for (const r of batch) {
      const qid = nIdLoose(r.id);
      const hid = nIdLoose(r.hoc_vien_id);
      if (qid == null || hid == null) continue;
      const ky = kyMap.get(qid);
      if (isEnrollmentDangHocByKy(ky?.ngay_dau_ky, ky?.ngay_cuoi_ky)) activeHvIds.add(hid);
    }

    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  const truongToHv = new Map<number, Set<number>>();
  from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ql_hv_truong_nganh")
      .select("truong_dai_hoc, hoc_vien")
      .range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const r of batch) {
      const tid = nIdLoose(r.truong_dai_hoc);
      const hv = nIdLoose(r.hoc_vien);
      if (tid == null || hv == null) continue;
      if (!activeHvIds.has(hv)) continue;
      if (!truongToHv.has(tid)) truongToHv.set(tid, new Set());
      truongToHv.get(tid)!.add(hv);
    }
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  const nganhCountByTruong = new Map<number, number>();
  from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("dh_truong_nganh")
      .select("truong_dai_hoc")
      .range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const r of batch) {
      const tid = nIdLoose(r.truong_dai_hoc);
      if (tid == null) continue;
      nganhCountByTruong.set(tid, (nganhCountByTruong.get(tid) ?? 0) + 1);
    }
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  const hvCountByTruong = new Map<number, number>();
  for (const [tid, set] of truongToHv) hvCountByTruong.set(tid, set.size);

  return { ok: true, hvCountByTruong, nganhCountByTruong };
}

function parseNamThi(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

/**
 * `ql_hv_truong_nganh.score` — điểm thi học viên (có thể là số thập phân, ví dụ
 * 7.5). Giữ nguyên giá trị (không trunc) miễn là number hợp lệ.
 */
function parseExamScore(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseMonThiChon(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function coerceSdt(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "boolean" || typeof v === "object") return null;
  const s =
    typeof v === "bigint"
      ? v.toString().trim()
      : String(v).replace(/^[\s"'`]+|[\s"'`]+$/g, "").trim();
  return s === "" ? null : s;
}

const IN_CHUNK = 200;

/**
 * Danh sách nguyện vọng dự thi (`ql_hv_truong_nganh`) — kèm thông tin học viên,
 * tên trường, tên ngành.
 *
 * **Lưu ý PostgREST:** `ql_hv_truong_nganh` không có FK metadata được expose qua
 * REST cache (đã thử embed → lỗi *Could not find a relationship*), nên ta fetch
 * 3 bảng độc lập rồi map theo `id` (giống pattern ở `admin-quan-ly-hoc-vien.ts`).
 *
 * @param truongFilterId — bắt buộc khi muốn xem một trường; truyền `null` để lấy
 *   toàn bộ (chú ý kết quả có thể rất lớn — UI hiện chỉ gọi khi đã chọn trường).
 * @param namThiFilter — lọc thêm theo `nam_thi`; `null` = mọi năm.
 *
 * Sắp xếp: năm thi giảm dần → tên học viên (vi).
 */
export async function fetchAdminDhStudentsByTruong(
  supabase: SupabaseClient,
  truongFilterId: number | null,
  namThiFilter: number | null,
): Promise<{ ok: true; rows: AdminDhStudentExamRow[] } | { ok: false; error: string }> {
  let q = supabase
    .from("ql_hv_truong_nganh")
    .select("id, hoc_vien, truong_dai_hoc, nganh_dao_tao, nam_thi, ghi_chu, score, mon_thi_chon")
    .order("nam_thi", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (truongFilterId != null && Number.isFinite(truongFilterId) && truongFilterId > 0) {
    q = q.eq("truong_dai_hoc", truongFilterId);
  }
  if (namThiFilter != null && Number.isFinite(namThiFilter)) {
    q = q.eq("nam_thi", namThiFilter);
  }

  const acc: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await q.range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    acc.push(...batch);
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  const hvIds = [
    ...new Set(acc.map((r) => nIdLoose(r.hoc_vien)).filter((x): x is number => x != null)),
  ];
  const trIds = [
    ...new Set(acc.map((r) => nIdLoose(r.truong_dai_hoc)).filter((x): x is number => x != null)),
  ];
  const ngIds = [
    ...new Set(acc.map((r) => nIdLoose(r.nganh_dao_tao)).filter((x): x is number => x != null)),
  ];

  const hvMap = new Map<
    number,
    { full_name: string; sdt: string | null; email: string | null; facebook: string | null }
  >();
  for (let i = 0; i < hvIds.length; i += IN_CHUNK) {
    const chunk = hvIds.slice(i, i + IN_CHUNK);
    if (!chunk.length) break;
    const { data, error } = await supabase
      .from("ql_thong_tin_hoc_vien")
      .select("id, full_name, sdt, email, facebook")
      .in("id", chunk);
    if (error) return { ok: false, error: error.message };
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const id = nIdLoose(row.id);
      if (id == null) continue;
      hvMap.set(id, {
        full_name: String(row.full_name ?? "").trim() || `Học viên #${id}`,
        sdt: coerceSdt(row.sdt),
        email: row.email != null ? String(row.email).trim() || null : null,
        facebook: row.facebook != null ? String(row.facebook).trim() || null : null,
      });
    }
  }

  const trMap = new Map<number, string>();
  if (trIds.length) {
    const { data, error } = await supabase
      .from("dh_truong_dai_hoc")
      .select("id, ten_truong_dai_hoc")
      .in("id", trIds);
    if (error) return { ok: false, error: error.message };
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const id = nIdLoose(row.id);
      if (id == null) continue;
      trMap.set(id, String(row.ten_truong_dai_hoc ?? "").trim() || `Trường #${id}`);
    }
  }

  const ngMap = new Map<number, string>();
  if (ngIds.length) {
    const { data, error } = await supabase
      .from("dh_nganh_dao_tao")
      .select("id, ten_nganh")
      .in("id", ngIds);
    if (error) return { ok: false, error: error.message };
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const id = nIdLoose(row.id);
      if (id == null) continue;
      ngMap.set(id, String(row.ten_nganh ?? "").trim() || `Ngành #${id}`);
    }
  }

  const mapped: AdminDhStudentExamRow[] = [];
  for (const raw of acc) {
    const id = nIdLoose(raw.id);
    if (id == null) continue;
    const tid = nIdLoose(raw.truong_dai_hoc);
    if (tid == null) continue;
    const hvId = nIdLoose(raw.hoc_vien);
    if (hvId == null) continue;
    const nid = nIdLoose(raw.nganh_dao_tao);
    const hv = hvMap.get(hvId);

    mapped.push({
      id,
      hoc_vien_id: hvId,
      full_name: hv?.full_name ?? `Học viên #${hvId}`,
      sdt: hv?.sdt ?? null,
      email: hv?.email ?? null,
      facebook: hv?.facebook ?? null,
      truong_id: tid,
      ten_truong: trMap.get(tid) ?? `Trường #${tid}`,
      nganh_id: nid,
      ten_nganh: nid != null ? ngMap.get(nid) ?? `Ngành #${nid}` : "—",
      nam_thi: parseNamThi(raw.nam_thi),
      ghi_chu: typeof raw.ghi_chu === "string" && raw.ghi_chu.trim() ? raw.ghi_chu.trim() : null,
      score: parseExamScore(raw.score),
      mon_thi_chon: parseMonThiChon(raw.mon_thi_chon),
    });
  }

  mapped.sort((a, b) => {
    const ya = a.nam_thi == null ? -Infinity : a.nam_thi;
    const yb = b.nam_thi == null ? -Infinity : b.nam_thi;
    if (ya !== yb) return yb - ya;
    const nc = a.full_name.localeCompare(b.full_name, "vi");
    if (nc !== 0) return nc;
    return a.ten_nganh.localeCompare(b.ten_nganh, "vi");
  });

  return { ok: true, rows: mapped };
}

/**
 * Lấy danh sách distinct `nam_thi` đã có trong `ql_hv_truong_nganh`. Trả về theo
 * thứ tự giảm dần (năm mới nhất trước). Bỏ qua giá trị null/không phải số.
 *
 * @param truongFilterId — nếu có, chỉ tính những dòng thuộc trường đó.
 */
export async function fetchAdminDhAvailableNamThi(
  supabase: SupabaseClient,
  truongFilterId: number | null,
): Promise<{ ok: true; years: number[] } | { ok: false; error: string }> {
  let q = supabase.from("ql_hv_truong_nganh").select("nam_thi");
  if (truongFilterId != null && Number.isFinite(truongFilterId) && truongFilterId > 0) {
    q = q.eq("truong_dai_hoc", truongFilterId);
  }

  const acc: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await q.range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    acc.push(...batch);
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  const set = new Set<number>();
  for (const r of acc) {
    const y = parseNamThi(r.nam_thi);
    if (y != null) set.add(y);
  }
  const years = [...set].sort((a, b) => b - a);
  return { ok: true, years };
}

/**
 * Số học viên distinct đăng ký dự thi theo từng cặp (trường, ngành) trong
 * `ql_hv_truong_nganh`. Key: `${truongId}__${nganhId}` → số HV (không trùng).
 *
 * @param truongFilterId — nếu có, chỉ quét dòng thuộc trường đó (khớp lọc trang).
 */
export async function fetchAdminDhPairHvDistinctCounts(
  supabase: SupabaseClient,
  truongFilterId: number | null,
): Promise<{ ok: true; counts: Record<string, number> } | { ok: false; error: string }> {
  let q = supabase.from("ql_hv_truong_nganh").select("hoc_vien, truong_dai_hoc, nganh_dao_tao");
  if (truongFilterId != null && Number.isFinite(truongFilterId) && truongFilterId > 0) {
    q = q.eq("truong_dai_hoc", truongFilterId);
  }

  const pairToHv = new Map<string, Set<number>>();
  let from = 0;
  for (;;) {
    const { data, error } = await q.range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const r of batch) {
      const tid = nIdLoose(r.truong_dai_hoc);
      const nid = nIdLoose(r.nganh_dao_tao);
      const hv = nIdLoose(r.hoc_vien);
      if (!tid || !nid || !hv) continue;
      const key = `${tid}__${nid}`;
      if (!pairToHv.has(key)) pairToHv.set(key, new Set());
      pairToHv.get(key)!.add(hv);
    }
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  const counts: Record<string, number> = {};
  for (const [k, set] of pairToHv) counts[k] = set.size;
  return { ok: true, counts };
}

/* -------------------------------------------------------------------------- */
/* Slug routing — trường: `/dh-truong-nganh/[truongSlug]`; năm: `.../tuyen-sinh/[nam]`; ngành: `.../nganh/[nganhSlug]` */
/* -------------------------------------------------------------------------- */

/**
 * Slug từ tên trường / tên ngành. Nếu nhiều bản ghi đụng slug, append `-${id}`
 * để đảm bảo URL duy nhất; xem `findDhTruongBySlug` / `findDhNganhBySlug`.
 */
export function slugifyDhName(ten: string): string {
  const s = slugifyVi(ten);
  return s || "khong-ten";
}

export function buildDhTruongSlug(id: number, ten: string, allRows: { id: number; ten: string }[]): string {
  const base = slugifyDhName(ten);
  const dup = allRows.some((r) => r.id !== id && slugifyDhName(r.ten) === base);
  return dup ? `${base}-${id}` : base;
}

export function buildDhNganhSlug(id: number, ten: string, allRows: { id: number; ten: string }[]): string {
  const base = slugifyDhName(ten);
  const dup = allRows.some((r) => r.id !== id && slugifyDhName(r.ten) === base);
  return dup ? `${base}-${id}` : base;
}

export type AdminDhTruongMatched = { id: number; ten: string; score: number | null; slug: string };

export async function findDhTruongBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<{ ok: true; row: AdminDhTruongMatched | null } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("dh_truong_dai_hoc")
    .select("id, ten_truong_dai_hoc, score");
  if (error) return { ok: false, error: error.message };
  const rows: { id: number; ten: string; score: number | null }[] = [];
  for (const r of data ?? []) {
    const row = r as { id?: unknown; ten_truong_dai_hoc?: unknown; score?: unknown };
    const id = nIdLoose(row.id);
    const ten = String(row.ten_truong_dai_hoc ?? "").trim();
    if (id == null || !ten) continue;
    rows.push({ id, ten, score: parseTruongScore(row.score) });
  }
  for (const r of rows) {
    const s = buildDhTruongSlug(r.id, r.ten, rows);
    if (s === slug) return { ok: true, row: { ...r, slug: s } };
  }
  return { ok: true, row: null };
}

export type AdminDhNganhMatched = { id: number; ten: string; slug: string };

/**
 * Tìm ngành theo slug — tập hợp các ngành xét chỉ là các ngành thuộc trường đó
 * (qua `dh_truong_nganh`). Slug collision được giải bằng append `-${id}`.
 */
export async function findDhNganhBySlugWithinTruong(
  supabase: SupabaseClient,
  truongId: number,
  slug: string,
): Promise<{ ok: true; row: AdminDhNganhMatched | null; allInTruong: AdminDhNganhMatched[] } | { ok: false; error: string }> {
  const listRes = await fetchDhNganhListByTruong(supabase, truongId);
  if (!listRes.ok) return { ok: false, error: listRes.error };
  const all = listRes.rows;
  const found = all.find((n) => n.slug === slug) ?? null;
  return { ok: true, row: found, allInTruong: all };
}

/** Danh sách ngành thuộc trường (qua `dh_truong_nganh`) — kèm slug đã khử trùng. */
export async function fetchDhNganhListByTruong(
  supabase: SupabaseClient,
  truongId: number,
): Promise<{ ok: true; rows: AdminDhNganhMatched[] } | { ok: false; error: string }> {
  const { data: pairData, error: pairErr } = await supabase
    .from("dh_truong_nganh")
    .select("nganh_dao_tao")
    .eq("truong_dai_hoc", truongId);
  if (pairErr) return { ok: false, error: pairErr.message };

  const ngIds = [
    ...new Set(
      ((pairData ?? []) as Record<string, unknown>[])
        .map((r) => nIdLoose(r.nganh_dao_tao))
        .filter((x): x is number => x != null),
    ),
  ];
  if (!ngIds.length) return { ok: true, rows: [] };

  const { data, error } = await supabase
    .from("dh_nganh_dao_tao")
    .select("id, ten_nganh")
    .in("id", ngIds);
  if (error) return { ok: false, error: error.message };

  const base: { id: number; ten: string }[] = [];
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const id = nIdLoose(r.id);
    if (id == null) continue;
    base.push({ id, ten: String(r.ten_nganh ?? "").trim() || `Ngành #${id}` });
  }
  base.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  const rows: AdminDhNganhMatched[] = base.map((n) => ({
    id: n.id,
    ten: n.ten,
    slug: buildDhNganhSlug(n.id, n.ten, base),
  }));
  return { ok: true, rows };
}

/* -------------------------------------------------------------------------- */
/* Pagination + overview stats                                                */
/* -------------------------------------------------------------------------- */

export const DH_STUDENTS_PAGE_SIZE = 15;

export type AdminDhStudentsPagedResult = {
  rows: AdminDhStudentExamRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/**
 * Phân trang server-side: chỉ SQL đúng `pageSize` dòng tương ứng `page` hiện tại
 * (`range(offset, offset + pageSize - 1)`), kèm `count: "exact"` để biết tổng.
 * Sau đó lookup HV / ngành chỉ cho các dòng trong page → phản hồi nhanh.
 */
export async function fetchAdminDhStudentsByTruongPaged(
  supabase: SupabaseClient,
  args: {
    truongId: number;
    nganhId?: number | null;
    namThi?: number | null;
    /** Lọc `mon_thi_chon` — khớp đúng chuỗi; `null`/bỏ qua = mọi môn. */
    monThiChon?: string | null;
    page: number;
    pageSize?: number;
  },
): Promise<{ ok: true; result: AdminDhStudentsPagedResult } | { ok: false; error: string }> {
  const pageSize = Math.max(1, Math.trunc(args.pageSize ?? DH_STUDENTS_PAGE_SIZE));
  const page = Math.max(1, Math.trunc(args.page || 1));
  const offset = (page - 1) * pageSize;

  let q = supabase
    .from("ql_hv_truong_nganh")
    .select("id, hoc_vien, truong_dai_hoc, nganh_dao_tao, nam_thi, ghi_chu, score, mon_thi_chon", {
      count: "exact",
    })
    .eq("truong_dai_hoc", args.truongId)
    .order("nam_thi", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (args.nganhId != null && Number.isFinite(args.nganhId) && args.nganhId > 0) {
    q = q.eq("nganh_dao_tao", args.nganhId);
  }
  if (args.namThi != null && Number.isFinite(args.namThi)) {
    q = q.eq("nam_thi", args.namThi);
  }
  if (args.monThiChon != null && String(args.monThiChon).trim() !== "") {
    q = q.eq("mon_thi_chon", String(args.monThiChon).trim());
  }

  const { data, error, count } = await q;
  if (error) return { ok: false, error: error.message };

  const acc = ((data ?? []) as Record<string, unknown>[]) ?? [];
  const total = typeof count === "number" ? count : acc.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const hvIds = [
    ...new Set(acc.map((r) => nIdLoose(r.hoc_vien)).filter((x): x is number => x != null)),
  ];
  const ngIds = [
    ...new Set(acc.map((r) => nIdLoose(r.nganh_dao_tao)).filter((x): x is number => x != null)),
  ];

  const hvMap = new Map<
    number,
    { full_name: string; sdt: string | null; email: string | null; facebook: string | null }
  >();
  if (hvIds.length) {
    const { data: hvData, error: hvErr } = await supabase
      .from("ql_thong_tin_hoc_vien")
      .select("id, full_name, sdt, email, facebook")
      .in("id", hvIds);
    if (hvErr) return { ok: false, error: hvErr.message };
    for (const row of (hvData ?? []) as Record<string, unknown>[]) {
      const id = nIdLoose(row.id);
      if (id == null) continue;
      hvMap.set(id, {
        full_name: String(row.full_name ?? "").trim() || `Học viên #${id}`,
        sdt: coerceSdt(row.sdt),
        email: row.email != null ? String(row.email).trim() || null : null,
        facebook: row.facebook != null ? String(row.facebook).trim() || null : null,
      });
    }
  }

  // Tên trường: chỉ 1 → fetch riêng để tránh embed FK lỗi.
  const { data: trData, error: trErr } = await supabase
    .from("dh_truong_dai_hoc")
    .select("id, ten_truong_dai_hoc")
    .eq("id", args.truongId)
    .maybeSingle();
  if (trErr) return { ok: false, error: trErr.message };
  const tenTruong =
    String((trData as { ten_truong_dai_hoc?: unknown } | null)?.ten_truong_dai_hoc ?? "").trim() ||
    `Trường #${args.truongId}`;

  const ngMap = new Map<number, string>();
  if (ngIds.length) {
    const { data: ngData, error: ngErr } = await supabase
      .from("dh_nganh_dao_tao")
      .select("id, ten_nganh")
      .in("id", ngIds);
    if (ngErr) return { ok: false, error: ngErr.message };
    for (const row of (ngData ?? []) as Record<string, unknown>[]) {
      const id = nIdLoose(row.id);
      if (id == null) continue;
      ngMap.set(id, String(row.ten_nganh ?? "").trim() || `Ngành #${id}`);
    }
  }

  const rows: AdminDhStudentExamRow[] = [];
  for (const raw of acc) {
    const id = nIdLoose(raw.id);
    if (id == null) continue;
    const hvId = nIdLoose(raw.hoc_vien);
    if (hvId == null) continue;
    const nid = nIdLoose(raw.nganh_dao_tao);
    const hv = hvMap.get(hvId);
    rows.push({
      id,
      hoc_vien_id: hvId,
      full_name: hv?.full_name ?? `Học viên #${hvId}`,
      sdt: hv?.sdt ?? null,
      email: hv?.email ?? null,
      facebook: hv?.facebook ?? null,
      truong_id: args.truongId,
      ten_truong: tenTruong,
      nganh_id: nid,
      ten_nganh: nid != null ? ngMap.get(nid) ?? `Ngành #${nid}` : "—",
      nam_thi: parseNamThi(raw.nam_thi),
      ghi_chu: typeof raw.ghi_chu === "string" && raw.ghi_chu.trim() ? raw.ghi_chu.trim() : null,
      score: parseExamScore(raw.score),
      mon_thi_chon: parseMonThiChon(raw.mon_thi_chon),
    });
  }

  return {
    ok: true,
    result: { rows, total, page, pageSize, pageCount },
  };
}

/**
 * Số tổng quan cho card thống kê — fetch nhẹ 3 cột (`hoc_vien`, `nganh_dao_tao`,
 * `nam_thi`) toàn bộ trường, rồi compute distinct trong JS.
 *
 * Áp dụng cho cả 2 mức:
 * - Mức trường: truyền `nganhId = null`.
 * - Mức (trường, ngành): truyền `nganhId` cụ thể.
 */
export type AdminDhOverviewStats = {
  totalNguyenVong: number;
  totalHocVien: number;
  totalNganh: number;
  totalNam: number;
  /** `[year, count]` — số HV distinct theo từng năm, năm mới nhất trước. */
  byYear: Array<{ nam: number; hocVien: number; nguyenVong: number }>;
};

export async function fetchAdminDhTruongOverviewStats(
  supabase: SupabaseClient,
  args: {
    truongId: number;
    nganhId?: number | null;
    /** Lọc theo `nam_thi` — `null`/bỏ qua = mọi năm. */
    namThi?: number | null;
    monThiChon?: string | null;
  },
): Promise<{ ok: true; stats: AdminDhOverviewStats } | { ok: false; error: string }> {
  let q = supabase
    .from("ql_hv_truong_nganh")
    .select("hoc_vien, nganh_dao_tao, nam_thi")
    .eq("truong_dai_hoc", args.truongId);
  if (args.nganhId != null && Number.isFinite(args.nganhId) && args.nganhId > 0) {
    q = q.eq("nganh_dao_tao", args.nganhId);
  }
  if (args.namThi != null && Number.isFinite(args.namThi)) {
    q = q.eq("nam_thi", args.namThi);
  }
  if (args.monThiChon != null && String(args.monThiChon).trim() !== "") {
    q = q.eq("mon_thi_chon", String(args.monThiChon).trim());
  }

  const acc: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await q.range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    acc.push(...batch);
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  const hvSet = new Set<number>();
  const ngSet = new Set<number>();
  const yrSet = new Set<number>();
  /** key: year → set hv ids; year → count nguyen vong */
  const yrHv = new Map<number, Set<number>>();
  const yrNv = new Map<number, number>();

  for (const r of acc) {
    const hv = nIdLoose(r.hoc_vien);
    if (hv != null) hvSet.add(hv);
    const ng = nIdLoose(r.nganh_dao_tao);
    if (ng != null) ngSet.add(ng);
    const y = parseNamThi(r.nam_thi);
    if (y != null) {
      yrSet.add(y);
      if (!yrHv.has(y)) yrHv.set(y, new Set());
      if (hv != null) yrHv.get(y)!.add(hv);
      yrNv.set(y, (yrNv.get(y) ?? 0) + 1);
    }
  }

  const byYear = [...yrSet]
    .sort((a, b) => b - a)
    .map((y) => ({ nam: y, hocVien: yrHv.get(y)?.size ?? 0, nguyenVong: yrNv.get(y) ?? 0 }));

  return {
    ok: true,
    stats: {
      totalNguyenVong: acc.length,
      totalHocVien: hvSet.size,
      totalNganh: ngSet.size,
      totalNam: yrSet.size,
      byYear,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Lịch tuyển sinh (`dh_moc_lich_tuyen_sinh`) + catalog cặp trường–ngành       */
/* -------------------------------------------------------------------------- */

export const DH_MOC_TEXT_MAX = 4000;

export function clampDhMocText(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * Các năm tuyển sinh đã có mốc lịch cho trường + luôn có năm hiện tại / năm sau (để chọn khi tạo mới).
 */
export async function fetchDhMocNamTuyenSinhYears(
  supabase: SupabaseClient,
  truongId: number,
): Promise<{ ok: true; years: number[] } | { ok: false; error: string }> {
  const set = new Set<number>();
  const yNow = new Date().getFullYear();
  set.add(yNow);
  set.add(yNow + 1);

  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("dh_moc_lich_tuyen_sinh")
      .select("nam_tuyen_sinh")
      .eq("truong_dai_hoc", truongId)
      .range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const r of batch) {
      const y = parseNamThi(r.nam_tuyen_sinh);
      if (y != null) set.add(y);
    }
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  const years = [...set].sort((a, b) => b - a);
  return { ok: true, years };
}

export async function fetchDhMocLichTuyenSinh(
  supabase: SupabaseClient,
  truongId: number,
  namTuyenSinh: number,
): Promise<{ ok: true; rows: AdminDhMocLichRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("dh_moc_lich_tuyen_sinh")
    .select(
      "id, truong_dai_hoc, nam_tuyen_sinh, ten_moc, thoi_gian_mo_ta, ghi_chu, nguon_thong_bao, thu_tu, cap_nhat_luc",
    )
    .eq("truong_dai_hoc", truongId)
    .eq("nam_tuyen_sinh", namTuyenSinh)
    .order("thu_tu", { ascending: true })
    .order("id", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const rows: AdminDhMocLichRow[] = [];
  for (const raw of (data ?? []) as Record<string, unknown>[]) {
    const id = nIdLoose(raw.id);
    const tid = nIdLoose(raw.truong_dai_hoc);
    const nam = parseNamThi(raw.nam_tuyen_sinh);
    if (id == null || tid == null || nam == null) continue;
    rows.push({
      id,
      truong_dai_hoc: tid,
      nam_tuyen_sinh: nam,
      ten_moc: typeof raw.ten_moc === "string" && raw.ten_moc.trim() ? raw.ten_moc.trim() : null,
      thoi_gian_mo_ta: clampDhMocText(String(raw.thoi_gian_mo_ta ?? ""), DH_MOC_TEXT_MAX) || "—",
      ghi_chu: typeof raw.ghi_chu === "string" && raw.ghi_chu.trim() ? raw.ghi_chu.trim() : null,
      nguon_thong_bao:
        typeof raw.nguon_thong_bao === "string" && raw.nguon_thong_bao.trim()
          ? raw.nguon_thong_bao.trim()
          : null,
      thu_tu: Number.isFinite(Number(raw.thu_tu)) ? Math.trunc(Number(raw.thu_tu)) : 0,
      cap_nhat_luc:
        raw.cap_nhat_luc != null ? String(raw.cap_nhat_luc) : null,
    });
  }

  return { ok: true, rows };
}

export async function fetchDhTruongNganhCatalogForPair(
  supabase: SupabaseClient,
  truongId: number,
  nganhId: number,
): Promise<
  { ok: true; mon_thi: string[]; details: string | null } | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("dh_truong_nganh")
    .select("mon_thi, details")
    .eq("truong_dai_hoc", truongId)
    .eq("nganh_dao_tao", nganhId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  const r = data as Record<string, unknown> | null;
  if (!r) return { ok: true, mon_thi: [], details: null };

  return {
    ok: true,
    mon_thi: parseMonThiArray(r.mon_thi),
    details: typeof r.details === "string" && r.details.trim() ? r.details.trim() : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Năm tuyển sinh — tổng hợp hub trường + chỉ tiêu / điểm chuẩn theo ngành-năm   */
/* -------------------------------------------------------------------------- */

export type AdminDhSchoolYearSummary = {
  nam: number;
  /** Số dòng mốc lịch (`dh_moc_lich_tuyen_sinh`). */
  soMocLich: number;
  /** Số ngành đã có bản ghi `dh_truong_nganh_theo_nam` cho năm đó. */
  soNganhCoSoLieu: number;
  /** Học viên distinct có `nam_thi` = năm này. */
  hocVienDistinct: number;
};

export type AdminDhNganhNamMergedRow = {
  nganh_id: number;
  ten_nganh: string;
  mon_thi: string[];
  details: string | null;
  nganh_slug: string;
  metric_id: number | null;
  chi_tieu: number | null;
  diem_chuan: number | null;
  metric_ghi_chu: string | null;
};

/**
 * Hợp nhất danh sách ngành của trường (`dh_truong_nganh`) với số liệu
 * `dh_truong_nganh_theo_nam` cho một năm.
 */
export async function fetchDhTruongNganhNamMerged(
  supabase: SupabaseClient,
  truongId: number,
  namTuyenSinh: number,
): Promise<{ ok: true; rows: AdminDhNganhNamMergedRow[] } | { ok: false; error: string }> {
  const pairsRes = await fetchAdminDhTruongNganhRows(supabase, truongId);
  if (!pairsRes.ok) return { ok: false, error: pairsRes.error };

  const pairs = pairsRes.rows;
  if (!pairs.length) return { ok: true, rows: [] };

  const { data: metRaw, error: metErr } = await supabase
    .from("dh_truong_nganh_theo_nam")
    .select("id, nganh_dao_tao, chi_tieu, diem_chuan, ghi_chu")
    .eq("truong_dai_hoc", truongId)
    .eq("nam_tuyen_sinh", namTuyenSinh);

  if (metErr) return { ok: false, error: metErr.message };

  const metricByNganh = new Map<
    number,
    { id: number; chi_tieu: number | null; diem_chuan: number | null; ghi_chu: string | null }
  >();
  for (const raw of (metRaw ?? []) as Record<string, unknown>[]) {
    const nid = nIdLoose(raw.nganh_dao_tao);
    const id = nIdLoose(raw.id);
    if (nid == null || id == null) continue;
    const chi = raw.chi_tieu;
    const chiTieu =
      chi == null || chi === ""
        ? null
        : Number.isFinite(Number(chi))
          ? Math.trunc(Number(chi))
          : null;
    const dc = raw.diem_chuan;
    const diemChuan =
      dc == null || dc === ""
        ? null
        : Number.isFinite(Number(dc))
          ? Number(dc)
          : null;
    const gc =
      typeof raw.ghi_chu === "string" && raw.ghi_chu.trim() ? raw.ghi_chu.trim() : null;
    metricByNganh.set(nid, { id, chi_tieu: chiTieu, diem_chuan: diemChuan, ghi_chu: gc });
  }

  const nganhBases = pairs.map((p) => ({ id: p.nganh_id, ten: p.ten_nganh }));
  const rows: AdminDhNganhNamMergedRow[] = [];
  for (const p of pairs) {
    const met = metricByNganh.get(p.nganh_id);
    rows.push({
      nganh_id: p.nganh_id,
      ten_nganh: p.ten_nganh,
      mon_thi: [...p.mon_thi],
      details: p.details,
      nganh_slug: buildDhNganhSlug(p.nganh_id, p.ten_nganh, nganhBases),
      metric_id: met?.id ?? null,
      chi_tieu: met?.chi_tieu ?? null,
      diem_chuan: met?.diem_chuan ?? null,
      metric_ghi_chu: met?.ghi_chu ?? null,
    });
  }

  rows.sort((a, b) => a.ten_nganh.localeCompare(b.ten_nganh, "vi"));
  return { ok: true, rows };
}

export async function fetchDhDistinctTuyenSinhYearsForTruong(
  supabase: SupabaseClient,
  truongId: number,
): Promise<{ ok: true; years: number[] } | { ok: false; error: string }> {
  const set = new Set<number>();
  const yNow = new Date().getFullYear();
  set.add(yNow);
  set.add(yNow + 1);

  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("dh_moc_lich_tuyen_sinh")
      .select("nam_tuyen_sinh")
      .eq("truong_dai_hoc", truongId)
      .range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const r of batch) {
      const y = parseNamThi(r.nam_tuyen_sinh);
      if (y != null) set.add(y);
    }
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("dh_truong_nganh_theo_nam")
      .select("nam_tuyen_sinh")
      .eq("truong_dai_hoc", truongId)
      .range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const r of batch) {
      const y = parseNamThi(r.nam_tuyen_sinh);
      if (y != null) set.add(y);
    }
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  let qhv = supabase
    .from("ql_hv_truong_nganh")
    .select("nam_thi")
    .eq("truong_dai_hoc", truongId);
  from = 0;
  for (;;) {
    const { data, error } = await qhv.range(from, from + STUDENT_PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const r of batch) {
      const y = parseNamThi(r.nam_thi);
      if (y != null) set.add(y);
    }
    if (batch.length < STUDENT_PAGE) break;
    from += STUDENT_PAGE;
  }

  const years = [...set].filter((y) => y >= 2000 && y <= 2100).sort((a, b) => b - a);
  return { ok: true, years };
}

export async function fetchDhSchoolYearSummaries(
  supabase: SupabaseClient,
  truongId: number,
  years: readonly number[],
): Promise<{ ok: true; summaries: AdminDhSchoolYearSummary[] } | { ok: false; error: string }> {
  const summaries: AdminDhSchoolYearSummary[] = [];

  for (const nam of years) {
    const { count: mocCnt, error: e1 } = await supabase
      .from("dh_moc_lich_tuyen_sinh")
      .select("id", { count: "exact", head: true })
      .eq("truong_dai_hoc", truongId)
      .eq("nam_tuyen_sinh", nam);
    if (e1) return { ok: false, error: e1.message };

    const { count: nganCnt, error: e2 } = await supabase
      .from("dh_truong_nganh_theo_nam")
      .select("id", { count: "exact", head: true })
      .eq("truong_dai_hoc", truongId)
      .eq("nam_tuyen_sinh", nam);
    if (e2) return { ok: false, error: e2.message };

    const hvSet = new Set<number>();
    let hf = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("ql_hv_truong_nganh")
        .select("hoc_vien")
        .eq("truong_dai_hoc", truongId)
        .eq("nam_thi", nam)
        .range(hf, hf + STUDENT_PAGE - 1);
      if (error) return { ok: false, error: error.message };
      const batch = (data ?? []) as Record<string, unknown>[];
      if (!batch.length) break;
      for (const r of batch) {
        const hv = nIdLoose(r.hoc_vien);
        if (hv != null) hvSet.add(hv);
      }
      if (batch.length < STUDENT_PAGE) break;
      hf += STUDENT_PAGE;
    }

    summaries.push({
      nam,
      soMocLich: typeof mocCnt === "number" ? mocCnt : 0,
      soNganhCoSoLieu: typeof nganCnt === "number" ? nganCnt : 0,
      hocVienDistinct: hvSet.size,
    });
  }

  return { ok: true, summaries };
}

