"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import type { CaDay, ThuInWeek, NhomDay } from "@/lib/lich-day-gv/config";
import { isCaDay, isNhomDay, addWeeksToMonday, parseMondayParam } from "@/lib/lich-day-gv/config";
import { formatSupabaseWriteError } from "@/lib/supabase/postgres-permission-hint";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { SupabaseClient } from "@supabase/supabase-js";

const REVALIDATE = "/admin/dashboard/lich-day-giao-vien";
const TABLE = "hr_lich_day_giao_vien";

export type LichDayGvActionResult =
  | { ok: true; added?: number; copied?: number }
  | { ok: false; error: string; needsNhomMigration?: boolean };

function revalidateSchedule(): void {
  revalidatePath(REVALIDATE);
}

function nId(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseThu(raw: unknown): ThuInWeek | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 7) return null;
  return n as ThuInWeek;
}

function parseNhom(raw: unknown): NhomDay | null {
  const s = String(raw ?? "").trim();
  return isNhomDay(s) ? s : null;
}

function nhomLabel(nhom: NhomDay): string {
  return nhom === "hinh" ? "Hình" : "Màu";
}

async function duplicateInsertResult(
  supabase: SupabaseClient,
  opts: {
    chiNhanhId: number;
    tuan: string;
    thu: ThuInWeek;
    ca: CaDay;
    nhom: NhomDay;
    nhanSuIds: number[];
  },
): Promise<Extract<LichDayGvActionResult, { ok: false }>> {
  const { data } = await supabase
    .from(TABLE)
    .select("nhan_su_id")
    .eq("chi_nhanh_id", opts.chiNhanhId)
    .eq("tuan_bat_dau", opts.tuan)
    .eq("thu", opts.thu)
    .eq("ca", opts.ca)
    .eq("nhom", opts.nhom)
    .in("nhan_su_id", opts.nhanSuIds);

  const inSameNhom = new Set(
    (data ?? [])
      .map((r) => nId((r as Record<string, unknown>).nhan_su_id))
      .filter((x): x is number => x != null),
  );
  const allInSameNhom = opts.nhanSuIds.every((id) => inSameNhom.has(id));
  if (allInSameNhom) {
    return {
      ok: false,
      error: `Giáo viên đã có trong nhóm ${nhomLabel(opts.nhom)}.`,
    };
  }
  return {
    ok: false,
    error:
      "Database chưa hỗ trợ cùng một GV ở cả Hình và Màu. Chạy SQL migration bên dưới trong Supabase → SQL Editor, rồi tải lại trang.",
    needsNhomMigration: true,
  };
}

export async function assignLichDayGiaoVien(input: {
  chi_nhanh_id: number;
  tuan_bat_dau: string;
  thu: number;
  ca: string;
  nhom: string;
  nhan_su_id: number;
  ghi_chu?: string | null;
}): Promise<LichDayGvActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const chiNhanhId = nId(input.chi_nhanh_id);
  const nhanSuId = nId(input.nhan_su_id);
  const thu = parseThu(input.thu);
  const ca = String(input.ca ?? "").trim();
  const nhom = parseNhom(input.nhom);
  const tuan = parseMondayParam(input.tuan_bat_dau);

  if (!chiNhanhId || !nhanSuId || !thu || !isCaDay(ca) || !nhom) {
    return { ok: false, error: "Dữ liệu không hợp lệ." };
  }

  const { error } = await supabase.from(TABLE).insert({
    chi_nhanh_id: chiNhanhId,
    tuan_bat_dau: tuan,
    thu,
    ca,
    nhom,
    nhan_su_id: nhanSuId,
    ghi_chu: input.ghi_chu?.trim() || null,
    nguoi_tao_id: session.staffId,
  });

  if (error) {
    if (error.code === "23505") {
      return await duplicateInsertResult(supabase, {
        chiNhanhId,
        tuan,
        thu,
        ca,
        nhom,
        nhanSuIds: [nhanSuId],
      });
    }
    return { ok: false, error: formatSupabaseWriteError(error, TABLE) || "Không gán được giáo viên." };
  }

  revalidateSchedule();
  return { ok: true };
}

export async function assignLichDayGiaoVienMany(input: {
  chi_nhanh_id: number;
  tuan_bat_dau: string;
  thu: number;
  ca: string;
  nhom: string;
  nhan_su_ids: number[];
}): Promise<LichDayGvActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const chiNhanhId = nId(input.chi_nhanh_id);
  const thu = parseThu(input.thu);
  const ca = String(input.ca ?? "").trim();
  const nhom = parseNhom(input.nhom);
  const tuan = parseMondayParam(input.tuan_bat_dau);

  const ids = [...new Set((input.nhan_su_ids ?? []).map((x) => nId(x)).filter((x): x is number => x != null))];

  if (!chiNhanhId || !thu || !isCaDay(ca) || !nhom) {
    return { ok: false, error: "Dữ liệu không hợp lệ." };
  }
  if (!ids.length) return { ok: false, error: "Chưa chọn giáo viên." };

  const { data: existing, error: readErr } = await supabase
    .from(TABLE)
    .select("nhan_su_id")
    .eq("chi_nhanh_id", chiNhanhId)
    .eq("tuan_bat_dau", tuan)
    .eq("thu", thu)
    .eq("ca", ca)
    .eq("nhom", nhom)
    .in("nhan_su_id", ids);

  if (readErr) return { ok: false, error: formatSupabaseWriteError(readErr, TABLE) };

  const taken = new Set(
    (existing ?? []).map((r) => nId((r as Record<string, unknown>).nhan_su_id)).filter((x): x is number => x != null),
  );
  const toInsert = ids.filter((id) => !taken.has(id));
  if (!toInsert.length) {
    return { ok: false, error: "Các giáo viên đã chọn đều có trong ca này." };
  }

  const rows = toInsert.map((nhanSuId) => ({
    chi_nhanh_id: chiNhanhId,
    tuan_bat_dau: tuan,
    thu,
    ca,
    nhom,
    nhan_su_id: nhanSuId,
    ghi_chu: null,
    nguoi_tao_id: session.staffId,
  }));

  const { error } = await supabase.from(TABLE).insert(rows);
  if (error) {
    if (error.code === "23505") {
      return await duplicateInsertResult(supabase, {
        chiNhanhId,
        tuan,
        thu,
        ca,
        nhom,
        nhanSuIds: toInsert,
      });
    }
    return { ok: false, error: formatSupabaseWriteError(error, TABLE) || "Không gán được giáo viên." };
  }

  revalidateSchedule();
  return { ok: true, added: toInsert.length };
}

export async function removeLichDayGiaoVien(id: number): Promise<LichDayGvActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const rowId = nId(id);
  if (!rowId) return { ok: false, error: "Dòng lịch không hợp lệ." };

  const { error } = await supabase.from(TABLE).delete().eq("id", rowId);
  if (error) return { ok: false, error: formatSupabaseWriteError(error, TABLE) || "Không xóa được." };

  revalidateSchedule();
  return { ok: true };
}

function isMissingColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("column") &&
    (m.includes("does not exist") || m.includes("schema cache") || m.includes("could not find"))
  );
}

/** Sao chép lịch tuần trước sang tuần hiện tại (bỏ qua trùng). */
export async function copyLichDayFromPreviousWeek(input: {
  chi_nhanh_id: number;
  tuan_bat_dau: string;
}): Promise<LichDayGvActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const chiNhanhId = nId(input.chi_nhanh_id);
  const tuan = parseMondayParam(input.tuan_bat_dau);
  if (!chiNhanhId) return { ok: false, error: "Chi nhánh không hợp lệ." };

  const prevMonday = addWeeksToMonday(tuan, -1);

  const { data: prevRows, error: readErr } = await supabase
    .from(TABLE)
    .select("thu, ca, nhom, nhan_su_id, ghi_chu")
    .eq("chi_nhanh_id", chiNhanhId)
    .eq("tuan_bat_dau", prevMonday);

  if (readErr && isMissingColumnError(readErr.message ?? "")) {
    const fb = await supabase
      .from(TABLE)
      .select("thu, ca, nhan_su_id, ghi_chu")
      .eq("chi_nhanh_id", chiNhanhId)
      .eq("tuan_bat_dau", prevMonday);
    if (fb.error) return { ok: false, error: formatSupabaseWriteError(fb.error, TABLE) };
    if (!fb.data?.length) return { ok: false, error: "Tuần trước chưa có lịch để sao chép." };
    const inserts = fb.data.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        chi_nhanh_id: chiNhanhId,
        tuan_bat_dau: tuan,
        thu: Number(row.thu),
        ca: String(row.ca),
        nhom: "hinh",
        nhan_su_id: Number(row.nhan_su_id),
        ghi_chu: row.ghi_chu != null ? String(row.ghi_chu) : null,
        nguoi_tao_id: session.staffId,
      };
    });
    const { data: existing, error: existErr } = await supabase
      .from(TABLE)
      .select("thu, ca, nhan_su_id")
      .eq("chi_nhanh_id", chiNhanhId)
      .eq("tuan_bat_dau", tuan);
    if (existErr) return { ok: false, error: formatSupabaseWriteError(existErr, TABLE) };
    const existingKeys = new Set(
      (existing ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return `${row.thu}|${row.ca}|hinh|${row.nhan_su_id}`;
      }),
    );
    const toInsert = inserts.filter((r) => !existingKeys.has(`${r.thu}|${r.ca}|${r.nhom}|${r.nhan_su_id}`));
    if (!toInsert.length) return { ok: false, error: "Tuần này đã có đủ lịch từ tuần trước." };
    const { error: insErr } = await supabase.from(TABLE).insert(toInsert);
    if (insErr) return { ok: false, error: formatSupabaseWriteError(insErr, TABLE) };
    revalidateSchedule();
    return { ok: true, copied: toInsert.length };
  }

  if (readErr) return { ok: false, error: formatSupabaseWriteError(readErr, TABLE) };
  if (!prevRows?.length) return { ok: false, error: "Tuần trước chưa có lịch để sao chép." };

  const inserts = prevRows.map((r) => {
    const row = r as Record<string, unknown>;
    const nhomRaw = String(row.nhom ?? "hinh");
    return {
      chi_nhanh_id: chiNhanhId,
      tuan_bat_dau: tuan,
      thu: Number(row.thu),
      ca: String(row.ca),
      nhom: isNhomDay(nhomRaw) ? nhomRaw : "hinh",
      nhan_su_id: Number(row.nhan_su_id),
      ghi_chu: row.ghi_chu != null ? String(row.ghi_chu) : null,
      nguoi_tao_id: session.staffId,
    };
  });

  const { data: existing, error: existErr } = await supabase
    .from(TABLE)
    .select("thu, ca, nhom, nhan_su_id")
    .eq("chi_nhanh_id", chiNhanhId)
    .eq("tuan_bat_dau", tuan);

  if (existErr) return { ok: false, error: formatSupabaseWriteError(existErr, TABLE) };

  const existingKeys = new Set(
    (existing ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const nhomRaw = String(row.nhom ?? "hinh");
      const nhom = isNhomDay(nhomRaw) ? nhomRaw : "hinh";
      return `${row.thu}|${row.ca}|${nhom}|${row.nhan_su_id}`;
    }),
  );

  const toInsert = inserts.filter(
    (r) => !existingKeys.has(`${r.thu}|${r.ca}|${r.nhom}|${r.nhan_su_id}`),
  );
  if (!toInsert.length) {
    return { ok: false, error: "Tuần này đã có đủ lịch từ tuần trước." };
  }

  const { error: insErr } = await supabase.from(TABLE).insert(toInsert);

  if (insErr) return { ok: false, error: formatSupabaseWriteError(insErr, TABLE) };

  revalidateSchedule();
  return { ok: true, copied: toInsert.length };
}
