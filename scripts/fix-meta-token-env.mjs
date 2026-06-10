import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function dedupeConcatenatedMetaToken(token) {
  const segments = [];
  let searchFrom = 0;
  while (searchFrom < token.length) {
    const start = token.indexOf("EAA", searchFrom);
    if (start === -1) break;
    const next = token.indexOf("EAA", start + 3);
    segments.push(next === -1 ? token.slice(start) : token.slice(start, next));
    searchFrom = start + 3;
  }
  if (segments.length <= 1) return token;
  return segments[segments.length - 1];
}

function normalizeMetaAccessToken(raw) {
  let token = raw.trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  token = token.replace(/\s+/g, "");
  return dedupeConcatenatedMetaToken(token);
}

const path = resolve(process.cwd(), ".env.local");
const raw = readFileSync(path, "utf8");
const lines = raw.split(/\r?\n/);
let fixed = false;

const out = lines.map((line) => {
  if (!line.trim().startsWith("META_ACCESS_TOKEN=")) return line;
  const val = line.slice(line.indexOf("=") + 1);
  const before = val.replace(/\s+/g, "");
  const token = normalizeMetaAccessToken(val);
  if (token !== before) fixed = true;
  return `META_ACCESS_TOKEN=${token}`;
});

if (fixed) {
  writeFileSync(path, out.join("\n"), "utf8");
  console.log("Fixed: removed duplicate token. New length:", normalizeMetaAccessToken(out.find((l) => l.startsWith("META_ACCESS_TOKEN=")).slice(19)).length);
} else {
  console.log("No duplicate token detected.");
}
