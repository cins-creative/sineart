import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { phongHocJsonResponse, phongHocOptionsResponse } from "@/lib/phong-hoc/mobile-api-cors";
import { parseTeacherIds } from "@/lib/utils/parse-teacher-ids";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function OPTIONS(): NextResponse {
  return phongHocOptionsResponse();
}

/**
 * Giáo viên cập nhật tiến độ học (`ql_quan_ly_hoc_vien.tien_do_hoc`) cho học viên
 * trong lớp mình chủ nhiệm.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return phongHocJsonResponse(
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
    return phongHocJsonResponse({ error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
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
    return phongHocJsonResponse({ error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }
  if (!Number.isFinite(enrollmentQlhvId) || enrollmentQlhvId <= 0) {
    return phongHocJsonResponse(
      { error: "enrollmentQlhvId không hợp lệ.", code: "BAD_ENR" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(teacherHrId) || teacherHrId <= 0) {
    return phongHocJsonResponse(
      { error: "teacherHrId không hợp lệ.", code: "BAD_TEACHER" },
      { status: 400 }
    );
  }
  if (baiTapId !== null && (!Number.isFinite(baiTapId) || baiTapId <= 0)) {
    return phongHocJsonResponse({ error: "baiTapId không hợp lệ.", code: "BAD_BAI" }, { status: 400 });
  }

  const { data: lopRow, error: lopErr } = await sb
    .from("ql_lop_hoc")
    .select("id, teacher, mon_hoc")
    .eq("id", lopHocId)
    .maybeSingle();

  if (lopErr) {
    return phongHocJsonResponse(
      { error: lopErr.message || "Không đọc được lớp.", code: "LOP_QUERY" },
      { status: 500 }
    );
  }
  if (!lopRow) {
    return phongHocJsonResponse({ error: "Không tìm thấy lớp.", code: "NO_LOP" }, { status: 404 });
  }

  const teacherIds = parseTeacherIds((lopRow as { teacher?: unknown }).teacher);
  if (!teacherIds.includes(teacherHrId)) {
    return phongHocJsonResponse(
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
    return phongHocJsonResponse(
      { error: enErr.message || "Lỗi ghi danh.", code: "ENROLL_QUERY" },
      { status: 500 }
    );
  }
  if (!enRow) {
    return phongHocJsonResponse(
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
      return phongHocJsonResponse(
        { error: exErr.message || "Lỗi bài tập.", code: "EX_QUERY" },
        { status: 500 }
      );
    }
    if (!exRow) {
      return phongHocJsonResponse({ error: "Bài tập không tồn tại.", code: "NO_BAI" }, { status: 404 });
    }
    const exMonId = Number((exRow as { mon_hoc?: unknown }).mon_hoc);
    if (Number.isFinite(lopMonId) && Number.isFinite(exMonId) && exMonId !== lopMonId) {
      return phongHocJsonResponse(
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
    return phongHocJsonResponse(
      { error: upErr.message || "Không lưu được tiến độ.", code: "UPDATE" },
      { status: 500 }
    );
  }

  return phongHocJsonResponse({ ok: true, enrollmentQlhvId, baiTapId });
}
