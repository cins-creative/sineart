import {
  getMetaServerConfig,
  META_GRAPH_VERSION,
  META_PAGE_TOKEN_REQUIRED_HELP,
  normalizeMetaApiErrorMessage,
  resolveMetaPageAccessToken,
} from "@/lib/meta/meta-config";

export type MetaInsightsPreset = "all" | "week" | "month" | "quarter" | "year" | "custom";

export type MetaMetricTotals = {
  pageMediaViews: number;
  pageEngagements: number;
  pageFollows: number;
  pagePostsPublished: number;
  messagingNewConversations: number;
  adSpend: number;
  adImpressions: number;
  adClicks: number;
  adMessages: number;
};

export type MetaMessagingSnapshot = {
  /** Tin chưa đọc trong inbox lúc gọi API */
  unreadMessageCount: number | null;
  /** Trung bình phút phản hồi (tính từ hội thoại Messenger gần đây) */
  avgResponseMinutes: number | null;
  /** % tin khách được Page trả lời trong 24h (mẫu hội thoại) */
  responseRatePct: number | null;
  /** Số hội thoại dùng để tính response time/rate */
  responseSampleConversations: number;
  /** Token có pages_messaging — cần để tính thời gian phản hồi */
  hasMessagingPermission: boolean;
  /** Ghi chú khi chưa tính được response time */
  responseTimeNote: string | null;
};

export type MetaInsightsTimePoint = {
  dateYmd: string;
  label: string;
  pageMediaViews: number;
  pageEngagements: number;
  pageFollows: number;
  pagePostsPublished: number;
  messagingNewConversations: number;
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
  messaging: MetaMessagingSnapshot;
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

/** Meta Page Insights: since/until tối đa ~93 ngày mỗi request — chunk an toàn 90 ngày. */
const META_INSIGHTS_CHUNK_DAYS = 90;

function chunkDateRange(range: DateRangeYmd, maxDays = META_INSIGHTS_CHUNK_DAYS): DateRangeYmd[] {
  const chunks: DateRangeYmd[] = [];
  let cursor = parseYmd(range.startYmd);
  const end = parseYmd(range.endYmd);

  while (cursor <= end) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + maxDays - 1);
    const cappedEnd = chunkEnd > end ? end : chunkEnd;
    chunks.push({ startYmd: formatYMDLocal(cursor), endYmd: formatYMDLocal(cappedEnd) });
    cursor = new Date(cappedEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  return chunks;
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

/** Page token đã resolve — dùng cho mọi Graph call trong một lần fetch report. */
let activeMetaAccessToken: string | null = null;

function getActiveMetaAccessToken(): string {
  const cfg = getMetaServerConfig();
  if (!activeMetaAccessToken && !cfg) throw new Error("Thiếu cấu hình Meta.");
  return activeMetaAccessToken ?? cfg!.accessToken;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}`);
  url.searchParams.set("access_token", getActiveMetaAccessToken());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as T & { error?: GraphError };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Meta Graph API lỗi HTTP ${res.status}`);
  }
  return json;
}

async function graphGetUrl<T>(fullUrl: string): Promise<T> {
  const res = await fetch(fullUrl, { cache: "no-store" });
  const json = (await res.json()) as T & { error?: GraphError };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Meta Graph API lỗi HTTP ${res.status}`);
  }
  return json;
}

type InsightValue = { value?: number | string; end_time?: string };
type InsightMetric = { name?: string; values?: InsightValue[] };

function mergeInsightBlocks(
  blocks: InsightMetric[],
  maps: {
    pageMediaViews: Map<string, number>;
    pageEngagements: Map<string, number>;
    pageFollows: Map<string, number>;
    messagingNewConversations: Map<string, number>;
  },
): void {
  for (const block of blocks) {
    const name = block.name ?? "";
    const target =
      name === "page_media_view"
        ? maps.pageMediaViews
        : name === "page_post_engagements"
          ? maps.pageEngagements
          : name === "page_daily_follows_unique"
            ? maps.pageFollows
            : name === "page_messages_new_conversations_unique"
              ? maps.messagingNewConversations
              : null;
    if (!target) continue;
    for (const v of block.values ?? []) {
      const ymd = v.end_time ? ymdFromMetaEndTime(v.end_time) : "";
      if (!ymd) continue;
      const n = Number(v.value);
      target.set(ymd, Number.isFinite(n) ? n : 0);
    }
  }
}

async function fetchPageInsights(range: DateRangeYmd): Promise<{
  pageMediaViews: Map<string, number>;
  pageEngagements: Map<string, number>;
  pageFollows: Map<string, number>;
  messagingNewConversations: Map<string, number>;
}> {
  const cfg = getMetaServerConfig();
  if (!cfg) throw new Error("Thiếu cấu hình Meta.");

  const metrics = [
    "page_media_view",
    "page_post_engagements",
    "page_daily_follows_unique",
    "page_messages_new_conversations_unique",
  ].join(",");

  const pageMediaViews = new Map<string, number>();
  const pageEngagements = new Map<string, number>();
  const pageFollows = new Map<string, number>();
  const messagingNewConversations = new Map<string, number>();
  const maps = { pageMediaViews, pageEngagements, pageFollows, messagingNewConversations };

  let totalBlocks = 0;
  for (const chunk of chunkDateRange(range)) {
    const json = await graphGet<{ data?: InsightMetric[] }>(`/${cfg.pageId}/insights`, {
      metric: metrics,
      period: "day",
      since: chunk.startYmd,
      until: chunk.endYmd,
    });
    totalBlocks += json.data?.length ?? 0;
    mergeInsightBlocks(json.data ?? [], maps);
  }

  const hasAny =
    pageMediaViews.size > 0 ||
    pageEngagements.size > 0 ||
    pageFollows.size > 0 ||
    messagingNewConversations.size > 0 ||
    totalBlocks > 0;
  if (!hasAny) {
    await throwIfMissingReadInsights(getActiveMetaAccessToken());
  }

  return { pageMediaViews, pageEngagements, pageFollows, messagingNewConversations };
}

const MAX_PUBLISHED_POST_PAGES = 15;

async function fetchPublishedPostsByDay(range: DateRangeYmd): Promise<Map<string, number>> {
  const cfg = getMetaServerConfig();
  const byDay = new Map<string, number>();
  if (!cfg) return byDay;

  const since = Math.floor(parseYmd(range.startYmd).getTime() / 1000);
  const until = Math.floor(parseYmd(range.endYmd).getTime() / 1000) + 86_400 - 1;

  type PostRow = { created_time?: string };
  type PostsPage = { data?: PostRow[]; paging?: { next?: string } };
  let nextUrl: string | null = null;

  for (let page = 0; page < MAX_PUBLISHED_POST_PAGES; page += 1) {
    const json: PostsPage = nextUrl
      ? await graphGetUrl<PostsPage>(nextUrl)
      : await graphGet<PostsPage>(`/${cfg.pageId}/published_posts`, {
          fields: "created_time",
          since: String(since),
          until: String(until),
          limit: "100",
        });

    for (const post of json.data ?? []) {
      const created = post.created_time?.trim();
      if (!created) continue;
      const ymd = created.slice(0, 10);
      if (ymd < range.startYmd || ymd > range.endYmd) continue;
      byDay.set(ymd, (byDay.get(ymd) ?? 0) + 1);
    }

    nextUrl = json.paging?.next ?? null;
    if (!nextUrl) break;
  }

  return byDay;
}

const META_READ_INSIGHTS_HELP =
  "Token thiếu quyền read_insights — Meta trả về rỗng (dashboard toàn 0). Vào developers.facebook.com → App Sine Art Analytics → Use cases / Quyền → thêm read_insights → Graph API Explorer Generate token lại (read_insights + pages_read_engagement + pages_show_list + business_management) → me/accounts → copy access_token Page → .env.local → restart.";

async function throwIfMissingReadInsights(accessToken: string): Promise<void> {
  const debug = await graphGet<{ data?: { scopes?: string[]; is_valid?: boolean } }>(`/debug_token`, {
    input_token: accessToken,
    access_token: accessToken,
  });
  const scopes = debug.data?.scopes ?? [];
  if (!scopes.includes("read_insights")) {
    throw new Error(META_READ_INSIGHTS_HELP);
  }
  throw new Error(
    "Không có dữ liệu Fanpage insights trong khoảng đã chọn — thử kỳ dài hơn. Nếu vừa dùng System User token, kiểm tra System User đã được gán Fanpage với quyền Phân tích/Quản lý.",
  );
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

  for (const chunk of chunkDateRange(range)) {
    const timeRange = JSON.stringify({ since: chunk.startYmd, until: chunk.endYmd });
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
    pagePostsPublished: 0,
    messagingNewConversations: 0,
    adSpend: 0,
    adImpressions: 0,
    adClicks: 0,
    adMessages: 0,
  };
}

async function tokenHasScope(scope: string): Promise<boolean> {
  try {
    const cfg = getMetaServerConfig();
    if (!cfg) return false;
    const debug = await graphGet<{ data?: { scopes?: string[] } }>(`/debug_token`, {
      input_token: cfg.accessToken,
      access_token: cfg.accessToken,
    });
    return (debug.data?.scopes ?? []).includes(scope);
  } catch {
    return false;
  }
}

async function fetchPageMessagingSnapshot(): Promise<Pick<MetaMessagingSnapshot, "unreadMessageCount">> {
  const cfg = getMetaServerConfig();
  if (!cfg) return { unreadMessageCount: null };
  try {
    const json = await graphGet<{ unread_message_count?: number }>(`/${cfg.pageId}`, {
      fields: "unread_message_count",
    });
    const n = json.unread_message_count;
    return { unreadMessageCount: typeof n === "number" && Number.isFinite(n) ? n : null };
  } catch {
    return { unreadMessageCount: null };
  }
}

const RESPONSE_WINDOW_MS = 24 * 60 * 60 * 1000;

type ConversationMessage = { created_time?: string; from?: { id?: string } };
type ConversationRow = { updated_time?: string; messages?: { data?: ConversationMessage[] } };

function parseMetaTime(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function computeConversationResponseStats(
  conversations: ConversationRow[],
  pageId: string,
  range: DateRangeYmd,
): { avgResponseMinutes: number | null; responseRatePct: number | null; sampleConversations: number } {
  const rangeStart = parseYmd(range.startYmd).getTime();
  const rangeEnd = parseYmd(range.endYmd).getTime() + 86_400_000 - 1;

  const responseMinutes: number[] = [];
  let userMessages = 0;
  let repliedWithinWindow = 0;
  let usedConversations = 0;

  for (const conv of conversations) {
    const updated = parseMetaTime(conv.updated_time);
    if (updated == null || updated < rangeStart || updated > rangeEnd) continue;

    const msgs = [...(conv.messages?.data ?? [])].sort(
      (a, b) => (parseMetaTime(a.created_time) ?? 0) - (parseMetaTime(b.created_time) ?? 0),
    );
    if (msgs.length === 0) continue;

    usedConversations += 1;
    for (let i = 0; i < msgs.length; i += 1) {
      const fromId = msgs[i].from?.id ?? "";
      if (!fromId || fromId === pageId) continue;

      const userTime = parseMetaTime(msgs[i].created_time);
      if (userTime == null) continue;
      userMessages += 1;

      let replied = false;
      for (let j = i + 1; j < msgs.length; j += 1) {
        if ((msgs[j].from?.id ?? "") !== pageId) continue;
        const pageTime = parseMetaTime(msgs[j].created_time);
        if (pageTime == null || pageTime <= userTime) continue;
        const deltaMs = pageTime - userTime;
        if (deltaMs <= RESPONSE_WINDOW_MS) {
          replied = true;
          responseMinutes.push(deltaMs / 60_000);
        }
        break;
      }
      if (replied) repliedWithinWindow += 1;
    }
  }

  const avgResponseMinutes =
    responseMinutes.length > 0
      ? Math.round((responseMinutes.reduce((a, b) => a + b, 0) / responseMinutes.length) * 10) / 10
      : null;
  const responseRatePct =
    userMessages > 0 ? Math.round((repliedWithinWindow / userMessages) * 1000) / 10 : null;

  return { avgResponseMinutes, responseRatePct, sampleConversations: usedConversations };
}

async function fetchMessagingResponseMetrics(range: DateRangeYmd): Promise<
  Pick<
    MetaMessagingSnapshot,
    "avgResponseMinutes" | "responseRatePct" | "responseSampleConversations" | "hasMessagingPermission" | "responseTimeNote"
  >
> {
  const cfg = getMetaServerConfig();
  if (!cfg) {
    return {
      avgResponseMinutes: null,
      responseRatePct: null,
      responseSampleConversations: 0,
      hasMessagingPermission: false,
      responseTimeNote: null,
    };
  }

  const hasMessagingPermission = await tokenHasScope("pages_messaging");
  if (!hasMessagingPermission) {
    return {
      avgResponseMinutes: null,
      responseRatePct: null,
      responseSampleConversations: 0,
      hasMessagingPermission: false,
      responseTimeNote:
        "Meta không có metric “thời gian phản hồi” trên Insights API. Thêm use case “Engage with customers on Messenger” (Tương tác khách hàng qua Messenger) trong App → Customize → quyền pages_messaging sẽ xuất hiện → Generate lại Page token.",
    };
  }

  try {
    const json = await graphGet<{ data?: ConversationRow[] }>(`/${cfg.pageId}/conversations`, {
      platform: "messenger",
      fields: "updated_time,messages.limit(40){created_time,from}",
      limit: "80",
    });

    const stats = computeConversationResponseStats(json.data ?? [], cfg.pageId, range);
    if (stats.sampleConversations === 0) {
      return {
        avgResponseMinutes: stats.avgResponseMinutes,
        responseRatePct: stats.responseRatePct,
        responseSampleConversations: 0,
        hasMessagingPermission: true,
        responseTimeNote: "Không có hội thoại Messenger trong kỳ đã chọn để tính thời gian phản hồi.",
      };
    }

    return {
      avgResponseMinutes: stats.avgResponseMinutes,
      responseRatePct: stats.responseRatePct,
      responseSampleConversations: stats.sampleConversations,
      hasMessagingPermission: true,
      responseTimeNote:
        stats.avgResponseMinutes == null
          ? "Có hội thoại nhưng chưa thấy tin Page trả lời trong 24h — kiểm tra inbox hoặc chọn kỳ dài hơn."
          : `Tính từ ${stats.sampleConversations} hội thoại gần nhất (phản hồi trong 24h). Số có thể lệch nhẹ so với Meta Business Suite.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không đọc được hội thoại Messenger.";
    return {
      avgResponseMinutes: null,
      responseRatePct: null,
      responseSampleConversations: 0,
      hasMessagingPermission: true,
      responseTimeNote: msg.replace(/EAA[A-Za-z0-9+/=_-]{20,}/g, "[token]"),
    };
  }
}

async function fetchMessagingSnapshot(range: DateRangeYmd): Promise<MetaMessagingSnapshot> {
  const [unread, response] = await Promise.all([fetchPageMessagingSnapshot(), fetchMessagingResponseMetrics(range)]);
  return { ...unread, ...response };
}

function sumMaps(
  days: string[],
  maps: {
    pageMediaViews: Map<string, number>;
    pageEngagements: Map<string, number>;
    pageFollows: Map<string, number>;
    pagePostsPublished: Map<string, number>;
    messagingNewConversations: Map<string, number>;
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
    acc.pagePostsPublished += maps.pagePostsPublished.get(ymd) ?? 0;
    acc.messagingNewConversations += maps.messagingNewConversations.get(ymd) ?? 0;
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
    pagePostsPublished: Map<string, number>;
    messagingNewConversations: Map<string, number>;
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
      pagePostsPublished: maps.pagePostsPublished.get(ymd) ?? 0,
      messagingNewConversations: maps.messagingNewConversations.get(ymd) ?? 0,
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
      pagePostsPublished: maps.pagePostsPublished.get(ymd) ?? 0,
      messagingNewConversations: maps.messagingNewConversations.get(ymd) ?? 0,
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
    existing.pagePostsPublished += row.pagePostsPublished;
    existing.messagingNewConversations += row.messagingNewConversations;
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
    pagePostsPublished: pctDelta(current.pagePostsPublished, previous.pagePostsPublished),
    messagingNewConversations: pctDelta(current.messagingNewConversations, previous.messagingNewConversations),
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

  try {
    activeMetaAccessToken = await resolveMetaPageAccessToken(cfg.accessToken, cfg.pageId);
  } catch (e) {
    const raw = e instanceof Error ? e.message : META_PAGE_TOKEN_REQUIRED_HELP;
    return { ok: false, error: normalizeMetaApiErrorMessage(raw) };
  }

  const range = resolveRange(opts.preset, opts.customFrom ?? "", opts.customTo ?? "");
  const compareRange = previousRange(range);
  const span = daySpanInclusive(range.startYmd, range.endYmd);
  const granularity: "day" | "month" = span > 45 ? "month" : "day";

  try {
    const [pageName, currentPage, currentPosts, currentAds, comparePage, comparePosts, compareAds, messaging] =
      await Promise.all([
      fetchPageName(),
      fetchPageInsights(range),
      fetchPublishedPostsByDay(range),
      fetchAdInsights(range),
      fetchPageInsights(compareRange),
      fetchPublishedPostsByDay(compareRange),
      fetchAdInsights(compareRange),
      fetchMessagingSnapshot(range),
    ]);

    const currentMaps = { ...currentPage, pagePostsPublished: currentPosts, ...currentAds };
    const compareMaps = { ...comparePage, pagePostsPublished: comparePosts, ...compareAds };
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
        messaging,
        timeSeries: buildTimeSeries(currentDays, currentMaps, granularity),
      },
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Lỗi Meta Graph API.";
    return { ok: false, error: normalizeMetaApiErrorMessage(raw) };
  }
}
