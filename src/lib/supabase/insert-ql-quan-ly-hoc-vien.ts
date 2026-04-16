import type { SupabaseClient } from "@supabase/supabase-js";

/** Gợi ý khi chưa deploy RPC bypass trigger `mon_hoc_id` trên Supabase. */
export const QLHV_ENROLLMENT_MIGRATION_HINT =
  "Chạy SQL trong `supabase/migrations/20260415140000_admin_insert_qlhv_enrollment.sql` (SQL Editor), sau đó `NOTIFY pgrst, 'reload schema';` nếu cần.";

function isMissingRpcError(code: string, message: string): boolean {
  const m = message.toLowerCase();
  return (
    code === "42883" ||
    code === "PGRST202" ||
    (m.includes("function") &&
      (m.includes("does not exist") ||
        m.includes("not found") ||
        m.includes("could not find") ||
        m.includes("schema cache"))) ||
    (m.includes("admin_insert_ql_quan_ly_hoc_vien") && (m.includes("function") || m.includes("schema cache")))
  );
}

function needsEnrollmentRpcBypass(err: { code?: string; message?: string }): boolean {
  const msg = (err.message ?? "").toLowerCase();
  const code = err.code ?? "";
  return code === "42703" || msg.includes("mon_hoc_id");
}

function rpcReturnedId(data: unknown): number | null {
  if (data == null) return null;
  if (typeof data === "bigint") {
    const n = Number(data);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (typeof data === "number") {
    return Number.isFinite(data) && data > 0 ? data : null;
  }
  const n = Number(data);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/**
 * INSERT `ql_quan_ly_hoc_vien` (hoc_vien_id, lop_hoc); nếu trigger DB lỗi mon_hoc_id thì gọi RPC
 * `admin_insert_ql_quan_ly_hoc_vien` (migration Supabase).
 */
export async function insertQlQuanLyHocVienEnrollment(
  supabase: SupabaseClient,
  hoc_vien_id: number,
  lop_hoc: number
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const ins = await supabase
    .from("ql_quan_ly_hoc_vien")
    .insert({ hoc_vien_id, lop_hoc })
    .select("id")
    .single();

  if (!ins.error && ins.data) {
    const id = Number((ins.data as { id: unknown }).id);
    if (!Number.isFinite(id) || id <= 0) {
      return { ok: false, error: "Không đọc được id ghi danh." };
    }
    return { ok: true, id };
  }

  if (!ins.error) {
    return { ok: false, error: "Không tạo được ghi danh (ql_quan_ly_hoc_vien)." };
  }

  if (!needsEnrollmentRpcBypass(ins.error)) {
    return { ok: false, error: ins.error.message || "Không tạo được ghi danh." };
  }

  const rpc = await supabase.rpc("admin_insert_ql_quan_ly_hoc_vien", {
    p_hoc_vien_id: hoc_vien_id,
    p_lop_hoc: lop_hoc,
  });

  if (!rpc.error) {
    const id = rpcReturnedId(rpc.data);
    if (id == null) {
      return { ok: false, error: "RPC ghi danh không trả id hợp lệ." };
    }
    return { ok: true, id };
  }

  const rpcMsg = rpc.error.message ?? "";
  if (isMissingRpcError(rpc.error.code ?? "", rpcMsg)) {
    return {
      ok: false,
      error: `Không tạo ghi danh: trigger DB (mon_hoc_id) và chưa có hàm bypass. ${QLHV_ENROLLMENT_MIGRATION_HINT}`,
    };
  }

  return { ok: false, error: rpcMsg || "RPC ghi danh thất bại." };
}
