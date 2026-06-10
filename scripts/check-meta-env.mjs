import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
let token = (vars.META_ACCESS_TOKEN || "").trim();
if (
  (token.startsWith('"') && token.endsWith('"')) ||
  (token.startsWith("'") && token.endsWith("'"))
) {
  token = token.slice(1, -1).trim();
}
const jsonMatch = token.match(/"access_token"\s*:\s*"([^"]+)"/);
if (jsonMatch?.[1]) token = jsonMatch[1];
token = token.replace(/\s+/g, "");

const issues = [];
if (!pageId) issues.push("META_PAGE_ID missing");
else if (pageId !== "199809030509769") issues.push(`META_PAGE_ID=${pageId} (expected 199809030509769)`);
if (!token) issues.push("META_ACCESS_TOKEN missing");
else {
  if (!token.startsWith("EAA")) issues.push("token should start with EAA");
  if (token.length < 100) issues.push(`token too short (${token.length} chars) — likely truncated`);
  if (/\s/.test(vars.META_ACCESS_TOKEN || "")) issues.push("token contains whitespace/newline in raw env");
  if (token.includes("access_token")) issues.push("looks like JSON fragment, not raw token");
}

console.log("ENV format:");
console.log("  META_PAGE_ID:", pageId || "(empty)");
console.log("  META_ACCESS_TOKEN length:", token.length || 0);
console.log("  META_ACCESS_TOKEN prefix:", token ? `${token.slice(0, 12)}...` : "(empty)");
if (issues.length) {
  console.log("ISSUES:", issues.join("; "));
  process.exit(1);
}

const url = `https://graph.facebook.com/v22.0/${pageId}?fields=name,fan_count&access_token=${encodeURIComponent(token)}`;
const res = await fetch(url);
const json = await res.json();
if (json.error) {
  console.log("META API: FAIL");
  console.log("  code:", json.error.code);
  console.log(
    "  message:",
    String(json.error.message).replace(/EAA[A-Za-z0-9+/=_-]{20,}/g, "[token]"),
  );
  process.exit(1);
}
console.log("META API: OK");
console.log("  page:", json.name);
console.log("  fan_count:", json.fan_count ?? "(n/a)");

const insightsUrl = `https://graph.facebook.com/v22.0/${pageId}/insights?metric=page_post_engagements&period=day&date_preset=last_28d&access_token=${encodeURIComponent(token)}`;
const insightsRes = await fetch(insightsUrl);
const insightsJson = await insightsRes.json();
const insightBlocks = insightsJson.data?.length ?? 0;
const debugUrl = `https://graph.facebook.com/v22.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`;
const debugJson = await (await fetch(debugUrl)).json();
const scopes = debugJson.data?.scopes ?? [];
console.log("  scopes:", scopes.join(", ") || "(none)");
console.log("  insights blocks (28d):", insightBlocks);
if (!scopes.includes("read_insights")) {
  console.log("WARN: thiếu read_insights — dashboard Meta sẽ toàn 0. Thêm quyền trong App + Generate token lại.");
  process.exit(2);
}
if (insightBlocks === 0) {
  console.log("WARN: insights trả về rỗng — kiểm tra read_insights hoặc kỳ dữ liệu.");
  process.exit(2);
}
console.log("INSIGHTS: OK");
