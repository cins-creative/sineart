import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ThiThuBaiNopRow, ThiThuDeThiRow, ThiThuKyThiRow } from "@/types/thi-thu";

const KY_SELECT =
  "id,tieu_de,mon_thi,thoi_gian_bat_dau,thoi_gian_giai_lao_bat_dau,thoi_gian_giai_lao_ket_thuc,thumbnail_url,lich_cham_bai_url,video_sua_bai,thoi_gian_sua_bai,trang_thai,created_at";

export async function fetchThiThuPublishedList(): Promise<ThiThuKyThiRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("thi_thu_ky_thi")
    .select(KY_SELECT)
    .eq("trang_thai", "published")
    .order("thoi_gian_bat_dau", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ThiThuKyThiRow[];
}

export async function fetchThiThuKyByIdPublic(id: string): Promise<ThiThuKyThiRow | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("thi_thu_ky_thi")
    .select(KY_SELECT)
    .eq("id", id)
    .eq("trang_thai", "published")
    .maybeSingle();
  if (error) throw error;
  return data as ThiThuKyThiRow | null;
}

export async function fetchThiThuKyByIdService(id: string): Promise<ThiThuKyThiRow | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("thi_thu_ky_thi")
    .select(KY_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ThiThuKyThiRow | null;
}

export async function fetchThiThuAdminList(): Promise<ThiThuKyThiRow[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("thi_thu_ky_thi")
    .select(KY_SELECT)
    .order("thoi_gian_bat_dau", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ThiThuKyThiRow[];
}

export async function fetchDeThiForKyPublic(kyId: string): Promise<ThiThuDeThiRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("thi_thu_de_thi")
    .select("id,ky_thi_id,tieu_de,anh_urls,thu_tu,created_at")
    .eq("ky_thi_id", kyId)
    .order("thu_tu", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ThiThuDeThiRow[];
}

export async function fetchDeThiForKyAdmin(kyId: string): Promise<ThiThuDeThiRow[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("thi_thu_de_thi")
    .select("id,ky_thi_id,tieu_de,anh_urls,thu_tu,created_at")
    .eq("ky_thi_id", kyId)
    .order("thu_tu", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ThiThuDeThiRow[];
}

export async function fetchBaiNopForKy(kyId: string): Promise<ThiThuBaiNopRow[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("thi_thu_bai_nop")
    .select("id,ky_thi_id,ho_ten,facebook,anh_bai_nop_urls,ghi_chu,thoi_gian_nop")
    .eq("ky_thi_id", kyId)
    .order("thoi_gian_nop", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ThiThuBaiNopRow[];
}

export async function countBaiNopByKyIds(kyIds: string[]): Promise<Record<string, number>> {
  if (kyIds.length === 0) return {};
  const supabase = createServiceRoleClient();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("thi_thu_bai_nop")
    .select("ky_thi_id")
    .in("ky_thi_id", kyIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const id of kyIds) counts[id] = 0;
  for (const row of data ?? []) {
    const k = (row as { ky_thi_id: string }).ky_thi_id;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
