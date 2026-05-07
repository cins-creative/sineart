import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { cfImageNormalizeAccount } from "@/lib/cfImageUrl";
import { vnSlugify } from "@/lib/data/de-thi-shared";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type UpdatePayload = {
  id?: unknown;
  ten?: unknown;
  slug?: unknown;
  thumbnail_url?: unknown;
  thumbnail_alt?: unknown;
  nam?: unknown;
  excerpt?: unknown;
  mon?: unknown;
  loai?: unknown;
  loai_mau_hinh_hoa?: unknown;
  truong_ids?: unknown;
  body_html?: unknown;
  content_raw?: unknown;
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

function intArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const it of v) {
    const n = Number(it);
    if (Number.isFinite(n) && n > 0) out.push(Math.trunc(n));
  }
  return out;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const LIST_SELECT = "id, slug, ten, thumbnail_url, nam, mon, created_at";

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

  if ("ten" in payload) {
    const t = str(payload.ten);
    if (!t) {
      return NextResponse.json({ ok: false, error: "Tên đề thi không được để trống." }, { status: 400 });
    }
    patch.ten = t;
  }
  if ("slug" in payload) {
    const raw = str(payload.slug);
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Slug không được để trống." }, { status: 400 });
    }
    const normalized = vnSlugify(raw);
    if (!normalized) {
      return NextResponse.json({ ok: false, error: "Slug không hợp lệ." }, { status: 400 });
    }
    patch.slug = normalized;
  }
  if ("thumbnail_url" in payload) patch.thumbnail_url = cfImageNormalizeAccount(str(payload.thumbnail_url));
  if ("thumbnail_alt" in payload) patch.thumbnail_alt = str(payload.thumbnail_alt);
  if ("nam" in payload) patch.nam = numOrNull(payload.nam);
  if ("excerpt" in payload) patch.excerpt = str(payload.excerpt);
  if ("mon" in payload) patch.mon = strArray(payload.mon);
  if ("loai" in payload) patch.loai = strArray(payload.loai);
  if ("loai_mau_hinh_hoa" in payload) patch.loai_mau_hinh_hoa = strArray(payload.loai_mau_hinh_hoa);
  if ("truong_ids" in payload) patch.truong_ids = intArray(payload.truong_ids);
  if ("body_html" in payload) patch.body_html = str(payload.body_html);
  if ("content_raw" in payload) patch.content_raw = str(payload.content_raw);

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

  if (typeof patch.slug === "string") {
    const { data: clash } = await supabase
      .from("mkt_de_thi")
      .select("id")
      .eq("slug", patch.slug)
      .neq("id", id)
      .maybeSingle();
    if (clash) {
      return NextResponse.json({ ok: false, error: "Slug đã được dùng cho đề thi khác." }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("mkt_de_thi")
    .update(patch)
    .eq("id", id)
    .select(LIST_SELECT)
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
      created_at: String(data.created_at ?? ""),
      ten: (data.ten as string | null) ?? null,
      slug: (data.slug as string | null) ?? null,
      thumbnail_url: cfImageNormalizeAccount(data.thumbnail_url as string | null),
      nam: data.nam == null ? null : Number(data.nam),
      mon: Array.isArray(data.mon)
        ? (data.mon as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
    },
  });
}
