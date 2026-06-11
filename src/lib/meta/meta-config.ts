export type MetaServerConfig = {
  accessToken: string;
  pageId: string;
  adAccountId: string | null;
};

/** Dọn token copy từ Graph API Explorer / JSON — tránh xuống dòng, ngoặc, prefix JSON. */
export function normalizeMetaAccessToken(raw: string | undefined): string | null {
  if (!raw) return null;
  let token = raw.trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  const jsonMatch = token.match(/"access_token"\s*:\s*"([^"]+)"/);
  if (jsonMatch?.[1]) token = jsonMatch[1];
  token = token.replace(/\s+/g, "");
  token = dedupeConcatenatedMetaToken(token);
  return token.length > 0 ? token : null;
}

/** Graph API Explorer đôi khi dán chồng token cũ + mới (2 lần EAA...) — lấy đoạn cuối. */
function dedupeConcatenatedMetaToken(token: string): string {
  const segments: string[] = [];
  let searchFrom = 0;
  while (searchFrom < token.length) {
    const start = token.indexOf("EAA", searchFrom);
    if (start === -1) break;
    const next = token.indexOf("EAA", start + 3);
    segments.push(next === -1 ? token.slice(start) : token.slice(start, next));
    searchFrom = start + 3;
  }
  if (segments.length <= 1) return token;
  return segments[segments.length - 1] ?? token;
}

export function getMetaServerConfig(): MetaServerConfig | null {
  const accessToken = normalizeMetaAccessToken(process.env.META_ACCESS_TOKEN);
  const pageId = process.env.META_PAGE_ID?.trim();
  if (!accessToken || !pageId) return null;
  const adAccountId = process.env.META_AD_ACCOUNT_ID?.trim() || null;
  return { accessToken, pageId, adAccountId };
}

export function isMetaConfiguredForAdmin(): boolean {
  return getMetaServerConfig() != null;
}

/** Chuyển lỗi Graph API sang hướng dẫn tiếng Việt — ẩn token trong message. */
export function normalizeMetaApiErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("malformed access token")) {
    return "Token Meta không hợp lệ — thường do dán 2 token dính liền hoặc thừa khoảng trắng. Graph API Explorer → chọn Page「Đồ họa Sine Art」→ copy Mã truy cập (một dòng EAA..., ~240 ký tự) → .env.local → restart.";
  }
  if (lower.includes("session has expired") || lower.includes("error validating access token")) {
    return "Token Meta đã hết hạn — cần generate token mới. Khuyến nghị System User (Business Manager) để token không hết hạn ~60 ngày. Graph API Explorer → Page「Đồ họa Sine Art」→ quyền read_insights, pages_read_engagement, pages_show_list, pages_messaging, business_management, ads_read → cập nhật META_ACCESS_TOKEN trong .env.local → restart dev server.";
  }
  if (lower.includes("page access token is required") || raw.includes("(#210)")) {
    return META_PAGE_TOKEN_REQUIRED_HELP;
  }
  return raw.replace(/EAA[A-Za-z0-9+/=_-]{20,}/g, "[token]");
}

export const META_PAGE_TOKEN_REQUIRED_HELP =
  "Token hiện tại là System User / User token — Meta yêu cầu Page access token cho insights và bài đăng. Business Manager → System User đã gán Fanpage → GET /{page-id}?fields=access_token hoặc /me/accounts → copy access_token của Page → META_ACCESS_TOKEN trong .env.local. (App tự đổi token nếu System User đã gán Page đúng quyền.)";

type GraphErrorBody = { error?: { message?: string; code?: number } };

let cachedPageToken: { envToken: string; pageId: string; pageToken: string } | null = null;

async function graphGetJson<T>(path: string, params: Record<string, string>): Promise<T & GraphErrorBody> {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: "no-store" });
  return (await res.json()) as T & GraphErrorBody;
}

/** System User token → Page access token (cache theo env token + page id). */
export async function resolveMetaPageAccessToken(envToken: string, pageId: string): Promise<string> {
  if (cachedPageToken?.envToken === envToken && cachedPageToken.pageId === pageId) {
    return cachedPageToken.pageToken;
  }

  const probe = await graphGetJson<{ data?: unknown[] }>(`/${pageId}/published_posts`, {
    limit: "1",
    access_token: envToken,
  });
  if (!probe.error) {
    cachedPageToken = { envToken, pageId, pageToken: envToken };
    return envToken;
  }
  if (probe.error?.code !== 210) {
    throw new Error(probe.error.message ?? META_PAGE_TOKEN_REQUIRED_HELP);
  }

  const pageNode = await graphGetJson<{ access_token?: string }>(`/${pageId}`, {
    fields: "access_token",
    access_token: envToken,
  });
  if (pageNode.access_token) {
    cachedPageToken = { envToken, pageId, pageToken: pageNode.access_token };
    return pageNode.access_token;
  }

  let nextUrl: string | null =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=id,access_token&limit=100&access_token=${encodeURIComponent(envToken)}`;
  while (nextUrl) {
    const res = await fetch(nextUrl, { cache: "no-store" });
    const json = (await res.json()) as {
      data?: { id?: string; access_token?: string }[];
      paging?: { next?: string };
      error?: { message?: string };
    };
    if (!res.ok || json.error) break;
    for (const page of json.data ?? []) {
      if (page.id === pageId && page.access_token) {
        cachedPageToken = { envToken, pageId, pageToken: page.access_token };
        return page.access_token;
      }
    }
    nextUrl = json.paging?.next ?? null;
  }

  throw new Error(META_PAGE_TOKEN_REQUIRED_HELP);
}

export const META_GRAPH_VERSION = "v22.0";
