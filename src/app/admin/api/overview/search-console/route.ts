import { NextResponse } from "next/server";

import {
  isOverviewPeriodSlug,
  overviewPeriodSlugToMkPreset,
} from "@/app/admin/dashboard/overview/overview-routes";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchSearchConsoleReport, type SearchConsoleReport } from "@/lib/data/search-console-gsc";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const url = new URL(req.url);
  const periodRaw = url.searchParams.get("period") ?? "nam";
  const period = isOverviewPeriodSlug(periodRaw) ? periodRaw : "nam";
  const preset = overviewPeriodSlugToMkPreset(period);
  const customFrom = url.searchParams.get("tu") ?? "";
  const customTo = url.searchParams.get("den") ?? "";

  const res = await fetchSearchConsoleReport({ preset, customFrom, customTo });

  if (!res.ok) {
    const status = res.code === "not_configured" ? 503 : 502;
    return NextResponse.json({ ok: false, error: res.error, code: res.code }, { status });
  }

  return NextResponse.json({ ok: true, ...(res.data satisfies SearchConsoleReport) });
}
