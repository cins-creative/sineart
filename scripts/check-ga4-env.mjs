import { createPrivateKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function normalizeGa4PrivateKey(raw) {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const pemMatch = key.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----([\s\S]*?)-----END (?:RSA )?PRIVATE KEY-----/);
  if (!pemMatch) return key;
  const body = pemMatch[1].replace(/\s/g, "");
  if (!body) return key;
  const header = key.includes("BEGIN RSA PRIVATE KEY")
    ? "-----BEGIN RSA PRIVATE KEY-----"
    : "-----BEGIN PRIVATE KEY-----";
  const footer = key.includes("END RSA PRIVATE KEY")
    ? "-----END RSA PRIVATE KEY-----"
    : "-----END PRIVATE KEY-----";
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `${header}\n${lines.join("\n")}\n${footer}\n`;
}

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

const propertyId = (vars.GA4_PROPERTY_ID || "").trim();
const clientEmail = (vars.GA4_CLIENT_EMAIL || "").trim();
const rawKey = (vars.GA4_PRIVATE_KEY || "").trim();

console.log("ENV format:");
console.log("  GA4_PROPERTY_ID:", propertyId || "(empty)");
console.log("  GA4_CLIENT_EMAIL:", clientEmail || "(empty)");
console.log("  GA4_PRIVATE_KEY length:", rawKey.length || 0);
console.log("  GA4_PRIVATE_KEY has BEGIN:", rawKey.includes("BEGIN PRIVATE KEY"));
console.log("  GA4_PRIVATE_KEY has literal \\n:", rawKey.includes("\\n"));

if (!propertyId || !clientEmail || !rawKey) {
  console.log("FAIL: thiếu GA4_PROPERTY_ID, GA4_CLIENT_EMAIL hoặc GA4_PRIVATE_KEY");
  process.exit(1);
}

const privateKey = normalizeGa4PrivateKey(rawKey);
try {
  createPrivateKey(privateKey);
  console.log("PRIVATE KEY: OK (OpenSSL decode thành công)");
} catch (e) {
  console.log("PRIVATE KEY: FAIL");
  console.log(" ", e instanceof Error ? e.message : String(e));
  console.log("");
  console.log("Sửa .env.local — một dòng, \\n thay xuống dòng thật:");
  console.log('GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n"');
  process.exit(1);
}

console.log("");
console.log("Copy 3 biến trên sang Vercel (Production) y hệt .env.local, rồi Redeploy.");
console.log("Lỗi production DECODER routines::unsupported = GA4_PRIVATE_KEY trên Vercel khác/bị hỏng so với local.");
