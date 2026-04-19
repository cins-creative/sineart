import { getHocPhiBlockData } from "@/lib/data/courses-page";
import { createClient } from "@/lib/supabase/server";
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
  /** `hp_goi_hoc_phi_new.post_title` — nhóm gói (vd: "1 môn", "2 môn"); null nếu chưa đặt. */
  postTitle: string | null;
};

function rowToCatalogItem(r: HocPhiGoiRow): PaymentFeeCatalogItem {
  const giaGoc = r.gia_goc;
  const discount = Math.min(100, Math.max(0, r.discount));
  const donVi = String(r.don_vi ?? "").trim() || "tháng";
  const sp = r.special;
  const special =
    sp == null || sp === "" ? null : String(sp).trim() || null;
  const pt = r.post_title;
  const postTitle =
    pt == null || pt === "" ? null : String(pt).trim() || null;
  // Tên gói: postTitle (nếu có) + number + donVi
  const tenGoiParts = [
    ...(postTitle ? [postTitle] : []),
    `${r.number} ${donVi}`,
  ];
  return {
    id: r.id,
    monHocId: r.mon_hoc,
    tenGoi: tenGoiParts.join(" ").trim(),
    numberValue: r.number,
    donVi,
    giaGoc,
    discount,
    giaThucDong: Math.round((giaGoc * (100 - discount)) / 100),
    soMon: 1,
    soBuoi: r.so_buoi,
    special,
    comboId: r.combo_id,
    postTitle,
  };
}

export type PaymentFeeCatalogBundle = {
  fees: PaymentFeeCatalogItem[];
  combos: HocPhiComboRow[];
  gois: HocPhiGoiRow[];
};

/**
 * Gói "Gói thời hạn" trên /donghocphi — cùng nguồn + dedupe với `HocPhiBlock` trên /khoa-hoc/[slug].
 * Combo dùng `goi_ids`-based matching — fetch toàn bộ combo từ `hp_combo_mon`.
 */
export async function fetchPaymentFeeCatalog(
  monIds: number[]
): Promise<PaymentFeeCatalogBundle> {
  const unique = [...new Set(monIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (!unique.length) return { fees: [], combos: [], gois: [] };

  const supabase = await createClient();
  const [blocks, allCombosResult] = await Promise.all([
    Promise.all(unique.map((monId) => getHocPhiBlockData(monId))),
    supabase
      ? supabase
          .from("hp_combo_mon")
          .select("id, ten_combo, gia_giam, goi_ids, dang_hoat_dong")
          .order("id", { ascending: true })
      : Promise.resolve(null),
  ]);

  const seenGoiId = new Set<number>();
  const mergedGois: HocPhiGoiRow[] = [];
  for (const block of blocks) {
    for (const g of block.gois) {
      if (!seenGoiId.has(g.id)) {
        seenGoiId.add(g.id);
        mergedGois.push(g);
      }
    }
  }

  // Dùng toàn bộ combo (goi_ids-based) thay vì chỉ combo qua combo_id trên gói
  let mergedCombos: HocPhiComboRow[] = [];
  if (
    allCombosResult &&
    !("error" in allCombosResult && allCombosResult.error) &&
    allCombosResult.data?.length
  ) {
    mergedCombos = (allCombosResult.data as Record<string, unknown>[]).map((c) => ({
      id: Number(c.id),
      ten_combo: String(c.ten_combo ?? "").trim(),
      gia_giam: Number(c.gia_giam ?? 0),
      goi_ids: Array.isArray(c.goi_ids)
        ? (c.goi_ids as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0)
        : [],
      dang_hoat_dong: c.dang_hoat_dong !== false,
    }));
  } else {
    // Fallback: dedup combos từ blocks (dùng combo_id cũ nếu chưa có goi_ids)
    const seenComboId = new Set<number>();
    for (const block of blocks) {
      for (const c of block.combos) {
        if (!seenComboId.has(c.id)) {
          seenComboId.add(c.id);
          mergedCombos.push(c);
        }
      }
    }
    mergedCombos.sort((a, b) => a.id - b.id);
  }

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

  // Build canonical map: raw goi_id (mọi ID gốc) → ID đã dedup trong picker (`out`).
  // Combo trong DB lưu raw IDs, nhưng payment-client check theo ID picker đã chọn → cần normalize.
  // Key: `monId|number|donVi|special-bucket` (giống dedupeMon1Pills, nhưng tách cấp tốc)
  const canonicalIdByKey = new Map<string, number>();
  for (const item of out) {
    const isCap = isHocPhiCapTocSpecial(item.special);
    const key = `${item.monHocId}|${item.numberValue}|${item.donVi.trim().toLowerCase()}|${isCap ? "1" : "0"}`;
    canonicalIdByKey.set(key, item.id);
  }
  const canonicalMap: Record<number, number> = {};
  for (const g of mergedGois) {
    const isCap = isHocPhiCapTocSpecial(g.special);
    const key = `${g.mon_hoc}|${g.number}|${(g.don_vi ?? "").trim().toLowerCase()}|${isCap ? "1" : "0"}`;
    const canonical = canonicalIdByKey.get(key);
    if (canonical != null) canonicalMap[g.id] = canonical;
  }

  // Normalize `combo.goi_ids` về canonical IDs để khớp với ID picker
  mergedCombos = mergedCombos.map((c) => ({
    ...c,
    goi_ids: c.goi_ids
      .map((id) => canonicalMap[id] ?? id)
      .filter((id, idx, arr) => arr.indexOf(id) === idx), // dedupe sau normalize
  }));

  return { fees: out, combos: mergedCombos, gois: mergedGois };
}
