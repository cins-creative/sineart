"use server";

import { revalidatePath } from "next/cache";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { SupabaseClient } from "@supabase/supabase-js";

const ADMIN_PATH = "/admin/dashboard/he-thong-bai-tap";

function revalidateHeThongPublic(): void {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/he-thong-bai-tap", "page");
  revalidatePath("/he-thong-bai-tap", "layout");
  revalidatePath("/khoa-hoc", "page");
  revalidatePath("/khoa-hoc", "layout");
}

export type BaiTapMutResult = { ok: true; message?: string } | { ok: false; error: string };

/** Payload form — một hoặc nhiều `ql_mon_hoc.id` (bảng nối `hv_he_thong_bai_tap_mon_hoc`). */
export type BaiTapSaveInput = {
  ten_bai_tap: string;
  bai_so: number | null;
  mon_hoc_ids: number[];
  thumbnail: string | null;
  noi_dung_liet_ke: string | null;
  mo_ta_bai_tap: string | null;
  video_bai_giang: string | null;
  loi_sai: string | null;
  video_ly_thuyet: string[] | null;
  video_tham_khao: string[] | null;
  is_visible: boolean;
  so_buoi: number | null;
  muc_do_quan_trong: string | null;
};

function normText(s: string | null | undefined): string | null {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

function normTextArr(a: string[] | null | undefined): string[] | null {
  if (!a?.length) return null;
  const out = a.map((x) => String(x).trim()).filter(Boolean);
  return out.length ? out : null;
}

function junctionErrorHint(message: string): string {
  if (!/permission denied|42501/i.test(message)) return message;
  return (
    `${message} — Chạy GRANT trên bảng hv_he_thong_bai_tap_mon_hoc (xem sql/grants_hv_he_thong_bai_tap_mon_hoc.sql) ` +
    "và kiểm tra .env dùng đúng SUPABASE_SERVICE_ROLE_KEY (role service_role), không dùng anon key."
  );
}

/** Đồng bộ bảng nối bài ↔ môn (service role). */
async function syncHeThongBaiTapMonJunction(
  supabase: SupabaseClient,
  baiTapId: number,
  monHocIds: number[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniq = [
    ...new Set(
      monHocIds.map((n) => Math.trunc(Number(n))).filter((n) => Number.isFinite(n) && n > 0)
    ),
  ].sort((a, b) => a - b);
  const { error: delErr } = await supabase
    .from("hv_he_thong_bai_tap_mon_hoc")
    .delete()
    .eq("bai_tap_id", baiTapId);
  if (delErr) return { ok: false, error: junctionErrorHint(delErr.message) };
  if (uniq.length === 0) return { ok: true };
  const { error: insErr } = await supabase.from("hv_he_thong_bai_tap_mon_hoc").insert(
    uniq.map((mon_hoc_id) => ({ bai_tap_id: baiTapId, mon_hoc_id }))
  );
  if (insErr) return { ok: false, error: junctionErrorHint(insErr.message) };
  return { ok: true };
}

function parsePayload(input: BaiTapSaveInput): { ok: true; data: BaiTapSaveInput } | { ok: false; error: string } {
  const ten_bai_tap = input.ten_bai_tap.trim();
  if (!ten_bai_tap) return { ok: false, error: "Nhập tên bài tập." };

  let so_buoi: number | null =
    input.so_buoi != null && Number.isFinite(input.so_buoi) ? Math.trunc(input.so_buoi) : null;
  if (so_buoi != null && so_buoi < 0) return { ok: false, error: "Số buổi không hợp lệ." };
  if (so_buoi === 0) so_buoi = null;

  const muc = normText(input.muc_do_quan_trong);
  const allowed = new Set(["Bắt buộc", "Tập luyện", "Tuỳ chọn", "Tùy chọn"]);
  const muc_do_quan_trong =
    muc && allowed.has(muc)
      ? muc === "Tùy chọn"
        ? "Tuỳ chọn"
        : muc
      : muc
        ? muc
        : null;

  const rawIds = input.mon_hoc_ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return { ok: false, error: "Chọn ít nhất một môn học." };
  }
  const mon_hoc_ids = [
    ...new Set(
      rawIds.map((x) => Math.trunc(Number(x))).filter((n) => Number.isFinite(n) && n > 0)
    ),
  ].sort((a, b) => a - b);
  if (mon_hoc_ids.length === 0) {
    return { ok: false, error: "Chọn ít nhất một môn học hợp lệ." };
  }

  return {
    ok: true,
    data: {
      ten_bai_tap,
      bai_so: input.bai_so != null && Number.isFinite(input.bai_so) ? Math.trunc(input.bai_so) : null,
      mon_hoc_ids,
      thumbnail: normText(input.thumbnail),
      noi_dung_liet_ke: normText(input.noi_dung_liet_ke),
      mo_ta_bai_tap: normText(input.mo_ta_bai_tap),
      video_bai_giang: normText(input.video_bai_giang),
      loi_sai: normText(input.loi_sai),
      video_ly_thuyet: normTextArr(input.video_ly_thuyet),
      video_tham_khao: normTextArr(input.video_tham_khao),
      is_visible: Boolean(input.is_visible),
      so_buoi,
      muc_do_quan_trong,
    },
  };
}

type HvBaiTapInsert = {
  ten_bai_tap: string;
  bai_so: number | null;
  /** Legacy — trigger / MIN từ bảng nối */
  mon_hoc: number | null;
  thumbnail: string | null;
  noi_dung_liet_ke: string | null;
  mo_ta_bai_tap: string | null;
  video_bai_giang: string | null;
  loi_sai: string | null;
  video_ly_thuyet: string[] | null;
  video_tham_khao: string[] | null;
  is_visible: boolean;
  so_buoi: number | null;
  muc_do_quan_trong: string | null;
};

function rowForDb(d: BaiTapSaveInput): HvBaiTapInsert {
  const mon_hoc =
    d.mon_hoc_ids.length > 0 ? Math.min(...d.mon_hoc_ids) : null;
  return {
    ten_bai_tap: d.ten_bai_tap,
    bai_so: d.bai_so,
    mon_hoc,
    thumbnail: d.thumbnail,
    noi_dung_liet_ke: d.noi_dung_liet_ke,
    mo_ta_bai_tap: d.mo_ta_bai_tap,
    video_bai_giang: d.video_bai_giang,
    loi_sai: d.loi_sai,
    video_ly_thuyet: d.video_ly_thuyet,
    video_tham_khao: d.video_tham_khao,
    is_visible: d.is_visible,
    so_buoi: d.so_buoi,
    muc_do_quan_trong: d.muc_do_quan_trong,
  };
}

export async function createHeThongBaiTap(input: BaiTapSaveInput): Promise<BaiTapMutResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const parsed = parsePayload(input);
  if (!parsed.ok) return parsed;

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data: inserted, error } = await supabase
    .from("hv_he_thong_bai_tap")
    .insert(rowForDb(parsed.data))
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message || "Không tạo được bài tập." };

  const newId = Number(inserted?.id);
  if (!Number.isFinite(newId) || newId <= 0) {
    return { ok: false, error: "Không lấy được id bài tập sau khi tạo." };
  }

  const sync = await syncHeThongBaiTapMonJunction(supabase, newId, parsed.data.mon_hoc_ids);
  if (!sync.ok) {
    await supabase.from("hv_he_thong_bai_tap").delete().eq("id", newId);
    return { ok: false, error: sync.error };
  }

  revalidateHeThongPublic();
  return { ok: true, message: "Đã tạo bài tập." };
}

export async function updateHeThongBaiTap(id: number, input: BaiTapSaveInput): Promise<BaiTapMutResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Mã bài không hợp lệ." };

  const parsed = parsePayload(input);
  if (!parsed.ok) return parsed;

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { error } = await supabase.from("hv_he_thong_bai_tap").update(rowForDb(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.message || "Không cập nhật được." };

  const sync = await syncHeThongBaiTapMonJunction(supabase, id, parsed.data.mon_hoc_ids);
  if (!sync.ok) return { ok: false, error: sync.error };

  revalidateHeThongPublic();
  return { ok: true, message: "Đã cập nhật." };
}

/**
 * Cho phép patch một tập nhỏ các field từ list view (inline edit / bulk action).
 * Dùng key khớp `hv_he_thong_bai_tap` để server tin tưởng trực tiếp mà không cần full payload.
 */
export type BaiTapBulkPatch = {
  ten_bai_tap?: string;
  bai_so?: number | null;
  mon_hoc?: number | null;
  is_visible?: boolean;
  so_buoi?: number | null;
  muc_do_quan_trong?: string | null;
};

export type BaiTapBulkUpdateResult =
  | { ok: true; updated: number; message?: string }
  | { ok: false; error: string; updated?: number };

function sanitizeBulkPatch(raw: BaiTapBulkPatch): {
  ok: true;
  patch: Record<string, unknown>;
} | { ok: false; error: string } {
  const patch: Record<string, unknown> = {};

  if (raw.ten_bai_tap !== undefined) {
    const t = String(raw.ten_bai_tap ?? "").trim();
    if (!t) return { ok: false, error: "Tên bài tập không được để trống." };
    patch.ten_bai_tap = t;
  }

  if (raw.bai_so !== undefined) {
    if (raw.bai_so == null) {
      patch.bai_so = null;
    } else {
      const n = Math.trunc(Number(raw.bai_so));
      if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Bài số không hợp lệ." };
      patch.bai_so = n === 0 ? null : n;
    }
  }

  if (raw.mon_hoc !== undefined) {
    if (raw.mon_hoc == null) {
      patch.mon_hoc = null;
    } else {
      const n = Math.trunc(Number(raw.mon_hoc));
      if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "Môn học không hợp lệ." };
      patch.mon_hoc = n;
    }
  }

  if (raw.is_visible !== undefined) {
    patch.is_visible = Boolean(raw.is_visible);
  }

  if (raw.so_buoi !== undefined) {
    if (raw.so_buoi == null) {
      patch.so_buoi = null;
    } else {
      const n = Math.trunc(Number(raw.so_buoi));
      if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Số buổi không hợp lệ." };
      patch.so_buoi = n === 0 ? null : n;
    }
  }

  if (raw.muc_do_quan_trong !== undefined) {
    const m = String(raw.muc_do_quan_trong ?? "").trim();
    patch.muc_do_quan_trong = m === "Tùy chọn" ? "Tuỳ chọn" : m || null;
  }

  return { ok: true, patch };
}

/**
 * Cập nhật hàng loạt — mỗi row chỉ nhận patch gồm các field đã đổi ở list view.
 * Trả về `updated` = số row chạy update thành công. Khi có lỗi thì giữ lại
 * danh sách lỗi để UI show toast (không rollback các row đã lưu trước đó).
 */
export async function bulkUpdateHeThongBaiTap(
  updates: Array<{ id: number; patch: BaiTapBulkPatch }>,
): Promise<BaiTapBulkUpdateResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Array.isArray(updates) || updates.length === 0) {
    return { ok: false, error: "Không có thay đổi để lưu." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const clean: { id: number; patch: Record<string, unknown> }[] = [];
  for (const u of updates) {
    const id = Number(u.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const san = sanitizeBulkPatch(u.patch ?? {});
    if (!san.ok) return { ok: false, error: `Bài #${id}: ${san.error}` };
    if (Object.keys(san.patch).length === 0) continue;
    clean.push({ id, patch: san.patch });
  }

  if (clean.length === 0) return { ok: false, error: "Không có thay đổi hợp lệ." };

  let updated = 0;
  const errs: string[] = [];
  for (const u of clean) {
    const { error } = await supabase
      .from("hv_he_thong_bai_tap")
      .update(u.patch)
      .eq("id", u.id);
    if (error) errs.push(`#${u.id}: ${error.message}`);
    else {
      updated++;
      if ("mon_hoc" in u.patch) {
        const mid = u.patch.mon_hoc as number | null | undefined;
        const ids =
          mid != null && Number.isFinite(Number(mid)) && Number(mid) > 0 ? [Math.trunc(Number(mid))] : [];
        const sync = await syncHeThongBaiTapMonJunction(supabase, u.id, ids);
        if (!sync.ok) errs.push(`#${u.id} (môn): ${sync.error}`);
      }
    }
  }

  revalidateHeThongPublic();
  if (errs.length > 0) {
    return {
      ok: false,
      error: errs.join("; "),
      updated,
    };
  }
  return { ok: true, updated, message: `Đã lưu ${updated} bài.` };
}

export async function deleteHeThongBaiTap(id: number): Promise<BaiTapMutResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Mã bài không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const { error } = await supabase.from("hv_he_thong_bai_tap").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        "Không xóa được (có thể còn bài nộp học viên hoặc tiến độ ghi danh tham chiếu bài này).",
    };
  }

  revalidateHeThongPublic();
  return { ok: true, message: "Đã xóa bài tập." };
}
