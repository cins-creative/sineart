import { GoogleAuth, OAuth2Client } from "google-auth-library";

import { getGscAuthConfig, type GscAuthConfig } from "@/lib/analytics/gsc-config";

import type { WebTrafficPreset } from "@/lib/data/web-traffic-ga4";

export type GscGranularity = "day" | "month";

export type GscTimePoint = {
  key: string;
  label: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleReport = {
  rangeLabel: string;
  granularity: GscGranularity;
  dataLagNote: string;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  timeSeries: GscTimePoint[];
  topQueries: GscQueryRow[];
  topPages: GscPageRow[];
};

type GscApiRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type GscApiResponse = { rows?: GscApiRow[] };

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const GSC_API = "https://www.googleapis.com/webmasters/v3/sites";
/** GSC thường chưa ổn định 1–2 ngày gần nhất. */
const GSC_LAG_DAYS = 2;

function formatYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function laggedToday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - GSC_LAG_DAYS);
  return d;
}

function presetToRange(preset: Exclude<WebTrafficPreset, "all" | "custom">): {
  startYmd: string;
  endYmd: string;
} {
  const end = laggedToday();
  const endYmd = formatYMDLocal(end);
  if (preset === "week") {
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  if (preset === "month") {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  if (preset === "quarter") {
    const q = Math.floor(end.getMonth() / 3);
    const start = new Date(end.getFullYear(), q * 3, 1);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  const start = new Date(end.getFullYear(), 0, 1);
  return { startYmd: formatYMDLocal(start), endYmd };
}

function normalizeCustomRange(customFrom: string, customTo: string): { startYmd: string; endYmd: string } {
  const endCap = formatYMDLocal(laggedToday());
  let from = customFrom.trim().slice(0, 10);
  let to = customTo.trim().slice(0, 10);
  if (!from && !to) return { startYmd: endCap, endYmd: endCap };
  if (!from) from = to || endCap;
  if (!to) to = from || endCap;
  if (from > to) [from, to] = [to, from];
  if (to > endCap) to = endCap;
  return { startYmd: from, endYmd: to };
}

function daySpanInclusive(startYmd: string, endYmd: string): number {
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  const s = new Date(ys, ms - 1, ds);
  const e = new Date(ye, me - 1, de);
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

function formatDayLabelYmd(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function formatDayLabel(isoDate: string): string {
  if (isoDate.length !== 10) return isoDate;
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `T${Number(m)}/${y}`;
}

function resolveGscQuery(
  preset: WebTrafficPreset,
  customFrom: string,
  customTo: string,
): { startDate: string; endDate: string; granularity: GscGranularity; rangeLabel: string } {
  if (preset === "all") {
    const end = laggedToday();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    const startYmd = formatYMDLocal(start);
    const endYmd = formatYMDLocal(end);
    return {
      startDate: startYmd,
      endDate: endYmd,
      granularity: "month",
      rangeLabel: "12 tháng gần nhất",
    };
  }

  const range =
    preset === "custom" ? normalizeCustomRange(customFrom, customTo) : presetToRange(preset);
  const span = daySpanInclusive(range.startYmd, range.endYmd);
  const granularity: GscGranularity = span > 45 ? "month" : "day";

  return {
    startDate: range.startYmd,
    endDate: range.endYmd,
    granularity,
    rangeLabel: `${formatDayLabelYmd(range.startYmd)} → ${formatDayLabelYmd(range.endYmd)}`,
  };
}

function mapApiRow(row: GscApiRow): {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
} {
  return {
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

function aggregateTotals(rows: { clicks: number; impressions: number; position: number }[]): {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
} {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const weightedPos = rows.reduce((s, r) => s + r.position * r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? weightedPos / impressions : 0,
  };
}

function aggregateDailyToMonthly(daily: GscTimePoint[]): GscTimePoint[] {
  const buckets = new Map<string, { clicks: number; impressions: number; weightedPos: number }>();
  for (const row of daily) {
    const ym = row.key.slice(0, 7);
    const b = buckets.get(ym) ?? { clicks: 0, impressions: 0, weightedPos: 0 };
    b.clicks += row.clicks;
    b.impressions += row.impressions;
    b.weightedPos += row.position * row.impressions;
    buckets.set(ym, b);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, b]) => ({
      key: ym,
      label: formatMonthLabel(ym),
      clicks: b.clicks,
      impressions: b.impressions,
      ctr: b.impressions > 0 ? b.clicks / b.impressions : 0,
      position: b.impressions > 0 ? b.weightedPos / b.impressions : 0,
    }));
}

let serviceAccountAuth: GoogleAuth | null = null;
let oauthClient: OAuth2Client | null = null;

async function getAccessToken(cfg: GscAuthConfig): Promise<string> {
  if (cfg.mode === "oauth") {
    if (!oauthClient) {
      oauthClient = new OAuth2Client(cfg.clientId, cfg.clientSecret);
      oauthClient.setCredentials({ refresh_token: cfg.refreshToken });
    }
    const { token } = await oauthClient.getAccessToken();
    if (!token) throw new Error("Không lấy được access token GSC (OAuth refresh).");
    return token;
  }

  if (!serviceAccountAuth) {
    serviceAccountAuth = new GoogleAuth({
      credentials: {
        client_email: cfg.clientEmail,
        private_key: cfg.privateKey,
      },
      scopes: [GSC_SCOPE],
    });
  }
  const client = await serviceAccountAuth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Không lấy được access token GSC (service account).");
  return token;
}

async function gscSearchAnalytics(
  siteUrl: string,
  token: string,
  body: {
    startDate: string;
    endDate: string;
    dimensions: string[];
    rowLimit?: number;
  },
): Promise<GscApiResponse> {
  const url = `${GSC_API}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: body.startDate,
      endDate: body.endDate,
      dimensions: body.dimensions,
      rowLimit: body.rowLimit ?? 1000,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `GSC HTTP ${res.status}`);
  }
  return JSON.parse(text) as GscApiResponse;
}

export async function fetchSearchConsoleReport(opts: {
  preset: WebTrafficPreset;
  customFrom?: string;
  customTo?: string;
}): Promise<
  | { ok: true; data: SearchConsoleReport }
  | { ok: false; error: string; code?: "not_configured" | "permission_denied" }
> {
  const cfg = getGscAuthConfig();
  if (!cfg) {
    return {
      ok: false,
      code: "not_configured",
      error:
        "Chưa cấu hình GSC (GSC_SITE_URL + GSC_OAUTH_* hoặc GA4 service account).",
    };
  }

  const { startDate, endDate, granularity, rangeLabel } = resolveGscQuery(
    opts.preset,
    opts.customFrom ?? "",
    opts.customTo ?? "",
  );

  try {
    const token = await getAccessToken(cfg);

    const [timeRes, queriesRes, pagesRes] = await Promise.all([
      gscSearchAnalytics(cfg.siteUrl, token, {
        startDate,
        endDate,
        dimensions: ["date"],
        rowLimit: 500,
      }),
      gscSearchAnalytics(cfg.siteUrl, token, {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 25,
      }),
      gscSearchAnalytics(cfg.siteUrl, token, {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 25,
      }),
    ]);

    let timeSeries: GscTimePoint[] = (timeRes.rows ?? []).map((row) => {
      const key = row.keys?.[0] ?? "";
      const m = mapApiRow(row);
      return {
        key,
        label: formatDayLabel(key),
        ...m,
      };
    });

    if (granularity === "month") {
      timeSeries = aggregateDailyToMonthly(timeSeries);
    }

    const topQueries: GscQueryRow[] = (queriesRes.rows ?? []).map((row) => ({
      query: row.keys?.[0] ?? "",
      ...mapApiRow(row),
    }));

    const topPages: GscPageRow[] = (pagesRes.rows ?? []).map((row) => ({
      page: row.keys?.[0] ?? "",
      ...mapApiRow(row),
    }));

    const totals = aggregateTotals(timeSeries);

    return {
      ok: true,
      data: {
        rangeLabel,
        granularity,
        dataLagNote: `Dữ liệu đến ${formatDayLabel(endDate)} (GSC trễ ~${GSC_LAG_DAYS} ngày)`,
        totals,
        timeSeries,
        topQueries,
        topPages,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi GSC không xác định.";
    if (msg.includes("403") || msg.includes("Forbidden")) {
      return {
        ok: false,
        code: "permission_denied",
        error:
          "Không có quyền đọc Search Console — kiểm tra OAuth refresh token (Owner sineart.vn) hoặc quyền service account.",
      };
    }
    return { ok: false, error: msg };
  }
}
