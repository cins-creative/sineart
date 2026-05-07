import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type AdminBangTinhLuongListItem,
  type AdminLopGiangDay,
  type AdminNhanSuRow,
  fetchBangTinhLuongByStaffId,
  fetchSingleHrNhanSuRow,
} from "@/lib/data/admin-quan-ly-nhan-su";
import { parseTeacherIds } from "@/lib/utils/parse-teacher-ids";

function missingColumnErr(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("column") &&
    (m.includes("does not exist") || m.includes("schema cache") || m.includes("could not find"))
  );
}

export type AdminStaffPersonalDashboardData = {
  staff: AdminNhanSuRow;
  chiNhanhTen: string | null;
  /** Chuỗi tên phòng (hr_phong), phân tách bằng dấu phẩy */
  phongLabel: string | null;
  /** Chuỗi tên ban hiển thị */
  banLabel: string | null;
  bangLuong: AdminBangTinhLuongListItem[];
  lopGiang: AdminLopGiangDay[];
};

async function loadPhongTenForStaff(supabase: SupabaseClient, staffId: number): Promise<string | null> {
  const { data: nvRows } = await supabase
    .from("hr_nhan_su_phong")
    .select("phong_id")
    .eq("nhan_su_id", staffId);
  const ids = [...new Set((nvRows ?? []).map((r) => Number((r as { phong_id?: unknown }).phong_id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) return null;

  let pr = await supabase.from("hr_phong").select("id, ten_phong, ban").in("id", ids);
  if (pr.error && missingColumnErr(pr.error.message ?? "")) {
    pr = (await supabase.from("hr_phong").select("id, ten_phong").in("id", ids)) as typeof pr;
  }
  const names: string[] = [];
  if (!pr.error && pr.data) {
    for (const r of pr.data as unknown as Record<string, unknown>[]) {
      const t = String(r.ten_phong ?? "").trim();
      if (t) names.push(t);
    }
  }
  names.sort((a, b) => a.localeCompare(b, "vi"));
  return names.length ? names.join(", ") : null;
}

async function loadBanLabelForStaff(
  supabase: SupabaseClient,
  staff: AdminNhanSuRow,
  staffId: number
): Promise<string | null> {
  const banIds = new Set<number>();
  if (staff.ban != null && staff.ban > 0) banIds.add(staff.ban);

  const { data: nvRows } = await supabase
    .from("hr_nhan_su_phong")
    .select("phong_id")
    .eq("nhan_su_id", staffId);
  const phongIds = [...new Set((nvRows ?? []).map((r) => Number((r as { phong_id?: unknown }).phong_id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (phongIds.length) {
    let phongRows: Record<string, unknown>[] | null = null;
    const prBan = await supabase.from("hr_phong").select("id, ban").in("id", phongIds);
    if (!prBan.error && prBan.data) {
      phongRows = prBan.data as unknown as Record<string, unknown>[];
    } else if (prBan.error && missingColumnErr(prBan.error.message ?? "")) {
      const prId = await supabase.from("hr_phong").select("id").in("id", phongIds);
      if (!prId.error && prId.data) phongRows = prId.data as unknown as Record<string, unknown>[];
    }
    if (phongRows) {
      for (const r of phongRows) {
        const b = r.ban != null ? Number(r.ban) : NaN;
        if (Number.isFinite(b) && b > 0) banIds.add(b);
      }
    }
  }

  if (!banIds.size) return null;
  const { data: bans } = await supabase.from("hr_ban").select("id, ten_ban").in("id", [...banIds]);
  const labels: string[] = [];
  if (bans?.length) {
    for (const r of bans as unknown as Record<string, unknown>[]) {
      const id = Number(r.id);
      const t = String(r.ten_ban ?? "").trim();
      if (Number.isFinite(id) && id > 0 && t) labels.push(t);
    }
  }
  labels.sort((a, b) => a.localeCompare(b, "vi"));
  return labels.length ? labels.join(", ") : null;
}

async function fetchLopGiangForTeacher(supabase: SupabaseClient, teacherId: number): Promise<AdminLopGiangDay[]> {
  if (!Number.isFinite(teacherId) || teacherId <= 0) return [];

  const monRes = await supabase.from("ql_mon_hoc").select("id, ten_mon_hoc").order("ten_mon_hoc", { ascending: true });
  const monLabelById: Record<number, string> = {};
  if (!monRes.error && monRes.data) {
    for (const r of monRes.data as unknown as Record<string, unknown>[]) {
      const id = Number(r.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      monLabelById[id] = String(r.ten_mon_hoc ?? "").trim() || `Môn #${id}`;
    }
  }

  const { data: allLops, error } = await supabase
    .from("ql_lop_hoc")
    .select("id, class_name, class_full_name, teacher, mon_hoc");

  if (error || !allLops?.length) return [];

  const out: AdminLopGiangDay[] = [];
  for (const raw of allLops as unknown as Record<string, unknown>[]) {
    if (!parseTeacherIds(raw.teacher).includes(teacherId)) continue;
    const lid = Number(raw.id);
    const monId = raw.mon_hoc != null && Number.isFinite(Number(raw.mon_hoc)) ? Number(raw.mon_hoc) : null;
    const item: AdminLopGiangDay = {
      id: Number.isFinite(lid) && lid > 0 ? lid : 0,
      class_name: String(raw.class_name ?? "").trim() || `Lớp #${lid}`,
      class_full_name: raw.class_full_name != null ? String(raw.class_full_name).trim() || null : null,
      mon_hoc_id: monId && monId > 0 ? monId : null,
      ten_mon_hoc: monId && monId > 0 ? (monLabelById[monId] ?? null) : null,
    };
    if (item.id > 0) out.push(item);
  }
  out.sort((a, b) => a.class_name.localeCompare(b.class_name, "vi"));
  return out;
}

function sortBangLuong(rows: AdminBangTinhLuongListItem[]): AdminBangTinhLuongListItem[] {
  return [...rows].sort((a, b) => {
    const ya = parseInt(String(a.ky_nam ?? "0"), 10) || 0;
    const yb = parseInt(String(b.ky_nam ?? "0"), 10) || 0;
    if (ya !== yb) return yb - ya;
    const ma = parseInt(String(a.ky_thang ?? "0"), 10) || 0;
    const mb = parseInt(String(b.ky_thang ?? "0"), 10) || 0;
    if (ma !== mb) return mb - ma;
    return b.id - a.id;
  });
}

/**
 * Dữ liệu trang «Hồ sơ nhân sự» — một nhân viên (`hr_nhan_su.id`).
 */
export async function fetchAdminStaffPersonalDashboard(
  supabase: SupabaseClient,
  staffId: number
): Promise<{ data: AdminStaffPersonalDashboardData | null; error: string | null }> {
  const staff = await fetchSingleHrNhanSuRow(supabase, staffId);
  if (!staff || staff.id <= 0) {
    return { data: null, error: "Không tìm thấy nhân sự." };
  }

  let chiNhanhTen: string | null = null;
  if (staff.chi_nhanh_id != null && staff.chi_nhanh_id > 0) {
    const { data: cn } = await supabase
      .from("ql_chi_nhanh")
      .select("ten")
      .eq("id", staff.chi_nhanh_id)
      .maybeSingle();
    if (cn && typeof (cn as { ten?: unknown }).ten === "string") {
      chiNhanhTen = String((cn as { ten: string }).ten).trim() || null;
    }
  }

  const [phongLabel, banLabel, bangMap, lopGiang] = await Promise.all([
    loadPhongTenForStaff(supabase, staffId),
    loadBanLabelForStaff(supabase, staff, staffId),
    fetchBangTinhLuongByStaffId(supabase, [staffId]),
    fetchLopGiangForTeacher(supabase, staffId),
  ]);

  const bangLuong = sortBangLuong(bangMap[staffId] ?? []);

  return {
    data: {
      staff,
      chiNhanhTen,
      phongLabel,
      banLabel,
      bangLuong,
      lopGiang,
    },
    error: null,
  };
}
