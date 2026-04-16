"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/he-thong-bai-tap";

function revalidateHeThongPublic(): void {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/he-thong-bai-tap", "page");
  revalidatePath("/he-thong-bai-tap", "layout");
  revalidatePath("/khoa-hoc", "page");
  revalidatePath("/khoa-hoc", "layout");
}

export type BaiTapMutResult = { ok: true; message?: string } | { ok: false; error: string };

/** Khớp cột thật `hv_he_thong_bai_tap` (không có `url_bai_tap`). */
export type BaiTapSaveInput = {
  ten_bai_tap: string;
  bai_so: number | null;
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

function normText(s: string | null | undefined): string | null {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

function normTextArr(a: string[] | null | undefined): string[] | null {
  if (!a?.length) return null;
  const out = a.map((x) => String(x).trim()).filter(Boolean);
  return out.length ? out : null;
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

  return {
    ok: true,
    data: {
      ten_bai_tap,
      bai_so: input.bai_so != null && Number.isFinite(input.bai_so) ? Math.trunc(input.bai_so) : null,
      mon_hoc:
        input.mon_hoc != null && Number.isFinite(input.mon_hoc) && input.mon_hoc > 0
          ? Math.trunc(input.mon_hoc)
          : null,
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
  return {
    ten_bai_tap: d.ten_bai_tap,
    bai_so: d.bai_so,
    mon_hoc: d.mon_hoc,
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

  const { error } = await supabase.from("hv_he_thong_bai_tap").insert(rowForDb(parsed.data));
  if (error) return { ok: false, error: error.message || "Không tạo được bài tập." };

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

  revalidateHeThongPublic();
  return { ok: true, message: "Đã cập nhật." };
}

export async function deleteHeThongBaiTap(id: number): Promise<BaiTapMutResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Mã bài không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

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
