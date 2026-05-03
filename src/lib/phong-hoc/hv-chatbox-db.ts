import type { SupabaseClient } from "@supabase/supabase-js";

/** FK lớp trên `hv_chatbox` — thử `lop_hoc` trước, lỗi schema thì `class` (Framer cũ). */
export type HvChatLopColumn = "lop_hoc" | "class";

const HV_SELECT_WITH_PHOTO = "id,created_at,content,photo,usertype,name";
const HV_SELECT_NO_PHOTO = "id,created_at,content,usertype,name";

export function isWrongLopFkColumnError(err: { message?: string; code?: string } | null): boolean {
  if (!err?.message) return false;
  if (err.code === "23505") return false;
  const m = err.message.toLowerCase();
  if (m.includes("duplicate key")) return false;
  if (err.code === "42703") return true;
  return (
    m.includes("schema cache") ||
    (m.includes("column") && (m.includes("lop_hoc") || m.includes("class")))
  );
}

/** PostgREST / Postgres — projection `select` gồm cột không tồn tại (vd. `photo`). */
export function isSelectableColumnMissingError(err: { message?: string; code?: string } | null): boolean {
  if (!err?.message) return false;
  const m = err.message.toLowerCase();
  if (err.code === "42703") return true;
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    (m.includes("column") && (m.includes("unknown") || m.includes("not exist")))
  );
}

function normalizeChatAfterIso(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = Date.parse(raw.trim());
  if (!Number.isFinite(t)) return null;
  return raw.trim();
}

export async function hvChatboxSelectByLop(
  sb: SupabaseClient,
  lopId: number,
  opts: { after?: string | null }
): Promise<{ rows: Record<string, unknown>[]; usedColumn: HvChatLopColumn }> {
  const after = normalizeChatAfterIso(opts.after ?? null);

  const runQuery = (col: HvChatLopColumn, selectList: string) => {
    let q = sb.from("hv_chatbox").select(selectList).eq(col, lopId);
    if (after) {
      return q.gt("created_at", after).order("created_at", { ascending: true }).limit(50);
    }
    return q.order("created_at", { ascending: false }).limit(200);
  };

  const tryCol = async (col: HvChatLopColumn) => {
    let { data, error } = await runQuery(col, HV_SELECT_WITH_PHOTO);
    if (error && isSelectableColumnMissingError(error)) {
      ({ data, error } = await runQuery(col, HV_SELECT_NO_PHOTO));
    }
    return { data, error } as const;
  };

  let col: HvChatLopColumn = "lop_hoc";
  let { data, error } = await tryCol(col);
  if (error && col === "lop_hoc" && isWrongLopFkColumnError(error)) {
    col = "class";
    ({ data, error } = await tryCol(col));
  }
  if (error) throw error;
  return { rows: (data ?? []) as unknown as Record<string, unknown>[], usedColumn: col };
}

export async function hvChatboxInsert(
  sb: SupabaseClient,
  lopId: number,
  row: Omit<Record<string, unknown>, "lop_hoc" | "class">
): Promise<{ message: Record<string, unknown>; usedColumn: HvChatLopColumn }> {
  const baseRow = { ...row };

  const insertWithSelect = (col: HvChatLopColumn, selectList: string) => {
    const insertPayload = col === "lop_hoc" ? { ...baseRow, lop_hoc: lopId } : { ...baseRow, class: lopId };
    return sb.from("hv_chatbox").insert(insertPayload).select(selectList).limit(1);
  };

  const insertForColumn = async (col: HvChatLopColumn) => {
    let r = await insertWithSelect(col, HV_SELECT_WITH_PHOTO);
    if (r.error && isSelectableColumnMissingError(r.error)) {
      r = await insertWithSelect(col, HV_SELECT_NO_PHOTO);
    }
    return r;
  };

  let col: HvChatLopColumn = "lop_hoc";
  let { data, error } = await insertForColumn(col);
  if (error && col === "lop_hoc" && isWrongLopFkColumnError(error)) {
    col = "class";
    ({ data, error } = await insertForColumn(col));
  }

  if (error) throw error;
  const arr = data as Record<string, unknown>[] | null;
  const message = Array.isArray(arr) ? arr[0] : null;
  if (!message) throw new Error("Insert không trả về bản ghi.");
  return { message, usedColumn: col };
}
