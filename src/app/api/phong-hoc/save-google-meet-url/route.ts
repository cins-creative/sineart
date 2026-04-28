import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GV lưu link Google Meet cho lớp (`ql_lop_hoc.url_google_meet`).
 * Anon không được UPDATE `ql_lop_hoc` — bắt buộc service role + verify chủ nhiệm.
 *
 * Body: `{ lopHocId, teacherHrId, url }`
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: { lopHocId?: unknown; teacherHrId?: unknown; url?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const lopHocId = Number(body.lopHocId);
  const teacherHrId = Number(body.teacherHrId);
  const url = String(body.url ?? "").trim();

  if (!Number.isFinite(lopHocId) || lopHocId <= 0) {
    return NextResponse.json({ ok: false, error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }
  if (!Number.isFinite(teacherHrId) || teacherHrId <= 0) {
    return NextResponse.json({ ok: false, error: "teacherHrId không hợp lệ.", code: "BAD_TEACHER" }, { status: 400 });
  }
  if (url.length < 8) {
    return NextResponse.json({ ok: false, error: "URL Meet không hợp lệ.", code: "BAD_URL" }, { status: 400 });
  }

  const { data: lopRow, error: lopErr } = await sb
    .from("ql_lop_hoc")
    .select("id, teacher")
    .eq("id", lopHocId)
    .maybeSingle();

  if (lopErr) {
    return NextResponse.json(
      { ok: false, error: lopErr.message || "Không đọc được lớp.", code: "LOP_QUERY" },
      { status: 500 }
    );
  }
  if (!lopRow) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy lớp.", code: "NO_LOP" }, { status: 404 });
  }

  const assignedTeacher = Number((lopRow as { teacher?: unknown }).teacher);
  if (!Number.isFinite(assignedTeacher) || assignedTeacher !== teacherHrId) {
    return NextResponse.json(
      { ok: false, error: "Chỉ giáo viên chủ nhiệm lớp mới được cập nhật link Meet.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const nowIso = new Date().toISOString();
  let { error: upErr } = await sb
    .from("ql_lop_hoc")
    .update({
      url_google_meet: url,
      url_google_meet_set_at: nowIso,
    })
    .eq("id", lopHocId);

  const missingCol =
    upErr &&
    (String(upErr.message).toLowerCase().includes("url_google_meet_set_at") ||
      (upErr as { code?: string }).code === "42703");
  if (missingCol) {
    const retry = await sb.from("ql_lop_hoc").update({ url_google_meet: url }).eq("id", lopHocId);
    upErr = retry.error;
  }

  if (upErr) {
    return NextResponse.json(
      { ok: false, error: upErr.message || "Không lưu được link Meet.", code: "UPDATE" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, url_google_meet_set_at: missingCol ? null : nowIso });
}
