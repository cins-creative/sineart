import { NextResponse } from "next/server";

import {
  fetchHvEnrollmentTracking,
  type HvEnrollmentTrackingResult,
} from "@/lib/data/admin-hv-enrollment-tracking";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  isOverviewPeriodSlug,
  overviewPeriodSlugToMkPreset,
} from "@/app/admin/dashboard/overview/overview-routes";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

function parseOptionalId(v: string | null): number | null {
  if (!v || v === "all") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

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
  const periodRaw = url.searchParams.get("period") ?? "thang";
  const period = isOverviewPeriodSlug(periodRaw) ? periodRaw : "thang";
  const preset = overviewPeriodSlugToMkPreset(period);
  const customFrom = url.searchParams.get("tu") ?? "";
  const customTo = url.searchParams.get("den") ?? "";
  const monHocId = parseOptionalId(url.searchParams.get("monHoc"));
  const lopHocId = parseOptionalId(url.searchParams.get("lopHoc"));

  const res = await fetchHvEnrollmentTracking(supabase, {
    preset,
    customFrom,
    customTo,
    monHocId,
    lopHocId,
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ...(res.data satisfies HvEnrollmentTrackingResult) });
}
