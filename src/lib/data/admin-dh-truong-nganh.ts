import type { SupabaseClient } from "@supabase/supabase-js";

import { DH_MON_THI_HOP_LE } from "@/lib/agent/dh-exam-profiles";

export type AdminDhTruongLookup = {
  id: number;
  ten: string;
  /** `dh_truong_dai_hoc.score` — điểm chuẩn / thang ưu tiên trường (thấp hơn = ưu tiên cao hơn). */
  score: number | null;
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

const ALLOWED_MON = new Set<string>(DH_MON_THI_HOP_LE as unknown as string[]);

function parseMonThiArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (!t) continue;
    if (ALLOWED_MON.has(t)) out.push(t);
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
export function sortDhTruongLookupByScore(rows: readonly AdminDhTruongLookup[]): AdminDhTruongLookup[] {
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
