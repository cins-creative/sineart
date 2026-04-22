import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { mergeHomeContent } from "@/lib/admin/home-content-schema";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const body = (raw as { content?: unknown }) ?? {};
  const normalized = mergeHomeContent(body.content);

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  const updatedBy =
    typeof session.staffId === "number" && Number.isFinite(session.staffId)
      ? session.staffId
      : null;

  const { data, error } = await supabase
    .from("mkt_home_content")
    .upsert(
      {
        id: 1,
        content: normalized,
        updated_by: updatedBy,
      },
      { onConflict: "id" },
    )
    .select("content, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không lưu được nội dung trang chủ." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    content: normalized,
    updated_at: (data.updated_at as string | null) ?? null,
  });
}
