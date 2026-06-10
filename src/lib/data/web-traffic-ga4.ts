import { BetaAnalyticsDataClient } from "@google-analytics/data";

import { getGa4ServerConfig } from "@/lib/analytics/ga4-config";

export type WebTrafficPreset = "all" | "week" | "month" | "quarter" | "year" | "custom";

export type WebTrafficGranularity = "day" | "month";

export type WebTrafficTimePoint = {
  key: string;
  label: string;
  pageviews: number;
  users: number;
  sessions: number;
};

export type WebTrafficPageRow = {
  path: string;
  pageviews: number;
  users: number;
  avgEngagementSec: number;
};

export type WebTrafficReport = {
  rangeLabel: string;
  granularity: WebTrafficGranularity;
  totals: { pageviews: number; users: number; sessions: number };
  timeSeries: WebTrafficTimePoint[];
  topPages: WebTrafficPageRow[];
};

type Ga4DateRange = { startDate: string; endDate: string };

function formatYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetToRange(preset: Exclude<WebTrafficPreset, "all" | "custom">): {
  startYmd: string;
  endYmd: string;
} {
  const today = new Date();
  const endYmd = formatYMDLocal(today);
  if (preset === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  if (preset === "quarter") {
    const q = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), q * 3, 1);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  const start = new Date(today.getFullYear(), 0, 1);
  return { startYmd: formatYMDLocal(start), endYmd };
}

function normalizeCustomRange(customFrom: string, customTo: string): { startYmd: string; endYmd: string } {
  const todayYmd = formatYMDLocal(new Date());
  let from = customFrom.trim().slice(0, 10);
  let to = customTo.trim().slice(0, 10);
  if (!from && !to) return { startYmd: todayYmd, endYmd: todayYmd };
  if (!from) from = to || todayYmd;
  if (!to) to = from || todayYmd;
  if (from > to) [from, to] = [to, from];
  return { startYmd: from, endYmd: to };
}

function daySpanInclusive(startYmd: string, endYmd: string): number {
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  const s = new Date(ys, ms - 1, ds);
  const e = new Date(ye, me - 1, de);
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

function formatDayLabelFromGa4(ga4Date: string): string {
  if (ga4Date.length !== 8) return ga4Date;
  const m = ga4Date.slice(4, 6);
  const d = ga4Date.slice(6, 8);
  return `${d}/${m}`;
}

function formatMonthLabelFromGa4(yearMonth: string): string {
  if (yearMonth.length !== 6) return yearMonth;
  const y = yearMonth.slice(0, 4);
  const m = Number(yearMonth.slice(4, 6));
  return `T${m}/${y}`;
}

function resolveWebTrafficQuery(
  preset: WebTrafficPreset,
  customFrom: string,
  customTo: string,
): { ga4: Ga4DateRange; granularity: WebTrafficGranularity; rangeLabel: string } {
  const todayYmd = formatYMDLocal(new Date());

  if (preset === "all") {
    return {
      ga4: { startDate: "12monthsAgo", endDate: "today" },
      granularity: "month",
      rangeLabel: "12 tháng gần nhất",
    };
  }

  const range =
    preset === "custom" ? normalizeCustomRange(customFrom, customTo) : presetToRange(preset);
  const span = daySpanInclusive(range.startYmd, range.endYmd);
  const granularity: WebTrafficGranularity = span > 45 ? "month" : "day";

  return {
    ga4: { startDate: range.startYmd, endDate: range.endYmd },
    granularity,
    rangeLabel: `${formatDayLabelYmd(range.startYmd)} → ${formatDayLabelYmd(range.endYmd)}`,
  };
}

function formatDayLabelYmd(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function numMetric(row: { metricValues?: { value?: string | null }[] | null }, idx: number): number {
  const v = row.metricValues?.[idx]?.value;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function strDim(row: { dimensionValues?: { value?: string | null }[] | null }, idx: number): string {
  return String(row.dimensionValues?.[idx]?.value ?? "").trim();
}

let clientSingleton: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (clientSingleton) return clientSingleton;
  const cfg = getGa4ServerConfig();
  if (!cfg) throw new Error("Thiếu cấu hình GA4 trên server.");
  clientSingleton = new BetaAnalyticsDataClient({
    credentials: {
      client_email: cfg.clientEmail,
      private_key: cfg.privateKey,
    },
  });
  return clientSingleton;
}

export async function fetchWebTrafficReport(opts: {
  preset: WebTrafficPreset;
  customFrom?: string;
  customTo?: string;
}): Promise<
  | { ok: true; data: WebTrafficReport }
  | { ok: false; error: string; code?: "not_configured" | "permission_denied" }
> {
  const cfg = getGa4ServerConfig();
  if (!cfg) {
    return {
      ok: false,
      code: "not_configured",
      error: "Chưa cấu hình GA4 (GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY).",
    };
  }

  const { ga4, granularity, rangeLabel } = resolveWebTrafficQuery(
    opts.preset,
    opts.customFrom ?? "",
    opts.customTo ?? "",
  );

  try {
    const client = getClient();
    const property = `properties/${cfg.propertyId}`;
    const timeDimension = granularity === "month" ? "yearMonth" : "date";

    const [timeRes, pagesRes] = await Promise.all([
      client.runReport({
        property,
        dateRanges: [ga4],
        dimensions: [{ name: timeDimension }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "sessions" },
        ],
        orderBys: [{ dimension: { dimensionName: timeDimension } }],
        limit: 366,
      }),
      client.runReport({
        property,
        dateRanges: [ga4],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 25,
      }),
    ]);

    const timeRows = timeRes[0]?.rows ?? [];
    const timeSeries: WebTrafficTimePoint[] = timeRows.map((row) => {
      const raw = strDim(row, 0);
      const label =
        granularity === "month" ? formatMonthLabelFromGa4(raw) : formatDayLabelFromGa4(raw);
      return {
        key: raw,
        label,
        pageviews: numMetric(row, 0),
        users: numMetric(row, 1),
        sessions: numMetric(row, 2),
      };
    });

    const pageRows = pagesRes[0]?.rows ?? [];
    const topPages: WebTrafficPageRow[] = pageRows
      .map((row) => ({
        path: strDim(row, 0) || "/",
        pageviews: numMetric(row, 0),
        users: numMetric(row, 1),
        avgEngagementSec: Math.round(numMetric(row, 2)),
      }))
      .filter((p) => p.pageviews > 0);

    const totals = timeSeries.reduce(
      (acc, row) => ({
        pageviews: acc.pageviews + row.pageviews,
        users: acc.users + row.users,
        sessions: acc.sessions + row.sessions,
      }),
      { pageviews: 0, users: 0, sessions: 0 },
    );

    return {
      ok: true,
      data: {
        rangeLabel,
        granularity,
        totals,
        timeSeries,
        topPages,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi GA4 không xác định.";
    if (msg.includes("PERMISSION_DENIED")) {
      return {
        ok: false,
        code: "permission_denied",
        error:
          "Service account chưa có quyền Viewer trên property GA4. Vào Admin → Property access management → thêm email service account.",
      };
    }
    return { ok: false, error: msg };
  }
}
