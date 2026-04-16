import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isWrongLopFkColumnError } from "@/app/api/phong-hoc/hv-chatbox/lop-column";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isPostgresUniqueViolation(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  const m = (err.message ?? "").toLowerCase();
  return m.includes("duplicate key") && m.includes("unique constraint");
}

/**
 * Đã có bản ghi “chờ xác nhận” cùng ảnh / HV / bài / lớp — idempotent (double-click, F5 lặp).
 */
async function findPendingChatSaveDuplicate(
  sb: SupabaseClient,
  params: { hocVienPk: number; photo: string; lopHocId: number; thuocBaiTap: number }
): Promise<{ found: boolean; queryError?: string }> {
  const { hocVienPk, photo, lopHocId, thuocBaiTap } = params;
  const build = (col: "lop_hoc" | "class") =>
    sb
      .from("hv_bai_hoc_vien")
      .select("id")
      .eq("ten_hoc_vien", hocVienPk)
      .eq("photo", photo)
      .eq("thuoc_bai_tap", thuocBaiTap)
      .eq("status", "Chờ xác nhận")
      .eq(col, lopHocId)
      .maybeSingle();

  let { data, error } = await build("lop_hoc");
  if (error && isWrongLopFkColumnError(error)) {
    ({ data, error } = await build("class"));
    if (error) return { found: false, queryError: error.message };
    return { found: data != null };
  }
  if (error) return { found: false, queryError: error.message };
  if (data) return { found: true };

  const r2 = await build("class");
  if (r2.error && !isWrongLopFkColumnError(r2.error)) {
    return { found: false, queryError: r2.error.message };
  }
  if (r2.error) return { found: false };
  return { found: r2.data != null };
}

/**
 * Giáo viên lưu ảnh từ chat vào `hv_bai_hoc_vien` (gallery — chờ xác nhận).
 * Body: `{ lopHocId, enrollmentQlhvId, photo, teacherHrId }` — `enrollmentQlhvId` = `ql_quan_ly_hoc_vien.id` (trùng `hv_chatbox.name`), `teacherHrId` = `hr_nhan_su.id` (giáo viên chủ nhiệm lớp).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: { lopHocId?: unknown; enrollmentQlhvId?: unknown; photo?: unknown; teacherHrId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const lopHocId = Number(body.lopHocId);
  const enrollmentQlhvId = Number(body.enrollmentQlhvId);
  const teacherHrId = Number(body.teacherHrId);
  const photo =
    typeof body.photo === "string" ? body.photo.trim() : body.photo == null ? "" : String(body.photo).trim();

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
    return NextResponse.json({ error: "teacherHrId không hợp lệ.", code: "BAD_TEACHER" }, { status: 400 });
  }
  if (!photo) {
    return NextResponse.json({ error: "Thiếu URL ảnh.", code: "BAD_PHOTO" }, { status: 400 });
  }

  const { data: lopForTeacher, error: lopTErr } = await sb
    .from("ql_lop_hoc")
    .select("teacher")
    .eq("id", lopHocId)
    .maybeSingle();

  if (lopTErr) {
    return NextResponse.json(
      { error: lopTErr.message || "Không đọc được lớp.", code: "LOP_QUERY" },
      { status: 500 }
    );
  }
  const assignedTeacher = Number((lopForTeacher as { teacher?: unknown } | null)?.teacher);
  if (!Number.isFinite(assignedTeacher) || assignedTeacher !== teacherHrId) {
    return NextResponse.json(
      { error: "Chỉ giáo viên chủ nhiệm lớp mới được lưu bài từ chat.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { data: enRow, error: eEn } = await sb
    .from("ql_quan_ly_hoc_vien")
    .select("id, hoc_vien_id, tien_do_hoc")
    .eq("id", enrollmentQlhvId)
    .eq("lop_hoc", lopHocId)
    .maybeSingle();

  if (eEn) {
    return NextResponse.json(
      { error: eEn.message || "Lỗi ghi danh.", code: "ENROLL_QUERY" },
      { status: 500 }
    );
  }
  if (!enRow) {
    return NextResponse.json({ error: "Không tìm thấy ghi danh lớp.", code: "NO_ENROLL" }, { status: 403 });
  }

  const hocVienPk = Number((enRow as { hoc_vien_id?: unknown }).hoc_vien_id);
  if (!Number.isFinite(hocVienPk) || hocVienPk <= 0) {
    return NextResponse.json({ error: "hoc_vien_id không hợp lệ.", code: "BAD_HV" }, { status: 400 });
  }

  let thuocBaiTap: number | null = null;
  const tdRaw = (enRow as { tien_do_hoc?: unknown }).tien_do_hoc;
  const td = tdRaw != null && tdRaw !== "" && Number.isFinite(Number(tdRaw)) ? Number(tdRaw) : null;
  if (td != null) {
    const { data: exOk } = await sb.from("hv_he_thong_bai_tap").select("id").eq("id", td).maybeSingle();
    if (exOk) thuocBaiTap = td;
  }

  let tenBaiTapLabel = "";
  if (thuocBaiTap == null) {
    const { data: lop } = await sb.from("ql_lop_hoc").select("mon_hoc").eq("id", lopHocId).maybeSingle();
    const monId = Number((lop as { mon_hoc?: unknown } | null)?.mon_hoc);
    if (!Number.isFinite(monId)) {
      return NextResponse.json(
        { error: "Lớp chưa gán môn — không chọn được bài tập.", code: "NO_MON" },
        { status: 400 }
      );
    }
    const { data: firstBai } = await sb
      .from("hv_he_thong_bai_tap")
      .select("id, ten_bai_tap")
      .eq("mon_hoc", monId)
      .order("bai_so", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!firstBai) {
      return NextResponse.json(
        { error: "Chưa có bài tập cho môn của lớp.", code: "NO_BAI" },
        { status: 400 }
      );
    }
    thuocBaiTap = Number((firstBai as { id: unknown }).id);
    tenBaiTapLabel = String((firstBai as { ten_bai_tap?: unknown }).ten_bai_tap ?? "").trim();
  } else {
    const { data: exRow } = await sb
      .from("hv_he_thong_bai_tap")
      .select("ten_bai_tap")
      .eq("id", thuocBaiTap)
      .maybeSingle();
    tenBaiTapLabel = String((exRow as { ten_bai_tap?: unknown } | null)?.ten_bai_tap ?? "").trim();
  }

  const baseRow: Record<string, unknown> = {
    ten_hoc_vien: hocVienPk,
    thuoc_bai_tap: thuocBaiTap,
    photo,
    score: null,
    status: "Chờ xác nhận",
    bai_mau: false,
  };

  const dupPre = await findPendingChatSaveDuplicate(sb, {
    hocVienPk,
    photo,
    lopHocId,
    thuocBaiTap,
  });
  if (dupPre.queryError) {
    return NextResponse.json(
      { error: dupPre.queryError, code: "DUP_QUERY" },
      { status: 500 }
    );
  }
  if (dupPre.found) {
    return NextResponse.json({ ok: true, alreadySaved: true, tenBaiTapLabel });
  }

  let insertPayload: Record<string, unknown> = { ...baseRow, lop_hoc: lopHocId };
  let { error: insErr } = await sb.from("hv_bai_hoc_vien").insert(insertPayload).select("id").limit(1);

  if (insErr && isWrongLopFkColumnError(insErr)) {
    insertPayload = { ...baseRow, class: lopHocId };
    ({ error: insErr } = await sb.from("hv_bai_hoc_vien").insert(insertPayload).select("id").limit(1));
  }

  if (insErr && isPostgresUniqueViolation(insErr)) {
    const dupAfter = await findPendingChatSaveDuplicate(sb, {
      hocVienPk,
      photo,
      lopHocId,
      thuocBaiTap,
    });
    if (dupAfter.found) {
      return NextResponse.json({ ok: true, alreadySaved: true, tenBaiTapLabel });
    }
    const detail =
      (insErr.message ?? "").includes("hv_bai_hoc_vien_pkey")
        ? "Sequence id bảng hv_bai_hoc_vien có thể lệch (import thủ công). Trong Supabase SQL: SELECT setval(pg_get_serial_sequence('hv_bai_hoc_vien','id'), (SELECT COALESCE(MAX(id),1) FROM hv_bai_hoc_vien));"
        : insErr.message || "Trùng khóa khi ghi bài học viên.";
    return NextResponse.json(
      { error: detail, code: "INSERT_UNIQUE", hint: "SEQUENCE" },
      { status: 503 }
    );
  }

  if (insErr) {
    return NextResponse.json(
      { error: insErr.message || "Không ghi được bài học viên.", code: "INSERT" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, tenBaiTapLabel });
}
