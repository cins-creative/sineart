import { NextResponse } from "next/server";

import { resolveExamDurationPhut } from "@/lib/thi-thu/debug-exam";
import { computeExamEndMs } from "@/lib/thi-thu/phase";
import { isMonThiKey } from "@/lib/thi-thu-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type Body = {
  ky_thi_id?: unknown;
  ho_ten?: unknown;
  facebook?: unknown;
  anh_bai_nop_urls?: unknown;
  ghi_chu?: unknown;
};

export async function POST(req: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const kyId = typeof body.ky_thi_id === "string" ? body.ky_thi_id.trim() : "";
  const hoTen = typeof body.ho_ten === "string" ? body.ho_ten.trim() : "";
  const facebook =
    typeof body.facebook === "string" && body.facebook.trim() ? body.facebook.trim() : null;
  const ghiChu =
    typeof body.ghi_chu === "string" && body.ghi_chu.trim() ? body.ghi_chu.trim() : null;
  const urls = Array.isArray(body.anh_bai_nop_urls)
    ? body.anh_bai_nop_urls.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];

  if (!kyId || !hoTen || urls.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Thiếu kỳ thi, họ tên hoặc ảnh bài nộp." },
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

  const { data: ky, error: kyErr } = await supabase
    .from("thi_thu_ky_thi")
    .select("id,mon_thi,thoi_gian_bat_dau,trang_thai,tieu_de")
    .eq("id", kyId)
    .eq("trang_thai", "published")
    .maybeSingle();

  if (kyErr || !ky) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy kỳ thi hoặc chưa công bố." }, {
      status: 404,
    });
  }

  const monRaw = String((ky as { mon_thi: string }).mon_thi);
  if (!isMonThiKey(monRaw)) {
    return NextResponse.json({ ok: false, error: "Môn thi không hợp lệ." }, { status: 400 });
  }

  const rowKy = ky as { thoi_gian_bat_dau: string; tieu_de?: string | null };
  const T = new Date(String(rowKy.thoi_gian_bat_dau)).getTime();
  const examPhut = resolveExamDurationPhut({ tieu_de: rowKy.tieu_de, mon_thi: monRaw });
  const endMs = computeExamEndMs(T, examPhut);
  const now = Date.now();

  if (now > endMs + 60_000) {
    return NextResponse.json({ ok: false, error: "Đã hết thời gian nộp bài cho kỳ thi này." }, {
      status: 400,
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("thi_thu_bai_nop")
    .insert({
      ky_thi_id: kyId,
      ho_ten: hoTen,
      facebook,
      anh_bai_nop_urls: urls,
      ghi_chu: ghiChu,
    })
    .select("id")
    .single();

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted?.id });
}
