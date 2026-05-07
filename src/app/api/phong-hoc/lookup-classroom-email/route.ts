import { lookupClassroomByEmail } from "@/lib/phong-hoc/lookup-by-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

/**
 * Tra cứu lớp phòng học theo email — **service role** để đọc đầy đủ `ql_quan_ly_hoc_vien` / `hp_*`
 * giống các route phòng học khác (anon browser đôi khi RLS / kiểu bigint lệch).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const rawEmail =
    typeof body === "object" && body !== null && "email" in body
      ? (body as { email?: unknown }).email
      : undefined;
  const email = rawEmail != null ? String(rawEmail).trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Thiếu email." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server chưa cấp SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }

  try {
    const outcome = await lookupClassroomByEmail(supabase, email);
    return NextResponse.json(outcome);
  } catch (e) {
    console.error("[lookup-classroom-email]", e);
    return NextResponse.json({ error: "Lỗi tra cứu." }, { status: 500 });
  }
}
