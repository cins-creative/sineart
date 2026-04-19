import type { HocPhiComboRow, HocPhiGoiRow } from "@/types/khoa-hoc";

function parseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseNumericArray(v: unknown): number[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return (v as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return [];
    if (t.startsWith("{") && t.endsWith("}")) {
      return t
        .slice(1, -1)
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const parsed = JSON.parse(t) as unknown;
        if (Array.isArray(parsed)) return parseNumericArray(parsed);
      } catch {
        /* ignore */
      }
    }
  }
  return [];
}

/** Map một dòng gói từ Supabase → `HocPhiGoiRow` (khớp `mapHocPhiGoiRow` trong courses-page). */
export function rawToHocPhiGoiRow(row: Record<string, unknown>): HocPhiGoiRow {
  const numRaw = row.number;
  const numberValue = numRaw == null || numRaw === "" ? 0 : Number(numRaw);
  const donVi = String(row.don_vi ?? "").trim();
  const giaGoc = parseMoney(row.gia_goc);
  const discount = Math.min(100, Math.max(0, parseMoney(row.discount)));
  const comboRaw = row.combo_id;
  const comboNum = comboRaw == null || comboRaw === "" ? null : Number(comboRaw);
  const sbRaw = row.so_buoi;
  const soBuoiParsed = sbRaw == null || sbRaw === "" ? null : Number(sbRaw);
  const so_buoi =
    soBuoiParsed != null && Number.isFinite(soBuoiParsed) && soBuoiParsed >= 0
      ? Math.round(soBuoiParsed)
      : null;
  const sp = row.special;
  const special =
    sp == null || sp === ""
      ? null
      : String(sp).trim() || null;
  const nt = row.note;
  const note =
    nt == null || nt === ""
      ? null
      : String(nt).trim() || null;

  return {
    id: Number(row.id),
    mon_hoc: Number(row.mon_hoc),
    number: Number.isFinite(numberValue) ? numberValue : 0,
    don_vi: donVi,
    gia_goc: giaGoc,
    discount,
    combo_id: comboNum != null && Number.isFinite(comboNum) ? comboNum : null,
    combo_ids: comboNum != null && Number.isFinite(comboNum) ? [comboNum] : [],
    so_buoi,
    special,
    note,
    post_title: null,
  };
}

export function rawToHocPhiComboRow(row: Record<string, unknown>): HocPhiComboRow {
  return {
    id: Number(row.id),
    ten_combo: String(row.ten_combo ?? "").trim(),
    gia_giam: parseMoney(row.gia_giam),
    goi_ids: parseNumericArray(row.goi_ids),
    dang_hoat_dong: row.dang_hoat_dong !== false,
  };
}

/**
 * Một dòng đang thanh toán — đủ để đối chiếu với `goi_ids` trên `hp_combo_mon`.
 * Chỉ cần `goiId` — combo khớp khi **tất cả** `goi_ids` trong combo đều có mặt trong giỏ.
 */
export type ComboPayingLineInput = {
  goiId: number;
};

/**
 * Trả về số tiền giảm của combo tốt nhất áp dụng được.
 *
 * Logic:
 *  - Combo phải `dang_hoat_dong = true`.
 *  - Combo phải có ít nhất 1 gói trong `goi_ids`.
 *  - **Tất cả** `goi_ids` của combo phải có trong giỏ (`payingLines`).
 *  - Nếu nhiều combo đủ điều kiện → chỉ lấy combo giảm nhiều nhất (single_best_only).
 */
export function firstApplicableComboDiscountDong(
  payingLines: ComboPayingLineInput[],
  combosOrdered: HocPhiComboRow[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _allGois?: HocPhiGoiRow[],
): number {
  return bestApplicableCombo(payingLines, combosOrdered)?.giam ?? 0;
}

/**
 * Trả về combo tốt nhất đủ điều kiện (single_best_only) + số tiền giảm.
 * `null` nếu không combo nào khớp.
 */
export function bestApplicableCombo(
  payingLines: ComboPayingLineInput[],
  combosOrdered: HocPhiComboRow[],
): { combo: HocPhiComboRow; giam: number } | null {
  const cartGoiIds = new Set(payingLines.map((l) => l.goiId));
  let bestCombo: HocPhiComboRow | null = null;
  let bestGiam = 0;

  for (const combo of combosOrdered) {
    if (!combo.dang_hoat_dong) continue;
    const giam = Math.max(0, Math.round(combo.gia_giam));
    if (giam <= 0) continue;
    if (!combo.goi_ids || combo.goi_ids.length === 0) continue;

    const allPresent = combo.goi_ids.every((id) => cartGoiIds.has(id));
    if (!allPresent) continue;

    if (giam > bestGiam) {
      bestGiam = giam;
      bestCombo = combo;
    }
  }

  return bestCombo ? { combo: bestCombo, giam: bestGiam } : null;
}
