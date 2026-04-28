import { NextResponse } from "next/server";

import { getAgentWorkerBaseUrl } from "@/lib/admin/agent-worker-url";
import { adminStaffCanAccessAgentPage } from "@/lib/admin/staff-mutation-access";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** Proxy POST tới Worker `/agent/toggle` (cập nhật KV session) — gọi same-origin từ admin. */
export async function POST(req: Request): Promise<NextResponse> {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const base = getAgentWorkerBaseUrl();
  const res = await fetch(`${base}/agent/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
