import {
  TRA_CUU_LIST_COLS,
  mapRowToList,
  type AdminTraCuuListRow,
  type TruongLookupRow,
} from "@/lib/admin/tra-cuu-schema";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import QuanLyTraCuuView from "./QuanLyTraCuuView";

export default async function QuanLyTraCuuPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <QuanLyTraCuuView
        initialRows={[]}
        initialTruongs={[]}
        missingServiceRole
      />
    );
  }

  const [rowsRes, truongRes] = await Promise.all([
    supabase
      .from("tra_cuu_thong_tin")
      .select(TRA_CUU_LIST_COLS)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(500),
    supabase
      .from("dh_truong_dai_hoc")
      .select("id, ten_truong_dai_hoc")
      .order("ten_truong_dai_hoc", { ascending: true }),
  ]);

  if (rowsRes.error) {
    return (
      <QuanLyTraCuuView
        initialRows={[]}
        initialTruongs={[]}
        loadError={rowsRes.error.message}
      />
    );
  }

  const rows: AdminTraCuuListRow[] = (rowsRes.data ?? []).map((r) =>
    mapRowToList(r as Record<string, unknown>),
  );

  const truongs: TruongLookupRow[] = (truongRes.data ?? [])
    .map((r): TruongLookupRow | null => {
      const row = r as { id?: unknown; ten_truong_dai_hoc?: unknown };
      const id = Number(row.id);
      const ten = typeof row.ten_truong_dai_hoc === "string" ? row.ten_truong_dai_hoc.trim() : "";
      if (!Number.isFinite(id) || !ten) return null;
      return { id, ten };
    })
    .filter((x): x is TruongLookupRow => x !== null);

  return <QuanLyTraCuuView initialRows={rows} initialTruongs={truongs} />;
}
