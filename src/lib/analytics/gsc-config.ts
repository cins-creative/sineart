import { getGa4ServerConfig } from "@/lib/analytics/ga4-config";

export type GscOAuthConfig = {
  mode: "oauth";
  siteUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type GscServiceAccountConfig = {
  mode: "service_account";
  siteUrl: string;
  clientEmail: string;
  privateKey: string;
};

export type GscAuthConfig = GscOAuthConfig | GscServiceAccountConfig;

export function getGscSiteUrl(): string | null {
  const url = process.env.GSC_SITE_URL?.trim();
  return url || null;
}

/** OAuth Owner (khuyến nghị) hoặc fallback service account GA4. */
export function getGscAuthConfig(): GscAuthConfig | null {
  const siteUrl = getGscSiteUrl();
  if (!siteUrl) return null;

  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN?.trim();
  const clientId = process.env.GSC_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET?.trim();
  if (refreshToken && clientId && clientSecret) {
    return { mode: "oauth", siteUrl, clientId, clientSecret, refreshToken };
  }

  const ga4 = getGa4ServerConfig();
  if (ga4) {
    return {
      mode: "service_account",
      siteUrl,
      clientEmail: ga4.clientEmail,
      privateKey: ga4.privateKey,
    };
  }

  return null;
}

export function isGscConfiguredForAdmin(): boolean {
  return getGscAuthConfig() != null;
}

/** @deprecated Dùng `getGscAuthConfig`. */
export function getGscServerConfig(): GscServiceAccountConfig | null {
  const cfg = getGscAuthConfig();
  if (!cfg || cfg.mode !== "service_account") return null;
  return cfg;
}
