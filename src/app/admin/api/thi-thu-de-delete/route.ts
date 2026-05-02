import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  THI_THU_KY_EDIT_FORBIDDEN_MSG,
  adminStaffCanEditThiThuKy,
} from "@/lib/admin/staff-mutation-access";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { formatSupabaseWriteError } from "@/lib/supabase/postgres-permission-hint";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type Body = { id?: unknown };

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const supabaseGate = createServiceRoleClient();
  if (!supabaseGate) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }
  const profileGate = await fetchAdminStaffShellProfile(supabaseGate, session.staffId);
  if (!adminStaffCanEditThiThuKy(profileGate.vai_tro)) {
    return NextResponse.json({ ok: false, error: THI_THU_KY_EDIT_FORBIDDEN_MSG }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "Thiếu id." }, { status: 400 });
  }

  const supabase = supabaseGate;

  const { error } = await supabase.from("thi_thu_de_thi").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: formatSupabaseWriteError(error, "thi_thu_de_thi") },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
