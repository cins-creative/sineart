import type { SupabaseClient } from "@supabase/supabase-js";

/** Ngày lịch VN `YYYY-MM-DD` (UTC+7). */
export function vnCalendarDateString(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  if (!y || !m || !day) {
    return d.toISOString().slice(0, 10);
  }
  return `${y}-${m}-${day}`;
}

export type PhDiemDanhNgayRow = {
  id: string;
  ngay: string;
  hoc_vien_id: number;
  da_vao_phong: boolean;
  da_gui_anh: boolean;
  first_join_at: string | null;
  first_image_at: string | null;
  full_name: string | null;
};

export async function upsertDiemDanhJoin(
  sb: SupabaseClient,
  lopHocId: number,
  hocVienId: number,
  at: Date = new Date()
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ngay = vnCalendarDateString(at);
  const iso = at.toISOString();

  const { data: existing, error: selErr } = await sb
    .from("hv_diem_danh")
    .select("da_gui_anh, first_join_at, first_image_at")
    .eq("lop_hoc_id", lopHocId)
    .eq("ngay", ngay)
    .eq("hoc_vien_id", hocVienId)
    .maybeSingle();

  if (selErr) return { ok: false, error: selErr.message };

  const ex = existing as {
    da_gui_anh?: boolean;
    first_join_at?: string | null;
    first_image_at?: string | null;
  } | null;

  /** Một lần upsert theo UNIQUE(lop_hoc_id, ngay, hoc_vien_id) — tránh UPDATE .eq('id') không khớp kiểu → 0 dòng đổi nhưng vẫn 200 OK. */
  const payload = {
    lop_hoc_id: lopHocId,
    ngay,
    hoc_vien_id: hocVienId,
    da_vao_phong: true,
    da_gui_anh: Boolean(ex?.da_gui_anh),
    first_join_at: ex?.first_join_at ?? iso,
    first_image_at: ex?.first_image_at ?? null,
  };

  const { error: upErr } = await sb.from("hv_diem_danh").upsert(payload, {
    onConflict: "lop_hoc_id,ngay,hoc_vien_id",
  });

  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}

export async function upsertDiemDanhImage(
  sb: SupabaseClient,
  lopHocId: number,
  hocVienId: number,
  at: Date = new Date()
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ngay = vnCalendarDateString(at);
  const iso = at.toISOString();

  const { data: existing, error: selErr } = await sb
    .from("hv_diem_danh")
    .select("da_vao_phong, da_gui_anh, first_join_at, first_image_at")
    .eq("lop_hoc_id", lopHocId)
    .eq("ngay", ngay)
    .eq("hoc_vien_id", hocVienId)
    .maybeSingle();

  if (selErr) return { ok: false, error: selErr.message };

  const ex = existing as {
    da_vao_phong?: boolean;
    da_gui_anh?: boolean;
    first_join_at?: string | null;
    first_image_at?: string | null;
  } | null;

  if (ex?.da_gui_anh) return { ok: true };

  const merged = {
    lop_hoc_id: lopHocId,
    ngay,
    hoc_vien_id: hocVienId,
    da_vao_phong: Boolean(ex?.da_vao_phong),
    da_gui_anh: true,
    first_join_at: ex?.first_join_at ?? null,
    first_image_at: ex?.first_image_at ?? iso,
  };

  const { error: upErr } = await sb.from("hv_diem_danh").upsert(merged, {
    onConflict: "lop_hoc_id,ngay,hoc_vien_id",
  });
  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}

export async function fetchDiemDanhForLopRange(
  sb: SupabaseClient,
  lopHocId: number,
  ngayFrom: string,
  ngayTo: string
): Promise<PhDiemDanhNgayRow[]> {
  const { data, error } = await sb
    .from("hv_diem_danh")
    .select("id, ngay, hoc_vien_id, da_vao_phong, da_gui_anh, first_join_at, first_image_at")
    .eq("lop_hoc_id", lopHocId)
    .gte("ngay", ngayFrom)
    .lte("ngay", ngayTo)
    .order("ngay", { ascending: false })
    .order("hoc_vien_id", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as Record<string, unknown>[];
  const hvIds = [...new Set(rows.map((r) => Number(r.hoc_vien_id)).filter((id) => Number.isFinite(id) && id > 0))];

  const nameById = new Map<number, string | null>();
  /** PostgREST lỗi với `.in("id", [])` — bỏ qua khi không có học viên. */
  if (hvIds.length > 0) {
    const { data: profs, error: pe } = await sb
      .from("ql_thong_tin_hoc_vien")
      .select("id, full_name")
      .in("id", hvIds);
    if (pe) throw pe;
    if (profs) {
      for (const p of profs as { id?: unknown; full_name?: unknown }[]) {
        const id = Number(p.id);
        if (!Number.isFinite(id)) continue;
        nameById.set(id, String(p.full_name ?? "").trim() || null);
      }
    }
  }

  return rows.map((r) => {
    const hid = Number(r.hoc_vien_id);
    return {
      id: String(r.id),
      ngay: String(r.ngay).slice(0, 10),
      hoc_vien_id: hid,
      da_vao_phong: Boolean(r.da_vao_phong),
      da_gui_anh: Boolean(r.da_gui_anh),
      first_join_at: r.first_join_at != null ? String(r.first_join_at) : null,
      first_image_at: r.first_image_at != null ? String(r.first_image_at) : null,
      full_name: nameById.get(hid) ?? null,
    };
  });
}
