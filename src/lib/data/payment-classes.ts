import type { SupabaseClient } from "@supabase/supabase-js";
import { countDangHocByLopIds } from "@/lib/data/class-seat-dang-hoc";
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
  /** `ql_lop_hoc.level_hinh_hoa` — CSV "Loại lớp" (hiển thị cho mọi môn). */
  levelHinhHoa: string | null;
  filled: number;
  total: number;
  isFull: boolean;
  /** `ql_lop_hoc.is_active` — false = tạm dừng khai giảng. */
  isActive: boolean;
};

/**
 * Lớp cho trang đóng học phí: ghế (si_so môn), sĩ số **Đang học** (cùng quy tắc QLHV),
 * tên GV (hr_nhan_su), ảnh lớp (ql_lop_hoc.avatar).
 */
export async function fetchEnrichedPaymentClasses(
  supabase: SupabaseClient
): Promise<EnrichedPaymentClass[]> {
  const selFull =
    "id, class_name, class_full_name, mon_hoc, lich_hoc, teacher, avatar, special, level_hinh_hoa, is_active";
  const selMin =
    "id, class_name, class_full_name, mon_hoc, lich_hoc, teacher, avatar, special, is_active";

  let lopRows: Record<string, unknown>[] | null = null;
  const first = await supabase
    .from("ql_lop_hoc")
    .select(selFull)
    .not("mon_hoc", "is", null)
    .order("id", { ascending: true });

  if (first.error) {
    const msg = first.error.message.toLowerCase();
    if (msg.includes("column") || msg.includes("schema")) {
      const retry = await supabase
        .from("ql_lop_hoc")
        .select(selMin)
        .not("mon_hoc", "is", null)
        .order("id", { ascending: true });
      if (retry.error || !retry.data?.length) return [];
      lopRows = retry.data as Record<string, unknown>[];
    } else {
      return [];
    }
  } else {
    lopRows = (first.data ?? []) as Record<string, unknown>[];
  }

  if (!lopRows?.length) return [];

  const lopList = lopRows;
  const lopIds = lopList.map((r) => Number(r.id)).filter((id) => Number.isFinite(id) && id > 0);
  const monIds = [
    ...new Set(
      lopList.map((r) => Number(r.mon_hoc)).filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  const teacherIds = [...new Set(lopList.flatMap((r) => parseTeacherIds(r.teacher)))];
  if (!lopIds.length) return [];

  const [{ data: mons }, { data: teachers }, filledByLop] = await Promise.all([
    monIds.length
      ? supabase.from("ql_mon_hoc").select("id, si_so").in("id", monIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    teacherIds.length
      ? supabase.from("hr_nhan_su").select("id, full_name").in("id", teacherIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    countDangHocByLopIds(supabase, lopIds),
  ]);

  const monSeat = new Map<number, number>();
  for (const m of mons ?? []) {
    const id = Number((m as Record<string, unknown>).id);
    if (!Number.isFinite(id)) continue;
    const si = Number((m as Record<string, unknown>).si_so ?? 0);
    monSeat.set(id, Number.isFinite(si) && si > 0 ? si : 20);
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

    const levelRaw = String(r.level_hinh_hoa ?? "").trim();
    const levelHinhHoa = levelRaw.length > 0 ? levelRaw : null;
    const isActive = r.is_active !== false;

    return {
      id,
      monHocId,
      tenLop,
      lichHoc,
      gvNames,
      avatar,
      special,
      levelHinhHoa,
      filled,
      total: totalSeat,
      isFull,
      isActive,
    };
  });
}
