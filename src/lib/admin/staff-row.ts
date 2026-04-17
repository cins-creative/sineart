import type { SupabaseClient } from "@supabase/supabase-js";

export type HrNhanSuAuthRow = {
  id: number;
  email: string | null;
  full_name: string | null;
  password: string | null;
  status: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapHrRow(data: {
  id?: unknown;
  email?: unknown;
  full_name?: unknown;
  password?: unknown;
  status?: unknown;
}): HrNhanSuAuthRow | null {
  const id = Number(data.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    email: data.email != null ? String(data.email) : null,
    full_name: data.full_name != null ? String(data.full_name) : null,
    password: data.password != null ? String(data.password) : null,
    status: data.status != null ? String(data.status) : null,
  };
}

/**
 * Tra cứu nhân sự theo email đăng nhập.
 * Thử `eq` (đúng chữ trong DB) trước, rồi `ilike` + lọc trùng khớp lower-case
 * (tránh trường hợp `ilike`/`_` trong SQL LIKE).
 */
export async function fetchStaffByEmailForAuth(
  supabase: SupabaseClient,
  email: string
): Promise<HrNhanSuAuthRow | null> {
  const trimmed = email.trim();
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const select = "id, email, full_name, password, status";

  for (const candidate of [...new Set([normalized, trimmed])]) {
    if (!candidate) continue;
    const { data, error } = await supabase
      .from("hr_nhan_su")
      .select(select)
      .eq("email", candidate)
      .maybeSingle();
    if (!error && data) {
      const mapped = mapHrRow(data as Parameters<typeof mapHrRow>[0]);
      if (mapped) return mapped;
    }
  }

  const { data: rows, error: ilikeErr } = await supabase
    .from("hr_nhan_su")
    .select(select)
    .ilike("email", normalized);

  if (ilikeErr || !rows?.length) return null;

  type HrRowRaw = Parameters<typeof mapHrRow>[0];
  const list = rows as HrRowRaw[];
  const exact = list.find(
    (r) => String(r.email ?? "")
      .trim()
      .toLowerCase() === normalized
  );
  const picked = exact ?? list[0];
  return mapHrRow(picked);
}

export function hasPasswordSet(row: Pick<HrNhanSuAuthRow, "password">): boolean {
  return String(row.password ?? "").trim() !== "";
}
