import type { SupabaseClient } from "@supabase/supabase-js";

/** FK lớp trên `hv_chatbox` — thử `lop_hoc` trước, lỗi schema thì `class` (Framer cũ). */
export type HvChatLopColumn = "lop_hoc" | "class";

export function isWrongLopFkColumnError(err: { message?: string; code?: string } | null): boolean {
  if (!err?.message) return false;
  /** Không coi lỗi unique / duplicate là “sai tên cột” — tránh insert lần 2 gây lỗi phụ. */
  if (err.code === "23505") return false;
  const m = err.message.toLowerCase();
  if (m.includes("duplicate key")) return false;
  if (err.code === "42703") return true;
  return (
    m.includes("schema cache") ||
    (m.includes("column") && (m.includes("lop_hoc") || m.includes("class")))
  );
}

export async function hvChatboxSelectByLop(
  sb: SupabaseClient,
  lopId: number,
  opts: { after?: string | null }
): Promise<{ rows: Record<string, unknown>[]; usedColumn: HvChatLopColumn }> {
  const build = (col: HvChatLopColumn) => {
    let q = sb
      .from("hv_chatbox")
      .select("id,created_at,content,photo,usertype,name")
      .eq(col, lopId);
    if (opts.after) {
      return q.gt("created_at", opts.after).order("created_at", { ascending: true }).limit(50);
    }
    return q.order("created_at", { ascending: false }).limit(200);
  };

  let col: HvChatLopColumn = "lop_hoc";
  let { data, error } = await build(col);
  if (error && col === "lop_hoc" && isWrongLopFkColumnError(error)) {
    col = "class";
    ({ data, error } = await build(col));
  }
  if (error) throw error;
  return { rows: (data ?? []) as Record<string, unknown>[], usedColumn: col };
}

export async function hvChatboxInsert(
  sb: SupabaseClient,
  lopId: number,
  row: Omit<Record<string, unknown>, "lop_hoc" | "class">
): Promise<{ message: Record<string, unknown>; usedColumn: HvChatLopColumn }> {
  const baseRow = { ...row };
  let col: HvChatLopColumn = "lop_hoc";
  let insertPayload: Record<string, unknown> = { ...baseRow, lop_hoc: lopId };
  let { data, error } = await sb
    .from("hv_chatbox")
    .insert(insertPayload)
    .select("id,created_at,content,photo,usertype,name")
    .limit(1);

  if (error && col === "lop_hoc" && isWrongLopFkColumnError(error)) {
    col = "class";
    insertPayload = { ...baseRow, class: lopId };
    ({ data, error } = await sb
      .from("hv_chatbox")
      .insert(insertPayload)
      .select("id,created_at,content,photo,usertype,name")
      .limit(1));
  }

  if (error) throw error;
  const arr = data as Record<string, unknown>[] | null;
  const message = Array.isArray(arr) ? arr[0] : null;
  if (!message) throw new Error("Insert không trả về bản ghi.");
  return { message, usedColumn: col };
}
