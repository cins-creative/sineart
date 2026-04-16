import type { SupabaseClient } from "@supabase/supabase-js";

export type LopHocMeetRow = {
  meeting_room: string | null;
  url_google_meet: string | null;
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
  const { data, error } = await supabase
    .from("ql_lop_hoc")
    .select("meeting_room, url_google_meet, device")
    .eq("id", lopHocId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as {
    meeting_room?: unknown;
    url_google_meet?: unknown;
    device?: unknown;
  };
  return {
    meeting_room: trimOrNull(row.meeting_room),
    url_google_meet: trimOrNull(row.url_google_meet),
    device: trimOrNull(row.device),
  };
}

export async function patchLopHocGoogleMeetUrl(
  supabase: SupabaseClient,
  lopHocId: number,
  url: string
): Promise<boolean> {
  const { error } = await supabase
    .from("ql_lop_hoc")
    .update({ url_google_meet: url })
    .eq("id", lopHocId);

  return !error;
}
