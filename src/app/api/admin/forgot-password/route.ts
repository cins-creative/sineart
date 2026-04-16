import { NextResponse } from "next/server";

import {
  sendAdminPasswordResetEmail,
  sendAdminPasswordSetupEmail,
} from "@/lib/admin/admin-email";
import { ADMIN_PWD_RESET_JWT_TYP, ADMIN_PWD_SETUP_JWT_TYP } from "@/lib/admin/constants";
import { isAdminJwtSecretConfigured, signPasswordActionToken } from "@/lib/admin/jwt-admin";
import { getSiteOrigin } from "@/lib/admin/site-origin";
import { hasPasswordSet, fetchStaffByEmailForAuth } from "@/lib/admin/staff-row";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type Body = { email?: string };

const PUBLIC_OK = {
  ok: true as const,
  message:
    "Nếu email thuộc nhân sự Sine Art, bạn sẽ nhận hướng dẫn trong hộp thư (kể cả mục spam).",
};

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, code: "NO_SERVICE", error: "Thiếu cấu hình server." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, code: "JSON", error: "Body không hợp lệ." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ ok: false, code: "INPUT", error: "Nhập email công việc." }, { status: 400 });
  }

  const row = await fetchStaffByEmailForAuth(supabase, email);
  if (!row?.email) {
    return NextResponse.json(PUBLIC_OK);
  }

  const toEmail = String(row.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return NextResponse.json(PUBLIC_OK);
  }

  const origin = getSiteOrigin();

  if (!isAdminJwtSecretConfigured()) {
    console.error("[admin forgot-password] ADMIN_SESSION_SECRET missing or shorter than 32 chars");
    return NextResponse.json(
      {
        ok: false,
        code: "NO_JWT_SECRET",
        error:
          "Chưa cấu hình ADMIN_SESSION_SECRET (≥32 ký tự) trên server — không tạo được liên kết trong email.",
      },
      { status: 503 }
    );
  }

  let jwt: string;
  try {
    if (!hasPasswordSet(row)) {
      jwt = await signPasswordActionToken({ staffId: row.id, typ: ADMIN_PWD_SETUP_JWT_TYP });
    } else {
      jwt = await signPasswordActionToken({ staffId: row.id, typ: ADMIN_PWD_RESET_JWT_TYP });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin forgot-password] sign token failed:", msg);
    return NextResponse.json(
      {
        ok: false,
        code: "JWT_SIGN",
        error: "Không tạo được liên kết đặt mật khẩu. Kiểm tra ADMIN_SESSION_SECRET trên server.",
      },
      { status: 503 }
    );
  }

  const sendResult = !hasPasswordSet(row)
    ? await sendAdminPasswordSetupEmail({
        toEmail,
        setupUrl: `${origin}/admin/setup?token=${encodeURIComponent(jwt)}`,
      })
    : await sendAdminPasswordResetEmail({
        toEmail,
        resetUrl: `${origin}/admin/reset?token=${encodeURIComponent(jwt)}`,
      });

  if (!sendResult.sent) {
    console.error("[admin forgot-password] Resend failed:", sendResult.reason, sendResult.hint ?? "", {
      staffId: row.id,
    });
    const hint = sendResult.hint?.trim();
    const errMsg =
      sendResult.reason === "no_resend_key"
        ? "Chưa cấu hình RESEND_API_KEY trên server — không gửi được email."
        : hint
          ? `Resend từ chối hoặc lỗi: ${hint}`
          : "Không gửi được email. Kiểm tra Resend (API key, domain gửi FROM, DNS) và thử lại.";
    return NextResponse.json({ ok: false, code: sendResult.reason, error: errMsg }, { status: 502 });
  }

  return NextResponse.json(PUBLIC_OK);
}
