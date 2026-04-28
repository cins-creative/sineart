"use server";

import { revalidatePath } from "next/cache";

import { DH_MON_THI_HOP_LE } from "@/lib/agent/dh-exam-profiles";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const REV = "/admin/dashboard/dh-truong-nganh";

function revalidate(): void {
  revalidatePath(REV);
}

const ALLOWED_MON = new Set<string>(DH_MON_THI_HOP_LE as unknown as string[]);

export type DhTnUpdateState = { ok: true } | { ok: false; error: string };

export async function updateDhTruongNganhRow(payload: {
  truongId: number;
  nganhId: number;
  details: string | null;
  monThi: string[];
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const truongId = Math.trunc(payload.truongId);
  const nganhId = Math.trunc(payload.nganhId);
  if (!Number.isFinite(truongId) || truongId <= 0 || !Number.isFinite(nganhId) || nganhId <= 0) {
    return { ok: false, error: "Trường hoặc ngành không hợp lệ." };
  }

  const details =
    payload.details != null && String(payload.details).trim() !== "" ? String(payload.details).trim() : null;

  const monThi: string[] = [];
  for (const x of payload.monThi ?? []) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (t && ALLOWED_MON.has(t)) monThi.push(t);
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase
    .from("dh_truong_nganh")
    .update({
      details,
      mon_thi: monThi,
    })
    .eq("truong_dai_hoc", truongId)
    .eq("nganh_dao_tao", nganhId);

  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}
