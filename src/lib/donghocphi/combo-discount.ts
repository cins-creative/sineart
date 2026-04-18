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
    so_buoi,
    special,
    note,
  };
}

export function rawToHocPhiComboRow(row: Record<string, unknown>): HocPhiComboRow {
  return {
    id: Number(row.id),
    ten_combo: String(row.ten_combo ?? "").trim(),
    gia_giam: parseMoney(row.gia_giam),
  };
}

/** Một dòng đang thanh toán — đủ để đối chiếu với `hp_combo_mon` + gói combo. */
export type ComboPayingLineInput = {
  monHocId: number;
  number: number;
  donVi: string;
  comboId: number | null;
};

/**
 * Giống `HocPhiBlock` (`combos.find`): combo **đầu tiên** (theo thứ tự `combosOrdered`)
 * mà đủ môn trong định nghĩa combo (`allGois` có `combo_id`), cùng thời lượng gói, và học viên
 * đang đóng đủ các môn đó với gói gắn `combo_id` tương ứng.
 */
export function firstApplicableComboDiscountDong(
  payingLines: ComboPayingLineInput[],
  combosOrdered: HocPhiComboRow[],
  allGois: HocPhiGoiRow[]
): number {
  for (const combo of combosOrdered) {
    const giam = Math.max(0, Math.round(combo.gia_giam));
    if (giam <= 0) continue;

    const R = [
      ...new Set(allGois.filter((g) => g.combo_id === combo.id).map((g) => g.mon_hoc)),
    ];
    if (R.length < 2) continue;

    const comboPaying = payingLines.filter(
      (l) => l.comboId === combo.id && R.includes(l.monHocId)
    );

    const byMon = new Map<number, ComboPayingLineInput>();
    let invalidDup = false;
    for (const l of comboPaying) {
      const prev = byMon.get(l.monHocId);
      if (prev != null) {
        if (prev.number !== l.number || prev.donVi.trim() !== l.donVi.trim()) {
          invalidDup = true;
          break;
        }
        continue;
      }
      byMon.set(l.monHocId, l);
    }
    if (invalidDup) continue;
    if (byMon.size !== R.length) continue;

    const first = [...byMon.values()][0];
    if (!first) continue;
    const sameDur = [...byMon.values()].every(
      (l) => l.number === first.number && l.donVi.trim() === first.donVi.trim()
    );
    if (!sameDur) continue;

    return giam;
  }
  return 0;
}
