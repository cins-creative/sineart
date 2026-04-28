import { NextResponse } from "next/server";

import { adminStaffCanAccessAgentPage } from "@/lib/admin/staff-mutation-access";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** Danh sách log hội thoại Agent (cùng dữ liệu Worker GET /agent/conversations) — đọc trực tiếp Supabase, tránh lỗi CORS / fetch từ browser. */
export async function GET(): Promise<NextResponse> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const profile = await fetchAdminStaffShellProfile(supabase, session.staffId);
  if (!adminStaffCanAccessAgentPage(profile.vai_tro)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("ag_conversation_log")
    .select("sender_id, message, role, agent_active, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("agent-conversations:", error);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json(data ?? []);
}
