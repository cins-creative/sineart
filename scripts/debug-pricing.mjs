import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, "utf8");
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing env", { hasUrl: Boolean(url), hasKey: Boolean(key) });
  process.exit(1);
}

const sb = createClient(url, key);

const q = process.argv.slice(2).join(" ").trim() || "Trang trí màu";

const mons = await sb
  .from("ql_mon_hoc")
  .select("id, ten_mon_hoc")
  .ilike("ten_mon_hoc", `%${q}%`)
  .limit(10);

console.log("query:", q);
console.log("mons.error:", mons.error);
console.log("mons.data:", mons.data);

const mon = mons.data?.[0];
if (!mon) process.exit(0);

const goi = await sb
  .from("hp_goi_hoc_phi")
  .select(
    "id, mon_hoc, ten_goi_hoc_phi, hoc_phi, gia_giam, so_mon, thoi_han_thang, hinh_thuc, la_chuan_thi"
  )
  .eq("mon_hoc", mon.id)
  .order("id", { ascending: true });

console.log("monId:", mon.id);
console.log("goi.error:", goi.error);
console.log("goi.count:", goi.data?.length ?? 0);
console.log("goi.data:", goi.data);

