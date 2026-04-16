import type { SupabaseClient } from "@supabase/supabase-js";

/** Dòng admin — bảng `ql_chi_nhanh` (Framer), FK `chi_nhanh_id` trên lớp/nhân sự trùng `id`. */
export type AdminChiNhanhRow = {
  id: number;
  ten: string;
  dia_chi: string | null;
  sdt: string | null;
  is_active: boolean;
  created_at: string | null;
  so_lop_hoc: number;
  so_nhan_su: number;
};

const PAGE = 1000;

async function aggregateChiNhanhFkCounts(
  supabase: SupabaseClient,
  table: "ql_lop_hoc" | "hr_nhan_su"
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("id, chi_nhanh_id")
      .not("chi_nhanh_id", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      return counts;
    }
    if (!data?.length) {
      break;
    }
    for (const row of data as { chi_nhanh_id?: unknown }[]) {
      const bid = Number(row.chi_nhanh_id);
      if (!Number.isFinite(bid) || bid <= 0) continue;
      counts.set(bid, (counts.get(bid) ?? 0) + 1);
    }
    if (data.length < PAGE) {
      break;
    }
    from += PAGE;
  }
  return counts;
}

/**
 * Đọc `ql_chi_nhanh` + đếm `ql_lop_hoc.chi_nhanh_id`, `hr_nhan_su.chi_nhanh_id`.
 */
export async function fetchAdminChiNhanhRows(supabase: SupabaseClient): Promise<{
  rows: AdminChiNhanhRow[];
  error: string | null;
  /** true nếu chỉ select được `id, ten` (thiếu cột mở rộng) */
  usedMinimalSelect: boolean;
}> {
  let usedMinimalSelect = false;

  const fullRes = await supabase
    .from("ql_chi_nhanh")
    .select("id, ten, dia_chi, sdt, is_active, created_at")
    .order("id", { ascending: true });

  let branchList: Record<string, unknown>[] = [];

  if (fullRes.error) {
    const msg = fullRes.error.message?.toLowerCase() ?? "";
    if (msg.includes("column") || msg.includes("schema")) {
      usedMinimalSelect = true;
      const minRes = await supabase.from("ql_chi_nhanh").select("id, ten").order("id", { ascending: true });
      if (minRes.error) {
        return { rows: [], error: minRes.error.message, usedMinimalSelect };
      }
      branchList = (minRes.data ?? []) as Record<string, unknown>[];
    } else {
      return { rows: [], error: fullRes.error.message, usedMinimalSelect };
    }
  } else {
    branchList = (fullRes.data ?? []) as Record<string, unknown>[];
  }

  const lopCounts = await aggregateChiNhanhFkCounts(supabase, "ql_lop_hoc");
  const nsCounts = await aggregateChiNhanhFkCounts(supabase, "hr_nhan_su");

  const rows: AdminChiNhanhRow[] = branchList.map((b) => {
    const id = Number(b.id);
    const ten = String(b.ten ?? "").trim() || "—";
    return {
      id: Number.isFinite(id) && id > 0 ? id : 0,
      ten,
      dia_chi: b.dia_chi != null ? String(b.dia_chi).trim() || null : null,
      sdt: b.sdt != null ? String(b.sdt).trim() || null : null,
      is_active: b.is_active === undefined || b.is_active === null ? true : Boolean(b.is_active),
      created_at: b.created_at != null ? String(b.created_at) : null,
      so_lop_hoc: lopCounts.get(id) ?? 0,
      so_nhan_su: nsCounts.get(id) ?? 0,
    };
  });

  return {
    rows: rows.filter((r) => r.id > 0),
    error: null,
    usedMinimalSelect,
  };
}
