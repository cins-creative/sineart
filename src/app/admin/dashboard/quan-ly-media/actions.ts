"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchMarketingMediaStaffNhanSuIds, MKT_MEDIA_TABLE } from "@/lib/data/admin-quan-ly-media";
import { isAllowedMktMediaType } from "@/lib/data/mkt-media-form";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/quan-ly-media";
const ORDER_MEDIA_PATH = "/admin/dashboard/order-media";

export type UpdateMediaDatesResult = { ok: true } | { ok: false; error: string };

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export async function updateMktMediaProjectDates(
  id: number,
  start_date: string,
  end_date: string,
): Promise<UpdateMediaDatesResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const s = parseYmd(start_date);
  const e = parseYmd(end_date);
  if (!s || !e) return { ok: false, error: "Ngày không hợp lệ (YYYY-MM-DD)." };
  if (e.getTime() < s.getTime()) return { ok: false, error: "Ngày kết thúc phải sau hoặc trùng ngày bắt đầu." };

  const { error } = await supabase
    .from(MKT_MEDIA_TABLE)
    .update({ start_date: ymd(s), end_date: ymd(e) })
    .eq("id", id);

  if (error) return { ok: false, error: error.message || "Không lưu được." };

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export type UpdateMktMediaScheduleTeamResult = { ok: true } | { ok: false; error: string };

/** Cập nhật ngày + `nguoi_lam` từ modal chi tiết. Người làm mới phải thuộc ban Marketing/Media (trừ người đã gán sẵn trên dòng). */
export async function updateMktMediaProjectScheduleAndTeam(
  id: number,
  start_date: string,
  end_date: string,
  nguoi_lam_ids: number[],
): Promise<UpdateMktMediaScheduleTeamResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const s = parseYmd(start_date);
  const e = parseYmd(end_date);
  if (!s || !e) return { ok: false, error: "Ngày không hợp lệ (YYYY-MM-DD)." };
  if (e.getTime() < s.getTime()) return { ok: false, error: "Ngày kết thúc phải sau hoặc trùng ngày bắt đầu." };

  const { data: row, error: readErr } = await supabase.from(MKT_MEDIA_TABLE).select("nguoi_lam").eq("id", id).maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  const rawExisting = row?.nguoi_lam;
  const existing: number[] = Array.isArray(rawExisting)
    ? rawExisting.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const existingSet = new Set(existing);

  const uniq = [...new Set(nguoi_lam_ids.filter((n) => Number.isInteger(n) && n > 0))];
  const allowedIds = await fetchMarketingMediaStaffNhanSuIds(supabase);
  if (allowedIds.size > 0) {
    const invalid = uniq.filter((mid) => !allowedIds.has(mid) && !existingSet.has(mid));
    if (invalid.length) {
      return {
        ok: false,
        error: `Người làm phải thuộc ban Marketing hoặc Media (ID không hợp lệ: ${invalid.join(", ")}).`,
      };
    }
  }
  const finalLam = uniq;

  const { error } = await supabase
    .from(MKT_MEDIA_TABLE)
    .update({
      start_date: ymd(s),
      end_date: ymd(e),
      nguoi_lam: finalLam.length ? finalLam : null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message || "Không lưu được." };

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export type CreateMktMediaOrderResult = { ok: true; id: number } | { ok: false; error: string };

export type CreateMktMediaOrderInput = {
  project_name: string;
  project_type: string | null;
  type: string | null;
  start_date: string;
  end_date: string;
  brief: string | null;
  minh_hoa: string[];
  nguoi_lam_ids: number[];
};

export async function createMktMediaOrder(input: CreateMktMediaOrderInput): Promise<CreateMktMediaOrderResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const name = input.project_name.trim();
  if (!name) return { ok: false, error: "Vui lòng nhập tên dự án." };

  const typeNorm = input.type?.trim() || null;
  if (typeNorm && !isAllowedMktMediaType(typeNorm)) {
    return { ok: false, error: "Định dạng (type) không hợp lệ." };
  }

  const s = parseYmd(input.start_date);
  const e = parseYmd(input.end_date);
  if (!s || !e) return { ok: false, error: "Ngày không hợp lệ (YYYY-MM-DD)." };
  if (e.getTime() < s.getTime()) return { ok: false, error: "Ngày kết thúc phải sau hoặc trùng ngày bắt đầu." };

  const minh_hoa = input.minh_hoa.map((u) => u.trim()).filter(Boolean);
  const brief = input.brief?.trim() || null;
  const project_type = input.project_type?.trim() || null;

  const nguoi_lam = input.nguoi_lam_ids.filter((id) => Number.isInteger(id) && id > 0);
  const uniqueLam = [...new Set(nguoi_lam)];

  const { data, error } = await supabase
    .from(MKT_MEDIA_TABLE)
    .insert({
      project_name: name,
      project_type,
      type: typeNorm,
      status: "Chờ xác nhận",
      start_date: ymd(s),
      end_date: ymd(e),
      brief,
      minh_hoa: minh_hoa.length ? minh_hoa : null,
      nguoi_tao: session.staffId,
      nguoi_lam: uniqueLam.length ? uniqueLam : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message || "Không tạo được order." };
  const id = typeof data?.id === "number" ? data.id : null;
  if (id == null) return { ok: false, error: "Không đọc được ID dự án mới." };

  revalidatePath(ADMIN_PATH);
  revalidatePath(ORDER_MEDIA_PATH);
  return { ok: true, id };
}
