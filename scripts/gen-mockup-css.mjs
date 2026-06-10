import fs from "node:fs";

const html = fs.readFileSync("c:/Users/DELL/Downloads/sineart-homepage-mockup (2).html", "utf8");
const m = html.match(/<style>([\s\S]*?)<\/style>/);
let css = m[1];
css = css.replace(/^:root\{/m, ".sa-mockup{");
css = css.replace(/^body\{/m, ".sa-mockup{");
css = css.replace(/^html\{scroll-behavior:smooth\}\n/m, "");
const lines = css.split("\n");
const out = [];
for (const line of lines) {
  if (!line.trim()) {
    out.push("");
    continue;
  }
  if (line.trim().startsWith("@")) {
    out.push(line.replace(/@media\((max-width:[^)]+)\)/g, "@media ($1)"));
    continue;
  }
  if (line.trim().startsWith("}") || line.trim().startsWith("/*")) {
    out.push(line);
    continue;
  }
  if (line.includes("{") && !line.trim().startsWith("@keyframes")) {
    const idx = line.indexOf("{");
    const sel = line.slice(0, idx).trim();
    if (sel.startsWith(".sa-mockup") || sel.startsWith("@keyframes")) out.push(line);
    else out.push(sel.split(",").map((s) => ".sa-mockup " + s.trim()).join(", ") + line.slice(idx));
  } else out.push(line);
}
let final = out.join("\n").replace(/\.sa-mockup \.sa-mockup/g, ".sa-mockup");
final = final.replace(
  "--display:'Be Vietnam Pro',sans-serif;",
  "--display:var(--font-be-vietnam-pro,'Be Vietnam Pro',sans-serif);",
);
final = final.replace(
  "--body:'Quicksand',sans-serif;",
  "--body:var(--font-quicksand,'Quicksand',sans-serif);",
);
final += `
.sa-mockup .video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.sa-mockup .play-btn svg{fill:#ee5b9f;color:#ee5b9f}
.sa-mockup .nav-mobile-sheet{display:none}
@media (max-width: 680px) {
.sa-mockup .nav-mobile-sheet{display:flex;flex-direction:column;gap:14px;padding:16px 24px;background:#fff;border-bottom:1px solid var(--ink-06);font-family:var(--display);font-weight:600}
}
`;
fs.writeFileSync("src/app/sineart-home-mockup.css", final);
console.log("wrote", final.length, "bytes");
