import type { SupabaseClient } from "@supabase/supabase-js";

import {
  collectDaoTaoBanIds,
  isNhanSuThuocBanDaoTao,
} from "@/lib/hr/ban-dao-tao";
import type { CaDay, ThuInWeek, NhomDay } from "@/lib/lich-day-gv/config";
import { isCaDay, isNhomDay } from "@/lib/lich-day-gv/config";
import { teacherNhomFlags } from "@/lib/lich-day-gv/mon-nhom";
import { parseTeacherIds } from "@/lib/utils/parse-teacher-ids";

const TABLE = "hr_lich_day_giao_vien";

export type LichDayGvAssignment = {
  id: number;
  chi_nhanh_id: number;
  tuan_bat_dau: string;
  thu: ThuInWeek;
  ca: CaDay;
  nhom: NhomDay;
  nhan_su_id: number;
  nhan_su_ten: string;
  nhan_su_sdt: string | null;
  ghi_chu: string | null;
};

export type LichDayGvTeacherOption = {
  id: number;
  full_name: string;
  chi_nhanh_id: number | null;
  avatar: string | null;
  /** Tên lớp đang dạy (`ql_lop_hoc`, lớp đang hoạt động). */
  lop_dang_day_labels: string[];
  nhom_flags: { hinh: boolean; mau: boolean };
};

function nId(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isActiveLopRow(raw: Record<string, unknown>): boolean {
  return raw.is_active !== false && raw.tinh_trang !== false;
}

function lopDisplayLabel(raw: Record<string, unknown>): string {
  const short = String(raw.class_name ?? "").trim();
  if (short) return short;
  const full = String(raw.class_full_name ?? "").trim();
  if (full) return full;
  const id = nId(raw.id);
  return id ? `Lớp #${id}` : "Lớp";
}

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("hr_lich_day_giao_vien") &&
    (m.includes("does not exist") || m.includes("could not find") || m.includes("schema cache"))
  );
}

function isPermissionDeniedError(message: string, code?: string): boolean {
  if (code === "42501") return true;
  const m = message.toLowerCase();
  return m.includes("permission denied") && m.includes("hr_lich_day_giao_vien");
}

function isMissingColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("column") &&
    (m.includes("does not exist") || m.includes("schema cache") || m.includes("could not find"))
  );
}

export async function fetchLichDayGvWeek(
  supabase: SupabaseClient,
  opts: { chi_nhanh_id: number; tuan_bat_dau: string },
): Promise<
  | { ok: true; assignments: LichDayGvAssignment[] }
  | { ok: false; error: string; missingTable?: boolean; permissionDenied?: boolean }
> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, chi_nhanh_id, tuan_bat_dau, thu, ca, nhom, nhan_su_id, ghi_chu")
    .eq("chi_nhanh_id", opts.chi_nhanh_id)
    .eq("tuan_bat_dau", opts.tuan_bat_dau)
    .order("thu", { ascending: true })
    .order("ca", { ascending: true })
    .order("nhom", { ascending: true });

  let rawRows = (data ?? []) as Record<string, unknown>[];
  if (error) {
    if (isMissingColumnError(error.message ?? "")) {
      const fallback = await supabase
        .from(TABLE)
        .select("id, chi_nhanh_id, tuan_bat_dau, thu, ca, nhan_su_id, ghi_chu")
        .eq("chi_nhanh_id", opts.chi_nhanh_id)
        .eq("tuan_bat_dau", opts.tuan_bat_dau)
        .order("thu", { ascending: true })
        .order("ca", { ascending: true });
      if (fallback.error) {
        return {
          ok: false,
          error: fallback.error.message,
          missingTable: isMissingTableError(fallback.error.message),
          permissionDenied: isPermissionDeniedError(fallback.error.message, fallback.error.code),
        };
      }
      rawRows = (fallback.data ?? []) as Record<string, unknown>[];
    } else {
      return {
        ok: false,
        error: error.message,
        missingTable: isMissingTableError(error.message),
        permissionDenied: isPermissionDeniedError(error.message, error.code),
      };
    }
  }

  const teacherIds = [...new Set(rawRows.map((r) => nId(r.nhan_su_id)).filter((x): x is number => x != null))];
  const nameById = new Map<number, string>();
  const sdtById = new Map<number, string>();
  if (teacherIds.length > 0) {
    const { data: staffRows } = await supabase
      .from("hr_nhan_su")
      .select("id, full_name, sdt")
      .in("id", teacherIds);
    for (const raw of staffRows ?? []) {
      const row = raw as Record<string, unknown>;
      const id = nId(row.id);
      if (id) {
        nameById.set(id, String(row.full_name ?? "").trim() || `GV #${id}`);
        const sdt = row.sdt != null ? String(row.sdt).trim() : "";
        if (sdt) sdtById.set(id, sdt);
      }
    }
  }

  const assignments: LichDayGvAssignment[] = [];
  for (const row of rawRows) {
    const id = nId(row.id);
    const chiNhanhId = nId(row.chi_nhanh_id);
    const thu = Number(row.thu);
    const caRaw = String(row.ca ?? "");
    const nhanSuId = nId(row.nhan_su_id);
    const nhomRaw = String(row.nhom ?? "hinh");
    const nhom: NhomDay = isNhomDay(nhomRaw) ? nhomRaw : "hinh";
    if (!id || !chiNhanhId || !nhanSuId || !isCaDay(caRaw) || thu < 1 || thu > 7) continue;
    assignments.push({
      id,
      chi_nhanh_id: chiNhanhId,
      tuan_bat_dau: String(row.tuan_bat_dau ?? "").slice(0, 10),
      thu: thu as ThuInWeek,
      ca: caRaw,
      nhom,
      nhan_su_id: nhanSuId,
      nhan_su_ten: nameById.get(nhanSuId) ?? `GV #${nhanSuId}`,
      nhan_su_sdt: sdtById.get(nhanSuId) ?? null,
      ghi_chu: row.ghi_chu != null ? String(row.ghi_chu).trim() || null : null,
    });
  }

  return { ok: true, assignments };
}

/** Giáo viên thuộc ban Đào tạo — ưu tiên cùng chi nhánh khi sort client. */
export async function fetchLichDayGvTeacherOptions(
  supabase: SupabaseClient,
): Promise<{ ok: true; teachers: LichDayGvTeacherOption[] } | { ok: false; error: string }> {
  const nsRes = await supabase
    .from("hr_nhan_su")
    .select("id, full_name, chi_nhanh_id, status, ban, avatar")
    .order("full_name", { ascending: true });

  if (nsRes.error) return { ok: false, error: nsRes.error.message };

  const banRes = await supabase.from("hr_ban").select("id, ten_ban");

  const banById: Record<number, string> = {};
  for (const raw of banRes.data ?? []) {
    const row = raw as Record<string, unknown>;
    const id = nId(row.id);
    if (!id) continue;
    banById[id] = String(row.ten_ban ?? "").trim() || `Ban #${id}`;
  }
  const daoTaoBanIds = collectDaoTaoBanIds(banById);

  const staffRows = (nsRes.data ?? []) as Record<string, unknown>[];
  const activeStaffIds: number[] = [];
  const staffMeta = new Map<
    number,
    {
      full_name: string;
      chi_nhanh_id: number | null;
      ban: number | null;
      avatar: string | null;
    }
  >();

  for (const row of staffRows) {
    const id = nId(row.id);
    if (!id) continue;
    const status = String(row.status ?? "").trim().toLowerCase();
    if (status === "nghi" || status === "đã nghỉ" || status === "da nghi") continue;
    activeStaffIds.push(id);
    staffMeta.set(id, {
      full_name: String(row.full_name ?? "").trim() || `NS #${id}`,
      chi_nhanh_id: nId(row.chi_nhanh_id),
      ban: nId(row.ban),
      avatar: row.avatar != null ? String(row.avatar).trim() || null : null,
    });
  }

  const monById = new Map<number, string>();
  const monRes = await supabase.from("ql_mon_hoc").select("id, ten_mon_hoc");
  for (const raw of monRes.data ?? []) {
    const row = raw as Record<string, unknown>;
    const id = nId(row.id);
    const ten = String(row.ten_mon_hoc ?? "").trim();
    if (id && ten) monById.set(id, ten);
  }

  const lopByTeacherId = new Map<number, string[]>();
  const monNamesByTeacherId = new Map<number, string[]>();
  const phongIdsByStaffId = new Map<number, number[]>();
  const phongToBanId: Record<number, number> = {};

  if (activeStaffIds.length > 0) {
    const staffSet = new Set(activeStaffIds);
    let lopRes = await supabase
      .from("ql_lop_hoc")
      .select("id, class_name, class_full_name, teacher, mon_hoc, is_active, tinh_trang");
    if (lopRes.error && isMissingColumnError(lopRes.error.message ?? "")) {
      lopRes = await supabase
        .from("ql_lop_hoc")
        .select("id, class_name, class_full_name, teacher, mon_hoc");
    }

    for (const raw of lopRes.data ?? []) {
      const row = raw as Record<string, unknown>;
      if (!isActiveLopRow(row)) continue;
      const label = lopDisplayLabel(row);
      const monId = nId(row.mon_hoc);
      const monTen = monId ? monById.get(monId) ?? null : null;
      for (const tid of parseTeacherIds(row.teacher)) {
        if (!staffSet.has(tid)) continue;
        const cur = lopByTeacherId.get(tid) ?? [];
        if (!cur.includes(label)) cur.push(label);
        lopByTeacherId.set(tid, cur);
        if (monTen) {
          const mons = monNamesByTeacherId.get(tid) ?? [];
          if (!mons.includes(monTen)) mons.push(monTen);
          monNamesByTeacherId.set(tid, mons);
        }
      }
    }

    for (const [tid, labels] of lopByTeacherId) {
      lopByTeacherId.set(tid, [...labels].sort((a, b) => a.localeCompare(b, "vi")));
    }

    const { data: nsPhongRows } = await supabase
      .from("hr_nhan_su_phong")
      .select("nhan_su_id, phong_id")
      .in("nhan_su_id", activeStaffIds);

    const phongIds = new Set<number>();
    for (const raw of nsPhongRows ?? []) {
      const row = raw as Record<string, unknown>;
      const sid = nId(row.nhan_su_id);
      const pid = nId(row.phong_id);
      if (!sid || !pid) continue;
      phongIds.add(pid);
      const cur = phongIdsByStaffId.get(sid) ?? [];
      if (!cur.includes(pid)) cur.push(pid);
      phongIdsByStaffId.set(sid, cur);
    }

    if (phongIds.size > 0) {
      const phRes = await supabase.from("hr_phong").select("id, ban").in("id", [...phongIds]);
      if (!phRes.error) {
        for (const raw of phRes.data ?? []) {
          const row = raw as Record<string, unknown>;
          const pid = nId(row.id);
          const bid = nId(row.ban);
          if (pid && bid) phongToBanId[pid] = bid;
        }
      }
    }
  }

  const teachers: LichDayGvTeacherOption[] = [];
  for (const id of activeStaffIds) {
    const meta = staffMeta.get(id);
    if (!meta) continue;
    if (
      !isNhanSuThuocBanDaoTao({
        nhanSuBan: meta.ban,
        phongIds: phongIdsByStaffId.get(id) ?? [],
        phongToBanId,
        daoTaoBanIds,
      })
    ) {
      continue;
    }

    teachers.push({
      id,
      full_name: meta.full_name,
      chi_nhanh_id: meta.chi_nhanh_id,
      avatar: meta.avatar,
      lop_dang_day_labels: lopByTeacherId.get(id) ?? [],
      nhom_flags: teacherNhomFlags(monNamesByTeacherId.get(id) ?? []),
    });
  }

  return { ok: true, teachers };
}
