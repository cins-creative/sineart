import { NextResponse } from "next/server";

import { adminStaffCanViewSepayTuVanNotifications } from "@/lib/admin/staff-mutation-access";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  fetchRecentSepayIncomingTransfers,
  fetchSepayIncomingTransfersPaginated,
} from "@/lib/data/admin-sepay-transfers";
import {
  fetchAdminStaffShellPhongTenPhongs,
  fetchAdminStaffShellProfile,
} from "@/lib/data/admin-shell-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

async function assertTuVanAccess(staffId: number) {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 }) };
  }

  const [profile, phongTenPhongs] = await Promise.all([
    fetchAdminStaffShellProfile(supabase, staffId),
    fetchAdminStaffShellPhongTenPhongs(supabase, staffId),
  ]);

  if (
    !adminStaffCanViewSepayTuVanNotifications({
      vai_tro: profile.vai_tro,
      phongTenPhongs,
    })
  ) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Không có quyền xem thông báo SePay." }, { status: 403 }),
    };
  }

  return { ok: true as const, supabase };
}

export async function GET(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const access = await assertTuVanAccess(session.staffId);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "history" ? "history" : "recent";

  if (scope === "history") {
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.max(5, Number(url.searchParams.get("pageSize") ?? "20") || 20);
    const search = url.searchParams.get("q")?.trim() ?? "";
    const res = await fetchSepayIncomingTransfersPaginated(access.supabase, { page, pageSize, search });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, ...res.data });
  }

  const res = await fetchRecentSepayIncomingTransfers(access.supabase, { limit: 30, lookbackHours: 168 });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, items: res.items });
}
