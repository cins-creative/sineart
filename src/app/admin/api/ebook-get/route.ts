import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { cfImageNormalizeAccount } from "@/lib/cfImageUrl";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

function normalizeArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const it of v) {
    if (typeof it !== "string") continue;
    const n = cfImageNormalizeAccount(it);
    if (n) out.push(n);
  }
  return out;
}

/** Trả đầy đủ 1 row `mkt_ebooks` (gồm cả mảng ảnh và HTML nội dung) để modal sửa. */
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
    .from("mkt_ebooks")
    .select(
      "id, slug, title, so_trang, featured, categories, thumbnail, image_demo, img_src_link, html_embed, content, noi_dung_sach, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy ebook." }, { status: 404 });
  }

  const normalized = {
    ...data,
    thumbnail: cfImageNormalizeAccount((data as Record<string, unknown>).thumbnail as string | null),
    image_demo: normalizeArr((data as Record<string, unknown>).image_demo),
    img_src_link: normalizeArr((data as Record<string, unknown>).img_src_link),
  };

  return NextResponse.json({ ok: true, data: normalized });
}
