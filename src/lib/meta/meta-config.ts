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

export const META_GRAPH_VERSION = "v22.0";
