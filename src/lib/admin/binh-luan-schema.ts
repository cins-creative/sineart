/**
 * Schema + helper dùng chung cho CRUD `ql_danh_gia` phía admin.
 * Không đụng DB — chỉ normalize input/output.
 *
 * Bảng chia sẻ:
 *  - Homepage `<ReviewsSection />` đọc `hien_thi = true` qua `src/lib/data/home.ts`.
 */

export const DANH_GIA_NGUON_OPTIONS = [
  { value: "Google Maps", label: "Google Maps" },
  { value: "Facebook", label: "Facebook" },
  { value: "Tự gửi", label: "Học viên tự gửi" },
  { value: "Khác", label: "Khác" },
] as const;

export type AdminDanhGiaListRow = {
  id: number;
  created_at: string;
  ten_nguoi: string | null;
  avatar_url: string | null;
  noi_dung: string | null;
  so_sao: number | null;
  thoi_gian_hoc: string | null;
  nguon: string | null;
  hien_thi: boolean | null;
  khoa_hoc_id: number | null;
};

export type MonHocLookupRow = { id: number; ten: string };

/** Cột SELECT cho bảng liệt kê. Không nest `ql_mon_hoc` ở đây vì Supabase REST join hay fail với view — fetch tên môn riêng. */
export const DANH_GIA_COLS =
  "id, created_at, ten_nguoi, avatar_url, noi_dung, so_sao, thoi_gian_hoc, nguon, hien_thi, khoa_hoc";

export function mapRowToListItem(raw: Record<string, unknown>): AdminDanhGiaListRow {
  return {
    id: Number(raw.id),
    created_at: String(raw.created_at ?? ""),
    ten_nguoi: asStrOrNull(raw.ten_nguoi),
    avatar_url: asStrOrNull(raw.avatar_url),
    noi_dung: asStrOrNull(raw.noi_dung),
    so_sao: asIntOrNull(raw.so_sao),
    thoi_gian_hoc: asStrOrNull(raw.thoi_gian_hoc),
    nguon: asStrOrNull(raw.nguon),
    hien_thi: typeof raw.hien_thi === "boolean" ? raw.hien_thi : null,
    khoa_hoc_id: asIntOrNull(raw.khoa_hoc),
  };
}

export type UpsertPatch = {
  ten_nguoi?: string;
  avatar_url?: string | null;
  noi_dung?: string;
  so_sao?: number;
  thoi_gian_hoc?: string | null;
  nguon?: string;
  hien_thi?: boolean;
  khoa_hoc?: number | null;
};

/** Chỉ giữ các field có mặt trong body và đã normalize. */
export function normalizeUpsert(body: Record<string, unknown>): UpsertPatch {
  const out: UpsertPatch = {};

  if ("ten_nguoi" in body) {
    const v = asStrOrNull(body.ten_nguoi);
    if (v) out.ten_nguoi = v;
  }
  if ("avatar_url" in body) {
    const v = asStrOrNull(body.avatar_url);
    out.avatar_url = v;
  }
  if ("noi_dung" in body) {
    const v = asStrOrNull(body.noi_dung);
    if (v) out.noi_dung = v;
  }
  if ("so_sao" in body) {
    const n = asIntOrNull(body.so_sao);
    if (n != null) out.so_sao = Math.min(5, Math.max(1, n));
  }
  if ("thoi_gian_hoc" in body) {
    out.thoi_gian_hoc = asStrOrNull(body.thoi_gian_hoc);
  }
  if ("nguon" in body) {
    const v = asStrOrNull(body.nguon);
    if (v) out.nguon = v;
  }
  if ("hien_thi" in body) {
    out.hien_thi = !!body.hien_thi;
  }
  if ("khoa_hoc" in body) {
    const n = asIntOrNull(body.khoa_hoc);
    out.khoa_hoc = n;
  }

  return out;
}

function asStrOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function asIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
