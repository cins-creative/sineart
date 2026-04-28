import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { GV_SYNC_COOKIE } from "@/lib/phong-hoc/gv-session-cookie";
import { HV_SYNC_COOKIE, signHvSessionToken } from "@/lib/phong-hoc/hv-session-cookie";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Đặt cookie httpOnly để SSR trang bài tập nhận diện HV đã vào Phòng học (không dùng Supabase Auth cookie).
 *
 * Body: `{ qlhv_id, lop_hoc_id }` — **`qlhv_id` trong session Phòng học là `ql_quan_ly_hoc_vien.id` (bản ghi ghi danh),**
 * không phải `ql_thong_tin_hoc_vien.id`. Cookie được ký với `hoc_vien_id` để khớp `getHeThongBaiTapAccess`.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY hoặc URL.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: { qlhv_id?: unknown; lop_hoc_id?: unknown };
  try {
    body = (await req.json()) as { qlhv_id?: unknown; lop_hoc_id?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const enrollmentId = Number(body.qlhv_id);
  const lopHocId = Number(body.lop_hoc_id);
  if (!Number.isFinite(enrollmentId) || enrollmentId <= 0 || !Number.isFinite(lopHocId) || lopHocId <= 0) {
    return NextResponse.json(
      { ok: false, error: "qlhv_id / lop_hoc_id không hợp lệ.", code: "BAD_BODY" },
      { status: 400 }
    );
  }

  const { data: enRow, error: eEn } = await sb
    .from("ql_quan_ly_hoc_vien")
    .select("id, hoc_vien_id, lop_hoc")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (eEn || !enRow) {
    return NextResponse.json(
      { ok: false, error: "Không tìm thấy ghi danh.", code: "NO_ENROLLMENT" },
      { status: 403 }
    );
  }

  const enLop = Number((enRow as { lop_hoc?: unknown }).lop_hoc);
  if (!Number.isFinite(enLop) || enLop !== lopHocId) {
    return NextResponse.json(
      { ok: false, error: "Không khớp lớp với ghi danh.", code: "LOP_MISMATCH" },
      { status: 403 }
    );
  }

  const hocVienPk = Number((enRow as { hoc_vien_id?: unknown }).hoc_vien_id);
  if (!Number.isFinite(hocVienPk) || hocVienPk <= 0) {
    return NextResponse.json({ ok: false, error: "hoc_vien_id không hợp lệ.", code: "BAD_HV_FK" }, { status: 403 });
  }

  const { data: hvRow, error: e1 } = await sb
    .from("ql_thong_tin_hoc_vien")
    .select("id")
    .eq("id", hocVienPk)
    .maybeSingle();
  if (e1 || !hvRow) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy học viên.", code: "NO_HV" }, { status: 403 });
  }

  const token = signHvSessionToken(hocVienPk);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấp biên bản ký phiên (HV_SESSION_SIGNING_SECRET hoặc SERVICE_ROLE).", code: "NO_SIGN" },
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
    name: HV_SYNC_COOKIE,
    value: token,
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 14,
  });
  res.cookies.set({
    name: GV_SYNC_COOKIE,
    value: "",
    ...cookieBase,
    maxAge: 0,
  });
  return res;
}
