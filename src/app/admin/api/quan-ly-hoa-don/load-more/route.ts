import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { ADMIN_HOA_DON_PAGE_SIZE, fetchAdminHoaDonBundle } from "@/lib/data/admin-quan-ly-hoa-don";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_PRESETS = new Set([-1, 0, 7, 30, 90]);

function parseDays(raw: string | null): number {
  if (raw == null || raw === "") return 30;
  const n = Number(raw);
  if (DAY_PRESETS.has(n)) return n;
  return 30;
}

function parseNonNegInt(raw: string | null, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

/** Lấy thêm 1 trang đơn (mặc định 15) cho trang `admin/dashboard/quan-ly-hoa-don`. */
export async function GET(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const days = parseDays(url.searchParams.get("days"));
  const offset = parseNonNegInt(url.searchParams.get("offset"), 0);
  const limit = Math.min(50, parseNonNegInt(url.searchParams.get("limit"), ADMIN_HOA_DON_PAGE_SIZE));
  const query = url.searchParams.get("q")?.trim() ?? "";

  const res = await fetchAdminHoaDonBundle(supabase, { days, limit, offset, query });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, bundle: res.data });
}
