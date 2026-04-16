/**
 * Chạy: node --env-file=.env.local scripts/debug-classroom-lookup.mjs [email]
 */
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] ?? "nguyenthanhtu.nkl@gmail.com").trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

console.log("Email:", email);

const { data: hvList, error: hvErr } = await supabase
  .from("ql_thong_tin_hoc_vien")
  .select("id,email,full_name")
  .ilike("email", email);

console.log("ql_thong_tin_hoc_vien:", { error: hvErr?.message ?? null, count: hvList?.length ?? 0 });

const hvPks = (hvList ?? []).map((r) => String(r.id));
if (hvPks.length === 0) {
  process.exit(0);
}

const q1 = await supabase
  .from("ql_quan_ly_hoc_vien")
  .select("id,hoc_vien_id,lop_hoc,tien_do_hoc,ngay_dau_ky,ngay_cuoi_ky")
  .in("hoc_vien_id", hvPks);

console.log("ql_quan_ly_hoc_vien [hoc_vien_id in]:", {
  error: q1.error?.message ?? null,
  count: q1.data?.length ?? 0,
  sample: q1.data?.slice(0, 3),
});
