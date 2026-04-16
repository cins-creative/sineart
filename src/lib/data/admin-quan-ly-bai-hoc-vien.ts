import type { SupabaseClient } from "@supabase/supabase-js";

import { isWrongLopFkColumnError } from "@/app/api/phong-hoc/hv-chatbox/lop-column";

/** Mỗi lần gọi Supabase.range; lặp cho đến hết bản ghi (tối đa MAX_TOTAL). */
const HV_BHV_FETCH_CHUNK = 1000;
const HV_BHV_MAX_TOTAL = 50_000;
const HV_OPTIONS_CHUNK = 1000;
const HV_OPTIONS_MAX = 20_000;

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
};

export type AdminBhvHocVienOpt = { id: number; full_name: string };
export type AdminBhvLopOpt = { id: number; label: string };

export type AdminQuanLyBaiHocVienBundle = {
  tab: AdminBhvStatusTab;
  rows: AdminBaiHocVienRow[];
  exercises: AdminBhvExerciseOpt[];
  hocVienOptions: AdminBhvHocVienOpt[];
  lopOptions: AdminBhvLopOpt[];
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

async function selectHvBaiHocVienRows(
  supabase: SupabaseClient,
  tab: AdminBhvStatusTab,
): Promise<{ rows: Record<string, unknown>[]; error: { message: string } | null }> {
  const baseCols =
    "id,photo,status,score,bai_mau,thuoc_bai_tap,ten_hoc_vien,ghi_chu,lop_hoc,class,created_at";
  const baseCols2 = "id,photo,status,score,bai_mau,thuoc_bai_tap,ten_hoc_vien,ghi_chu,class,created_at";

  const fetchAllForCols = async (cols: string): Promise<{ rows: Record<string, unknown>[]; error: { message: string } | null }> => {
    const acc: Record<string, unknown>[] = [];
    let from = 0;
    for (;;) {
      let q = supabase
        .from("hv_bai_hoc_vien")
        .select(cols)
        .order("score", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });
      if (tab === "cho") q = q.or("status.eq.Chờ xác nhận,status.is.null");
      else if (tab === "hoan") q = q.eq("status", "Hoàn thiện");
      else if (tab === "kcl") q = q.eq("status", "Không đủ chất lượng");
      const { data, error } = await q.range(from, from + HV_BHV_FETCH_CHUNK - 1);
      if (error) return { rows: acc, error };
      const chunk = ((data ?? []) as unknown) as Record<string, unknown>[];
      acc.push(...chunk);
      if (chunk.length < HV_BHV_FETCH_CHUNK) break;
      from += HV_BHV_FETCH_CHUNK;
      if (acc.length >= HV_BHV_MAX_TOTAL) break;
    }
    return { rows: acc, error: null };
  };

  let { rows, error } = await fetchAllForCols(baseCols);
  if (error && isWrongLopFkColumnError(error)) {
    ({ rows, error } = await fetchAllForCols(baseCols2));
  }
  return { rows, error };
}

export async function fetchAdminQuanLyBaiHocVienBundle(
  supabase: SupabaseClient,
  tab: AdminBhvStatusTab,
): Promise<{ ok: true; data: AdminQuanLyBaiHocVienBundle } | { ok: false; error: string }> {
  const { rows: raw, error } = await selectHvBaiHocVienRows(supabase, tab);
  if (error) {
    return { ok: false, error: error.message || "Không đọc được hv_bai_hoc_vien." };
  }

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
    });
  }

  rows.sort((a, b) => {
    const sa = a.score ?? -1e18;
    const sb = b.score ?? -1e18;
    if (sb !== sa) return sb - sa;
    return b.id - a.id;
  });

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

  return { ok: true, data: { tab, rows, exercises, hocVienOptions, lopOptions } };
}

export function adminBhvTabFromSearch(raw: string | string[] | undefined): AdminBhvStatusTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "hoan" || v === "kcl" || v === "tat_ca" || v === "cho") return v;
  return "cho";
}
