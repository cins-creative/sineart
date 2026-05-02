import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchBaiNopForKy } from "@/lib/data/thi-thu";

export const runtime = "nodejs";

/** Danh sách bài nộp `thi_thu_bai_nop` theo kỳ — chỉ admin đã đăng nhập. */
export async function GET(req: Request): Promise<NextResponse> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const url = new URL(req.url);
  const kyThiId = url.searchParams.get("ky_thi_id")?.trim() ?? "";
  if (!kyThiId) {
    return NextResponse.json({ ok: false, error: "Thiếu ky_thi_id." }, { status: 400 });
  }

  try {
    const rows = await fetchBaiNopForKy(kyThiId);
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    console.error("[thi-thu-bai-nop-list]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Lỗi tải danh sách." },
      { status: 500 },
    );
  }
}
