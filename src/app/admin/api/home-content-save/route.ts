import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  mergeHomeContent,
  normalizeAdConfig,
} from "@/lib/admin/home-content-schema";
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

  const body = (raw as { content?: unknown; ad?: unknown }) ?? {};
  const normalized = mergeHomeContent(body.content);
  const adRaw = (body.ad ?? {}) as { ads?: unknown; visibleWhere?: unknown; visible_where?: unknown };
  const adConfig = normalizeAdConfig(adRaw);

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
        ads: adConfig.ads,
        visible_where: adConfig.visibleWhere,
        updated_by: updatedBy,
      },
      { onConflict: "id" },
    )
    .select("content, ads, visible_where, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không lưu được nội dung trang chủ." },
      { status: 500 },
    );
  }

  revalidatePath("/", "page");
  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/quan-ly-trang-chu", "page");

  return NextResponse.json({
    ok: true,
    content: normalized,
    ad: adConfig,
    updated_at: (data.updated_at as string | null) ?? null,
  });
}
