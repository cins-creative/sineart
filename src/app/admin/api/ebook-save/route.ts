import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { cfImageNormalizeAccount } from "@/lib/cfImageUrl";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type SavePayload = {
  title?: unknown;
  slug?: unknown;
  so_trang?: unknown;
  featured?: unknown;
  categories?: unknown;
  thumbnail?: unknown;
  image_demo?: unknown;
  img_src_link?: unknown;
  html_embed?: unknown;
  content?: unknown;
  noi_dung_sach?: unknown;
};

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const it of v) {
    if (typeof it === "string") {
      const t = it.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export async function POST(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  let p: SavePayload;
  try {
    p = (await req.json()) as SavePayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const title = str(p.title);
  if (!title) {
    return NextResponse.json({ ok: false, error: "Thiếu tiêu đề." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  const slugRaw = str(p.slug);
  const slug = slugRaw ? normalizeSlug(slugRaw) : normalizeSlug(title);
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Slug không hợp lệ." }, { status: 400 });
  }

  // Unique slug — nếu đã tồn tại, thêm hậu tố -1, -2 ...
  let finalSlug = slug;
  {
    let attempt = 0;
    while (true) {
      const { data: existed } = await supabase
        .from("mkt_ebooks")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();
      if (!existed) break;
      attempt += 1;
      finalSlug = `${slug}-${attempt}`;
      if (attempt > 50) {
        return NextResponse.json({ ok: false, error: "Không tạo được slug duy nhất." }, { status: 500 });
      }
    }
  }

  const soTrang =
    typeof p.so_trang === "number" && Number.isFinite(p.so_trang) && p.so_trang > 0
      ? Math.floor(p.so_trang)
      : null;

  const row = {
    title,
    slug: finalSlug,
    so_trang: soTrang,
    featured: typeof p.featured === "boolean" ? p.featured : false,
    categories: strArray(p.categories),
    thumbnail: str(p.thumbnail),
    image_demo: strArray(p.image_demo),
    img_src_link: strArray(p.img_src_link),
    html_embed: str(p.html_embed),
    content: str(p.content),
    noi_dung_sach: str(p.noi_dung_sach),
  };

  const { data, error } = await supabase
    .from("mkt_ebooks")
    .insert(row)
    .select(
      "id, slug, title, so_trang, featured, categories, thumbnail, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không insert được bản ghi." },
      { status: 500 },
    );
  }

  const normalized = {
    ...data,
    thumbnail: cfImageNormalizeAccount((data as Record<string, unknown>).thumbnail as string | null),
  };

  return NextResponse.json({ ok: true, row: normalized });
}
