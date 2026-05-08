"use server";

import { revalidatePath } from "next/cache";

import {
  DH_MON_THI_ARRAY_MAX_COUNT,
  DH_MON_THI_ITEM_MAX_LEN,
} from "@/lib/agent/dh-exam-profiles";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const REV = "/admin/dashboard/dh-truong-nganh";

function revalidate(): void {
  revalidatePath(REV);
}

function sanitizeMonThiForSave(raw: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    let t = x.trim();
    if (!t) continue;
    if (t.length > DH_MON_THI_ITEM_MAX_LEN) t = t.slice(0, DH_MON_THI_ITEM_MAX_LEN);
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= DH_MON_THI_ARRAY_MAX_COUNT) break;
  }
  return out;
}

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

  const monThi = sanitizeMonThiForSave(payload.monThi ?? []);

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

/**
 * Tư vấn cập nhật điểm thi học viên cho 1 dòng nguyện vọng (`ql_hv_truong_nganh`).
 *
 * - `score = null` → xoá điểm (bỏ trống ô).
 * - Số phải hữu hạn, không âm. Chấp nhận thập phân (vd: 7.25). Cap ở 1000 đề
 *   phòng nhập sai đơn vị.
 *
 * Revalidate cả route gốc lẫn các sub-route slug để bảng cập nhật ngay.
 */
export async function updateQlHvTruongNganhScore(payload: {
  rowId: number;
  score: number | null;
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const rowId = Math.trunc(payload.rowId);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    return { ok: false, error: "Dòng nguyện vọng không hợp lệ." };
  }

  let scoreToSave: number | null = null;
  if (payload.score != null) {
    if (!Number.isFinite(payload.score)) {
      return { ok: false, error: "Điểm thi phải là số." };
    }
    if (payload.score < 0) {
      return { ok: false, error: "Điểm thi không được âm." };
    }
    if (payload.score > 1000) {
      return { ok: false, error: "Điểm thi không hợp lệ (quá lớn)." };
    }
    scoreToSave = payload.score;
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase
    .from("ql_hv_truong_nganh")
    .update({ score: scoreToSave })
    .eq("id", rowId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(REV);
  revalidatePath(`${REV}/[truongSlug]`, "page");
  revalidatePath(`${REV}/[truongSlug]/[nganhSlug]`, "page");
  return { ok: true };
}
