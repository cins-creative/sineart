import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { GV_SYNC_COOKIE, signGvSessionToken } from "@/lib/phong-hoc/gv-session-cookie";
import { HV_SYNC_COOKIE } from "@/lib/phong-hoc/hv-session-cookie";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Đặt cookie httpOnly để SSR (vd. `/he-thong-bai-tap/[slug]`) nhận diện GV đã
 * đăng nhập Phòng học (localStorage không đi qua Supabase Auth).
 *
 * Body: `{ hr_id, lop_hoc_id }` — verify `ql_lop_hoc.teacher == hr_id` để đảm
 * bảo GV chủ nhiệm đúng lớp, rồi ký cookie theo `hr_nhan_su.id`.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY hoặc URL.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: { hr_id?: unknown; lop_hoc_id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON không hợp lệ.", code: "JSON" },
      { status: 400 }
    );
  }

  const hrId = Number(body.hr_id);
  const lopHocId = Number(body.lop_hoc_id);
  if (
    !Number.isFinite(hrId) ||
    hrId <= 0 ||
    !Number.isFinite(lopHocId) ||
    lopHocId <= 0
  ) {
    return NextResponse.json(
      { ok: false, error: "hr_id / lop_hoc_id không hợp lệ.", code: "BAD_BODY" },
      { status: 400 }
    );
  }

  const { data: lopRow, error: eLop } = await sb
    .from("ql_lop_hoc")
    .select("id, teacher")
    .eq("id", lopHocId)
    .maybeSingle();
  if (eLop || !lopRow) {
    return NextResponse.json(
      { ok: false, error: "Không tìm thấy lớp.", code: "NO_LOP" },
      { status: 403 }
    );
  }

  const assignedTeacher = Number((lopRow as { teacher?: unknown }).teacher);
  if (!Number.isFinite(assignedTeacher) || assignedTeacher !== hrId) {
    return NextResponse.json(
      { ok: false, error: "GV không phải chủ nhiệm lớp này.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { data: nsRow, error: eNs } = await sb
    .from("hr_nhan_su")
    .select("id")
    .eq("id", hrId)
    .maybeSingle();
  if (eNs || !nsRow) {
    return NextResponse.json(
      { ok: false, error: "Không tìm thấy nhân sự.", code: "NO_HR" },
      { status: 403 }
    );
  }

  const token = signGvSessionToken(hrId);
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "Chưa cấp biên bản ký phiên (HV_SESSION_SIGNING_SECRET hoặc SERVICE_ROLE).",
        code: "NO_SIGN",
      },
      { status: 503 }
    );
  }

  const res = NextResponse.json({ ok: true });
  const cookieBase = {
    path: "/" as const,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  res.cookies.set({
    name: GV_SYNC_COOKIE,
    value: token,
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 14,
  });
  res.cookies.set({
    name: HV_SYNC_COOKIE,
    value: "",
    ...cookieBase,
    maxAge: 0,
  });
  return res;
}
