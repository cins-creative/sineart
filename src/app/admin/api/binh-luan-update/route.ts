import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { DANH_GIA_COLS, mapRowToListItem, normalizeUpsert } from "@/lib/admin/binh-luan-schema";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** Cập nhật partial — field nào có trong payload mới patch. */
export async function POST(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Thiếu id hợp lệ." }, { status: 400 });
  }

  const patch = normalizeUpsert(body);
  if ("ten_nguoi" in body && !patch.ten_nguoi) {
    return NextResponse.json({ ok: false, error: "Tên không được để trống." }, { status: 400 });
  }
  if ("noi_dung" in body && !patch.noi_dung) {
    return NextResponse.json({ ok: false, error: "Nội dung không được để trống." }, { status: 400 });
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: "Không có field nào cần cập nhật." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("ql_danh_gia")
    .update(patch as Record<string, unknown>)
    .eq("id", id)
    .select(DANH_GIA_COLS)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không cập nhật được." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, row: mapRowToListItem(data as Record<string, unknown>) });
}
