import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isWrongLopFkColumnError } from "@/app/api/phong-hoc/hv-chatbox/lop-column";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Học viên tự lưu bài vào `hv_bai_hoc_vien` (`status = "Chờ xác nhận"`).
 * Body JSON: `{ hocVienId, classId, exerciseId?, photoUrl, baiMau?: boolean }`
 *
 * Session public bằng `localStorage` (`sine_art_session`) — route này không xác thực
 * được trực tiếp, nên validate nội dung để đảm bảo học viên thực sự ghi danh lớp:
 *  1. `hocVienId` là `ql_thong_tin_hoc_vien.id` hợp lệ.
 *  2. `classId` khớp 1 bản ghi `ql_quan_ly_hoc_vien` với `hoc_vien_id = hocVienId`.
 *  3. `exerciseId` (nếu có) tồn tại trong `hv_he_thong_bai_tap`.
 *  4. `photoUrl` là URL http(s).
 *
 * FK lớp trong `hv_bai_hoc_vien` thử `lop_hoc` trước, lỗi schema thì `class` — cùng
 * pattern `isWrongLopFkColumnError` dùng cho `hv_chatbox`.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY.", code: "NO_SERVICE" },
      { status: 503 },
    );
  }

  let body: {
    hocVienId?: unknown;
    classId?: unknown;
    exerciseId?: unknown;
    photoUrl?: unknown;
    baiMau?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON không hợp lệ.", code: "JSON" },
      { status: 400 },
    );
  }

  const hocVienId = Number(body.hocVienId);
  const classId = Number(body.classId);
  const exerciseIdRaw = body.exerciseId;
  const exerciseId =
    exerciseIdRaw == null || exerciseIdRaw === ""
      ? null
      : Number.isFinite(Number(exerciseIdRaw))
        ? Number(exerciseIdRaw)
        : null;
  const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl.trim() : "";
  const baiMau = Boolean(body.baiMau);

  if (!Number.isFinite(hocVienId) || hocVienId <= 0) {
    return NextResponse.json(
      { ok: false, error: "hocVienId không hợp lệ.", code: "BAD_HV" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(classId) || classId <= 0) {
    return NextResponse.json(
      { ok: false, error: "classId không hợp lệ.", code: "BAD_LOP" },
      { status: 400 },
    );
  }
  if (!/^https?:\/\//i.test(photoUrl)) {
    return NextResponse.json(
      { ok: false, error: "photoUrl không hợp lệ.", code: "BAD_PHOTO" },
      { status: 400 },
    );
  }

  const { data: hvRow, error: hvErr } = await sb
    .from("ql_thong_tin_hoc_vien")
    .select("id")
    .eq("id", hocVienId)
    .maybeSingle();
  if (hvErr) {
    return NextResponse.json(
      { ok: false, error: hvErr.message || "Lỗi đọc học viên.", code: "HV_QUERY" },
      { status: 500 },
    );
  }
  if (!hvRow) {
    return NextResponse.json(
      { ok: false, error: "Học viên không tồn tại.", code: "NO_HV" },
      { status: 404 },
    );
  }

  const { data: enRow, error: enErr } = await sb
    .from("ql_quan_ly_hoc_vien")
    .select("id")
    .eq("hoc_vien_id", hocVienId)
    .eq("lop_hoc", classId)
    .maybeSingle();
  if (enErr) {
    return NextResponse.json(
      { ok: false, error: enErr.message || "Lỗi đọc ghi danh.", code: "ENROLL_QUERY" },
      { status: 500 },
    );
  }
  if (!enRow) {
    return NextResponse.json(
      { ok: false, error: "Học viên không học lớp này.", code: "NOT_ENROLLED" },
      { status: 403 },
    );
  }

  if (exerciseId != null) {
    const { data: exRow, error: exErr } = await sb
      .from("hv_he_thong_bai_tap")
      .select("id")
      .eq("id", exerciseId)
      .maybeSingle();
    if (exErr) {
      return NextResponse.json(
        { ok: false, error: exErr.message || "Lỗi đọc bài tập.", code: "EX_QUERY" },
        { status: 500 },
      );
    }
    if (!exRow) {
      return NextResponse.json(
        { ok: false, error: "Bài tập không tồn tại.", code: "NO_EX" },
        { status: 400 },
      );
    }
  }

  const baseRow: Record<string, unknown> = {
    ten_hoc_vien: hocVienId,
    thuoc_bai_tap: exerciseId,
    photo: photoUrl,
    score: null,
    status: "Chờ xác nhận",
    bai_mau: baiMau,
  };

  let insertPayload: Record<string, unknown> = { ...baseRow, lop_hoc: classId };
  let { data: insData, error: insErr } = await sb
    .from("hv_bai_hoc_vien")
    .insert(insertPayload)
    .select("id")
    .limit(1);

  if (insErr && isWrongLopFkColumnError(insErr)) {
    insertPayload = { ...baseRow, class: classId };
    ({ data: insData, error: insErr } = await sb
      .from("hv_bai_hoc_vien")
      .insert(insertPayload)
      .select("id")
      .limit(1));
  }

  if (insErr) {
    return NextResponse.json(
      { ok: false, error: insErr.message || "Không ghi được bài.", code: "INSERT" },
      { status: 500 },
    );
  }

  const id =
    Array.isArray(insData) && insData[0] && typeof (insData[0] as { id?: unknown }).id === "number"
      ? ((insData[0] as { id: number }).id as number)
      : null;
  return NextResponse.json({ ok: true, id });
}
