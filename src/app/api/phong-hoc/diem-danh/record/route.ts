import { upsertDiemDanhJoin } from "@/lib/phong-hoc/diem-danh";
import { getHvIdFromSyncedCookie } from "@/lib/phong-hoc/hv-session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Học viên gọi sau khi join Daily (`joined-meeting`) — ghi nhận đã vào phòng trong ngày (VN).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: { lopHocId?: unknown };
  try {
    body = (await req.json()) as { lopHocId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const lopHocId = Number(body.lopHocId);
  if (!Number.isFinite(lopHocId) || lopHocId <= 0) {
    return NextResponse.json({ ok: false, error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }

  const hvId = await getHvIdFromSyncedCookie();
  if (hvId == null || hvId <= 0) {
    return NextResponse.json(
      { ok: false, error: "Cần đăng nhập học viên (cookie Phòng học).", code: "NO_HV" },
      { status: 401 }
    );
  }

  const { data: en, error: enErr } = await sb
    .from("ql_quan_ly_hoc_vien")
    .select("id")
    .eq("lop_hoc", lopHocId)
    .eq("hoc_vien_id", hvId)
    .maybeSingle();

  if (enErr || !en) {
    return NextResponse.json(
      { ok: false, error: "Học viên không thuộc lớp này.", code: "NOT_IN_CLASS" },
      { status: 403 }
    );
  }

  const r = await upsertDiemDanhJoin(sb, lopHocId, hvId);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error, code: "UPSERT" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
