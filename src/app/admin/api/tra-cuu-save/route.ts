import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  TRA_CUU_FULL_COLS,
  mapRowToFull,
  normalizeUpsert,
  slugifyVi,
} from "@/lib/admin/tra-cuu-schema";
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
  if (!patch.title) {
    return NextResponse.json({ ok: false, error: "Thiếu tiêu đề." }, { status: 400 });
  }
  const slug = patch.slug && patch.slug.trim().length > 0 ? patch.slug : slugifyVi(patch.title);
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Không sinh được slug hợp lệ." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  const insertRow: Record<string, unknown> = {
    slug,
    title: patch.title,
    thumbnail_url: patch.thumbnail_url ?? null,
    thumbnail_alt: patch.thumbnail_alt ?? patch.title,
    nam: patch.nam ?? null,
    excerpt: patch.excerpt ?? null,
    body_html: patch.body_html ?? null,
    is_featured: patch.is_featured ?? false,
    published_at: patch.published_at ?? new Date().toISOString(),
    truong_ids: patch.truong_ids ?? [],
    type: patch.type ?? [],
  };

  const { data, error } = await supabase
    .from("tra_cuu_thong_tin")
    .insert(insertRow)
    .select(TRA_CUU_FULL_COLS)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không insert được bản ghi." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, row: mapRowToFull(data as Record<string, unknown>) });
}
