import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  mergeHomeContent,
  normalizeAdConfig,
} from "@/lib/admin/home-content-schema";
import { MKT_HOME_CONTENT_TAG } from "@/lib/data/mkt-home-cached";
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

  const body = (raw as { content?: unknown; ad?: unknown; img_class?: unknown }) ?? {};
  const normalized = mergeHomeContent(body.content);
  const adRaw = (body.ad ?? {}) as { ads?: unknown; visibleWhere?: unknown; visible_where?: unknown };
  const adConfig = normalizeAdConfig(adRaw);

  function normalizeImgClassColumn(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((s) => /^https?:\/\//i.test(s));
  }
  const imgClass = normalizeImgClassColumn(body.img_class);

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

  const baseRow = {
    id: 1,
    content: normalized,
    ads: adConfig.ads,
    visible_where: adConfig.visibleWhere,
    updated_by: updatedBy,
  } as const;

  let imgClassSkipped = false;

  let { data, error } = await supabase
    .from("mkt_home_content")
    .upsert(
      { ...baseRow, img_class: imgClass },
      { onConflict: "id" },
    )
    .select("content, ads, visible_where, updated_at")
    .single();

  const errMsg = error?.message ?? "";
  const missingImgClassColumn =
    /img_class/i.test(errMsg) ||
    (/schema cache/i.test(errMsg) &&
      (/column/i.test(errMsg) || /could not find/i.test(errMsg)));

  if (error && missingImgClassColumn) {
    const retry = await supabase
      .from("mkt_home_content")
      .upsert(baseRow, { onConflict: "id" })
      .select("content, ads, visible_where, updated_at")
      .single();
    data = retry.data;
    error = retry.error;
    imgClassSkipped = true;
  }

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Không lưu được nội dung trang chủ." },
      { status: 500 },
    );
  }

  revalidatePath("/", "page");
  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard/quan-ly-trang-chu", "page");
  revalidateTag(MKT_HOME_CONTENT_TAG, "max");

  return NextResponse.json({
    ok: true,
    content: normalized,
    ad: adConfig,
    updated_at: (data.updated_at as string | null) ?? null,
    ...(imgClassSkipped
      ? {
          warning:
            "Ảnh lớp học chưa được ghi (thiếu cột `img_class` hoặc PostgREST chưa reload). Trên Supabase SQL Editor chạy: " +
            "`alter table public.mkt_home_content add column if not exists img_class text[] not null default '{}';` " +
            "rồi `notify pgrst, 'reload schema';` — sau đó bấm Lưu lại.",
        }
      : {}),
  });
}
