import { NextResponse } from "next/server";

import { signAdminSessionToken } from "@/lib/admin/jwt-admin";
import { hasPasswordSet, fetchStaffByEmailForAuth } from "@/lib/admin/staff-row";
import { verifyPassword, hashPassword } from "@/lib/admin/password";
import { attachAdminSessionCookie } from "@/lib/admin/session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type Body = { email?: string; password?: string };

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, code: "NO_SERVICE", error: "Thiếu cấu hình server Supabase." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, code: "JSON", error: "Body không hợp lệ." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email.trim() || !password) {
    return NextResponse.json({ ok: false, code: "INPUT", error: "Nhập email và mật khẩu." }, { status: 400 });
  }

  const row = await fetchStaffByEmailForAuth(supabase, email);
  if (!row) {
    return NextResponse.json({ ok: false, code: "AUTH", error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
  }

  if (!hasPasswordSet(row)) {
    return NextResponse.json({
      ok: false,
      code: "PASSWORD_NOT_SET",
      error: "Tài khoản chưa có mật khẩu. Dùng «Quên mật khẩu» hoặc «Đặt mật khẩu qua email» để nhận liên kết đặt mật khẩu.",
    });
  }

  const ok = await verifyPassword(password, row.password);
  if (!ok) {
    return NextResponse.json({ ok: false, code: "AUTH", error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
  }

  const stored = String(row.password ?? "");
  const isLegacyPlain = stored !== "" && !stored.startsWith("$2");

  const token = await signAdminSessionToken({
    staffId: row.id,
    email: String(row.email ?? email).trim(),
    name: String(row.full_name ?? "").trim() || "Nhân sự",
  });

  const res = NextResponse.json({ ok: true });

  attachAdminSessionCookie(res, token);

  if (isLegacyPlain) {
    const hashed = await hashPassword(password);
    void supabase.from("hr_nhan_su").update({ password: hashed }).eq("id", row.id);
  }

  return res;
}
