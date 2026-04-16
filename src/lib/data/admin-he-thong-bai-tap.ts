import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminMonHocOpt = {
  id: number;
  ten_mon_hoc: string;
};

export type AdminBaiTapRow = {
  id: number;
  ten_bai_tap: string;
  bai_so: number | null;
  thumbnail: string | null;
  mon_hoc: number | null;
  ten_mon_hoc: string | null;
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

export type AdminHeThongBaiTapBundle = {
  baiTap: AdminBaiTapRow[];
  monHoc: AdminMonHocOpt[];
};

export async function fetchAdminHeThongBaiTapBundle(supabase: SupabaseClient): Promise<
  { ok: true; data: AdminHeThongBaiTapBundle } | { ok: false; error: string }
> {
  const { data: monRows, error: monErr } = await supabase
    .from("ql_mon_hoc")
    .select("id, ten_mon_hoc")
    .order("ten_mon_hoc", { ascending: true });
  if (monErr) return { ok: false, error: monErr.message };

  const monHoc: AdminMonHocOpt[] = (monRows ?? [])
    .map((r) => {
      const id = Number((r as { id?: unknown }).id);
      const ten_mon_hoc = String((r as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim();
      if (!Number.isFinite(id) || id <= 0 || !ten_mon_hoc) return null;
      return { id, ten_mon_hoc };
    })
    .filter((x): x is AdminMonHocOpt => x != null);

  const monMap = new Map(monHoc.map((m) => [m.id, m.ten_mon_hoc]));

  const { data: btRows, error: btErr } = await supabase
    .from("hv_he_thong_bai_tap")
    .select(
      [
        "id",
        "ten_bai_tap",
        "bai_so",
        "thumbnail",
        "mon_hoc",
        "noi_dung_liet_ke",
        "mo_ta_bai_tap",
        "video_bai_giang",
        "loi_sai",
        "video_ly_thuyet",
        "video_tham_khao",
        "is_visible",
        "so_buoi",
        "muc_do_quan_trong",
      ].join(", ")
    )
    .order("mon_hoc", { ascending: true, nullsFirst: false })
    .order("bai_so", { ascending: true, nullsFirst: false });

  if (btErr) return { ok: false, error: btErr.message };

  const asTextArr = (v: unknown): string[] | null => {
    if (v == null) return null;
    if (Array.isArray(v)) {
      const out = v.map((x) => String(x).trim()).filter(Boolean);
      return out.length ? out : null;
    }
    return null;
  };

  const baiTap: AdminBaiTapRow[] = (btRows ?? []).map((raw) => {
    const r = raw as {
      id: unknown;
      ten_bai_tap?: unknown;
      bai_so?: unknown;
      thumbnail?: unknown;
      mon_hoc?: unknown;
      noi_dung_liet_ke?: unknown;
      mo_ta_bai_tap?: unknown;
      video_bai_giang?: unknown;
      loi_sai?: unknown;
      video_ly_thuyet?: unknown;
      video_tham_khao?: unknown;
      is_visible?: unknown;
      so_buoi?: unknown;
      muc_do_quan_trong?: unknown;
    };
    const id = Number(r.id);
    const monId = r.mon_hoc != null && r.mon_hoc !== "" ? Number(r.mon_hoc) : null;
    const vis =
      r.is_visible === true || r.is_visible === "true" || r.is_visible === 1 || r.is_visible === "t";
    return {
      id: Number.isFinite(id) && id > 0 ? id : 0,
      ten_bai_tap: String(r.ten_bai_tap ?? "").trim() || "—",
      bai_so: r.bai_so != null && r.bai_so !== "" && Number.isFinite(Number(r.bai_so)) ? Number(r.bai_so) : null,
      thumbnail: r.thumbnail != null && String(r.thumbnail).trim() ? String(r.thumbnail).trim() : null,
      mon_hoc: monId != null && Number.isFinite(monId) && monId > 0 ? monId : null,
      ten_mon_hoc: monId != null && monId > 0 ? monMap.get(monId) ?? null : null,
      noi_dung_liet_ke:
        r.noi_dung_liet_ke != null && String(r.noi_dung_liet_ke).trim() ? String(r.noi_dung_liet_ke) : null,
      mo_ta_bai_tap: r.mo_ta_bai_tap != null && String(r.mo_ta_bai_tap).trim() ? String(r.mo_ta_bai_tap) : null,
      video_bai_giang:
        r.video_bai_giang != null && String(r.video_bai_giang).trim() ? String(r.video_bai_giang).trim() : null,
      loi_sai: r.loi_sai != null && String(r.loi_sai).trim() ? String(r.loi_sai).trim() : null,
      video_ly_thuyet: asTextArr(r.video_ly_thuyet),
      video_tham_khao: asTextArr(r.video_tham_khao),
      is_visible: vis,
      so_buoi:
        r.so_buoi != null && r.so_buoi !== "" && Number.isFinite(Number(r.so_buoi)) ? Number(r.so_buoi) : null,
      muc_do_quan_trong:
        r.muc_do_quan_trong != null && String(r.muc_do_quan_trong).trim()
          ? String(r.muc_do_quan_trong).trim()
          : null,
    };
  });

  return { ok: true, data: { baiTap: baiTap.filter((r) => r.id > 0), monHoc } };
}
