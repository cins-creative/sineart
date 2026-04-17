import { getHocPhiBlockData } from "@/lib/data/courses-page";
import { dedupeMon1Pills, isHocPhiCapTocSpecial } from "@/lib/hocPhiDedupe";
import type { HocPhiComboRow, HocPhiGoiRow } from "@/types/khoa-hoc";

/** Khớp `PaymentFeeItem` trong `payment-client` — dùng cho đóng học phí */
export type PaymentFeeCatalogItem = {
  id: number;
  monHocId: number;
  tenGoi: string;
  numberValue: number;
  donVi: string;
  giaGoc: number;
  discount: number;
  giaThucDong: number;
  soMon: number;
  /** `hp_goi_hoc_phi_new.so_buoi` */
  soBuoi: number | null;
  /** `hp_goi_hoc_phi_new.special` — gói cấp tốc vs thường (khớp `HocPhiBlock` / `ql_lop_hoc.special`). */
  special: string | null;
  /** `hp_combo_mon.id` — null nếu gói không thuộc combo */
  comboId: number | null;
};

function rowToCatalogItem(r: HocPhiGoiRow): PaymentFeeCatalogItem {
  const giaGoc = r.gia_goc;
  const discount = Math.min(100, Math.max(0, r.discount));
  const donVi = String(r.don_vi ?? "").trim() || "tháng";
  const sp = r.special;
  const special =
    sp == null || sp === "" ? null : String(sp).trim() || null;
  return {
    id: r.id,
    monHocId: r.mon_hoc,
    tenGoi: `${r.number} ${donVi}`.trim(),
    numberValue: r.number,
    donVi,
    giaGoc,
    discount,
    giaThucDong: Math.round((giaGoc * (100 - discount)) / 100),
    soMon: 1,
    soBuoi: r.so_buoi,
    special,
    comboId: r.combo_id,
  };
}

export type PaymentFeeCatalogBundle = {
  fees: PaymentFeeCatalogItem[];
  combos: HocPhiComboRow[];
  gois: HocPhiGoiRow[];
};

/**
 * Gói “Gói thời hạn” trên /donghocphi — cùng nguồn + dedupe với `HocPhiBlock` trên /khoa-hoc/[slug]
 * (getHocPhiBlockData: gói môn + gói cùng combo_id).
 */
export async function fetchPaymentFeeCatalog(
  monIds: number[]
): Promise<PaymentFeeCatalogBundle> {
  const unique = [...new Set(monIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (!unique.length) return { fees: [], combos: [], gois: [] };

  const blocks = await Promise.all(unique.map((monId) => getHocPhiBlockData(monId)));

  const seenComboId = new Set<number>();
  const mergedCombos: HocPhiComboRow[] = [];
  const seenGoiId = new Set<number>();
  const mergedGois: HocPhiGoiRow[] = [];

  for (const block of blocks) {
    for (const c of block.combos) {
      if (!seenComboId.has(c.id)) {
        seenComboId.add(c.id);
        mergedCombos.push(c);
      }
    }
    for (const g of block.gois) {
      if (!seenGoiId.has(g.id)) {
        seenGoiId.add(g.id);
        mergedGois.push(g);
      }
    }
  }
  mergedCombos.sort((a, b) => a.id - b.id);

  const seenRowId = new Set<number>();
  const out: PaymentFeeCatalogItem[] = [];

  for (let i = 0; i < unique.length; i += 1) {
    const monId = unique[i];
    const { gois } = blocks[i];
    const mon1NonCap = gois.filter(
      (r) => r.mon_hoc === monId && !isHocPhiCapTocSpecial(r.special),
    );
    const mon1Cap = gois.filter(
      (r) => r.mon_hoc === monId && isHocPhiCapTocSpecial(r.special),
    );
    for (const r of dedupeMon1Pills(mon1NonCap)) {
      if (seenRowId.has(r.id)) continue;
      seenRowId.add(r.id);
      out.push(rowToCatalogItem(r));
    }
    for (const r of dedupeMon1Pills(mon1Cap)) {
      if (seenRowId.has(r.id)) continue;
      seenRowId.add(r.id);
      out.push(rowToCatalogItem(r));
    }
  }

  return { fees: out, combos: mergedCombos, gois: mergedGois };
}
