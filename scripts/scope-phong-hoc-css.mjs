import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcHtml =
  process.argv[2] ||
  "C:/Users/DELL/Downloads/sine-art-classroom-layouts (1).html";
/** Ghi ra file tạm — UI chính là phong-hoc-ui.css (đồng bộ DHP), không ghi đè. */
const outCss = path.join(root, "src/app/phong-hoc/phong-hoc-from-html.css");

const h = fs.readFileSync(srcHtml, "utf8");
const m = h.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error("no <style> in html");
let c = m[1];

c = c.replace(
  /\*,\*::before,\*::after\{[^}]+\}/,
  ".phc *, .phc *::before, .phc *::after { box-sizing: border-box; }"
);
c = c.replace(/html,body\{[^}]+\}/g, "");
c = c.replace(/:root\{/g, ".phc {");
c = c.replace(
  /body\{font-family:'Be Vietnam Pro',sans-serif;background:var\(--bg\);color:var\(--text\);display:flex;flex-direction:column;height:100%\}/,
  ""
);

c = c.replace(
  /\.phc \{/,
  `.phc {
  font-family: "Be Vietnam Pro", system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;`
);

function scopeLine(line) {
  const raw = line;
  const t = line.trim();
  if (!t) return line;
  if (t.startsWith("@keyframes")) return line;
  if (t.startsWith("/*")) return line;
  if (t.startsWith(".phc")) return line;

  const lead = line.match(/^\s*/)[0];
  if (!t.startsWith(".")) return line;

  const brace = t.indexOf("{");
  if (brace === -1) return line;
  const selPart = t.slice(0, brace).trim();
  const rest = t.slice(brace);
  const scoped = selPart
    .split(",")
    .map((s) => s.trim())
    .map((s) => (s.startsWith(".") ? `.phc ${s}` : s))
    .join(", ");
  return `${lead}${scoped} ${rest}`;
}

const out = c
  .split("\n")
  .map(scopeLine)
  .join("\n");

fs.mkdirSync(path.dirname(outCss), { recursive: true });
fs.writeFileSync(outCss, out, "utf8");
console.log("Wrote", outCss);
