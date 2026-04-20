import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type SavePayload = {
  title?: unknown;
  thumbnail?: unknown;
  image_alt?: unknown;
  opening?: unknown;
  content?: unknown;
  ending?: unknown;
  nguon?: unknown;
  feature?: unknown;
};

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
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
      { status: 503 }
    );
  }

  const row = {
    title,
    thumbnail: str(p.thumbnail),
    image_alt: str(p.image_alt) ?? title,
    opening: str(p.opening),
    content: str(p.content),
    ending: str(p.ending),
    nguon: str(p.nguon),
    feature: typeof p.feature === "boolean" ? p.feature : false,
  };

  const { data, error } = await supabase
    .from("mkt_blogs")
    .insert(row)
    .select("id, created_at, title, thumbnail, feature, nguon, image_alt")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không insert được bản ghi." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    row: {
      id: Number(data.id),
      created_at: String(data.created_at),
      title: (data.title as string | null) ?? null,
      thumbnail: (data.thumbnail as string | null) ?? null,
      feature: (data.feature as boolean | null) ?? null,
      nguon: (data.nguon as string | null) ?? null,
      image_alt: (data.image_alt as string | null) ?? null,
    },
  });
}
