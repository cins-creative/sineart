export type MetaServerConfig = {
  accessToken: string;
  pageId: string;
  adAccountId: string | null;
};

export function getMetaServerConfig(): MetaServerConfig | null {
  const accessToken = process.env.META_ACCESS_TOKEN?.trim();
  const pageId = process.env.META_PAGE_ID?.trim();
  if (!accessToken || !pageId) return null;
  const adAccountId = process.env.META_AD_ACCOUNT_ID?.trim() || null;
  return { accessToken, pageId, adAccountId };
}

export function isMetaConfiguredForAdmin(): boolean {
  return getMetaServerConfig() != null;
}

export const META_GRAPH_VERSION = "v22.0";
