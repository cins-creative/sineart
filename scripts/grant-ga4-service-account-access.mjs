/**
 * Một lần: cấp quyền Viewer GA4 cho service account (khi UI báo "doesn't match a Google Account").
 *
 * Cách A — OAuth Playground (không cần gcloud):
 *   1. Bật "Google Analytics Admin API" trên project sine-art-analytics.
 *   2. https://developers.google.com/oauthplayground/
 *   3. Step 1 → nhập scope: https://www.googleapis.com/auth/analytics.manage.users → Authorize APIs
 *   4. Step 2 → Exchange authorization code for tokens → copy Access token
 *   5. set GA4_ADMIN_OAUTH_TOKEN=ya29....   (PowerShell: $env:GA4_ADMIN_OAUTH_TOKEN="ya29....")
 *   6. node scripts/grant-ga4-service-account-access.mjs
 *
 * Cách B — gcloud (nếu đã cài): gcloud auth application-default login → node scripts/...
 *
 * Chạy: node scripts/grant-ga4-service-account-access.mjs
 */

import { GoogleAuth } from "google-auth-library";

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID?.trim() || "455842534";
const GA4_ACCOUNT_ID = process.env.GA4_ACCOUNT_ID?.trim() || "326661103";
const SERVICE_ACCOUNT_EMAIL =
  process.env.GA4_CLIENT_EMAIL?.trim() || "ga4-admin-reader@sine-art-analytics.iam.gserviceaccount.com";

const SCOPE = "https://www.googleapis.com/auth/analytics.manage.users";
const API = "https://analyticsadmin.googleapis.com/v1alpha";

async function getAccessToken() {
  const manual = process.env.GA4_ADMIN_OAUTH_TOKEN?.trim();
  if (manual) return manual;

  const auth = new GoogleAuth({ scopes: [SCOPE] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) {
    throw new Error(
      "Không có token. Dùng OAuth Playground (xem hướng dẫn đầu file) hoặc cài gcloud: winget install Google.CloudSDK",
    );
  }
  return token;
}

async function createAccessBinding(parent, label, token) {
  const body = {
    user: SERVICE_ACCOUNT_EMAIL,
    roles: ["predefinedRoles/viewer"],
  };

  const res = await fetch(`${API}/${parent}/accessBindings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ ${label} (${res.status}):`, text);
    return false;
  }
  console.log(`✅ ${label}:`, text);
  return true;
}

console.log("Service account:", SERVICE_ACCOUNT_EMAIL);
console.log("Property ID:", GA4_PROPERTY_ID, "| Account ID:", GA4_ACCOUNT_ID);
console.log("");

const token = await getAccessToken();
const okProperty = await createAccessBinding(`properties/${GA4_PROPERTY_ID}`, "Property access", token);
if (!okProperty) {
  console.log("\nThử account level…");
  await createAccessBinding(`accounts/${GA4_ACCOUNT_ID}`, "Account access", token);
}

console.log("\nXong — đợi ~1 phút rồi refresh tab Traffic web trong admin.");
