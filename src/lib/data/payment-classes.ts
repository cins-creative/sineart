import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTeacherIds } from "@/lib/utils/parse-teacher-ids";

export type EnrichedPaymentClass = {
  id: number;
  monHocId: number;
  tenLop: string;
  lichHoc: string;
  gvNames: string;
  /** Ảnh đại diện lớp — `ql_lop_hoc.avatar`. */
  avatar: string | null;
  /** `ql_lop_hoc.special` — nhận «cấp tốc» giống gói học phí / `HocPhiBlock`. */
  special: string | null;
  filled: number;
  total: number;
  isFull: boolean;
};

/**
 * Lớp cho trang đóng học phí: ghế (si_so môn), sĩ số thực (ql_quan_ly_hoc_vien),
 * tên GV (hr_nhan_su), ảnh lớp (ql_lop_hoc.avatar).
 */
export async function fetchEnrichedPaymentClasses(
  supabase: SupabaseClient
): Promise<EnrichedPaymentClass[]> {
  const { data: lopRows, error: lopErr } = await supabase
    .from("ql_lop_hoc")
    .select("id, class_name, class_full_name, mon_hoc, lich_hoc, teacher, avatar, special")
    .not("mon_hoc", "is", null)
    .order("id", { ascending: true });

  if (lopErr || !lopRows?.length) return [];

  const lopList = lopRows as Record<string, unknown>[];
  const lopIds = lopList.map((r) => Number(r.id)).filter((id) => Number.isFinite(id) && id > 0);
  const monIds = [
    ...new Set(
      lopList.map((r) => Number(r.mon_hoc)).filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  const teacherIds = [...new Set(lopList.flatMap((r) => parseTeacherIds(r.teacher)))];
  if (!lopIds.length) return [];

  const [{ data: mons }, { data: enrollRows }, { data: teachers }] = await Promise.all([
    monIds.length
      ? supabase.from("ql_mon_hoc").select("id, si_so").in("id", monIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    supabase
      .from("ql_quan_ly_hoc_vien")
      .select("lop_hoc")
      .in("lop_hoc", lopIds),
    teacherIds.length
      ? supabase.from("hr_nhan_su").select("id, full_name").in("id", teacherIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const monSeat = new Map<number, number>();
  for (const m of mons ?? []) {
    const id = Number((m as Record<string, unknown>).id);
    if (!Number.isFinite(id)) continue;
    const si = Number((m as Record<string, unknown>).si_so ?? 0);
    monSeat.set(id, Number.isFinite(si) && si > 0 ? si : 20);
  }

  const filledByLop = new Map<number, number>();
  for (const row of enrollRows ?? []) {
    const lid = Number((row as Record<string, unknown>).lop_hoc);
    if (!Number.isFinite(lid)) continue;
    filledByLop.set(lid, (filledByLop.get(lid) ?? 0) + 1);
  }

  const teacherMap = new Map<number, string>();
  for (const t of teachers ?? []) {
    const id = Number((t as Record<string, unknown>).id);
    if (!Number.isFinite(id)) continue;
    teacherMap.set(id, String((t as Record<string, unknown>).full_name ?? "").trim() || "Giáo viên");
  }

  return lopList.map((r) => {
    const id = Number(r.id);
    const monHocId = Number(r.mon_hoc);
    const totalSeat = monSeat.get(monHocId) ?? 20;
    const filled = filledByLop.get(id) ?? 0;
    const isFull = filled >= totalSeat;
    const teacherIdsOfClass = [...new Set(parseTeacherIds(r.teacher))];
    const gvNameList = teacherIdsOfClass
      .map((tid) => teacherMap.get(tid))
      .filter((name): name is string => Boolean(name && name.trim()));
    const gvNames = gvNameList.length ? gvNameList.join(" · ") : "Đang cập nhật";
    const avatarRaw = String(r.avatar ?? "").trim();
    const avatar = avatarRaw.length > 0 ? avatarRaw : null;
    const spRaw = r.special;
    const special =
      spRaw == null || spRaw === ""
        ? null
        : String(spRaw).trim() || null;
    const tenLop =
      String(r.class_full_name ?? "").trim() ||
      String(r.class_name ?? "").trim() ||
      `Lớp ${id}`;
    const lichHoc = String(r.lich_hoc ?? "").trim() || "Liên hệ tư vấn lịch học";

    return {
      id,
      monHocId,
      tenLop,
      lichHoc,
      gvNames,
      avatar,
      special,
      filled,
      total: totalSeat,
      isFull,
    };
  });
}
