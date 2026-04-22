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
  mon_hoc ( id, ten_mon_hoc )
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
): { id: number; ten_mon_hoc: string } {
  if (raw == null) return { id: 0, ten_mon_hoc: "Môn học" };
  const o = Array.isArray(raw) ? raw[0] : raw;
  if (o && typeof o === "object" && "id" in o) {
    const row = o as { id?: unknown; ten_mon_hoc?: unknown };
    return {
      id: Number(row.id) || 0,
      ten_mon_hoc: String(row.ten_mon_hoc ?? "").trim() || "Môn học",
    };
  }
  return { id: 0, ten_mon_hoc: "Môn học" };
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
    .select("id, ten_bai_tap, bai_so, thumbnail, mon_hoc ( id, ten_mon_hoc )")
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

/** Bài tập theo `hv_he_thong_bai_tap.mon_hoc` — dùng trang chi tiết khóa học. */
export async function getBaiTapListForMon(monId: number): Promise<BaiTap[]> {
  const supabase = await createClient();
  if (!supabase || !Number.isFinite(monId)) return [];

  const { data, error } = await supabase
    .from("hv_he_thong_bai_tap")
    .select(BAI_TAP_SELECT)
    .eq("mon_hoc", monId)
    .order("bai_so", { ascending: true });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[getBaiTapListForMon] full select:", error.message);
    }
    return getBaiTapListForMonFallback(supabase, monId);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map(mapRow).filter((r) => r.id > 0);
}

/**
 * Trang công khai `/he-thong-bai-tap/[slug]` — khớp `bai_so` + `slugify(ten_bai_tap)`.
 * Không lọc `is_visible` (danh sách bài & trang chi tiết dùng mọi bản ghi hợp lệ).
 *
 * Disambiguation giữa các môn có cùng `bai_so` + slug tên:
 * - Nếu `opts.monId` > 0: chỉ trả bản ghi khớp đúng `mon_hoc`.
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

  let query = supabase
    .from("hv_he_thong_bai_tap")
    .select(BAI_TAP_SELECT)
    .eq("bai_so", parsed.baiSo);

  const monHint = Number(opts?.monId);
  if (Number.isFinite(monHint) && monHint > 0) {
    query = query.eq("mon_hoc", monHint);
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    if (process.env.NODE_ENV === "development" && error) {
      console.error("[getBaiTapByHeThongSlug]", error.message);
    }
    return null;
  }

  const rows = (data as Record<string, unknown>[]).map(mapRow);
  const match = rows.filter((r) => slugifyTenBaiTap(r.ten_bai_tap) === parsed.titleSlug);
  if (match.length === 0) return null;
  const published = match.find((r) => r.is_visible);
  return published ?? match[0] ?? null;
}
