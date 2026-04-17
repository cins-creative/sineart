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
  /** `hp_goi_hoc_phi_new.special` — null nếu bảng legacy không có cột. */
  special: string | null;
  so_buoi: number | null;
};

export type AdminMonOption = { id: number; ten_mon_hoc: string };
export type AdminComboOption = { id: number; ten_combo: string; gia_giam: number };

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
  return `${GOI_SELECT_BASE}, special`;
}

function mapRow(raw: Record<string, unknown>): AdminGoiHocPhiRow {
  const numRaw = raw.number ?? raw["number"];
  const specialRaw = raw.special;
  return {
    id: Number(raw.id),
    created_at: String(raw.created_at ?? ""),
    mon_hoc: parseNumericNullable(raw.mon_hoc),
    goiNumber: parseNumericNullable(numRaw),
    don_vi: raw.don_vi == null || raw.don_vi === "" ? null : String(raw.don_vi).trim() || null,
    gia_goc: parseNumericNullable(raw.gia_goc),
    discount: parseNumericNullable(raw.discount),
    combo_id: parseNumericNullable(raw.combo_id),
    special:
      specialRaw == null || specialRaw === ""
        ? null
        : String(specialRaw).trim() || null,
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
    .select("id, ten_combo, gia_giam")
    .order("id", { ascending: true });

  let comboWarning: string | null = null;
  if (comboErr) {
    const msg = comboErr.message || "lỗi không xác định";
    comboWarning = `Không đọc được hp_combo_mon (${msg}). Trang vẫn hoạt động: nhập ID combo thủ công. Trên Supabase chạy: GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_combo_mon TO service_role; (hoặc migration supabase/migrations/20260418120000_hp_combo_mon_service_grants.sql).`;
  }

  const rows = (goiRows as Record<string, unknown>[] | null)?.map(mapRow) ?? [];
  const monOptions: AdminMonOption[] =
    (monRows as { id: number; ten_mon_hoc: string | null }[] | null)?.map((m) => ({
      id: Number(m.id),
      ten_mon_hoc: String(m.ten_mon_hoc ?? "").trim() || `Môn #${m.id}`,
    })) ?? [];
  const comboOptions: AdminComboOption[] = comboErr
    ? []
    : (comboRows as { id: number; ten_combo: string | null; gia_giam?: unknown }[] | null)?.map(
        (c) => ({
          id: Number(c.id),
          ten_combo: String(c.ten_combo ?? "").trim() || `Combo #${c.id}`,
          gia_giam: parseNumericNullable(c.gia_giam) ?? 0,
        }),
      ) ?? [];

  return { tableName, rows, monOptions, comboOptions, loadError, comboWarning };
}
