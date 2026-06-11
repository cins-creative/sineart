import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const GRAPH_VERSION = "v22.0";

const envPath = resolve(process.cwd(), ".env.local");
let raw;
try {
  raw = readFileSync(envPath, "utf8");
} catch {
  console.log("FAIL: .env.local not found");
  process.exit(1);
}

const vars = {};
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  vars[t.slice(0, i).trim()] = t.slice(i + 1);
}

const pageId = (vars.META_PAGE_ID || "").trim();
let envToken = (vars.META_ACCESS_TOKEN || "").trim();
if (
  (envToken.startsWith('"') && envToken.endsWith('"')) ||
  (envToken.startsWith("'") && envToken.endsWith("'"))
) {
  envToken = envToken.slice(1, -1).trim();
}
const jsonMatch = envToken.match(/"access_token"\s*:\s*"([^"]+)"/);
if (jsonMatch?.[1]) envToken = jsonMatch[1];
envToken = envToken.replace(/\s+/g, "");

const issues = [];
if (!pageId) issues.push("META_PAGE_ID missing");
else if (pageId !== "199809030509769") issues.push(`META_PAGE_ID=${pageId} (expected 199809030509769)`);
if (!envToken) issues.push("META_ACCESS_TOKEN missing");
else {
  if (!envToken.startsWith("EAA")) issues.push("token should start with EAA");
  if (envToken.length < 100) issues.push(`token too short (${envToken.length} chars) — likely truncated`);
  if (envToken.length > 320) issues.push(`token too long (${envToken.length} chars) — có thể dán 2 token dính liền`);
  if ((envToken.match(/EAA/g) ?? []).length > 1) issues.push("token contains EAA twice — dán chồng token cũ + mới");
  if (/\s/.test(vars.META_ACCESS_TOKEN || "")) issues.push("token contains whitespace/newline in raw env");
  if (envToken.includes("access_token")) issues.push("looks like JSON fragment, not raw token");
}

console.log("ENV format:");
console.log("  META_PAGE_ID:", pageId || "(empty)");
console.log("  META_ACCESS_TOKEN length:", envToken.length || 0);
console.log("  META_ACCESS_TOKEN prefix:", envToken ? `${envToken.slice(0, 12)}...` : "(empty)");
if (issues.length) {
  console.log("ISSUES:", issues.join("; "));
  process.exit(1);
}

async function graphGet(path, params) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  return res.json();
}

async function resolvePageToken(token, pid) {
  const probe = await graphGet(`/${pid}/published_posts`, { limit: "1", access_token: token });
  if (!probe.error) return { token, source: "env (already page token)" };

  if (probe.error?.code !== 210) {
    return { error: probe.error?.message ?? "published_posts probe failed" };
  }

  const pageNode = await graphGet(`/${pid}`, { fields: "access_token", access_token: token });
  if (pageNode.access_token) return { token: pageNode.access_token, source: "/{page-id}?fields=access_token" };

  let nextUrl = `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,access_token&limit=100&access_token=${encodeURIComponent(token)}`;
  while (nextUrl) {
    const res = await fetch(nextUrl);
    const json = await res.json();
    if (!res.ok || json.error) break;
    for (const page of json.data ?? []) {
      if (page.id === pid && page.access_token) {
        return { token: page.access_token, source: "/me/accounts" };
      }
    }
    nextUrl = json.paging?.next ?? null;
  }

  return {
    error:
      "System User token OK nhưng chưa đổi được Page token (#210). Business Manager → System User → gán Fanpage Đồ họa Sine Art (quyền Phân tích hoặc Quản lý) → generate token lại.",
  };
}

const basic = await graphGet(`/${pageId}`, { fields: "name,fan_count", access_token: envToken });
if (basic.error) {
  console.log("META API: FAIL");
  console.log("  code:", basic.error.code);
  console.log(
    "  message:",
    String(basic.error.message).replace(/EAA[A-Za-z0-9+/=_-]{20,}/g, "[token]"),
  );
  const debugFail = await graphGet("/debug_token", { input_token: envToken, access_token: envToken });
  const d = debugFail.data ?? {};
  if (d.type) console.log("  token type:", d.type);
  if (d.expires_at != null) {
    const exp =
      d.expires_at === 0
        ? "never (System User — không hết hạn)"
        : new Date(d.expires_at * 1000).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    console.log("  expires_at:", exp);
  }
  if (d.type === "USER" && d.expires_at && d.expires_at > 0) {
    console.log("");
    console.log("TIP: Đây là User token tạm (~1–2 giờ) từ Graph API Explorer — KHÔNG phải System User.");
    console.log("     Tạo token trong Business Manager → System users → Generate → chọn Never expire.");
  }
  process.exit(1);
}
console.log("META API: OK");
console.log("  page:", basic.name);
console.log("  fan_count:", basic.fan_count ?? "(n/a)");

const resolved = await resolvePageToken(envToken, pageId);
if (resolved.error) {
  console.log("PAGE TOKEN: FAIL");
  console.log(" ", resolved.error);
  process.exit(1);
}

const token = resolved.token;
console.log("PAGE TOKEN:", resolved.source);
console.log("  page token length:", token.length);

const debugJson = await graphGet("/debug_token", { input_token: token, access_token: token });
const scopes = debugJson.data?.scopes ?? [];
console.log("  scopes:", scopes.join(", ") || "(none)");
if (debugJson.data?.expires_at != null) {
  const exp =
    debugJson.data.expires_at === 0
      ? "never"
      : new Date(debugJson.data.expires_at * 1000).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  console.log("  page token expires:", exp);
}
if (!scopes.includes("read_insights")) {
  console.log("WARN: thiếu read_insights — dashboard Meta sẽ toàn 0. Thêm quyền trong App + Generate token lại.");
  process.exit(2);
}
if (!scopes.includes("pages_messaging")) {
  console.log("WARN: thiếu pages_messaging — thêm use case Messenger trong App Dashboard, rồi generate token lại.");
}
if (!scopes.includes("ads_read")) {
  console.log("NOTE: thiếu ads_read — tab Ads sẽ không có chi phí/quảng cáo (tuỳ chọn).");
}

const insightsJson = await graphGet(`/${pageId}/insights`, {
  metric: "page_messages_new_conversations_unique",
  period: "day",
  date_preset: "last_28d",
  access_token: token,
});
const insightBlocks = insightsJson.data?.length ?? 0;
const msgPoints = insightsJson.data?.[0]?.values?.length ?? 0;
console.log("  insights blocks (28d):", insightBlocks);
console.log("  inbox new conv points (28d):", msgPoints);
if (insightsJson.error) {
  console.log("  insights error:", insightsJson.error.message);
  process.exit(1);
}

const postsJson = await graphGet(`/${pageId}/published_posts`, {
  fields: "created_time",
  since: String(Math.floor(Date.now() / 1000 - 28 * 86400)),
  limit: "5",
  access_token: token,
});
console.log("  published_posts sample:", postsJson.error?.message ?? `${postsJson.data?.length ?? 0} rows (API OK)`);
if (postsJson.error) process.exit(1);

if (insightBlocks === 0) {
  console.log("WARN: insights trả về rỗng — có thể Page ít hoạt động inbox 28 ngày qua, thử metric khác.");
}

const unreadJson = await graphGet(`/${pageId}`, { fields: "unread_message_count", access_token: token });
console.log("  unread inbox:", unreadJson.unread_message_count ?? "(n/a)");
console.log("INSIGHTS: OK");

if (resolved.source !== "env (already page token)" && token !== envToken) {
  console.log("");
  console.log("TIP: Có thể giữ System User token trong .env — app tự đổi Page token khi chạy.");
  console.log("     Hoặc dán Page token (~240 ký tự) trực tiếp vào META_ACCESS_TOKEN.");
}
