import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Khớp `payment-client` / cột `hp_don_thu_hoc_phi.status` */
const HP_DA_THANH_TOAN = "Đã thanh toán";

type PaidInvoiceRow = {
  id: number;
  ma_don: string | null;
  ma_don_so: string | null;
  ngay_thanh_toan: string | null;
};

/**
 * Danh sách đơn học phí đã thanh toán của học viên (chỉ khi email khớp hồ sơ).
 * Body: `{ hoc_vien_id: number, email: string }`
 */
export async function POST(req: Request): Promise<NextResponse> {
  const sb = createServiceRoleClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình máy chủ." }, { status: 500 });
  }

  let body: { hoc_vien_id?: unknown; email?: unknown };
  try {
    body = (await req.json()) as { hoc_vien_id?: unknown; email?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const hvIdRaw = body.hoc_vien_id;
  const hvId = typeof hvIdRaw === "number" ? hvIdRaw : Number(hvIdRaw);
  const emailNorm = String(body.email ?? "").trim().toLowerCase();

  if (!Number.isFinite(hvId) || hvId <= 0 || emailNorm === "") {
    return NextResponse.json({ ok: false, error: "Thiếu học viên hoặc email." }, { status: 400 });
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

  const { data: dons, error: donErr } = await sb
    .from("hp_don_thu_hoc_phi")
    .select("id, ma_don, ma_don_so, ngay_thanh_toan, status")
    .eq("student", hvId)
    .eq("status", HP_DA_THANH_TOAN)
    .order("ngay_thanh_toan", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (donErr) {
    return NextResponse.json(
      { ok: false, error: donErr.message || "Không đọc được đơn." },
      { status: 500 },
    );
  }

  const invoices: PaidInvoiceRow[] = (dons ?? []).map((r) => {
    const row = r as {
      id: unknown;
      ma_don?: string | null;
      ma_don_so?: string | null;
      ngay_thanh_toan?: string | null;
    };
    return {
      id: Number(row.id),
      ma_don: row.ma_don ?? null,
      ma_don_so: row.ma_don_so ?? null,
      ngay_thanh_toan: row.ngay_thanh_toan != null ? String(row.ngay_thanh_toan) : null,
    };
  });

  return NextResponse.json({ ok: true, invoices });
}
