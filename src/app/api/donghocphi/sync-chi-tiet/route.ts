import { sendPaymentReceiptEmail } from "@/lib/donghocphi/payment-receipt-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const STATUS_PAID = "Đã thanh toán";

type Body = { donId?: number };

export type SyncChiTietReceiptEmail = {
  sent: boolean;
  /** Mã nội bộ khi không gửi (vd. no_resend_key, bad_email, resend_api) */
  reason?: string;
  /** Gợi ý từ Resend / lỗi mạng (đã cắt ngắn) */
  hint?: string;
  /** Lỗi không mong đợi trong code gửi mail */
  error?: "resend_failed";
};

/**
 * Fallback khi Worker đã PATCH đơn nhưng chi tiết chưa đồng bộ.
 * Chỉ cập nhật line items nếu header đơn đã `Đã thanh toán`.
 * Kỳ học phí chỉ nằm trên `hp_thu_hp_chi_tiet` — không cập nhật `ql_quan_ly_hoc_vien`.
 *
 * Ghi danh lớp mới (`INSERT ql_quan_ly_hoc_vien`) xảy ra trong luồng tạo đơn, không ở đây — `khoa_hoc_vien` trên
 * `hp_thu_hp_chi_tiet` là `ql_quan_ly_hoc_vien.id` và cần `lop_hoc` đã biết tại thời điểm tạo đơn.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Thiếu cấu hình Supabase service role.", code: "NO_SERVICE" },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ.", code: "JSON" }, { status: 400 });
  }

  const donId = body.donId;
  if (donId == null || !Number.isFinite(donId) || donId <= 0) {
    return NextResponse.json({ error: "donId không hợp lệ.", code: "BODY" }, { status: 400 });
  }

  const { data: don, error: donErr } = await supabase
    .from("hp_don_thu_hoc_phi")
    .select("id, status")
    .eq("id", donId)
    .maybeSingle();

  if (donErr) {
    return NextResponse.json(
      { error: donErr.message, code: "DON_READ" },
      { status: 500 }
    );
  }
  if (!don) {
    return NextResponse.json({ error: "Không tìm thấy đơn.", code: "NOT_FOUND" }, { status: 404 });
  }

  const st = String((don as { status?: string | null }).status ?? "").trim();
  if (st !== STATUS_PAID) {
    return NextResponse.json(
      { error: "Đơn chưa ở trạng thái đã thanh toán.", code: "NOT_PAID" },
      { status: 409 }
    );
  }

  const { error: upErr } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .update({ status: STATUS_PAID })
    .eq("don_thu", donId);

  if (upErr) {
    return NextResponse.json(
      { error: upErr.message, code: "CHI_TIET_UPDATE" },
      { status: 500 }
    );
  }

  let receiptEmail: SyncChiTietReceiptEmail;
  try {
    const mail = await sendPaymentReceiptEmail(supabase, donId);
    if (mail.sent) {
      receiptEmail = { sent: true };
      console.info("[sync-chi-tiet] receipt email sent", { donId });
    } else {
      const hint = mail.hint;
      receiptEmail = {
        sent: false,
        reason: mail.reason,
        ...(hint ? { hint } : {}),
      };
      if (mail.reason === "resend_api" || mail.reason === "resend_network") {
        console.warn("[sync-chi-tiet] receipt email resend error", {
          donId,
          reason: mail.reason,
          hint: hint ?? "",
        });
      } else {
        console.info("[sync-chi-tiet] receipt email skipped", { donId, reason: mail.reason });
      }
    }
  } catch (e) {
    console.error("[sync-chi-tiet] receipt email failed:", e);
    receiptEmail = { sent: false, error: "resend_failed" };
  }

  return NextResponse.json({ ok: true as const, receiptEmail });
}
