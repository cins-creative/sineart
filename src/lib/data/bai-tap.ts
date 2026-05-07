import { collectHeThongBaiTapIdsForMon } from "@/lib/data/htbt-linked-to-mon";
import { createClient } from "@/lib/supabase/server";
import { parseHeThongBaiTapSlug, slugifyTenBaiTap } from "@/lib/he-thong-bai-tap/slug";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BaiTap, MucDoQuanTrong } from "@/types/baiTap";

const BAI_TAP_SELECT = `
  id,
  ten_bai_tap,
  bai_so,
  thumbnail,
  noi_dung_liet_ke,
  mo_ta_bai_tap,
  video_bai_giang,
  video_ly_thuyet,
  loi_sai,
  is_visible,
  so_buoi,
  muc_do_quan_trong,
  mon_hoc ( id, ten_mon_hoc, loai_khoa_hoc )
`;

function extractStringArr(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    const s = v == null ? "" : String(v).trim();
    if (s) out.push(s);
  }
  return out;
}

function normalizeMucDo(raw: unknown): MucDoQuanTrong {
  const s = String(raw ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (s.includes("bat buoc") || s === "bb") return "Bắt buộc";
  if (s.includes("tap luyen") || s === "tl") return "Tập luyện";
  if (s.includes("tuy chon") || s.includes("tuỳ chọn") || s.includes("tùy chọn"))
    return "Tuỳ chọn";
  return "Bắt buộc";
}

function extractMonHoc(
  raw: unknown
): { id: number; ten_mon_hoc: string; loai_khoa_hoc: string | null } {
  if (raw == null) return { id: 0, ten_mon_hoc: "Môn học", loai_khoa_hoc: null };
  const o = Array.isArray(raw) ? raw[0] : raw;
  if (o && typeof o === "object" && "id" in o) {
    const row = o as { id?: unknown; ten_mon_hoc?: unknown; loai_khoa_hoc?: unknown };
    const loai = row.loai_khoa_hoc != null ? String(row.loai_khoa_hoc).trim() : "";
    return {
      id: Number(row.id) || 0,
      ten_mon_hoc: String(row.ten_mon_hoc ?? "").trim() || "Môn học",
      loai_khoa_hoc: loai !== "" ? loai : null,
    };
  }
  return { id: 0, ten_mon_hoc: "Môn học", loai_khoa_hoc: null };
}

function mapRow(row: Record<string, unknown>): BaiTap {
  const mon = extractMonHoc(row.mon_hoc);
  const visible =
    row.is_visible === true ||
    row.is_visible === "true" ||
    row.is_visible === 1;
  return {
    id: Number(row.id),
    ten_bai_tap: String(row.ten_bai_tap ?? "").trim() || "Bài tập",
    bai_so: Number(row.bai_so ?? 0) || 0,
    thumbnail:
      row.thumbnail == null || String(row.thumbnail).trim() === ""
        ? null
        : String(row.thumbnail).trim(),
    noi_dung_liet_ke:
      row.noi_dung_liet_ke == null
        ? null
        : String(row.noi_dung_liet_ke),
    mo_ta_bai_tap:
      row.mo_ta_bai_tap == null || String(row.mo_ta_bai_tap).trim() === ""
        ? null
        : String(row.mo_ta_bai_tap),
    video_bai_giang:
      row.video_bai_giang == null
        ? null
        : String(row.video_bai_giang).trim() || null,
    video_ly_thuyet: extractStringArr(row.video_ly_thuyet),
    loi_sai:
      row.loi_sai == null || String(row.loi_sai).trim() === ""
        ? null
        : String(row.loi_sai),
    is_visible: visible,
    so_buoi: Math.max(0, Number(row.so_buoi ?? 0) || 0),
    muc_do_quan_trong: normalizeMucDo(row.muc_do_quan_trong),
    mon_hoc: mon,
  };
}

async function getBaiTapListForMonFallback(
  supabase: SupabaseClient,
  monId: number
): Promise<BaiTap[]> {
  const { data, error } = await supabase
    .from("hv_he_thong_bai_tap")
    .select("id, ten_bai_tap, bai_so, thumbnail, mon_hoc ( id, ten_mon_hoc, loai_khoa_hoc )")
    .eq("mon_hoc", monId)
    .order("bai_so", { ascending: true });

  if (error || !data?.length) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id),
    ten_bai_tap: String(row.ten_bai_tap ?? "").trim() || "Bài tập",
    bai_so: Number(row.bai_so ?? 0) || 0,
    thumbnail:
      row.thumbnail == null || String(row.thumbnail).trim() === ""
        ? null
        : String(row.thumbnail).trim(),
    noi_dung_liet_ke: null,
    mo_ta_bai_tap: null,
    video_bai_giang: null,
    video_ly_thuyet: [],
    loi_sai: null,
    is_visible: false,
    so_buoi: 1,
    muc_do_quan_trong: "Bắt buộc" as MucDoQuanTrong,
    mon_hoc: extractMonHoc(row.mon_hoc),
  }));
}

/**
 * Gom bài tập theo từng môn cho các môn cùng `loai_khoa_hoc` (vd: "Luyện thi").
 * Dùng trang `/khoa-hoc/[slug]` khi khóa tổng hợp (vd: Luyện thi tại lớp) cần
 * render tabs giáo trình cho mỗi môn con (Hình họa / Trang trí màu / Bố cục màu).
 *
 * - `opts.excludeMonId`: loại bỏ mon hiện tại (tránh duplicate khi page tổng hợp).
 * - `opts.hinhThucPreferred`: ưu tiên các môn cùng `hinh_thuc` với khóa đang xem.
 */
export async function getBaiTapGroupsForLoaiKhoaHoc(
  loaiKhoaHoc: string,
  opts?: {
    excludeMonId?: number | null;
    hinhThucPreferred?: string | null;
  }
): Promise<Array<{ monHocId: number; monHocName: string; items: BaiTap[] }>> {
  const supabase = await createClient();
  if (!supabase || !loaiKhoaHoc?.trim()) return [];

  const { data: mons, error } = await supabase
    .from("ql_mon_hoc")
    .select("id, ten_mon_hoc, hinh_thuc, thu_tu_hien_thi")
    .eq("loai_khoa_hoc", loaiKhoaHoc)
    .order("thu_tu_hien_thi", { ascending: true });
  if (error || !mons?.length) return [];

  const rows = mons as Array<{
    id: number;
    ten_mon_hoc: string | null;
    hinh_thuc: string | null;
    thu_tu_hien_thi?: number | null;
  }>;

  const excludeId =
    opts?.excludeMonId != null && Number.isFinite(Number(opts.excludeMonId))
      ? Number(opts.excludeMonId)
      : null;

  const preferred = (opts?.hinhThucPreferred ?? "").trim();
  const normalizeHT = (s: string | null) =>
    (s ?? "")
      .trim()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
  const preferredNorm = normalizeHT(preferred);

  let filtered = rows.filter((m) => m.id != null);
  if (excludeId != null) {
    filtered = filtered.filter((m) => Number(m.id) !== excludeId);
  }
  if (preferredNorm) {
    const matched = filtered.filter(
      (m) => normalizeHT(m.hinh_thuc) === preferredNorm
    );
    if (matched.length >= 1) filtered = matched;
  }

  const groups = await Promise.all(
    filtered.map(async (m) => {
      const id = Number(m.id);
      const name = String(m.ten_mon_hoc ?? "").trim() || "Môn học";
      const items = await getBaiTapListForMon(id);
      return { monHocId: id, monHocName: name, items };
    })
  );

  return groups.filter((g) => g.items.length > 0);
}

/** Bài tập thuộc môn (junction `hv_he_thong_bai_tap_mon_hoc` + cột legacy `mon_hoc`). */
export async function getBaiTapListForMon(monId: number): Promise<BaiTap[]> {
  const supabase = await createClient();
  if (!supabase || !Number.isFinite(monId)) return [];

  let ids: number[];
  try {
    ids = await collectHeThongBaiTapIdsForMon(supabase, monId);
  } catch {
    return getBaiTapListForMonFallback(supabase, monId);
  }

  if (ids.length === 0) return [];

  const CHUNK = 120;
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("hv_he_thong_bai_tap")
      .select(BAI_TAP_SELECT)
      .in("id", slice);
    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[getBaiTapListForMon] full select:", error.message);
      }
      return getBaiTapListForMonFallback(supabase, monId);
    }
    rows.push(...((data ?? []) as Record<string, unknown>[]));
  }

  const mapped = rows.map(mapRow).filter((r) => r.id > 0);
  mapped.sort((a, b) => {
    if (a.bai_so !== b.bai_so) return a.bai_so - b.bai_so;
    return a.id - b.id;
  });
  return mapped;
}

/**
 * Trang công khai `/he-thong-bai-tap/[slug]` — khớp `bai_so` + `slugify(ten_bai_tap)`.
 * Không lọc `is_visible` (danh sách bài & trang chi tiết dùng mọi bản ghi hợp lệ).
 *
 * Disambiguation giữa các môn có cùng `bai_so` + slug tên:
 * - Nếu `opts.monId` > 0: chỉ bài được gán môn đó (junction + cột `mon_hoc`).
 * - Nếu không có `monId`: ưu tiên bản `is_visible`, fallback bản đầu tiên.
 */
export async function getBaiTapByHeThongSlug(
  slugPath: string,
  opts?: { monId?: number | null }
): Promise<BaiTap | null> {
  const parsed = parseHeThongBaiTapSlug(slugPath);
  if (!parsed) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const monHint = Number(opts?.monId);

  let rawRows: Record<string, unknown>[] = [];

  if (Number.isFinite(monHint) && monHint > 0) {
    let linkedIds: number[];
    try {
      linkedIds = await collectHeThongBaiTapIdsForMon(supabase, monHint);
    } catch {
      linkedIds = [];
    }
    if (linkedIds.length === 0) return null;
    const CHUNK = 120;
    for (let i = 0; i < linkedIds.length; i += CHUNK) {
      const slice = linkedIds.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from("hv_he_thong_bai_tap")
        .select(BAI_TAP_SELECT)
        .eq("bai_so", parsed.baiSo)
        .in("id", slice);
      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[getBaiTapByHeThongSlug]", error.message);
        }
        return null;
      }
      rawRows.push(...((data ?? []) as Record<string, unknown>[]));
    }
  } else {
    const { data, error } = await supabase
      .from("hv_he_thong_bai_tap")
      .select(BAI_TAP_SELECT)
      .eq("bai_so", parsed.baiSo);

    if (error || !data?.length) {
      if (process.env.NODE_ENV === "development" && error) {
        console.error("[getBaiTapByHeThongSlug]", error.message);
      }
      return null;
    }
    rawRows = data as Record<string, unknown>[];
  }

  const rows = rawRows.map(mapRow);
  const match = rows.filter((r) => slugifyTenBaiTap(r.ten_bai_tap) === parsed.titleSlug);
  if (match.length === 0) return null;
  const published = match.find((r) => r.is_visible);
  return published ?? match[0] ?? null;
}
