import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getGvHrIdFromSyncedCookie } from "@/lib/phong-hoc/gv-session-cookie";
import { getHvIdFromSyncedCookie } from "@/lib/phong-hoc/hv-session-cookie";
import { fetchLopHocMeetRow } from "@/lib/phong-hoc/lop-hoc-meet-fields";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Đọc `meeting_room` + Google Meet cho lớp — **bypass RLS** qua service role,
 * nhưng chỉ khi cookie Phòng học chứng minh HV/GV đúng lớp (anon client hay bị RLS chặn).
 *
 * GET `?lopHocId=123` + cookie `sine_hv_sync` hoặc `sine_gv_sync`.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const lopHocId = Number(url.searchParams.get("lopHocId"));
  if (!Number.isFinite(lopHocId) || lopHocId <= 0) {
    return NextResponse.json({ error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }

  const hvPk = await getHvIdFromSyncedCookie();
  if (hvPk != null && hvPk > 0) {
    const { data: en, error: eEn } = await sb
      .from("ql_quan_ly_hoc_vien")
      .select("id")
      .eq("hoc_vien_id", hvPk)
      .eq("lop_hoc", lopHocId)
      .maybeSingle();
    if (!eEn && en) {
      const row = await fetchLopHocMeetRow(sb, lopHocId);
      if (!row) {
        return NextResponse.json({ error: "Không đọc được lớp.", code: "NO_ROW" }, { status: 404 });
      }
      return NextResponse.json(row, {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      });
    }
  }

  const gvHrId = await getGvHrIdFromSyncedCookie();
  if (gvHrId != null && gvHrId > 0) {
    const { data: lop, error: lopErr } = await sb
      .from("ql_lop_hoc")
      .select("teacher")
      .eq("id", lopHocId)
      .maybeSingle();
    if (!lopErr && lop && Number((lop as { teacher?: unknown }).teacher) === gvHrId) {
      const row = await fetchLopHocMeetRow(sb, lopHocId);
      if (!row) {
        return NextResponse.json({ error: "Không đọc được lớp.", code: "NO_ROW" }, { status: 404 });
      }
      return NextResponse.json(row, {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      });
    }
  }

  return NextResponse.json(
    {
      error: "Chưa xác thực Phòng học (cookie HV/GV) hoặc không thuộc lớp này.",
      code: "FORBIDDEN",
    },
    { status: 403 }
  );
}
