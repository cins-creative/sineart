/**
 * Fetch dữ liệu public cho `/tra-cuu-thong-tin/truong/...` — chỉ Server Components.
 * Slug trường/ngành khớp logic admin (`buildDhTruongSlug` / `buildDhNganhSlug`).
 */

import { cache } from "react";

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildDhTruongSlug,
  fetchAdminDhTruongNganhRows,
  fetchDhDistinctTuyenSinhYearsForTruong,
  fetchDhMocLichTuyenSinh,
  fetchDhNganhListByTruong,
  fetchDhTruongNganhCatalogForPair,
  findDhNganhBySlugWithinTruong,
  findDhTruongBySlug,
  type AdminDhMocLichRow,
} from "@/lib/data/admin-dh-truong-nganh";
import { createClient } from "@/lib/supabase/server";
import { createFetchWithTimeout } from "@/lib/supabase/fetch-timeout";

const PAGE_SIZE = 1000;

/** `generateStaticParams` chạy lúc build — không dùng `cookies()` (SSR client). */
function createSupabaseForStaticParams(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createFetchWithTimeout() },
  });
}

function parseYear(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export type TruongPublicNganh = {
  nganh_id: number;
  ten_nganh: string;
  slug: string;
  mon_thi: string[];
  details: string | null;
};

export type TruongPublicMetricRow = {
  nam_tuyen_sinh: number;
  nganh_id: number;
  ten_nganh: string;
  nganh_slug: string;
  diem_chuan: number | null;
  chi_tieu: number | null;
  ghi_chu: string | null;
};

export type TruongPublicExtras = {
  mo_ta: string | null;
  website: string | null;
  dia_chi: string | null;
  ma_truong: string | null;
  hinh_anh: string | null;
};

export type TruongPublicPageData = {
  truong_id: number;
  ten_truong: string;
  truong_slug: string;
  score: number | null;
  extras: TruongPublicExtras;
  nganh: TruongPublicNganh[];
  metricsByYear: { year: number; rows: TruongPublicMetricRow[] }[];
  mocByYear: { year: number; rows: AdminDhMocLichRow[] }[];
};

export type NganhDiemPublicRow = {
  nam_tuyen_sinh: number;
  diem_chuan: number | null;
  chi_tieu: number | null;
  ghi_chu: string | null;
};

export type NganhDiemPublicPageData = {
  truong_id: number;
  ten_truong: string;
  truong_slug: string;
  nganh_id: number;
  ten_nganh: string;
  nganh_slug: string;
  truong_extras: TruongPublicExtras;
  nganh_extras: TruongPublicExtras;
  diemRows: NganhDiemPublicRow[];
  mon_thi: string[];
  details: string | null;
};

export function publicTruongPath(truongSlug: string): string {
  return `/tra-cuu-thong-tin/truong/${encodeURIComponent(truongSlug)}`;
}

export function publicNganhPath(truongSlug: string, nganhSlug: string): string {
  return `/tra-cuu-thong-tin/truong/${encodeURIComponent(truongSlug)}/${encodeURIComponent(nganhSlug)}`;
}

async function fetchTruongExtras(
  supabase: SupabaseClient,
  truongId: number,
): Promise<TruongPublicExtras> {
  const empty: TruongPublicExtras = {
    mo_ta: null,
    website: null,
    dia_chi: null,
    ma_truong: null,
    hinh_anh: null,
  };
  const { data, error } = await supabase.from("dh_truong_dai_hoc").select("*").eq("id", truongId).maybeSingle();
  if (error || !data) return empty;
  const r = data as Record<string, unknown>;
  return {
    mo_ta: typeof r.mo_ta === "string" && r.mo_ta.trim() ? r.mo_ta.trim() : null,
    website: typeof r.website === "string" && r.website.trim() ? r.website.trim() : null,
    dia_chi: typeof r.dia_chi === "string" && r.dia_chi.trim() ? r.dia_chi.trim() : null,
    ma_truong: typeof r.ma_truong === "string" && r.ma_truong.trim() ? r.ma_truong.trim() : null,
    hinh_anh: typeof r.hinh_anh === "string" && r.hinh_anh.trim() ? r.hinh_anh.trim() : null,
  };
}

async function fetchNganhExtras(
  supabase: SupabaseClient,
  nganhId: number,
): Promise<TruongPublicExtras> {
  const empty: TruongPublicExtras = {
    mo_ta: null,
    website: null,
    dia_chi: null,
    ma_truong: null,
    hinh_anh: null,
  };
  const { data, error } = await supabase.from("dh_nganh_dao_tao").select("*").eq("id", nganhId).maybeSingle();
  if (error || !data) return empty;
  const r = data as Record<string, unknown>;
  return {
    mo_ta: typeof r.mo_ta === "string" && r.mo_ta.trim() ? r.mo_ta.trim() : null,
    website: null,
    dia_chi: null,
    ma_truong: typeof r.ma_nganh === "string" && r.ma_nganh.trim() ? r.ma_nganh.trim() : null,
    hinh_anh: typeof r.hinh_anh === "string" && r.hinh_anh.trim() ? r.hinh_anh.trim() : null,
  };
}

async function fetchMetricsForTruong(
  supabase: SupabaseClient,
  truongId: number,
  nganhMeta: Map<number, { ten: string; slug: string }>,
): Promise<TruongPublicMetricRow[]> {
  const acc: TruongPublicMetricRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("dh_truong_nganh_theo_nam")
      .select("nam_tuyen_sinh, nganh_dao_tao, diem_chuan, chi_tieu, ghi_chu")
      .eq("truong_dai_hoc", truongId)
      .order("nam_tuyen_sinh", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn("[dh-public] dh_truong_nganh_theo_nam:", error.message);
      break;
    }
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const raw of batch) {
      const nam = parseYear(raw.nam_tuyen_sinh);
      const nid = Number(raw.nganh_dao_tao);
      const meta = nganhMeta.get(nid);
      if (nam == null || !Number.isFinite(nid) || nid <= 0 || !meta) continue;
      const dc = raw.diem_chuan;
      const diem =
        dc == null || dc === ""
          ? null
          : Number.isFinite(Number(dc))
            ? Number(dc)
            : null;
      const ct = raw.chi_tieu;
      const chiTieu =
        ct == null || ct === ""
          ? null
          : Number.isFinite(Number(ct))
            ? Math.trunc(Number(ct))
            : null;
      acc.push({
        nam_tuyen_sinh: nam,
        nganh_id: nid,
        ten_nganh: meta.ten,
        nganh_slug: meta.slug,
        diem_chuan: diem,
        chi_tieu: chiTieu,
        ghi_chu: typeof raw.ghi_chu === "string" && raw.ghi_chu.trim() ? raw.ghi_chu.trim() : null,
      });
    }
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return acc;
}

function groupMetricsByYear(rows: TruongPublicMetricRow[]): { year: number; rows: TruongPublicMetricRow[] }[] {
  const byYear = new Map<number, TruongPublicMetricRow[]>();
  for (const r of rows) {
    if (!byYear.has(r.nam_tuyen_sinh)) byYear.set(r.nam_tuyen_sinh, []);
    byYear.get(r.nam_tuyen_sinh)!.push(r);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  return years.map((year) => ({
    year,
    rows: (byYear.get(year) ?? []).sort((a, b) => a.ten_nganh.localeCompare(b.ten_nganh, "vi")),
  }));
}

async function fetchTruongPublicPageDataUncached(
  truongSlug: string,
): Promise<TruongPublicPageData | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const found = await findDhTruongBySlug(supabase, truongSlug);
  if (!found.ok || !found.row) return null;

  const { id: truong_id, ten: ten_truong, score, slug: truong_slug } = found.row;

  const [listRes, pairsRes, extras] = await Promise.all([
    fetchDhNganhListByTruong(supabase, truong_id),
    fetchAdminDhTruongNganhRows(supabase, truong_id),
    fetchTruongExtras(supabase, truong_id),
  ]);
  if (!listRes.ok || !pairsRes.ok) return null;

  const pairByNganh = new Map(pairsRes.rows.map((p) => [p.nganh_id, p]));
  const nganhMeta = new Map(
    listRes.rows.map((r) => [r.id, { ten: r.ten, slug: r.slug } as const]),
  );

  const nganh: TruongPublicNganh[] = listRes.rows.map((r) => {
    const p = pairByNganh.get(r.id);
    return {
      nganh_id: r.id,
      ten_nganh: r.ten,
      slug: r.slug,
      mon_thi: p?.mon_thi ?? [],
      details: p?.details ?? null,
    };
  });

  const metrics = await fetchMetricsForTruong(supabase, truong_id, nganhMeta);
  const metricsByYear = groupMetricsByYear(metrics);

  const yearsRes = await fetchDhDistinctTuyenSinhYearsForTruong(supabase, truong_id);
  const years = yearsRes.ok ? yearsRes.years : [];
  const mocByYear: { year: number; rows: AdminDhMocLichRow[] }[] = [];
  for (const year of years) {
    const m = await fetchDhMocLichTuyenSinh(supabase, truong_id, year);
    if (m.ok && m.rows.length) mocByYear.push({ year, rows: m.rows });
  }
  mocByYear.sort((a, b) => b.year - a.year);

  return {
    truong_id,
    ten_truong,
    truong_slug,
    score,
    extras,
    nganh,
    metricsByYear,
    mocByYear,
  };
}

export const getTruongPublicPageData = cache(fetchTruongPublicPageDataUncached);

async function fetchNganhDiemPublicPageDataUncached(
  truongSlug: string,
  nganhSlug: string,
): Promise<NganhDiemPublicPageData | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const tr = await findDhTruongBySlug(supabase, truongSlug);
  if (!tr.ok || !tr.row) return null;

  const ng = await findDhNganhBySlugWithinTruong(supabase, tr.row.id, nganhSlug);
  if (!ng.ok || !ng.row) return null;

  const [catalog, trExtras, ngExtras] = await Promise.all([
    fetchDhTruongNganhCatalogForPair(supabase, tr.row.id, ng.row.id),
    fetchTruongExtras(supabase, tr.row.id),
    fetchNganhExtras(supabase, ng.row.id),
  ]);
  if (!catalog.ok) return null;

  const diemRows: NganhDiemPublicRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("dh_truong_nganh_theo_nam")
      .select("nam_tuyen_sinh, diem_chuan, chi_tieu, ghi_chu")
      .eq("truong_dai_hoc", tr.row.id)
      .eq("nganh_dao_tao", ng.row.id)
      .order("nam_tuyen_sinh", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn("[dh-public] nganh diem:", error.message);
      break;
    }
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;
    for (const raw of batch) {
      const nam = parseYear(raw.nam_tuyen_sinh);
      if (nam == null) continue;
      const dc = raw.diem_chuan;
      const diem =
        dc == null || dc === ""
          ? null
          : Number.isFinite(Number(dc))
            ? Number(dc)
            : null;
      const ct = raw.chi_tieu;
      const chiTieu =
        ct == null || ct === ""
          ? null
          : Number.isFinite(Number(ct))
            ? Math.trunc(Number(ct))
            : null;
      diemRows.push({
        nam_tuyen_sinh: nam,
        diem_chuan: diem,
        chi_tieu: chiTieu,
        ghi_chu: typeof raw.ghi_chu === "string" && raw.ghi_chu.trim() ? raw.ghi_chu.trim() : null,
      });
    }
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  if (!diemRows.length) return null;

  return {
    truong_id: tr.row.id,
    ten_truong: tr.row.ten,
    truong_slug: tr.row.slug,
    nganh_id: ng.row.id,
    ten_nganh: ng.row.ten,
    nganh_slug: ng.row.slug,
    truong_extras: trExtras,
    nganh_extras: ngExtras,
    diemRows,
    mon_thi: catalog.mon_thi,
    details: catalog.details,
  };
}

export const getNganhDiemPublicPageData = cache(fetchNganhDiemPublicPageDataUncached);

export async function generateStaticParamsTruongSlugs(): Promise<{ "truong-slug": string }[]> {
  const supabase = createSupabaseForStaticParams();
  if (!supabase) return [];

  const { data, error } = await supabase.from("dh_truong_dai_hoc").select("id, ten_truong_dai_hoc");
  if (error || !data?.length) return [];

  const rows = (data as Record<string, unknown>[])
    .map((r) => {
      const id = Number(r.id);
      const ten = String(r.ten_truong_dai_hoc ?? "").trim();
      if (!Number.isFinite(id) || id <= 0 || !ten) return null;
      return { id, ten };
    })
    .filter((x): x is { id: number; ten: string } => x !== null);

  return rows.map((r) => ({
    "truong-slug": buildDhTruongSlug(r.id, r.ten, rows),
  }));
}

export async function generateStaticParamsTruongNganhSlugs(): Promise<
  { "truong-slug": string; "nganh-slug": string }[]
> {
  const supabase = createSupabaseForStaticParams();
  if (!supabase) return [];

  const pairKeys = new Map<string, { tid: number; nid: number }>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("dh_truong_nganh_theo_nam")
      .select("truong_dai_hoc, nganh_dao_tao")
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data?.length) break;
    for (const raw of data as Record<string, unknown>[]) {
      const tid = Number(raw.truong_dai_hoc);
      const nid = Number(raw.nganh_dao_tao);
      if (!Number.isFinite(tid) || tid <= 0 || !Number.isFinite(nid) || nid <= 0) continue;
      pairKeys.set(`${tid}-${nid}`, { tid, nid });
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const { data: trData } = await supabase.from("dh_truong_dai_hoc").select("id, ten_truong_dai_hoc");
  const trRows = (trData as Record<string, unknown>[] | null)?.flatMap((r) => {
    const id = Number(r.id);
    const ten = String(r.ten_truong_dai_hoc ?? "").trim();
    if (!Number.isFinite(id) || id <= 0 || !ten) return [];
    return [{ id, ten }];
  }) ?? [];

  const byTruong = new Map<number, Set<number>>();
  for (const { tid, nid } of pairKeys.values()) {
    if (!byTruong.has(tid)) byTruong.set(tid, new Set());
    byTruong.get(tid)!.add(nid);
  }

  const out: { "truong-slug": string; "nganh-slug": string }[] = [];
  const seen = new Set<string>();

  for (const [tid, nids] of byTruong) {
    const tr = trRows.find((x) => x.id === tid);
    if (!tr) continue;
    const truongSlug = buildDhTruongSlug(tr.id, tr.ten, trRows);
    const listRes = await fetchDhNganhListByTruong(supabase, tid);
    if (!listRes.ok) continue;
    const slugByNganhId = new Map(listRes.rows.map((r) => [r.id, r.slug]));
    for (const nid of nids) {
      const nganhSlug = slugByNganhId.get(nid);
      if (!nganhSlug) continue;
      const k = `${truongSlug}::${nganhSlug}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ "truong-slug": truongSlug, "nganh-slug": nganhSlug });
    }
  }

  return out;
}
