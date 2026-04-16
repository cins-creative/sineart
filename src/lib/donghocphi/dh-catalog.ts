import type { SupabaseClient } from "@supabase/supabase-js";

/** Mục chọn trường — truyền xuống client (JSON-safe). */
export type DhpDhTruongItem = { id: number; ten: string };

/** Ngành theo từng trường — key là `String(truongId)` (JSON object keys). */
export type DhpDhCatalog = {
  truong: DhpDhTruongItem[];
  nganhByTruongId: Record<string, DhpDhTruongItem[]>;
};

export type DhpInitialNguyenVongRow = { truongId: number; nganhId: number };

/**
 * Đọc `dh_truong_dai_hoc`, `dh_nganh_dao_tao`, `dh_truong_nganh` — không dùng FK embed (theo quy ước project).
 */
export async function fetchDhNguyenVongCatalog(
  supabase: SupabaseClient
): Promise<{ catalog: DhpDhCatalog | null; error: string | null }> {
  const [trRes, ngRes, jRes] = await Promise.all([
    supabase
      .from("dh_truong_dai_hoc")
      .select("id, ten_truong_dai_hoc")
      .order("ten_truong_dai_hoc", { ascending: true }),
    supabase.from("dh_nganh_dao_tao").select("id, ten_nganh").order("ten_nganh", { ascending: true }),
    supabase.from("dh_truong_nganh").select("truong_dai_hoc, nganh_dao_tao"),
  ]);

  if (trRes.error) return { catalog: null, error: trRes.error.message };
  if (ngRes.error) return { catalog: null, error: ngRes.error.message };
  if (jRes.error) return { catalog: null, error: jRes.error.message };

  const nganhLabel = new Map<number, string>();
  for (const r of ngRes.data ?? []) {
    const id = Number((r as { id: unknown }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const ten = String((r as { ten_nganh?: unknown }).ten_nganh ?? "").trim();
    nganhLabel.set(id, ten || `Ngành ${id}`);
  }

  const truong: DhpDhTruongItem[] = (trRes.data ?? [])
    .map((r) => {
      const id = Number((r as { id: unknown }).id);
      const ten = String((r as { ten_truong_dai_hoc?: unknown }).ten_truong_dai_hoc ?? "").trim();
      return { id, ten: ten || `Trường ${id}` };
    })
    .filter((x) => Number.isFinite(x.id) && x.id > 0);

  const nganhByTruongId: Record<string, DhpDhTruongItem[]> = {};

  for (const jr of jRes.data ?? []) {
    const row = jr as { truong_dai_hoc?: unknown; nganh_dao_tao?: unknown };
    const t = Number(row.truong_dai_hoc);
    const n = Number(row.nganh_dao_tao);
    if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(n) || n <= 0) continue;
    const tenNganh = nganhLabel.get(n);
    if (tenNganh == null) continue;
    const key = String(t);
    const list = nganhByTruongId[key] ?? [];
    if (!list.some((x) => x.id === n)) {
      list.push({ id: n, ten: tenNganh });
    }
    nganhByTruongId[key] = list;
  }

  for (const k of Object.keys(nganhByTruongId)) {
    nganhByTruongId[k]?.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  }

  return {
    catalog: { truong, nganhByTruongId },
    error: null,
  };
}
