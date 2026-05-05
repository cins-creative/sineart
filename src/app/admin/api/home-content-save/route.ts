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
  const adRaw = (body.ad ?? {}) as {
    ads?: unknown;
    visibleWhere?: unknown;
    visible_where?: unknown;
    clickUrl?: unknown;
  };
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
    ad_click_url: adConfig.clickUrl,
    updated_by: updatedBy,
  } as const;

  let imgClassSkipped = false;
  let adClickSkipped = false;

  type UpsertPayload = Record<string, unknown>;
  let payload: UpsertPayload = {
    ...baseRow,
    img_class: imgClass,
  };

  let { data, error } = await supabase
    .from("mkt_home_content")
    .upsert(payload, { onConflict: "id" })
    .select("content, ads, visible_where, updated_at")
    .single();

  const errMsg0 = error?.message ?? "";
  const missingImgClassColumn =
    /img_class/i.test(errMsg0) ||
    (/schema cache/i.test(errMsg0) &&
      (/column/i.test(errMsg0) || /could not find/i.test(errMsg0)));

  if (error && missingImgClassColumn && "img_class" in payload) {
    delete payload.img_class;
    imgClassSkipped = true;
    const retry = await supabase
      .from("mkt_home_content")
      .upsert(payload, { onConflict: "id" })
      .select("content, ads, visible_where, updated_at")
      .single();
    data = retry.data;
    error = retry.error;
  }

  const errMsg1 = error?.message ?? "";
  if (error && /ad_click_url/i.test(errMsg1) && "ad_click_url" in payload) {
    delete payload.ad_click_url;
    adClickSkipped = true;
    const retry2 = await supabase
      .from("mkt_home_content")
      .upsert(payload, { onConflict: "id" })
      .select("content, ads, visible_where, updated_at")
      .single();
    data = retry2.data;
    error = retry2.error;
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

  const warnParts: string[] = [];
  if (imgClassSkipped) {
    warnParts.push(
      "Ảnh lớp học chưa được ghi (thiếu cột `img_class` hoặc PostgREST chưa reload). SQL: `alter table public.mkt_home_content add column if not exists img_class text[] not null default '{}';` rồi `notify pgrst, 'reload schema';`.",
    );
  }
  if (adClickSkipped) {
    warnParts.push(
      "Link click banner chưa được ghi (thiếu cột `ad_click_url`). SQL: `alter table public.mkt_home_content add column if not exists ad_click_url text not null default '';` rồi `notify pgrst, 'reload schema';`.",
    );
  }

  return NextResponse.json({
    ok: true,
    content: normalized,
    ad: adConfig,
    updated_at: (data.updated_at as string | null) ?? null,
    ...(warnParts.length ? { warning: warnParts.join(" ") } : {}),
  });
}
