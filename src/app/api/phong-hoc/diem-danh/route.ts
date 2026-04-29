import { fetchDiemDanhForLopRange } from "@/lib/phong-hoc/diem-danh";
import { getGvHrIdFromSyncedCookie } from "@/lib/phong-hoc/gv-session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** GV xem điểm danh theo khoảng ngày (`ngayFrom` / `ngayTo` dạng YYYY-MM-DD). */
export async function GET(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  const hrId = await getGvHrIdFromSyncedCookie();
  if (hrId == null || hrId <= 0) {
    return NextResponse.json({ error: "Cần đăng nhập giáo viên (Phòng học).", code: "NO_GV" }, { status: 401 });
  }

  const url = new URL(req.url);
  const lop = Number(url.searchParams.get("lopHocId"));
  const ngayFrom = url.searchParams.get("ngayFrom")?.trim().slice(0, 10) ?? "";
  const ngayTo = url.searchParams.get("ngayTo")?.trim().slice(0, 10) ?? "";

  if (!Number.isFinite(lop) || lop <= 0) {
    return NextResponse.json({ error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(ngayTo)) {
    return NextResponse.json({ error: "ngayFrom / ngayTo phải là YYYY-MM-DD.", code: "BAD_DATE" }, { status: 400 });
  }

  const { data: lopRow, error: lopErr } = await sb
    .from("ql_lop_hoc")
    .select("id, teacher")
    .eq("id", lop)
    .maybeSingle();

  if (lopErr || !lopRow) {
    return NextResponse.json({ error: "Không tìm thấy lớp.", code: "NO_LOP" }, { status: 404 });
  }

  const teacher = Number((lopRow as { teacher?: unknown }).teacher);
  if (!Number.isFinite(teacher) || teacher !== hrId) {
    return NextResponse.json({ error: "Không có quyền xem lớp này.", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const rows = await fetchDiemDanhForLopRange(sb, lop, ngayFrom, ngayTo);
    return NextResponse.json({ rows });
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Lỗi truy vấn.";
    return NextResponse.json({ error: msg, code: "QUERY" }, { status: 500 });
  }
}
