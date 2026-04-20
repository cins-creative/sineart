import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  TRA_CUU_FULL_COLS,
  mapRowToFull,
  normalizeUpsert,
} from "@/lib/admin/tra-cuu-schema";
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
  if ("title" in body && !patch.title) {
    return NextResponse.json({ ok: false, error: "Tiêu đề không được để trống." }, { status: 400 });
  }

  const updatePatch: Record<string, unknown> = { ...patch };
  if (!Object.keys(updatePatch).length) {
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
    .from("tra_cuu_thong_tin")
    .update(updatePatch)
    .eq("id", id)
    .select(TRA_CUU_FULL_COLS)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không cập nhật được." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, row: mapRowToFull(data as Record<string, unknown>) });
}
