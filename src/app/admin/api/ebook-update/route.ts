import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { cfImageNormalizeAccount } from "@/lib/cfImageUrl";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type UpdatePayload = {
  id?: unknown;
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

function strOrEmpty(v: unknown): string | null {
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

/** Cập nhật partial. Gửi field nào thì patch field đó. */
export async function POST(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  let payload: UpdatePayload;
  try {
    payload = (await req.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const id = Number(payload.id);
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

  const patch: Record<string, unknown> = {};

  if ("title" in payload) {
    const t = strOrEmpty(payload.title);
    if (!t) {
      return NextResponse.json({ ok: false, error: "Tiêu đề không được để trống." }, { status: 400 });
    }
    patch.title = t;
  }

  if ("slug" in payload) {
    const raw = strOrEmpty(payload.slug);
    if (raw) {
      const normalized = normalizeSlug(raw);
      if (!normalized) {
        return NextResponse.json({ ok: false, error: "Slug không hợp lệ." }, { status: 400 });
      }
      // Check collision (với bản ghi khác)
      const { data: existed } = await supabase
        .from("mkt_ebooks")
        .select("id")
        .eq("slug", normalized)
        .neq("id", id)
        .maybeSingle();
      if (existed) {
        return NextResponse.json(
          { ok: false, error: `Slug "${normalized}" đã tồn tại ở bản ghi khác.` },
          { status: 409 },
        );
      }
      patch.slug = normalized;
    }
  }

  if ("so_trang" in payload) {
    if (
      typeof payload.so_trang === "number" &&
      Number.isFinite(payload.so_trang) &&
      payload.so_trang > 0
    ) {
      patch.so_trang = Math.floor(payload.so_trang);
    } else {
      patch.so_trang = null;
    }
  }

  if ("featured" in payload && typeof payload.featured === "boolean") {
    patch.featured = payload.featured;
  }

  if ("categories" in payload) patch.categories = strArray(payload.categories);
  if ("thumbnail" in payload) patch.thumbnail = strOrEmpty(payload.thumbnail);
  if ("image_demo" in payload) patch.image_demo = strArray(payload.image_demo);
  if ("img_src_link" in payload) patch.img_src_link = strArray(payload.img_src_link);
  if ("html_embed" in payload) patch.html_embed = strOrEmpty(payload.html_embed);
  if ("content" in payload) patch.content = strOrEmpty(payload.content);
  if ("noi_dung_sach" in payload) patch.noi_dung_sach = strOrEmpty(payload.noi_dung_sach);

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: "Không có field nào cần cập nhật." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("mkt_ebooks")
    .update(patch)
    .eq("id", id)
    .select(
      "id, slug, title, so_trang, featured, categories, thumbnail, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không cập nhật được." },
      { status: 500 },
    );
  }

  const row = {
    ...data,
    thumbnail: cfImageNormalizeAccount((data as Record<string, unknown>).thumbnail as string | null),
  };

  return NextResponse.json({ ok: true, row });
}
