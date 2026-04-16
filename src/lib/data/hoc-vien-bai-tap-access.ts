import { createClient } from "@/lib/supabase/server";
import { getHvIdFromSyncedCookie } from "@/lib/phong-hoc/hv-session-cookie";

/**
 * `anon` chưa đăng nhập; `non_hv` đăng nhập nhưng không phải HV/GV trong hệ thống;
 * `hv` học viên; `gv` giáo viên/nhân sự (`hr_nhan_su.email`) — xem toàn bộ bài, không khóa tiến độ.
 */
export type HeThongBaiTapViewer = "anon" | "non_hv" | "hv" | "gv";

export type HeThongBaiTapAccess = {
  viewer: HeThongBaiTapViewer;
  /**
   * Trong `sortedAscByBaiSo`: chỉ số bài xa nhất được xem (0-based, gồm cả bài đó).
   * - `-1`: chưa mở bài nào hoặc không áp dụng (không phải HV).
   */
  maxAccessibleIndex: number;
};

/**
 * `ql_quan_ly_hoc_vien.tien_do_hoc` → id bài trong `hv_he_thong_bai_tap`, lớp phải cùng `mon_hoc`.
 */
export async function getHeThongBaiTapAccess(
  monHocId: number,
  sortedAscByBaiSo: { id: number }[]
): Promise<HeThongBaiTapAccess> {
  const empty: HeThongBaiTapAccess = { viewer: "anon", maxAccessibleIndex: -1 };

  if (!Number.isFinite(monHocId) || sortedAscByBaiSo.length === 0) return empty;

  const ids = sortedAscByBaiSo.map((e) => e.id);
  const supabase = await createClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let email = user?.email?.trim().toLowerCase() ?? null;

  /** Phòng học chỉ lưu session localStorage, không set Supabase Auth — nhận email qua cookie đã đồng bộ. */
  if (!email) {
    const hid = await getHvIdFromSyncedCookie();
    if (hid != null && Number.isFinite(hid)) {
      const { data: qlRow } = await supabase
        .from("ql_thong_tin_hoc_vien")
        .select("email")
        .eq("id", hid)
        .maybeSingle();
      const em = qlRow != null && typeof (qlRow as { email?: unknown }).email === "string" ? (qlRow as { email: string }).email.trim().toLowerCase() : "";
      if (em) email = em;
    }
  }

  if (!email) return empty;

  const { data: nhanSu } = await supabase
    .from("hr_nhan_su")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  const staffId =
    nhanSu != null && typeof (nhanSu as { id?: unknown }).id !== "undefined"
      ? Number((nhanSu as { id: unknown }).id)
      : NaN;
  if (Number.isFinite(staffId)) {
    const last = sortedAscByBaiSo.length - 1;
    return { viewer: "gv", maxAccessibleIndex: last >= 0 ? last : -1 };
  }

  const { data: qlhv } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const hvId =
    qlhv != null && typeof (qlhv as { id?: unknown }).id !== "undefined"
      ? Number((qlhv as { id: unknown }).id)
      : NaN;
  if (!Number.isFinite(hvId)) return { viewer: "non_hv", maxAccessibleIndex: -1 };

  const { data: lops } = await supabase.from("ql_lop_hoc").select("id").eq("mon_hoc", monHocId);
  const lopIds = (lops ?? [])
    .map((row) => Number((row as { id: unknown }).id))
    .filter(Number.isFinite);
  if (lopIds.length === 0) return { viewer: "hv", maxAccessibleIndex: -1 };

  const { data: ens, error } = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("tien_do_hoc")
    .eq("hoc_vien_id", hvId)
    .in("lop_hoc", lopIds);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[getHeThongBaiTapAccess]", error.message);
    }
    return { viewer: "hv", maxAccessibleIndex: -1 };
  }

  let maxIdx = -1;
  for (const r of ens ?? []) {
    const td = (r as { tien_do_hoc?: unknown }).tien_do_hoc;
    const tid = td != null && td !== "" ? Number(td) : NaN;
    if (!Number.isFinite(tid)) continue;
    const ix = ids.indexOf(tid);
    if (ix > maxIdx) maxIdx = ix;
  }

  return { viewer: "hv", maxAccessibleIndex: maxIdx };
}

export function exerciseIndexInSortedAsc(
  sortedAsc: { id: number }[],
  exerciseId: number
): number {
  return sortedAsc.findIndex((x) => x.id === exerciseId);
}
