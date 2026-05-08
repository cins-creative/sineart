import { isWrongLopFkColumnError } from "@/app/api/phong-hoc/hv-chatbox/lop-column";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchLopCurriculumExercises } from "@/lib/phong-hoc/lop-curriculum";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isHttpsPhotoUrl(s: string): boolean {
  const t = s.trim();
  if (t.length < 12 || t.length > 4096) return false;
  if (!/^https:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

async function resolveAnonymousStudentId(sb: SupabaseClient): Promise<number | null> {
  const raw = process.env.ANONYMOUS_STUDENT_ID?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const exact = ["Ẩn Danh", "Ẩn danh", "ẩn danh", "An Danh"];
  for (const name of exact) {
    const { data } = await sb.from("ql_thong_tin_hoc_vien").select("id").eq("full_name", name).maybeSingle();
    const id = Number((data as { id?: unknown } | null)?.id);
    if (Number.isFinite(id) && id > 0) return id;
  }

  const { data: rows } = await sb
    .from("ql_thong_tin_hoc_vien")
    .select("id")
    .ilike("full_name", "%ẩn danh%")
    .limit(1);

  const id = Number((rows?.[0] as { id?: unknown } | undefined)?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * GV chủ nhiệm thêm bài mẫu vào gallery lớp: `hv_bai_hoc_vien` với học viên ẩn danh,
 * `bai_mau = true`, `status = Hoàn thiện` (để hiện trong tab gallery).
 *
 * Body JSON: `{ lopHocId, teacherHrId, thuocBaiTap, photo }`
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: { lopHocId?: unknown; teacherHrId?: unknown; thuocBaiTap?: unknown; photo?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const lopHocId = Number(body.lopHocId);
  const teacherHrId = Number(body.teacherHrId);
  const thuocBaiTap = Number(body.thuocBaiTap);
  const photo =
    typeof body.photo === "string" ? body.photo.trim() : body.photo == null ? "" : String(body.photo).trim();

  if (!Number.isFinite(lopHocId) || lopHocId <= 0) {
    return NextResponse.json({ ok: false, error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }
  if (!Number.isFinite(teacherHrId) || teacherHrId <= 0) {
    return NextResponse.json({ ok: false, error: "teacherHrId không hợp lệ.", code: "BAD_TEACHER" }, { status: 400 });
  }
  if (!Number.isFinite(thuocBaiTap) || thuocBaiTap <= 0) {
    return NextResponse.json({ ok: false, error: "thuocBaiTap không hợp lệ.", code: "BAD_BAI" }, { status: 400 });
  }
  if (!photo || !isHttpsPhotoUrl(photo)) {
    return NextResponse.json(
      { ok: false, error: "URL ảnh phải là HTTPS hợp lệ.", code: "BAD_PHOTO" },
      { status: 400 }
    );
  }

  const { data: lopForTeacher, error: lopTErr } = await sb
    .from("ql_lop_hoc")
    .select("teacher")
    .eq("id", lopHocId)
    .maybeSingle();

  if (lopTErr) {
    return NextResponse.json(
      { ok: false, error: lopTErr.message || "Không đọc được lớp.", code: "LOP_QUERY" },
      { status: 500 }
    );
  }
  const assignedTeacher = Number((lopForTeacher as { teacher?: unknown } | null)?.teacher);
  if (!Number.isFinite(assignedTeacher) || assignedTeacher !== teacherHrId) {
    return NextResponse.json(
      { ok: false, error: "Chỉ giáo viên chủ nhiệm lớp mới thêm bài mẫu.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { exercises } = await fetchLopCurriculumExercises(sb, lopHocId);
  if (!exercises.some((e) => e.id === thuocBaiTap)) {
    return NextResponse.json(
      { ok: false, error: "Bài tập không thuộc chương trình môn của lớp này.", code: "BAI_NOT_IN_CLASS" },
      { status: 400 }
    );
  }

  const anonId = await resolveAnonymousStudentId(sb);
  if (anonId == null) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Chưa cấu học viên ẩn danh: tạo bản ghi ql_thong_tin_hoc_vien «Ẩn Danh» hoặc đặt biến ANONYMOUS_STUDENT_ID.",
        code: "NO_ANON_STUDENT",
      },
      { status: 503 }
    );
  }

  const baseRow: Record<string, unknown> = {
    ten_hoc_vien: anonId,
    thuoc_bai_tap: thuocBaiTap,
    photo,
    score: null,
    status: "Hoàn thiện",
    bai_mau: true,
  };

  let insertPayload: Record<string, unknown> = { ...baseRow, lop_hoc: lopHocId };
  let { error: insErr } = await sb.from("hv_bai_hoc_vien").insert(insertPayload).select("id").limit(1);

  if (insErr && isWrongLopFkColumnError(insErr)) {
    insertPayload = { ...baseRow, class: lopHocId };
    ({ error: insErr } = await sb.from("hv_bai_hoc_vien").insert(insertPayload).select("id").limit(1));
  }

  if (insErr) {
    return NextResponse.json(
      { ok: false, error: insErr.message || "Không ghi được bài mẫu.", code: "INSERT" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
