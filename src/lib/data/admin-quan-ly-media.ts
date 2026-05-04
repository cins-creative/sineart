import type { SupabaseClient } from "@supabase/supabase-js";

export const MKT_MEDIA_TABLE = "mkt_quan_ly_media";

/** Một dòng `mkt_quan_ly_media` — dùng cho admin Quản lý media. */
export type MktMediaProjectRow = {
  id: number;
  project_name: string;
  project_type: string | null;
  type: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  brief: string | null;
  minh_hoa: string[] | null;
  nguoi_tao: number | null;
  nguoi_lam: number[] | null;
};

/** `hr_nhan_su.id` → `full_name` — key dạng chuỗi để serialize props client an toàn. */
export type StaffNameById = Record<string, string>;

/** `hr_nhan_su.id` → `avatar` (URL), null nếu không có. */
export type StaffAvatarById = Record<string, string | null>;

const SELECT =
  "id, project_name, project_type, type, status, start_date, end_date, brief, minh_hoa, nguoi_tao, nguoi_lam";

/** Lần đầu vào trang chỉ fetch tối đa nhiêu dòng — phần còn lại tải sau (client + server action). */
export const MEDIA_INITIAL_FETCH_LIMIT = 60;

export async function fetchMktQuanLyMediaRows(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: MktMediaProjectRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from(MKT_MEDIA_TABLE)
    .select(SELECT)
    .order("id", { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data as MktMediaProjectRow[]) ?? [] };
}

/** Cửa sổ phân trang theo `id` giảm dần — `rangeFrom`/`rangeTo` bao gồm (Supabase range inclusive). */
export async function fetchMktQuanLyMediaRowsWindow(
  supabase: SupabaseClient,
  rangeFrom: number,
  rangeTo: number,
): Promise<{ ok: true; rows: MktMediaProjectRow[] } | { ok: false; error: string }> {
  if (rangeFrom < 0 || rangeTo < rangeFrom) {
    return { ok: true, rows: [] };
  }
  const { data, error } = await supabase
    .from(MKT_MEDIA_TABLE)
    .select(SELECT)
    .order("id", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data as MktMediaProjectRow[]) ?? [] };
}

/** Mọi dòng từ offset trở đi (phục vụ tải nền sau trang đầu). */
export async function fetchMktQuanLyMediaRowsFromOffset(
  supabase: SupabaseClient,
  startOffset: number,
): Promise<{ ok: true; rows: MktMediaProjectRow[] } | { ok: false; error: string }> {
  if (startOffset < 0) return { ok: true, rows: [] };
  const out: MktMediaProjectRow[] = [];
  const PAGE = 500;
  let from = startOffset;
  for (;;) {
    const { data, error } = await supabase
      .from(MKT_MEDIA_TABLE)
      .select(SELECT)
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const chunk = (data as MktMediaProjectRow[]) ?? [];
    if (!chunk.length) break;
    out.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return { ok: true, rows: out };
}

export function collectStaffIdsFromMediaProjects(rows: MktMediaProjectRow[]): number[] {
  const s = new Set<number>();
  for (const p of rows) {
    const nt = p.nguoi_tao;
    if (nt != null && Number.isFinite(nt) && nt > 0) s.add(nt);
    for (const id of p.nguoi_lam ?? []) {
      const n = Number(id);
      if (Number.isFinite(n) && n > 0) s.add(n);
    }
  }
  return [...s];
}

/** Chỉ đọc nhân sự cần hiển thị cho batch dự án — nhẹ hơn load toàn bộ `hr_nhan_su`. */
export async function fetchHrNhanSuByIds(
  supabase: SupabaseClient,
  ids: number[],
): Promise<{ ok: true; map: StaffNameById; avatarById: StaffAvatarById } | { ok: false; error: string }> {
  const unique = [...new Set(ids)].filter((id) => Number.isFinite(id) && id > 0);
  if (!unique.length) return { ok: true, map: {}, avatarById: {} };

  const map: StaffNameById = {};
  const avatarById: StaffAvatarById = {};
  const CHUNK = 120;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("hr_nhan_su").select("id, full_name, avatar").in("id", chunk);
    if (error) return { ok: false, error: error.message };
    for (const row of (data as { id: number; full_name: string | null; avatar?: string | null }[]) ?? []) {
      const name = row.full_name?.trim();
      map[String(row.id)] = name && name.length > 0 ? name : `Nhân sự #${row.id}`;
      const av = row.avatar;
      avatarById[String(row.id)] =
        typeof av === "string" && av.trim().length > 0 ? av.trim() : null;
    }
  }
  return { ok: true, map, avatarById };
}

/** Danh bạ nhân sự tối thiểu — join `nguoi_tao` / `nguoi_lam` với `hr_nhan_su`. */
export async function fetchHrNhanSuStaffNameById(
  supabase: SupabaseClient,
): Promise<{ ok: true; map: StaffNameById; avatarById: StaffAvatarById } | { ok: false; error: string }> {
  const { data, error } = await supabase.from("hr_nhan_su").select("id, full_name, avatar");
  if (error) return { ok: false, error: error.message };
  const map: StaffNameById = {};
  const avatarById: StaffAvatarById = {};
  for (const row of (data as { id: number; full_name: string | null; avatar?: string | null }[]) ?? []) {
    const name = row.full_name?.trim();
    map[String(row.id)] = name && name.length > 0 ? name : `Nhân sự #${row.id}`;
    const av = row.avatar;
    avatarById[String(row.id)] =
      typeof av === "string" && av.trim().length > 0 ? av.trim() : null;
  }
  return { ok: true, map, avatarById };
}

export type HrNhanSuStaffOption = { id: number; full_name: string };

/** Danh sách nhân sự cho form chọn người làm. */
export async function fetchHrNhanSuStaffOptions(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: HrNhanSuStaffOption[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.from("hr_nhan_su").select("id, full_name").order("full_name");
  if (error) return { ok: false, error: error.message };
  const rows: HrNhanSuStaffOption[] = ((data as { id: number; full_name: string | null }[]) ?? []).map((r) => ({
    id: r.id,
    full_name: r.full_name?.trim() || `Nhân sự #${r.id}`,
  }));
  return { ok: true, rows };
}

function unwrapJoinMedia<T extends Record<string, unknown>>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] as T) ?? null : v;
}

/** Ban Marketing hoặc ban có tên chứa «media» (không phân biệt hoa thường). */
function isMarketingOrMediaBanName(tenBan: string): boolean {
  const s = tenBan.trim();
  if (!s) return false;
  const sl = s.toLowerCase();
  return sl.includes("marketing") || sl.includes("media");
}

/** Chỉ ban có tên chứa «media» — dùng filter timeline theo người làm. */
function isMediaBanName(tenBan: string): boolean {
  return tenBan.trim().toLowerCase().includes("media");
}

/**
 * `hr_nhan_su` có phòng thuộc ban Marketing hoặc Media (qua `hr_nhan_su_phong` → `hr_phong` → `hr_ban.ten_ban`).
 * Dùng cho chọn người làm dự án media.
 */
export async function fetchMarketingMediaStaffNhanSuIds(supabase: SupabaseClient): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("hr_nhan_su_phong")
    .select("nhan_su_id, hr_phong!inner(ban, hr_ban!inner(ten_ban))");

  if (error || !data?.length) return new Set();

  const ids = new Set<number>();
  for (const row of data as { nhan_su_id?: unknown; hr_phong?: unknown }[]) {
    const ph = unwrapJoinMedia(row.hr_phong as Record<string, unknown> | Record<string, unknown>[] | null);
    if (!ph) continue;
    const banRaw = (ph as { hr_ban?: unknown }).hr_ban;
    const ban = unwrapJoinMedia(banRaw as Record<string, unknown> | Record<string, unknown>[] | null);
    const tenBan =
      ban && typeof (ban as { ten_ban?: unknown }).ten_ban === "string"
        ? String((ban as { ten_ban: string }).ten_ban).trim()
        : "";
    if (!isMarketingOrMediaBanName(tenBan)) continue;
    const nid = Number(row.nhan_su_id);
    if (Number.isFinite(nid) && nid > 0) ids.add(nid);
  }
  return ids;
}

/** Chỉ nhân sự thuộc ban Marketing / Media (nếu lọc được; nếu không có ID nào thì trả về toàn bộ như fallback). */
export async function fetchMarketingMediaStaffOptions(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: HrNhanSuStaffOption[] } | { ok: false; error: string }> {
  const allRes = await fetchHrNhanSuStaffOptions(supabase);
  if (!allRes.ok) return allRes;
  const idSet = await fetchMarketingMediaStaffNhanSuIds(supabase);
  if (idSet.size === 0) return { ok: true, rows: allRes.rows };
  return { ok: true, rows: allRes.rows.filter((r) => idSet.has(r.id)) };
}

/** Nhân sự có phòng thuộc ban tên chứa «Media». */
export async function fetchMediaBanStaffNhanSuIds(supabase: SupabaseClient): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("hr_nhan_su_phong")
    .select("nhan_su_id, hr_phong!inner(ban, hr_ban!inner(ten_ban))");

  if (error || !data?.length) return new Set();

  const ids = new Set<number>();
  for (const row of data as { nhan_su_id?: unknown; hr_phong?: unknown }[]) {
    const ph = unwrapJoinMedia(row.hr_phong as Record<string, unknown> | Record<string, unknown>[] | null);
    if (!ph) continue;
    const banRaw = (ph as { hr_ban?: unknown }).hr_ban;
    const ban = unwrapJoinMedia(banRaw as Record<string, unknown> | Record<string, unknown>[] | null);
    const tenBan =
      ban && typeof (ban as { ten_ban?: unknown }).ten_ban === "string"
        ? String((ban as { ten_ban: string }).ten_ban).trim()
        : "";
    if (!isMediaBanName(tenBan)) continue;
    const nid = Number(row.nhan_su_id);
    if (Number.isFinite(nid) && nid > 0) ids.add(nid);
  }
  return ids;
}

export async function fetchMediaBanStaffOptions(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: HrNhanSuStaffOption[] } | { ok: false; error: string }> {
  const allRes = await fetchHrNhanSuStaffOptions(supabase);
  if (!allRes.ok) return allRes;
  const idSet = await fetchMediaBanStaffNhanSuIds(supabase);
  if (idSet.size === 0) return { ok: true, rows: [] };
  return { ok: true, rows: allRes.rows.filter((r) => idSet.has(r.id)) };
}
