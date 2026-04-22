import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Giáo viên cập nhật tiến độ học (`ql_quan_ly_hoc_vien.tien_do_hoc`) cho học viên
 * trong lớp mình chủ nhiệm.
 *
 * RLS bảng `ql_quan_ly_hoc_vien` chỉ cho anon SELECT — bắt buộc đi qua service role
 * và tự xác thực: `teacherHrId` phải trùng `ql_lop_hoc.teacher`, `enrollmentQlhvId`
 * phải thuộc đúng `lopHocId`, `baiTapId` (nếu có) phải cùng môn với lớp.
 *
 * Body: `{ lopHocId, enrollmentQlhvId, teacherHrId, baiTapId }` — `baiTapId` = null
 * để xoá tiến độ.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: {
    lopHocId?: unknown;
    enrollmentQlhvId?: unknown;
    teacherHrId?: unknown;
    baiTapId?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const lopHocId = Number(body.lopHocId);
  const enrollmentQlhvId = Number(body.enrollmentQlhvId);
  const teacherHrId = Number(body.teacherHrId);
  const rawBai = body.baiTapId;
  const baiTapId =
    rawBai === null || rawBai === undefined || rawBai === ""
      ? null
      : Number.isFinite(Number(rawBai))
        ? Number(rawBai)
        : NaN;

  if (!Number.isFinite(lopHocId) || lopHocId <= 0) {
    return NextResponse.json({ error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }
  if (!Number.isFinite(enrollmentQlhvId) || enrollmentQlhvId <= 0) {
    return NextResponse.json(
      { error: "enrollmentQlhvId không hợp lệ.", code: "BAD_ENR" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(teacherHrId) || teacherHrId <= 0) {
    return NextResponse.json(
      { error: "teacherHrId không hợp lệ.", code: "BAD_TEACHER" },
      { status: 400 }
    );
  }
  if (baiTapId !== null && (!Number.isFinite(baiTapId) || baiTapId <= 0)) {
    return NextResponse.json({ error: "baiTapId không hợp lệ.", code: "BAD_BAI" }, { status: 400 });
  }

  const { data: lopRow, error: lopErr } = await sb
    .from("ql_lop_hoc")
    .select("id, teacher, mon_hoc")
    .eq("id", lopHocId)
    .maybeSingle();

  if (lopErr) {
    return NextResponse.json(
      { error: lopErr.message || "Không đọc được lớp.", code: "LOP_QUERY" },
      { status: 500 }
    );
  }
  if (!lopRow) {
    return NextResponse.json({ error: "Không tìm thấy lớp.", code: "NO_LOP" }, { status: 404 });
  }
  const assignedTeacher = Number((lopRow as { teacher?: unknown }).teacher);
  if (!Number.isFinite(assignedTeacher) || assignedTeacher !== teacherHrId) {
    return NextResponse.json(
      { error: "Chỉ giáo viên chủ nhiệm lớp mới được cập nhật tiến độ.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }
  const lopMonId = Number((lopRow as { mon_hoc?: unknown }).mon_hoc);

  const { data: enRow, error: enErr } = await sb
    .from("ql_quan_ly_hoc_vien")
    .select("id, lop_hoc")
    .eq("id", enrollmentQlhvId)
    .eq("lop_hoc", lopHocId)
    .maybeSingle();

  if (enErr) {
    return NextResponse.json(
      { error: enErr.message || "Lỗi ghi danh.", code: "ENROLL_QUERY" },
      { status: 500 }
    );
  }
  if (!enRow) {
    return NextResponse.json(
      { error: "Học viên không thuộc lớp này.", code: "NO_ENROLL" },
      { status: 403 }
    );
  }

  if (baiTapId != null) {
    const { data: exRow, error: exErr } = await sb
      .from("hv_he_thong_bai_tap")
      .select("id, mon_hoc")
      .eq("id", baiTapId)
      .maybeSingle();
    if (exErr) {
      return NextResponse.json(
        { error: exErr.message || "Lỗi bài tập.", code: "EX_QUERY" },
        { status: 500 }
      );
    }
    if (!exRow) {
      return NextResponse.json(
        { error: "Bài tập không tồn tại.", code: "NO_BAI" },
        { status: 404 }
      );
    }
    const exMonId = Number((exRow as { mon_hoc?: unknown }).mon_hoc);
    if (Number.isFinite(lopMonId) && Number.isFinite(exMonId) && exMonId !== lopMonId) {
      return NextResponse.json(
        { error: "Bài tập không thuộc môn của lớp.", code: "BAI_WRONG_MON" },
        { status: 400 }
      );
    }
  }

  const { error: upErr } = await sb
    .from("ql_quan_ly_hoc_vien")
    .update({ tien_do_hoc: baiTapId })
    .eq("id", enrollmentQlhvId);

  if (upErr) {
    return NextResponse.json(
      { error: upErr.message || "Không lưu được tiến độ.", code: "UPDATE" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, enrollmentQlhvId, baiTapId });
}
