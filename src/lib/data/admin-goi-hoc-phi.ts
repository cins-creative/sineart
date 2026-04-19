import type { SupabaseClient } from "@supabase/supabase-js";

import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";

function parseNumericNullable(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const t = v.replace(/\s/g, "").replace(/,/g, "").trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseComboIdsField(v: unknown): number[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    const out = v.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
    return [...new Set(out)].sort((a, b) => a - b);
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return [];
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const parsed = JSON.parse(t) as unknown;
        if (Array.isArray(parsed)) return parseComboIdsField(parsed);
      } catch {
        /* ignore */
      }
    }
    if (t.startsWith("{") && t.endsWith("}")) {
      return t
        .slice(1, -1)
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((x) => Number.isFinite(x) && x > 0);
    }
    const n = Number(t);
    return Number.isFinite(n) && n > 0 ? [n] : [];
  }
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? [n] : [];
}

export type AdminGoiHocPhiRow = {
  id: number;
  created_at: string;
  mon_hoc: number | null;
  /** Cột SQL `number` (số hiển thị / thứ tự gói). */
  goiNumber: number | null;
  don_vi: string | null;
  gia_goc: number | null;
  discount: number | null;
  combo_id: number | null;
  /** Danh sách combo (many-to-many qua bảng map); fallback: dùng `combo_id` nếu chưa có map. */
  combo_ids: number[];
  /** `hp_goi_hoc_phi_new.special` — null nếu bảng legacy không có cột. */
  special: string | null;
  /** `hp_goi_hoc_phi_new.note` — ghi chú / nội dung bổ sung (null nếu bảng legacy). */
  note: string | null;
  /** `hp_goi_hoc_phi_new.post_title` — hậu tố tên gói (null nếu bảng legacy / chưa có cột). */
  post_title: string | null;
  so_buoi: number | null;
};

export type AdminMonOption = { id: number; ten_mon_hoc: string };
export type AdminComboOption = {
  id: number;
  ten_combo: string;
  gia_giam: number;
  /** `hp_combo_mon.goi_ids` — danh sách ID gói phải đủ trong giỏ để combo áp dụng. */
  goi_ids: number[];
  /** `hp_combo_mon.dang_hoat_dong` — false = combo bị tắt. */
  dang_hoat_dong: boolean;
};

export type AdminGoiHocPhiBundle = {
  tableName: string;
  rows: AdminGoiHocPhiRow[];
  monOptions: AdminMonOption[];
  comboOptions: AdminComboOption[];
  loadError: string | null;
  /**
   * Đọc `hp_combo_mon` thất bại (vd. permission denied) — trang vẫn dùng được,
   * nhập `combo_id` thủ công trong form.
   */
  comboWarning: string | null;
};

const GOI_SELECT_BASE =
  'id, created_at, mon_hoc, "number", don_vi, gia_goc, discount, combo_id, so_buoi';

function goiSelectForTable(tableName: string): string {
  if (tableName === "hp_goi_hoc_phi") return GOI_SELECT_BASE;
  return `${GOI_SELECT_BASE}, special, note, post_title`;
}

function mapRow(raw: Record<string, unknown>): AdminGoiHocPhiRow {
  const numRaw = raw.number ?? raw["number"];
  const specialRaw = raw.special;
  const noteRaw = raw.note;
  const postTitleRaw = raw.post_title;
  return {
    id: Number(raw.id),
    created_at: String(raw.created_at ?? ""),
    mon_hoc: parseNumericNullable(raw.mon_hoc),
    goiNumber: parseNumericNullable(numRaw),
    don_vi: raw.don_vi == null || raw.don_vi === "" ? null : String(raw.don_vi).trim() || null,
    gia_goc: parseNumericNullable(raw.gia_goc),
    discount: parseNumericNullable(raw.discount),
    combo_id: null,
    combo_ids: parseComboIdsField(raw.combo_id),
    special:
      specialRaw == null || specialRaw === ""
        ? null
        : String(specialRaw).trim() || null,
    note:
      noteRaw == null || noteRaw === ""
        ? null
        : String(noteRaw).trim() || null,
    post_title:
      postTitleRaw == null || postTitleRaw === ""
        ? null
        : String(postTitleRaw).trim() || null,
    so_buoi: parseNumericNullable(raw.so_buoi),
  };
}

export async function fetchAdminGoiHocPhiBundle(
  supabase: SupabaseClient,
): Promise<AdminGoiHocPhiBundle> {
  const tableName = hpGoiHocPhiTableName();
  let loadError: string | null = null;

  const { data: goiRows, error: goiErr } = await supabase
    .from(tableName)
    .select(goiSelectForTable(tableName))
    .order("id", { ascending: false });

  if (goiErr) {
    loadError =
      goiErr.message ||
      `Không đọc được ${tableName}. Kiểm tra tên bảng (HP_GOI_HOC_PHI_TABLE) và quyền service role.`;
  }

  const { data: monRows, error: monErr } = await supabase
    .from("ql_mon_hoc")
    .select("id, ten_mon_hoc")
    .order("thu_tu_hien_thi", { ascending: true });

  if (monErr && !loadError) {
    loadError = monErr.message || "Không đọc được ql_mon_hoc.";
  }

  const { data: comboRows, error: comboErr } = await supabase
    .from("hp_combo_mon")
    .select("id, ten_combo, gia_giam, goi_ids, dang_hoat_dong")
    .order("id", { ascending: true });

  let comboWarning: string | null = null;
  if (comboErr) {
    const msg = comboErr.message || "lỗi không xác định";
    comboWarning = `Không đọc được hp_combo_mon (${msg}). Trang vẫn hoạt động: nhập ID combo thủ công. Trên Supabase chạy: GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_combo_mon TO service_role; (hoặc migration supabase/migrations/20260418120000_hp_combo_mon_service_grants.sql).`;
  }

  const rows = (goiRows as Record<string, unknown>[] | null)?.map(mapRow) ?? [];
  for (const row of rows) {
    row.combo_id = row.combo_ids[0] ?? null;
  }
  const monOptions: AdminMonOption[] =
    (monRows as { id: number; ten_mon_hoc: string | null }[] | null)?.map((m) => ({
      id: Number(m.id),
      ten_mon_hoc: String(m.ten_mon_hoc ?? "").trim() || `Môn #${m.id}`,
    })) ?? [];
  const comboOptions: AdminComboOption[] = comboErr
    ? []
    : (comboRows as { id: number; ten_combo: string | null; gia_giam?: unknown; goi_ids?: unknown; dang_hoat_dong?: unknown }[] | null)?.map(
        (c) => ({
          id: Number(c.id),
          ten_combo: String(c.ten_combo ?? "").trim() || `Combo #${c.id}`,
          gia_giam: parseNumericNullable(c.gia_giam) ?? 0,
          goi_ids: parseComboIdsField(c.goi_ids),
          dang_hoat_dong: c.dang_hoat_dong !== false,
        }),
      ) ?? [];

  return { tableName, rows, monOptions, comboOptions, loadError, comboWarning };
}
