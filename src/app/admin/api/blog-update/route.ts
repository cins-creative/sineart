import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type UpdatePayload = {
  id?: unknown;
  title?: unknown;
  thumbnail?: unknown;
  image_alt?: unknown;
  opening?: unknown;
  content?: unknown;
  ending?: unknown;
  nguon?: unknown;
  feature?: unknown;
};

function strOrEmpty(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Cập nhật bản ghi `mkt_blogs`.
 * Gửi field nào thì patch field đó — field không có trong payload sẽ không đụng.
 */
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

  const patch: Record<string, unknown> = {};
  if ("title" in payload) {
    const t = strOrEmpty(payload.title);
    if (!t) {
      return NextResponse.json({ ok: false, error: "Tiêu đề không được để trống." }, { status: 400 });
    }
    patch.title = t;
  }
  if ("thumbnail" in payload) patch.thumbnail = strOrEmpty(payload.thumbnail);
  if ("image_alt" in payload) patch.image_alt = strOrEmpty(payload.image_alt);
  if ("opening" in payload) patch.opening = strOrEmpty(payload.opening);
  if ("content" in payload) patch.content = strOrEmpty(payload.content);
  if ("ending" in payload) patch.ending = strOrEmpty(payload.ending);
  if ("nguon" in payload) patch.nguon = strOrEmpty(payload.nguon);
  if ("feature" in payload && typeof payload.feature === "boolean") {
    patch.feature = payload.feature;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: "Không có field nào cần cập nhật." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("mkt_blogs")
    .update(patch)
    .eq("id", id)
    .select("id, created_at, title, thumbnail, feature, nguon, image_alt")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không cập nhật được." },
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
