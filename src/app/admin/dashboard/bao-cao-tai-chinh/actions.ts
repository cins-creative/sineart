"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { buildSupabasePayload, type ColData } from "@/lib/data/bao-cao-tai-chinh-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/bao-cao-tai-chinh";

export type BaoCaoTaiChinhSaveResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function saveBaoCaoTaiChinhColumn(input: {
  recordId: number | null;
  nam: string;
  thang: string;
  data: ColData;
}): Promise<BaoCaoTaiChinhSaveResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const nam = input.nam.trim();
  const thang = input.thang.trim();
  if (!nam || !thang) return { ok: false, error: "Thiếu năm hoặc tháng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const body = buildSupabasePayload(nam, thang, input.data);

  if (input.recordId != null && input.recordId > 0) {
    const { error } = await supabase.from("tc_bao_cao_tai_chinh").update(body).eq("id", input.recordId);
    if (error) return { ok: false, error: error.message || "Không cập nhật được." };
    revalidatePath(ADMIN_PATH);
    return { ok: true, id: input.recordId };
  }

  const { data, error } = await supabase
    .from("tc_bao_cao_tai_chinh")
    .insert(body)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message || "Không thêm được kỳ báo cáo." };
  const id = data?.id;
  if (typeof id !== "number") return { ok: false, error: "Không nhận được id sau khi thêm." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, id };
}
