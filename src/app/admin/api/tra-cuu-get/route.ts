import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { TRA_CUU_FULL_COLS, mapRowToFull } from "@/lib/admin/tra-cuu-schema";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** Trả đầy đủ 1 row (kèm body_html) để modal chỉnh sửa. */
export async function GET(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Thiếu id hợp lệ." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("tra_cuu_thong_tin")
    .select(TRA_CUU_FULL_COLS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy bản ghi." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: mapRowToFull(data as Record<string, unknown>) });
}
