import type { SupabaseClient } from "@supabase/supabase-js";
import { isSameVnCalendarDay } from "@/lib/utils/date-vn";

export type LopHocMeetRow = {
  meeting_room: string | null;
  url_google_meet: string | null;
  /** Mốc lưu link Meet (Phòng học) — dùng reset «mỗi ngày sau 24:00» theo ngày VN. */
  url_google_meet_set_at: string | null;
  device: string | null;
};

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

/** Một lần đọc `ql_lop_hoc` cho canvas + Meet Google (Framer MeetControl). */
export async function fetchLopHocMeetRow(
  supabase: SupabaseClient,
  lopHocId: number
): Promise<LopHocMeetRow | null> {
  let { data, error } = await supabase
    .from("ql_lop_hoc")
    .select("meeting_room, url_google_meet, url_google_meet_set_at, device")
    .eq("id", lopHocId)
    .maybeSingle();

  const missingSetAtCol =
    error &&
    (String(error.message).toLowerCase().includes("url_google_meet_set_at") ||
      String(error.message).toLowerCase().includes("schema cache") ||
      (error as { code?: string }).code === "42703");
  if (missingSetAtCol) {
    const retry = await supabase
      .from("ql_lop_hoc")
      .select("meeting_room, url_google_meet, device")
      .eq("id", lopHocId)
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) return null;
  const row = data as {
    meeting_room?: unknown;
    url_google_meet?: unknown;
    url_google_meet_set_at?: unknown;
    device?: unknown;
  };
  const setAtRaw = "url_google_meet_set_at" in row ? row.url_google_meet_set_at : undefined;
  const setAt = setAtRaw != null && String(setAtRaw).trim() !== "" ? String(setAtRaw).trim() : null;
  return {
    meeting_room: trimOrNull(row.meeting_room),
    url_google_meet: trimOrNull(row.url_google_meet),
    url_google_meet_set_at: setAt,
    device: trimOrNull(row.device),
  };
}

export async function patchLopHocGoogleMeetUrl(
  supabase: SupabaseClient,
  lopHocId: number,
  url: string
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  let { error } = await supabase
    .from("ql_lop_hoc")
    .update({
      url_google_meet: url,
      url_google_meet_set_at: nowIso,
    })
    .eq("id", lopHocId);

  const missingCol =
    error &&
    (String(error.message).toLowerCase().includes("url_google_meet_set_at") ||
      (error as { code?: string }).code === "42703");
  if (missingCol) {
    const retry = await supabase.from("ql_lop_hoc").update({ url_google_meet: url }).eq("id", lopHocId);
    error = retry.error;
  }

  return !error;
}

/**
 * Học viên chỉ thấy link Meet trong ngày (theo lịch VN) sau khi GV lưu.
 * Không có `set_at` (dữ liệu cũ trước migration): vẫn hiển thị nếu có URL.
 */
export function studentVisibleGoogleMeetUrl(
  url: string | null | undefined,
  setAtIso: string | null | undefined
): string | null {
  const u = trimOrNull(url);
  if (!u) return null;
  if (!setAtIso?.trim()) return u;
  const saved = new Date(setAtIso.trim());
  if (!Number.isFinite(saved.getTime())) return u;
  return isSameVnCalendarDay(saved, new Date()) ? u : null;
}
