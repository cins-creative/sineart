/**
 * Backfill hp_thu_hp_chi_tiet.hoc_phi_dong từ giá gói hiện tại.
 * Chạy SAU khi đã ALTER TABLE thêm cột hoc_phi_dong.
 *
 *   node scripts/backfill-hoc-phi-dong.mjs
 */
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function parseMoney(v) {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/\s/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function payableFromGoi(row) {
  const giaGoc = parseMoney(row.gia_goc);
  const disc = parseMoney(row.discount);
  if (giaGoc > 0) return Math.round((giaGoc * (100 - Math.min(100, Math.max(0, disc)))) / 100);
  const giaGiam = parseMoney(row.gia_giam);
  if (giaGiam > 0) return Math.round(giaGiam);
  return parseMoney(row.hoc_phi);
}

(async () => {
  const { error: colTest } = await sb.from("hp_thu_hp_chi_tiet").select("hoc_phi_dong").limit(1);
  if (colTest && /hoc_phi_dong|column/i.test(colTest.message)) {
    console.error("Thiếu cột hoc_phi_dong — chạy ALTER TABLE trong Supabase SQL Editor trước.");
    process.exit(1);
  }

  const goiTable = process.env.HP_GOI_HOC_PHI_TABLE || "hp_goi_hoc_phi_new";
  const goiCache = new Map();
  let from = 0;
  const PAGE = 500;
  let updated = 0;
  let skipped = 0;

  for (;;) {
    const { data: rows, error } = await sb
      .from("hp_thu_hp_chi_tiet")
      .select("id, goi_hoc_phi, hoc_phi_dong")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!rows?.length) break;

    for (const r of rows) {
      if (r.hoc_phi_dong != null && String(r.hoc_phi_dong).trim() !== "") {
        skipped++;
        continue;
      }
      const goiId = Number(r.goi_hoc_phi);
      if (!Number.isFinite(goiId) || goiId <= 0) continue;

      let goi = goiCache.get(goiId);
      if (!goi) {
        const { data: g } = await sb
          .from(goiTable)
          .select("id, gia_goc, discount, hoc_phi, gia_giam")
          .eq("id", goiId)
          .maybeSingle();
        goi = g;
        if (g) goiCache.set(goiId, g);
      }

      const amt = goi ? payableFromGoi(goi) : 0;
      const { error: uErr } = await sb.from("hp_thu_hp_chi_tiet").update({ hoc_phi_dong: amt }).eq("id", r.id);
      if (uErr) {
        console.error(`id ${r.id}:`, uErr.message);
        process.exit(1);
      }
      updated++;
    }

    if (rows.length < PAGE) break;
    from += PAGE;
  }

  const { count: total } = await sb.from("hp_thu_hp_chi_tiet").select("*", { count: "exact", head: true });
  const { count: nullCount } = await sb
    .from("hp_thu_hp_chi_tiet")
    .select("*", { count: "exact", head: true })
    .is("hoc_phi_dong", null);

  console.log(JSON.stringify({ updated, skipped, total, nullCount, goiTable }, null, 2));
})();
