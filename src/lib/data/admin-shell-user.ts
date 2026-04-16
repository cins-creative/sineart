import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminStaffShellProfile = {
  /** `hr_nhan_su.vai_tro` */
  vai_tro: string | null;
  /** `hr_nhan_su.avatar` — URL Cloudflare Images */
  avatar: string | null;
};

function unwrapJoin<T extends Record<string, unknown>>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? null;
  return v;
}

/**
 * Vai trò + ảnh đại diện sidebar admin từ `hr_nhan_su`.
 */
export async function fetchAdminStaffShellProfile(
  supabase: SupabaseClient,
  staffId: number,
): Promise<AdminStaffShellProfile> {
  if (!Number.isFinite(staffId) || staffId <= 0) {
    return { vai_tro: null, avatar: null };
  }

  const res = await supabase.from("hr_nhan_su").select("vai_tro, avatar").eq("id", staffId).maybeSingle();

  if (res.error) return { vai_tro: null, avatar: null };

  const row = res.data as { vai_tro?: unknown; avatar?: unknown } | null;
  if (!row) return { vai_tro: null, avatar: null };

  const v = row.vai_tro;
  const vai_tro = v == null ? null : String(v).trim() || null;

  const a = row.avatar;
  const avatar =
    a != null && String(a).trim() ? String(a).trim() : null;

  return { vai_tro, avatar };
}

/**
 * Các `hr_phong.ten_phong` mà nhân sự thuộc (qua `hr_nhan_su_phong` → `hr_phong`).
 * Dùng phân quyền menu dashboard.
 */
export async function fetchAdminStaffShellPhongTenPhongs(
  supabase: SupabaseClient,
  staffId: number,
): Promise<string[]> {
  if (!Number.isFinite(staffId) || staffId <= 0) return [];

  const { data, error } = await supabase
    .from("hr_nhan_su_phong")
    .select("hr_phong!inner(ten_phong)")
    .eq("nhan_su_id", staffId);

  if (error || !data?.length) return [];

  const out = new Set<string>();
  for (const row of data as { hr_phong?: unknown }[]) {
    const ph = unwrapJoin(row.hr_phong as Record<string, unknown> | Record<string, unknown>[] | null);
    if (!ph) continue;
    const ten =
      typeof (ph as { ten_phong?: unknown }).ten_phong === "string"
        ? String((ph as { ten_phong: string }).ten_phong).trim()
        : "";
    if (ten) out.add(ten);
  }
  return [...out];
}
