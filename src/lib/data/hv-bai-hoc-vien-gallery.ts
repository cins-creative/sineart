import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BaiHocVien, GalleryDisplayItem } from "@/types/homepage";

/** Cùng câu `select` như `getHomePageData` — embed đủ để `tenMonHoc` + nhãn bài tập */
export const HV_BAI_HOC_VIEN_GALLERY_SELECT = `
  id, photo, score, bai_mau,
  ten_hoc_vien:ql_thong_tin_hoc_vien(full_name),
  lop_hoc:ql_lop_hoc(class_name),
  thuoc_bai_tap:hv_he_thong_bai_tap(
    ten_bai_tap,
    mon_hoc:ql_mon_hoc(id, ten_mon_hoc)
  )
`;

/** Khi embed lỗi / không trả dòng — chỉ cột gốc, nhãn chung */
function mapMinimalRowsToGalleryItems(
  rows: {
    id: unknown;
    photo: unknown;
    score: unknown;
    bai_mau?: unknown;
  }[]
): GalleryDisplayItem[] {
  return rows.map((row, i) => {
    const raw = row.score;
    const sc =
      raw != null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
    return {
      id: String(row.id),
      photo: typeof row.photo === "string" ? row.photo : null,
      score: sc,
      studentName: "Học viên",
      categoryLabel: "Tác phẩm",
      tenMonHoc: null,
      monHocId: null,
      baiMau: Boolean(row.bai_mau),
      mi: (i % 32) + 1,
    };
  });
}

export function mapHvBaiHocVienRowsToGalleryItems(
  rows: BaiHocVien[]
): GalleryDisplayItem[] {
  return rows.map((row, i) => {
    const monRow = row.thuoc_bai_tap?.mon_hoc;
    const mon = monRow?.ten_mon_hoc ?? "";
    const tap = row.thuoc_bai_tap?.ten_bai_tap;
    const categoryLabel = tap
      ? `${mon}${mon ? " · " : ""}${tap}`.replace(/^ · /, "")
      : mon || "Tác phẩm";
    const rawTen = monRow?.ten_mon_hoc?.trim() ?? "";
    const tenMonHoc = rawTen.length > 0 ? rawTen : null;
    const monHocId =
      monRow != null && monRow.id != null && Number.isFinite(Number(monRow.id))
        ? Number(monRow.id)
        : null;
    const rawSc = row.score;
    const score =
      rawSc != null && rawSc !== "" && Number.isFinite(Number(rawSc))
        ? Number(rawSc)
        : null;
    return {
      id: String(row.id),
      photo: row.photo,
      score,
      studentName: row.ten_hoc_vien?.full_name ?? "Học viên",
      categoryLabel,
      tenMonHoc,
      monHocId,
      baiMau: row.bai_mau,
      mi: (i % 32) + 1,
    };
  });
}

type HvGalleryFetchOptions = {
  /** Chỉ tranh học viên (loại trừ bài mẫu) — dùng gallery trang khóa học */
  onlyStudentWork?: boolean;
};

async function fetchMinimalHvGalleryItems(
  supabase: SupabaseClient,
  limit: number,
  options?: HvGalleryFetchOptions
): Promise<GalleryDisplayItem[]> {
  let q = supabase
    .from("hv_bai_hoc_vien")
    .select("id, photo, score, bai_mau")
    .eq("status", "Hoàn thiện");
  if (options?.onlyStudentWork) {
    q = q.eq("bai_mau", false);
  }
  const { data, error } = await q
    .order("score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data?.length) return [];
  return mapMinimalRowsToGalleryItems(
    data as {
      id: unknown;
      photo: unknown;
      score: unknown;
      bai_mau?: unknown;
    }[]
  );
}

/** Dùng chung trang chủ — ưu tiên embed; lỗi/rỗng thì chỉ `id, photo, score` */
export async function fetchHvBaiHocVienGalleryItems(
  supabase: SupabaseClient,
  limit: number,
  options?: HvGalleryFetchOptions
): Promise<GalleryDisplayItem[]> {
  let q = supabase
    .from("hv_bai_hoc_vien")
    .select(HV_BAI_HOC_VIEN_GALLERY_SELECT)
    .eq("status", "Hoàn thiện");
  if (options?.onlyStudentWork) {
    q = q.eq("bai_mau", false);
  }
  const { data, error } = await q
    .order("score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!error && data?.length) {
    return mapHvBaiHocVienRowsToGalleryItems(
      data as unknown as BaiHocVien[]
    );
  }

  return fetchMinimalHvGalleryItems(supabase, limit, options);
}

/**
 * Lấy tranh học viên đúng môn — join `hv_he_thong_bai_tap!inner` + lọc `mon_hoc`.
 * Tránh lỗi “mất tranh” khi fallback cũ chỉ lấy top N toàn hệ thống rồi lọc theo tên (bỏ sót bài điểm thấp).
 */
async function fetchGalleryItemsByMonHocId(
  supabase: SupabaseClient,
  monId: number,
  limit: number,
  options?: HvGalleryFetchOptions
): Promise<GalleryDisplayItem[]> {
  const selectInner = `
  id, photo, score, bai_mau,
  ten_hoc_vien:ql_thong_tin_hoc_vien(full_name),
  lop_hoc:ql_lop_hoc(class_name),
  thuoc_bai_tap:hv_he_thong_bai_tap!inner(
    ten_bai_tap,
    mon_hoc:ql_mon_hoc(id, ten_mon_hoc)
  )
`;
  let q = supabase
    .from("hv_bai_hoc_vien")
    .select(selectInner)
    .eq("status", "Hoàn thiện")
    .eq("thuoc_bai_tap.mon_hoc", monId);
  if (options?.onlyStudentWork) {
    q = q.eq("bai_mau", false);
  }
  const { data, error } = await q
    .order("score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data?.length) return [];
  return mapHvBaiHocVienRowsToGalleryItems(data as unknown as BaiHocVien[]);
}

function normalizeTenMonHoc(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .normalize("NFC")
    .replace(/\s+/g, " ");
}

export function isLuyenThiTaiLopTitle(s: string): boolean {
  const n = normalizeTenMonHoc(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  return n === "luyen thi tai lop";
}

/**
 * Khớp với tiêu đề khóa (`h1.kd-title`): cùng tên môn (chuẩn hoá) hoặc cùng `ql_mon_hoc.id`.
 */
function itemMatchesCourseTitle(
  item: GalleryDisplayItem,
  displayTitle: string,
  detail: { id: number } | null
): boolean {
  const target = normalizeTenMonHoc(displayTitle);
  if (target.length === 0) return false;
  if (normalizeTenMonHoc(item.tenMonHoc) === target) return true;
  if (
    detail != null &&
    item.monHocId != null &&
    item.monHocId === detail.id
  ) {
    return true;
  }
  return false;
}

/** Pool lớn + lọc theo tên khóa (và id khi có `detail`) — khi không join được theo môn. */
async function galleryFilteredByCourseTitle(
  supabase: SupabaseClient,
  displayTitle: string,
  detail: { id: number } | null,
  cap: number
): Promise<GalleryDisplayItem[]> {
  if (detail != null && Number.isFinite(Number(detail.id))) {
    const byMon = await fetchGalleryItemsByMonHocId(
      supabase,
      Number(detail.id),
      Math.max(cap * 4, 200),
      { onlyStudentWork: true }
    );
    const matched = byMon.filter((i) =>
      itemMatchesCourseTitle(i, displayTitle, detail)
    );
    if (matched.length > 0) return matched.slice(0, cap);
  }

  const items = await fetchHvBaiHocVienGalleryItems(supabase, 1200, {
    onlyStudentWork: true,
  });
  return items
    .filter((i) => itemMatchesCourseTitle(i, displayTitle, detail))
    .slice(0, cap);
}

/**
 * Trang `/khoa-hoc/[slug]`: chỉ hiển thị tranh đúng **tên khóa** trên trang (`displayTitle` = `h1.kd-title`).
 * Ưu tiên lọc DB: `hv_he_thong_bai_tap.mon_hoc` → `hv_bai_hoc_vien.thuoc_bai_tap`; sau đó siết lại theo tên/id.
 */
export async function getStudentGalleryForKhoaHocPage(
  detail: { id: number; tenMonHoc: string } | null,
  displayTitle: string
): Promise<GalleryDisplayItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const cap = 48;
  if (normalizeTenMonHoc(displayTitle).length === 0) {
    return [];
  }

  // Rule riêng: trang "Luyện thi tại lớp" hiển thị toàn bộ tranh học viên.
  if (isLuyenThiTaiLopTitle(displayTitle)) {
    const allItems = await fetchHvBaiHocVienGalleryItems(supabase, cap, {
      onlyStudentWork: true,
    });
    return allItems.slice(0, cap);
  }

  if (!detail) {
    return galleryFilteredByCourseTitle(supabase, displayTitle, null, cap);
  }

  const monId = Number(detail.id);
  if (!Number.isFinite(monId)) {
    return [];
  }

  const mapped = await fetchGalleryItemsByMonHocId(
    supabase,
    monId,
    Math.max(cap * 2, 64),
    { onlyStudentWork: true }
  );
  const filtered = mapped.filter((i) =>
    itemMatchesCourseTitle(i, displayTitle, detail)
  );
  if (filtered.length > 0) {
    return filtered.slice(0, cap);
  }
  return galleryFilteredByCourseTitle(supabase, displayTitle, detail, cap);
}

const HTBT_BAI_TAP_GALLERY_CAP = 120;

/**
 * Trang `/he-thong-bai-tap/[slug]`: tranh đã hoàn thiện gắn đúng bài tập (`thuoc_bai_tap`),
 * gồm cả bài mẫu (`bai_mau`) và tác phẩm học viên (bài tham khảo).
 */
export async function getGalleryItemsForBaiTapExercise(
  baiTapId: number
): Promise<GalleryDisplayItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const id = Number(baiTapId);
  if (!Number.isFinite(id)) return [];

  const { data, error } = await supabase
    .from("hv_bai_hoc_vien")
    .select(HV_BAI_HOC_VIEN_GALLERY_SELECT)
    .eq("status", "Hoàn thiện")
    .eq("thuoc_bai_tap", id)
    .order("score", { ascending: false, nullsFirst: false })
    .limit(HTBT_BAI_TAP_GALLERY_CAP);

  if (error || !data?.length) return [];
  return mapHvBaiHocVienRowsToGalleryItems(data as unknown as BaiHocVien[]);
}
