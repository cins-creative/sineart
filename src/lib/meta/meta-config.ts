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
  return token.length > 0 ? token : null;
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
