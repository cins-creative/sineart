import { fetchPaidInvoiceDetailForStudent } from "@/lib/donghocphi/paid-invoice-detail-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Chi tiết một đơn học phí đã thanh toán (chỉ khi email khớp hồ sơ và đơn thuộc học viên).
 * Body: `{ hoc_vien_id: number, email: string, don_id: number }`
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình máy chủ." }, { status: 500 });
  }

  let body: { hoc_vien_id?: unknown; email?: unknown; don_id?: unknown };
  try {
    body = (await req.json()) as { hoc_vien_id?: unknown; email?: unknown; don_id?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const hvIdRaw = body.hoc_vien_id;
  const hvId = typeof hvIdRaw === "number" ? hvIdRaw : Number(hvIdRaw);
  const donIdRaw = body.don_id;
  const donId = typeof donIdRaw === "number" ? donIdRaw : Number(donIdRaw);
  const emailNorm = String(body.email ?? "").trim().toLowerCase();

  if (!Number.isFinite(hvId) || hvId <= 0 || emailNorm === "" || !Number.isFinite(donId) || donId <= 0) {
    return NextResponse.json({ ok: false, error: "Thiếu tham số." }, { status: 400 });
  }

  const { data: hvRow, error: hvErr } = await sb
    .from("ql_thong_tin_hoc_vien")
    .select("id, email")
    .eq("id", hvId)
    .maybeSingle();

  if (hvErr || !hvRow) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy hồ sơ." }, { status: 404 });
  }

  const rowEmail = String((hvRow as { email?: unknown }).email ?? "")
    .trim()
    .toLowerCase();
  if (rowEmail === "" || rowEmail !== emailNorm) {
    return NextResponse.json({ ok: false, error: "Không khớp email hồ sơ." }, { status: 403 });
  }

  const built = await fetchPaidInvoiceDetailForStudent(sb, donId, hvId);
  if (!built.ok) {
    const status =
      built.code === "NOT_FOUND" || built.code === "NOT_PAID" ? 404 : built.code === "NO_LINES" ? 404 : 500;
    const msg =
      built.code === "NOT_PAID"
        ? "Đơn chưa thanh toán hoặc không thuộc hồ sơ."
        : built.code === "NOT_FOUND"
          ? "Không tìm thấy đơn."
          : built.code === "NO_LINES"
            ? "Đơn không có dòng chi tiết."
            : "Không đọc được dữ liệu đơn.";
    return NextResponse.json({ ok: false, error: msg, code: built.code }, { status });
  }

  return NextResponse.json({ ok: true, detail: built.data });
}
