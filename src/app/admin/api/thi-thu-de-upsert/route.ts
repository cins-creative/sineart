import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { formatSupabaseWriteError } from "@/lib/supabase/postgres-permission-hint";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type Body = {
  id?: unknown;
  ky_thi_id?: unknown;
  tieu_de?: unknown;
  anh_urls?: unknown;
  thu_tu?: unknown;
};

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const kyId = typeof body.ky_thi_id === "string" ? body.ky_thi_id.trim() : "";
  const tieuDe = typeof body.tieu_de === "string" ? body.tieu_de.trim() : "";
  const thuTu =
    typeof body.thu_tu === "number" && Number.isFinite(body.thu_tu)
      ? Math.floor(body.thu_tu)
      : parseInt(String(body.thu_tu), 10);
  const anhUrls = Array.isArray(body.anh_urls)
    ? (body.anh_urls as unknown[]).filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];

  if (!kyId || !tieuDe || !Number.isFinite(thuTu)) {
    return NextResponse.json(
      { ok: false, error: "Thiếu kỳ thi, tiêu đề hoặc thứ tự." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  const id = typeof body.id === "string" && body.id.length > 0 ? body.id.trim() : null;

  if (id) {
    const { data, error } = await supabase
      .from("thi_thu_de_thi")
      .update({ tieu_de: tieuDe, anh_urls: anhUrls, thu_tu: thuTu, ky_thi_id: kyId })
      .eq("id", id)
      .select("id")
      .single();
    if (error) {
      return NextResponse.json(
        { ok: false, error: formatSupabaseWriteError(error, "thi_thu_de_thi") },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, id: data?.id });
  }

  const { data, error } = await supabase
    .from("thi_thu_de_thi")
    .insert({ ky_thi_id: kyId, tieu_de: tieuDe, anh_urls: anhUrls, thu_tu: thuTu })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json(
      { ok: false, error: formatSupabaseWriteError(error, "thi_thu_de_thi") },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: data?.id });
}
