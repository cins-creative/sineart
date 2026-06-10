import { getMetaServerConfig, META_GRAPH_VERSION } from "@/lib/meta/meta-config";

export type MetaInsightsPreset = "all" | "week" | "month" | "quarter" | "year" | "custom";

export type MetaMetricTotals = {
  pageMediaViews: number;
  pageEngagements: number;
  pageFollows: number;
  adSpend: number;
  adImpressions: number;
  adClicks: number;
  adMessages: number;
};

export type MetaInsightsTimePoint = {
  dateYmd: string;
  label: string;
  pageMediaViews: number;
  pageEngagements: number;
  pageFollows: number;
  adSpend: number;
  adImpressions: number;
  adClicks: number;
  adMessages: number;
};

export type MetaInsightsReport = {
  pageName: string;
  rangeLabel: string;
  compareRangeLabel: string;
  granularity: "day" | "month";
  hasAdAccount: boolean;
  totals: MetaMetricTotals;
  compareTotals: MetaMetricTotals;
  deltas: Record<keyof MetaMetricTotals, number | null>;
  timeSeries: MetaInsightsTimePoint[];
};

type DateRangeYmd = { startYmd: string; endYmd: string };

type GraphError = { message?: string; type?: string; code?: number };

function formatYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daySpanInclusive(startYmd: string, endYmd: string): number {
  const s = parseYmd(startYmd);
  const e = parseYmd(endYmd);
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

function formatDayLabel(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function formatMonthLabel(ymd: string): string {
  const [y, m] = ymd.split("-");
  return `T${Number(m)}/${y}`;
}

function presetToRange(preset: Exclude<MetaInsightsPreset, "all" | "custom">): DateRangeYmd {
  const today = new Date();
  const endYmd = formatYMDLocal(today);
  if (preset === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  if (preset === "month") {
    return { startYmd: formatYMDLocal(new Date(today.getFullYear(), today.getMonth(), 1)), endYmd };
  }
  if (preset === "quarter") {
    const q = Math.floor(today.getMonth() / 3);
    return { startYmd: formatYMDLocal(new Date(today.getFullYear(), q * 3, 1)), endYmd };
  }
  return { startYmd: formatYMDLocal(new Date(today.getFullYear(), 0, 1)), endYmd };
}

function normalizeCustomRange(customFrom: string, customTo: string): DateRangeYmd {
  const todayYmd = formatYMDLocal(new Date());
  let from = customFrom.trim().slice(0, 10);
  let to = customTo.trim().slice(0, 10);
  if (!from && !to) return { startYmd: todayYmd, endYmd: todayYmd };
  if (!from) from = to || todayYmd;
  if (!to) to = from || todayYmd;
  if (from > to) [from, to] = [to, from];
  return { startYmd: from, endYmd: to };
}

function resolveRange(preset: MetaInsightsPreset, customFrom: string, customTo: string): DateRangeYmd {
  if (preset === "all") {
    const today = new Date();
    const start = new Date(today);
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    return { startYmd: formatYMDLocal(start), endYmd: formatYMDLocal(today) };
  }
  if (preset === "custom") return normalizeCustomRange(customFrom, customTo);
  return presetToRange(preset);
}

function previousRange(range: DateRangeYmd): DateRangeYmd {
  const span = daySpanInclusive(range.startYmd, range.endYmd);
  const end = parseYmd(range.startYmd);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - (span - 1));
  return { startYmd: formatYMDLocal(start), endYmd: formatYMDLocal(end) };
}

function ymdFromMetaEndTime(endTime: string): string {
  return endTime.trim().slice(0, 10);
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const cfg = getMetaServerConfig();
  if (!cfg) throw new Error("Thiếu cấu hình Meta.");

  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}`);
  url.searchParams.set("access_token", cfg.accessToken);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as T & { error?: GraphError };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Meta Graph API lỗi HTTP ${res.status}`);
  }
  return json;
}

type InsightValue = { value?: number | string; end_time?: string };
type InsightMetric = { name?: string; values?: InsightValue[] };

async function fetchPageInsights(range: DateRangeYmd): Promise<{
  pageMediaViews: Map<string, number>;
  pageEngagements: Map<string, number>;
  pageFollows: Map<string, number>;
}> {
  const cfg = getMetaServerConfig();
  if (!cfg) throw new Error("Thiếu cấu hình Meta.");

  const metrics = ["page_media_view", "page_post_engagements", "page_daily_follows_unique"].join(",");
  const json = await graphGet<{ data?: InsightMetric[] }>(`/${cfg.pageId}/insights`, {
    metric: metrics,
    period: "day",
    since: range.startYmd,
    until: range.endYmd,
  });

  const pageMediaViews = new Map<string, number>();
  const pageEngagements = new Map<string, number>();
  const pageFollows = new Map<string, number>();

  for (const block of json.data ?? []) {
    const name = block.name ?? "";
    const target =
      name === "page_media_view"
        ? pageMediaViews
        : name === "page_post_engagements"
          ? pageEngagements
          : name === "page_daily_follows_unique"
            ? pageFollows
            : null;
    if (!target) continue;
    for (const v of block.values ?? []) {
      const ymd = v.end_time ? ymdFromMetaEndTime(v.end_time) : "";
      if (!ymd) continue;
      const n = Number(v.value);
      target.set(ymd, Number.isFinite(n) ? n : 0);
    }
  }

  const hasAny =
    pageMediaViews.size > 0 || pageEngagements.size > 0 || pageFollows.size > 0 || (json.data?.length ?? 0) > 0;
  if (!hasAny) {
    await throwIfMissingReadInsights(cfg.accessToken);
  }

  return { pageMediaViews, pageEngagements, pageFollows };
}

const META_READ_INSIGHTS_HELP =
  "Token thiếu quyền read_insights — Meta trả về rỗng (dashboard toàn 0). Vào developers.facebook.com → App Sine Art Analytics → Use cases / Quyền → thêm read_insights → Graph API Explorer Generate token lại (read_insights + pages_read_engagement + pages_show_list + business_management) → me/accounts → copy access_token Page → .env.local → restart.";

async function throwIfMissingReadInsights(accessToken: string): Promise<void> {
  try {
    const debug = await graphGet<{ data?: { scopes?: string[]; is_valid?: boolean } }>(`/debug_token`, {
      input_token: accessToken,
      access_token: accessToken,
    });
    const scopes = debug.data?.scopes ?? [];
    if (!scopes.includes("read_insights")) {
      throw new Error(META_READ_INSIGHTS_HELP);
    }
  } catch (e) {
    if (e instanceof Error && e.message === META_READ_INSIGHTS_HELP) throw e;
  }
  throw new Error("Không có dữ liệu Fanpage insights trong khoảng đã chọn — thử kỳ dài hơn hoặc kiểm tra quyền read_insights trên token.");
}

function extractMessageCount(actions: { action_type?: string; value?: string }[] | undefined): number {
  if (!actions?.length) return 0;
  let n = 0;
  for (const a of actions) {
    const t = a.action_type ?? "";
    if (
      t.includes("onsite_conversion.messaging_conversation") ||
      t.includes("messaging_conversation") ||
      t === "onsite_conversion.total_messaging_connection"
    ) {
      n += Number(a.value) || 0;
    }
  }
  return n;
}

type AdInsightRow = {
  date_start?: string;
  spend?: string;
  impressions?: string;
  inline_link_clicks?: string;
  actions?: { action_type?: string; value?: string }[];
};

async function fetchAdInsights(range: DateRangeYmd): Promise<{
  adSpend: Map<string, number>;
  adImpressions: Map<string, number>;
  adClicks: Map<string, number>;
  adMessages: Map<string, number>;
}> {
  const cfg = getMetaServerConfig();
  const adSpend = new Map<string, number>();
  const adImpressions = new Map<string, number>();
  const adClicks = new Map<string, number>();
  const adMessages = new Map<string, number>();

  if (!cfg?.adAccountId) {
    return { adSpend, adImpressions, adClicks, adMessages };
  }

  const actId = cfg.adAccountId.startsWith("act_") ? cfg.adAccountId : `act_${cfg.adAccountId}`;
  const timeRange = JSON.stringify({ since: range.startYmd, until: range.endYmd });

  const json = await graphGet<{ data?: AdInsightRow[] }>(`/${actId}/insights`, {
    fields: "spend,impressions,inline_link_clicks,actions",
    time_range: timeRange,
    time_increment: "1",
    level: "account",
  });

  for (const row of json.data ?? []) {
    const ymd = row.date_start?.trim().slice(0, 10);
    if (!ymd) continue;
    adSpend.set(ymd, Number(row.spend) || 0);
    adImpressions.set(ymd, Number(row.impressions) || 0);
    adClicks.set(ymd, Number(row.inline_link_clicks) || 0);
    adMessages.set(ymd, extractMessageCount(row.actions));
  }

  return { adSpend, adImpressions, adClicks, adMessages };
}

function enumerateDays(range: DateRangeYmd): string[] {
  const out: string[] = [];
  for (let d = parseYmd(range.startYmd); ; d.setDate(d.getDate() + 1)) {
    const ymd = formatYMDLocal(d);
    out.push(ymd);
    if (ymd >= range.endYmd) break;
  }
  return out;
}

function emptyTotals(): MetaMetricTotals {
  return {
    pageMediaViews: 0,
    pageEngagements: 0,
    pageFollows: 0,
    adSpend: 0,
    adImpressions: 0,
    adClicks: 0,
    adMessages: 0,
  };
}

function sumMaps(
  days: string[],
  maps: {
    pageMediaViews: Map<string, number>;
    pageEngagements: Map<string, number>;
    pageFollows: Map<string, number>;
    adSpend: Map<string, number>;
    adImpressions: Map<string, number>;
    adClicks: Map<string, number>;
    adMessages: Map<string, number>;
  },
): MetaMetricTotals {
  return days.reduce((acc, ymd) => {
    acc.pageMediaViews += maps.pageMediaViews.get(ymd) ?? 0;
    acc.pageEngagements += maps.pageEngagements.get(ymd) ?? 0;
    acc.pageFollows += maps.pageFollows.get(ymd) ?? 0;
    acc.adSpend += maps.adSpend.get(ymd) ?? 0;
    acc.adImpressions += maps.adImpressions.get(ymd) ?? 0;
    acc.adClicks += maps.adClicks.get(ymd) ?? 0;
    acc.adMessages += maps.adMessages.get(ymd) ?? 0;
    return acc;
  }, emptyTotals());
}

function buildTimeSeries(
  days: string[],
  maps: {
    pageMediaViews: Map<string, number>;
    pageEngagements: Map<string, number>;
    pageFollows: Map<string, number>;
    adSpend: Map<string, number>;
    adImpressions: Map<string, number>;
    adClicks: Map<string, number>;
    adMessages: Map<string, number>;
  },
  granularity: "day" | "month",
): MetaInsightsTimePoint[] {
  if (granularity === "day") {
    return days.map((ymd) => ({
      dateYmd: ymd,
      label: formatDayLabel(ymd),
      pageMediaViews: maps.pageMediaViews.get(ymd) ?? 0,
      pageEngagements: maps.pageEngagements.get(ymd) ?? 0,
      pageFollows: maps.pageFollows.get(ymd) ?? 0,
      adSpend: maps.adSpend.get(ymd) ?? 0,
      adImpressions: maps.adImpressions.get(ymd) ?? 0,
      adClicks: maps.adClicks.get(ymd) ?? 0,
      adMessages: maps.adMessages.get(ymd) ?? 0,
    }));
  }

  const groups = new Map<string, MetaInsightsTimePoint>();
  for (const ymd of days) {
    const key = ymd.slice(0, 7);
    const row = {
      pageMediaViews: maps.pageMediaViews.get(ymd) ?? 0,
      pageEngagements: maps.pageEngagements.get(ymd) ?? 0,
      pageFollows: maps.pageFollows.get(ymd) ?? 0,
      adSpend: maps.adSpend.get(ymd) ?? 0,
      adImpressions: maps.adImpressions.get(ymd) ?? 0,
      adClicks: maps.adClicks.get(ymd) ?? 0,
      adMessages: maps.adMessages.get(ymd) ?? 0,
    };
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { dateYmd: `${key}-01`, label: formatMonthLabel(`${key}-01`), ...row });
      continue;
    }
    existing.pageMediaViews += row.pageMediaViews;
    existing.pageEngagements += row.pageEngagements;
    existing.pageFollows += row.pageFollows;
    existing.adSpend += row.adSpend;
    existing.adImpressions += row.adImpressions;
    existing.adClicks += row.adClicks;
    existing.adMessages += row.adMessages;
  }
  return [...groups.values()];
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function buildDeltas(
  current: MetaMetricTotals,
  previous: MetaMetricTotals,
): Record<keyof MetaMetricTotals, number | null> {
  return {
    pageMediaViews: pctDelta(current.pageMediaViews, previous.pageMediaViews),
    pageEngagements: pctDelta(current.pageEngagements, previous.pageEngagements),
    pageFollows: pctDelta(current.pageFollows, previous.pageFollows),
    adSpend: pctDelta(current.adSpend, previous.adSpend),
    adImpressions: pctDelta(current.adImpressions, previous.adImpressions),
    adClicks: pctDelta(current.adClicks, previous.adClicks),
    adMessages: pctDelta(current.adMessages, previous.adMessages),
  };
}

async function fetchPageName(): Promise<string> {
  const cfg = getMetaServerConfig();
  if (!cfg) return "Fanpage";
  try {
    const json = await graphGet<{ name?: string }>(`/${cfg.pageId}`, { fields: "name" });
    return json.name?.trim() || "Fanpage";
  } catch {
    return "Fanpage";
  }
}

export async function fetchMetaInsightsReport(opts: {
  preset: MetaInsightsPreset;
  customFrom?: string;
  customTo?: string;
}): Promise<
  { ok: true; data: MetaInsightsReport } | { ok: false; error: string; code?: "not_configured" }
> {
  const cfg = getMetaServerConfig();
  if (!cfg) {
    return {
      ok: false,
      code: "not_configured",
      error: "Chưa cấu hình Meta (META_ACCESS_TOKEN, META_PAGE_ID).",
    };
  }

  const range = resolveRange(opts.preset, opts.customFrom ?? "", opts.customTo ?? "");
  const compareRange = previousRange(range);
  const span = daySpanInclusive(range.startYmd, range.endYmd);
  const granularity: "day" | "month" = span > 45 ? "month" : "day";

  try {
    const [pageName, currentPage, currentAds, comparePage, compareAds] = await Promise.all([
      fetchPageName(),
      fetchPageInsights(range),
      fetchAdInsights(range),
      fetchPageInsights(compareRange),
      fetchAdInsights(compareRange),
    ]);

    const currentMaps = { ...currentPage, ...currentAds };
    const compareMaps = { ...comparePage, ...compareAds };
    const currentDays = enumerateDays(range);
    const compareDays = enumerateDays(compareRange);

    const totals = sumMaps(currentDays, currentMaps);
    const compareTotals = sumMaps(compareDays, compareMaps);
    totals.adSpend = Math.round(totals.adSpend * 100) / 100;
    compareTotals.adSpend = Math.round(compareTotals.adSpend * 100) / 100;

    return {
      ok: true,
      data: {
        pageName,
        rangeLabel: `${formatDayLabel(range.startYmd)} → ${formatDayLabel(range.endYmd)}`,
        compareRangeLabel: `${formatDayLabel(compareRange.startYmd)} → ${formatDayLabel(compareRange.endYmd)}`,
        granularity,
        hasAdAccount: Boolean(cfg.adAccountId),
        totals,
        compareTotals,
        deltas: buildDeltas(totals, compareTotals),
        timeSeries: buildTimeSeries(currentDays, currentMaps, granularity),
      },
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Lỗi Meta Graph API.";
    const error = raw.toLowerCase().includes("malformed access token")
      ? "Token Meta không hợp lệ — copy lại access_token của Page từ Graph API Explorer (me/accounts), dán một dòng trong .env.local, không dấu ngoặc, rồi restart server."
      : raw.replace(/EAA[A-Za-z0-9+/=_-]{20,}/g, "[token]");
    return { ok: false, error };
  }
}
