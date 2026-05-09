import type { SupabaseClient } from "@supabase/supabase-js";

import { isWrongLopFkColumnError } from "@/app/api/phong-hoc/hv-chatbox/lop-column";

const HV_OPTIONS_CHUNK = 1000;
const HV_OPTIONS_MAX = 20_000;

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MIN = 5;
const PAGE_SIZE_MAX = 100;

export type AdminBhvStatusTab = "cho" | "hoan" | "kcl" | "tat_ca";

export const ADMIN_BHV_STATUS_TABS: { id: AdminBhvStatusTab; label: string }[] = [
  { id: "cho", label: "Chờ xác nhận" },
  { id: "hoan", label: "Hoàn thiện" },
  { id: "kcl", label: "Không đủ CL" },
  { id: "tat_ca", label: "Tất cả" },
];

export type AdminBhvExerciseOpt = {
  id: number;
  ten_bai_tap: string;
  ten_mon_hoc: string;
};

export type AdminBaiHocVienRow = {
  id: number;
  photo: string | null;
  status: string;
  score: number | null;
  thuoc_bai_tap: number | null;
  lop_id: number | null;
  hoc_vien_id: number | null;
  bai_mau: boolean;
  ghi_chu: string | null;
  ten_hoc_vien_name: string;
  lop_name: string;
  bai_tap_name: string;
  ten_mon_hoc: string;
  /** ISO từ `hv_bai_hoc_vien.created_at` — sort mặc định mới nhất trước. */
  created_at: string | null;
};

export type AdminBhvHocVienOpt = { id: number; full_name: string };
export type AdminBhvLopOpt = { id: number; label: string };

export const ADMIN_BHV_TAB_PATH: Record<AdminBhvStatusTab, string> = {
  cho: "cho",
  hoan: "hoan",
  kcl: "kcl",
  tat_ca: "tat-ca",
};

export function adminBhvPathSegmentFromTab(tab: AdminBhvStatusTab): string {
  return ADMIN_BHV_TAB_PATH[tab];
}

/** Segment trong URL `/quan-ly-bai-hoc-vien/[tab]` → tab nội bộ. */
export function adminBhvTabFromPathSegment(seg: string | undefined): AdminBhvStatusTab | null {
  if (!seg) return null;
  const s = seg.trim().toLowerCase();
  if (s === "cho" || s === "hoan" || s === "kcl") return s as AdminBhvStatusTab;
  if (s === "tat-ca" || s === "tat_ca") return "tat_ca";
  return null;
}

export type AdminQuanLyBaiHocVienBundle = {
  tab: AdminBhvStatusTab;
  rows: AdminBaiHocVienRow[];
  /** Tổng dòng khớp tab + lọc môn/bài/ẩn bài mẫu (không phụ thuộc sort/pagination). */
  totalCount: number;
  page: number;
  pageSize: number;
  exercises: AdminBhvExerciseOpt[];
  hocVienOptions: AdminBhvHocVienOpt[];
  lopOptions: AdminBhvLopOpt[];
};

export type AdminBhvFetchParams = {
  tab: AdminBhvStatusTab;
  page: number;
  pageSize: number;
  /** `ql_mon_hoc.ten_mon_hoc` — rỗng = không lọc. */
  filterMonHoc: string;
  /** `hv_he_thong_bai_tap.id` — null = không lọc theo bài (chỉ theo môn nếu có). */
  filterBaiTapId: number | null;
  /** true = chỉ hiện bản ghi không phải bài mẫu (`bai_mau = false`). */
  hideBaiMau: boolean;
  /** Sort điểm; null = mới tạo trước (`created_at` / `id`). */
  scoreSort: "desc" | "asc" | null;
};

function nId(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function lopIdFromRow(r: Record<string, unknown>): number | null {
  const a = nId(r.lop_hoc);
  if (a) return a;
  return nId(r.class);
}

function clampPageSize(n: number): number {
  if (!Number.isFinite(n)) return PAGE_SIZE_DEFAULT;
  return Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_MIN, Math.floor(n)));
}

type OrderMode = "created" | "score_desc" | "score_asc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any;

function applyTabFilter(q: AnyQuery, tab: AdminBhvStatusTab): AnyQuery {
  if (tab === "cho") return q.or("status.eq.Chờ xác nhận,status.is.null");
  if (tab === "hoan") return q.eq("status", "Hoàn thiện");
  if (tab === "kcl") return q.eq("status", "Không đủ chất lượng");
  return q;
}

function applyHideBaiMauFilter(q: AnyQuery, hideBaiMau: boolean): AnyQuery {
  if (!hideBaiMau) return q;
  return q.eq("bai_mau", false);
}

function applyOrdering(q: AnyQuery, mode: OrderMode): AnyQuery {
  if (mode === "score_desc") {
    return q
      .order("score", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });
  }
  if (mode === "score_asc") {
    return q
      .order("score", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false });
  }
  return q
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });
}

function orderModeFromParams(scoreSort: AdminBhvFetchParams["scoreSort"]): OrderMode {
  if (scoreSort === "desc") return "score_desc";
  if (scoreSort === "asc") return "score_asc";
  return "created";
}

async function resolveThuocBaiTapFilter(
  supabase: SupabaseClient,
  filterMonHoc: string,
  filterBaiTapId: number | null,
): Promise<number[] | null> {
  if (filterBaiTapId != null && filterBaiTapId > 0) {
    const monIds = await resolveThuocBaiTapIdsForMon(supabase, filterMonHoc);
    if (monIds === null) {
      return [filterBaiTapId];
    }
    if (monIds.length === 0) return [];
    return monIds.includes(filterBaiTapId) ? [filterBaiTapId] : [];
  }
  return resolveThuocBaiTapIdsForMon(supabase, filterMonHoc);
}

async function resolveThuocBaiTapIdsForMon(
  supabase: SupabaseClient,
  tenMonHoc: string,
): Promise<number[] | null> {
  const label = tenMonHoc.trim();
  if (!label) return null;

  const { data: monRow, error: mErr } = await supabase
    .from("ql_mon_hoc")
    .select("id")
    .eq("ten_mon_hoc", label)
    .maybeSingle();
  if (mErr || !monRow) return [];

  const mid = nId((monRow as { id?: unknown }).id);
  if (!mid) return [];

  const { data: btRows, error: btErr } = await supabase
    .from("hv_he_thong_bai_tap")
    .select("id")
    .eq("mon_hoc", mid);
  if (btErr) return [];
  const ids = (btRows ?? [])
    .map((r) => nId((r as { id?: unknown }).id))
    .filter((x): x is number => x != null);
  return ids;
}

async function fetchHvPageRaw(args: {
  supabase: SupabaseClient;
  tab: AdminBhvStatusTab;
  cols: string;
  thuocBaiTapFilter: number[] | null;
  hideBaiMau: boolean;
  orderMode: OrderMode;
  page: number;
  pageSize: number;
}): Promise<{
  rows: Record<string, unknown>[];
  totalCount: number;
  error: { message: string } | null;
}> {
  const { supabase, tab, cols, thuocBaiTapFilter, hideBaiMau, orderMode, page, pageSize } = args;
  const safePage = Math.max(1, page);
  const size = clampPageSize(pageSize);
  const from = (safePage - 1) * size;
  const to = from + size - 1;

  const buildFiltered = () => {
    let q: AnyQuery = supabase.from("hv_bai_hoc_vien").select(cols);
    q = applyTabFilter(q, tab);
    q = applyHideBaiMauFilter(q, hideBaiMau);
    if (thuocBaiTapFilter !== null) {
      if (thuocBaiTapFilter.length === 0) return null;
      q = q.in("thuoc_bai_tap", thuocBaiTapFilter);
    }
    q = applyOrdering(q, orderMode);
    return q;
  };

  const filtered = buildFiltered();
  if (!filtered) {
    return { rows: [], totalCount: 0, error: null };
  }

  let countQ: AnyQuery = supabase.from("hv_bai_hoc_vien").select("*", { count: "exact", head: true });
  countQ = applyTabFilter(countQ, tab);
  countQ = applyHideBaiMauFilter(countQ, hideBaiMau);
  if (thuocBaiTapFilter !== null) {
    if (thuocBaiTapFilter.length === 0) {
      return { rows: [], totalCount: 0, error: null };
    }
    countQ = countQ.in("thuoc_bai_tap", thuocBaiTapFilter);
  }

  const [{ count: totalRaw, error: cErr }, { data, error: dErr }] = await Promise.all([countQ, filtered.range(from, to)]);

  if (cErr) {
    return { rows: [], totalCount: 0, error: cErr as { message: string } };
  }
  if (dErr) {
    return { rows: [], totalCount: 0, error: dErr as { message: string } };
  }

  const totalCount = typeof totalRaw === "number" ? totalRaw : 0;
  const rows = ((data ?? []) as unknown) as Record<string, unknown>[];
  return { rows, totalCount, error: null };
}

async function selectHvBaiHocVienPage(
  supabase: SupabaseClient,
  params: AdminBhvFetchParams,
): Promise<{
  rows: Record<string, unknown>[];
  totalCount: number;
  error: { message: string } | null;
}> {
  const baseCols =
    "id,photo,status,score,bai_mau,thuoc_bai_tap,ten_hoc_vien,ghi_chu,lop_hoc,class,created_at";
  const baseCols2 = "id,photo,status,score,bai_mau,thuoc_bai_tap,ten_hoc_vien,ghi_chu,class,created_at";

  const thuocBaiTapFilter = await resolveThuocBaiTapFilter(
    supabase,
    params.filterMonHoc,
    params.filterBaiTapId,
  );
  const orderMode = orderModeFromParams(params.scoreSort);
  const page = Math.max(1, params.page);
  const pageSize = clampPageSize(params.pageSize);

  let result = await fetchHvPageRaw({
    supabase,
    tab: params.tab,
    cols: baseCols,
    thuocBaiTapFilter,
    hideBaiMau: params.hideBaiMau,
    orderMode,
    page,
    pageSize,
  });

  if (result.error && isWrongLopFkColumnError(result.error)) {
    result = await fetchHvPageRaw({
      supabase,
      tab: params.tab,
      cols: baseCols2,
      thuocBaiTapFilter,
      hideBaiMau: params.hideBaiMau,
      orderMode,
      page,
      pageSize,
    });
  }

  return result;
}

function clampPageToTotal(page: number, totalCount: number, pageSize: number): number {
  const size = clampPageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalCount) / size));
  return Math.min(Math.max(1, page), totalPages);
}

export async function fetchAdminQuanLyBaiHocVienBundle(
  supabase: SupabaseClient,
  params: AdminBhvFetchParams,
): Promise<{ ok: true; data: AdminQuanLyBaiHocVienBundle } | { ok: false; error: string }> {
  const pageSize = clampPageSize(params.pageSize);

  let { rows: raw, totalCount, error } = await selectHvBaiHocVienPage(supabase, {
    ...params,
    pageSize,
    page: Math.max(1, params.page),
  });

  if (error) {
    return { ok: false, error: error.message || "Không đọc được hv_bai_hoc_vien." };
  }

  const pageClamped = clampPageToTotal(params.page, totalCount, pageSize);
  if (pageClamped !== params.page && totalCount > 0) {
    ({ rows: raw, totalCount, error } = await selectHvBaiHocVienPage(supabase, {
      ...params,
      page: pageClamped,
      pageSize,
    }));
    if (error) {
      return { ok: false, error: error.message || "Không đọc được hv_bai_hoc_vien." };
    }
  }

  const effectivePage = totalCount === 0 ? 1 : pageClamped;

  const hvIds = [...new Set(raw.map((r) => nId(r.ten_hoc_vien)).filter((x): x is number => x != null))];
  const lopIds = [...new Set(raw.map((r) => lopIdFromRow(r)).filter((x): x is number => x != null))];
  const btIds = [...new Set(raw.map((r) => nId(r.thuoc_bai_tap)).filter((x): x is number => x != null))];

  const [hvRes, lopRes, btRes] = await Promise.all([
    hvIds.length
      ? supabase.from("ql_thong_tin_hoc_vien").select("id, full_name").in("id", hvIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    lopIds.length
      ? supabase.from("ql_lop_hoc").select("id, class_name, class_full_name").in("id", lopIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    btIds.length
      ? supabase.from("hv_he_thong_bai_tap").select("id, ten_bai_tap, mon_hoc").in("id", btIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  if (hvRes.error || lopRes.error || btRes.error) {
    const msg = hvRes.error?.message || lopRes.error?.message || btRes.error?.message || "Lỗi tham chiếu.";
    return { ok: false, error: msg };
  }

  const hvName = new Map<number, string>();
  for (const r of hvRes.data ?? []) {
    const id = nId((r as { id?: unknown }).id);
    if (!id) continue;
    hvName.set(id, String((r as { full_name?: unknown }).full_name ?? "").trim() || `HV #${id}`);
  }

  const lopName = new Map<number, string>();
  for (const r of lopRes.data ?? []) {
    const id = nId((r as { id?: unknown }).id);
    if (!id) continue;
    const cn = String((r as { class_name?: unknown }).class_name ?? "").trim();
    const cf = String((r as { class_full_name?: unknown }).class_full_name ?? "").trim();
    lopName.set(id, cf || cn || `Lớp #${id}`);
  }

  const monIds = [
    ...new Set(
      (btRes.data ?? [])
        .map((r) => nId((r as { mon_hoc?: unknown }).mon_hoc))
        .filter((x): x is number => x != null),
    ),
  ];
  const monName = new Map<number, string>();
  if (monIds.length) {
    const { data: monRows, error: monErr } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .in("id", monIds);
    if (monErr) return { ok: false, error: monErr.message || "Không đọc môn học." };
    for (const r of monRows ?? []) {
      const id = nId((r as { id?: unknown }).id);
      if (!id) continue;
      monName.set(id, String((r as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim());
    }
  }

  const btMeta = new Map<number, { ten: string; mon: string }>();
  for (const r of btRes.data ?? []) {
    const id = nId((r as { id?: unknown }).id);
    if (!id) continue;
    const monId = nId((r as { mon_hoc?: unknown }).mon_hoc);
    btMeta.set(id, {
      ten: String((r as { ten_bai_tap?: unknown }).ten_bai_tap ?? "").trim(),
      mon: monId != null ? monName.get(monId) ?? "" : "",
    });
  }

  const rows: AdminBaiHocVienRow[] = [];
  for (const r of raw) {
    const id = nId(r.id);
    if (!id) continue;
    const hvPk = nId(r.ten_hoc_vien);
    const lid = lopIdFromRow(r);
    const btId = nId(r.thuoc_bai_tap);
    const bt = btId != null ? btMeta.get(btId) : undefined;
    const sc = r.score;
    const scoreNum =
      sc != null && sc !== "" && String(sc).trim() !== "" && Number.isFinite(Number(sc)) ? Number(sc) : null;
    const ca = r.created_at != null ? String(r.created_at).trim() : "";
    rows.push({
      id,
      photo: typeof r.photo === "string" && r.photo.trim() ? r.photo.trim() : null,
      status: String(r.status ?? "").trim() || "Chờ xác nhận",
      score: scoreNum,
      thuoc_bai_tap: btId,
      lop_id: lid,
      hoc_vien_id: hvPk,
      bai_mau: Boolean(r.bai_mau),
      ghi_chu: r.ghi_chu != null ? String(r.ghi_chu).trim() || null : null,
      ten_hoc_vien_name: hvPk != null ? hvName.get(hvPk) ?? `HV #${hvPk}` : "—",
      lop_name: lid != null ? lopName.get(lid) ?? `Lớp #${lid}` : "—",
      bai_tap_name: bt?.ten ?? "—",
      ten_mon_hoc: bt?.mon ?? "",
      created_at: ca || null,
    });
  }

  const { data: exAll, error: exErr } = await supabase
    .from("hv_he_thong_bai_tap")
    .select("id, ten_bai_tap, mon_hoc")
    .order("ten_bai_tap", { ascending: true })
    .limit(800);
  if (exErr) {
    return { ok: false, error: exErr.message || "Không đọc danh sách bài tập." };
  }

  const exMonIds = [
    ...new Set(
      (exAll ?? [])
        .map((r) => nId((r as { mon_hoc?: unknown }).mon_hoc))
        .filter((x): x is number => x != null),
    ),
  ];
  const exMonName = new Map<number, string>();
  if (exMonIds.length) {
    const { data: monRows2, error: monErr2 } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .in("id", exMonIds);
    if (monErr2) return { ok: false, error: monErr2.message || "Không đọc môn (bài tập)." };
    for (const r of monRows2 ?? []) {
      const mid = nId((r as { id?: unknown }).id);
      if (mid) exMonName.set(mid, String((r as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim());
    }
  }

  const exercises: AdminBhvExerciseOpt[] = (exAll ?? [])
    .map((r) => {
      const id = nId((r as { id?: unknown }).id);
      if (!id) return null;
      const ten = String((r as { ten_bai_tap?: unknown }).ten_bai_tap ?? "").trim();
      if (!ten) return null;
      const monId = nId((r as { mon_hoc?: unknown }).mon_hoc);
      return {
        id,
        ten_bai_tap: ten,
        ten_mon_hoc: monId != null ? exMonName.get(monId) ?? "" : "",
      };
    })
    .filter((x): x is AdminBhvExerciseOpt => x != null);

  const hocVienOptions: AdminBhvHocVienOpt[] = [];
  {
    let from = 0;
    for (;;) {
      const { data: hvOptRows, error: hvOptErr } = await supabase
        .from("ql_thong_tin_hoc_vien")
        .select("id, full_name")
        .order("full_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + HV_OPTIONS_CHUNK - 1);
      if (hvOptErr) {
        return { ok: false, error: hvOptErr.message || "Không đọc danh sách học viên." };
      }
      const chunk = hvOptRows ?? [];
      for (const r of chunk) {
        const id = nId((r as { id?: unknown }).id);
        if (!id) continue;
        const full_name = String((r as { full_name?: unknown }).full_name ?? "").trim();
        hocVienOptions.push({ id, full_name: full_name || `HV #${id}` });
      }
      if (chunk.length < HV_OPTIONS_CHUNK) break;
      from += HV_OPTIONS_CHUNK;
      if (hocVienOptions.length >= HV_OPTIONS_MAX) break;
    }
  }

  const { data: lopOptRows, error: lopOptErr } = await supabase
    .from("ql_lop_hoc")
    .select("id, class_name, class_full_name")
    .order("class_full_name", { ascending: true })
    .limit(2000);
  if (lopOptErr) {
    return { ok: false, error: lopOptErr.message || "Không đọc danh sách lớp." };
  }

  const lopOptions: AdminBhvLopOpt[] = (lopOptRows ?? [])
    .map((r) => {
      const id = nId((r as { id?: unknown }).id);
      if (!id) return null;
      const cn = String((r as { class_name?: unknown }).class_name ?? "").trim();
      const cf = String((r as { class_full_name?: unknown }).class_full_name ?? "").trim();
      const label = cf || cn || `Lớp #${id}`;
      return { id, label };
    })
    .filter((x): x is AdminBhvLopOpt => x != null);

  return {
    ok: true,
    data: {
      tab: params.tab,
      rows,
      totalCount,
      page: effectivePage,
      pageSize,
      exercises,
      hocVienOptions,
      lopOptions,
    },
  };
}

export function adminBhvTabFromSearch(raw: string | string[] | undefined): AdminBhvStatusTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "hoan" || v === "kcl" || v === "tat_ca" || v === "cho") return v;
  return "cho";
}

export function adminBhvScoreSortFromSearch(
  raw: string | string[] | undefined,
): "desc" | "asc" | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "desc" || v === "asc") return v;
  return null;
}

/** Đọc `page`, `pageSize`, `mon`, `bai`, `hideMau`, `score` từ `searchParams` App Router; `routeTab` ghi đè tab khi dùng path `[tab]`. */
export function adminBhvListParamsFromSearch(
  sp: Record<string, string | string[] | undefined>,
  opts?: { routeTab?: AdminBhvStatusTab | null },
): AdminBhvFetchParams {
  const tab = opts?.routeTab ?? adminBhvTabFromSearch(sp.tab);
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const rawPs = Array.isArray(sp.pageSize) ? sp.pageSize[0] : sp.pageSize;
  const page = Math.max(1, parseInt(String(rawPage ?? "1"), 10) || 1);
  const pageSize = clampPageSize(parseInt(String(rawPs ?? String(PAGE_SIZE_DEFAULT)), 10) || PAGE_SIZE_DEFAULT);
  const rawMon = Array.isArray(sp.mon) ? sp.mon[0] : sp.mon;
  const filterMonHoc = typeof rawMon === "string" ? rawMon : "";
  const rawBai = Array.isArray(sp.bai) ? sp.bai[0] : sp.bai;
  let filterBaiTapId: number | null = null;
  if (typeof rawBai === "string" && rawBai.trim()) {
    const n = parseInt(rawBai.trim(), 10);
    if (Number.isFinite(n) && n > 0) filterBaiTapId = n;
  }
  const rawHideMau = Array.isArray(sp.hideMau) ? sp.hideMau[0] : sp.hideMau;
  const hideBaiMau = rawHideMau === "1" || String(rawHideMau).toLowerCase() === "true";
  const scoreSort = adminBhvScoreSortFromSearch(sp.score);
  return { tab, page, pageSize, filterMonHoc, filterBaiTapId, hideBaiMau, scoreSort };
}
