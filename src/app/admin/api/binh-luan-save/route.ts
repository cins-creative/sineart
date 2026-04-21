import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { DANH_GIA_COLS, mapRowToListItem, normalizeUpsert } from "@/lib/admin/binh-luan-schema";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const patch = normalizeUpsert((body ?? {}) as Record<string, unknown>);
  if (!patch.ten_nguoi) {
    return NextResponse.json({ ok: false, error: "Thiếu tên người." }, { status: 400 });
  }
  if (!patch.noi_dung) {
    return NextResponse.json({ ok: false, error: "Thiếu nội dung." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  const insertRow: Record<string, unknown> = {
    ten_nguoi: patch.ten_nguoi,
    avatar_url: patch.avatar_url ?? null,
    noi_dung: patch.noi_dung,
    so_sao: patch.so_sao ?? 5,
    thoi_gian_hoc: patch.thoi_gian_hoc ?? null,
    nguon: patch.nguon ?? "Tự gửi",
    hien_thi: patch.hien_thi ?? true,
    khoa_hoc: patch.khoa_hoc ?? null,
  };

  const { data, error } = await supabase
    .from("ql_danh_gia")
    .insert(insertRow)
    .select(DANH_GIA_COLS)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không insert được bản ghi." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, row: mapRowToListItem(data as Record<string, unknown>) });
}
