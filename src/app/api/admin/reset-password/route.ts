import { NextResponse } from "next/server";

import { ADMIN_PWD_RESET_JWT_TYP, ADMIN_PWD_SETUP_JWT_TYP } from "@/lib/admin/constants";
import { verifyPasswordActionToken } from "@/lib/admin/jwt-admin";
import { hashPassword, isPasswordStrongEnough } from "@/lib/admin/password";
import { hasPasswordSet } from "@/lib/admin/staff-row";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type Body = { token?: string; password?: string };

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

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || !password) {
    return NextResponse.json({ ok: false, code: "INPUT", error: "Thiếu token hoặc mật khẩu mới." }, { status: 400 });
  }

  if (!isPasswordStrongEnough(password)) {
    return NextResponse.json(
      { ok: false, code: "WEAK", error: "Mật khẩu cần ít nhất 8 ký tự." },
      { status: 400 }
    );
  }

  const decoded = await verifyPasswordActionToken(token);
  if (!decoded) {
    return NextResponse.json(
      { ok: false, code: "TOKEN", error: "Liên kết không hợp lệ hoặc đã hết hạn." },
      { status: 400 }
    );
  }

  const { data: rowRaw, error: rowErr } = await supabase
    .from("hr_nhan_su")
    .select("id, email, password")
    .eq("id", decoded.staffId)
    .maybeSingle();

  if (rowErr || !rowRaw) {
    return NextResponse.json(
      { ok: false, code: "TOKEN", error: "Liên kết không hợp lệ hoặc đã hết hạn." },
      { status: 400 }
    );
  }

  const row = rowRaw as { id?: unknown; email?: unknown; password?: unknown };
  const authRow = {
    id: Number(row.id),
    email: row.email != null ? String(row.email) : null,
    full_name: null,
    password: row.password != null ? String(row.password) : null,
  };

  if (decoded.typ === ADMIN_PWD_SETUP_JWT_TYP && hasPasswordSet(authRow)) {
    return NextResponse.json(
      { ok: false, code: "TOKEN", error: "Tài khoản đã có mật khẩu. Dùng «Quên mật khẩu» để đặt lại." },
      { status: 400 }
    );
  }

  if (decoded.typ === ADMIN_PWD_RESET_JWT_TYP && !hasPasswordSet(authRow)) {
    return NextResponse.json(
      { ok: false, code: "TOKEN", error: "Liên kết đặt lại không còn hợp lệ. Dùng email đặt mật khẩu lần đầu." },
      { status: 400 }
    );
  }

  const hashed = await hashPassword(password);
  const { error } = await supabase
    .from("hr_nhan_su")
    .update({ password: hashed })
    .eq("id", decoded.staffId);

  if (error) {
    return NextResponse.json(
      { ok: false, code: "DB", error: "Không cập nhật được mật khẩu. Thử lại sau." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "Đã đặt mật khẩu. Bạn có thể đăng nhập." });
}
