import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { cfImageNormalizeAccount } from "@/lib/cfImageUrl";
import { vnSlugify } from "@/lib/data/de-thi-shared";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type SavePayload = {
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

  let p: SavePayload;
  try {
    p = (await req.json()) as SavePayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const ten = str(p.ten);
  if (!ten) {
    return NextResponse.json({ ok: false, error: "Thiếu tên đề thi." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 }
    );
  }

  const slugInput = str(p.slug);
  const baseSlug = slugInput ? vnSlugify(slugInput) : vnSlugify(ten);
  if (!baseSlug) {
    return NextResponse.json({ ok: false, error: "Slug không hợp lệ (kiểm tra tên đề)." }, { status: 400 });
  }

  let finalSlug = baseSlug;
  {
    let attempt = 0;
    while (true) {
      const { data: existed } = await supabase
        .from("mkt_de_thi")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();
      if (!existed) break;
      attempt += 1;
      finalSlug = `${baseSlug}-${attempt}`;
      if (attempt > 80) {
        return NextResponse.json({ ok: false, error: "Không tạo được slug duy nhất." }, { status: 500 });
      }
    }
  }

  const row = {
    slug: finalSlug,
    ten,
    thumbnail_url: cfImageNormalizeAccount(str(p.thumbnail_url)),
    thumbnail_alt: str(p.thumbnail_alt),
    nam: numOrNull(p.nam),
    excerpt: str(p.excerpt),
    mon: strArray(p.mon),
    loai: strArray(p.loai),
    loai_mau_hinh_hoa: strArray(p.loai_mau_hinh_hoa),
    truong_ids: intArray(p.truong_ids),
    body_html: str(p.body_html),
    content_raw: str(p.content_raw),
  };

  const { data, error } = await supabase.from("mkt_de_thi").insert(row).select(LIST_SELECT).single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không thêm được bản ghi." },
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
