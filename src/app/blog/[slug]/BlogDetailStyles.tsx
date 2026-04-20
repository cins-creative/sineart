"use client";

const css = `
  .bd{--ink:#2d2020;--ink-2:rgba(45,32,32,.78);--ink-muted:rgba(45,32,32,.56);--ink-divider:rgba(45,32,32,.10);--ink-border:rgba(45,32,32,.07);--ink-border-strong:rgba(45,32,32,.12);--ink-tint:rgba(45,32,32,.045);--magenta:#ee5b9f;--peach:#f8a668;--grad:linear-gradient(135deg,#f8a668,#ee5b9f);--grad-cta:linear-gradient(145deg,#fbc08a 0%,#f8a668 22%,#ee5b9f 78%,#d9468a 100%);--shadow:0 4px 18px rgba(45,32,32,.06);--shadow-md:0 10px 32px rgba(45,32,32,.12);--shadow-cta:0 4px 14px rgba(238,91,159,.35);--font-d:"Be Vietnam Pro",system-ui,sans-serif;--font-b:"Quicksand",system-ui,sans-serif;background:#f8f6f2;color:var(--ink);font-family:var(--font-b);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
  .bd *{box-sizing:border-box}
  .bd a{text-decoration:none;color:inherit}

  /* NAV */
  .bd-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);border-bottom:1px solid var(--ink-border)}
  .bd-nav-inner{max-width:1340px;margin:0 auto;padding:0 28px;display:flex;align-items:center;justify-content:space-between;height:64px;gap:16px}
  .bd-logo{display:inline-flex;gap:.12em;font-family:var(--font-d);font-weight:800;font-size:22px;letter-spacing:-.03em}
  .bd-logo-art{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .bd-nav-links{display:flex;gap:2px}
  .bd-nav-links a{padding:9px 14px;border-radius:999px;font-size:14px;font-weight:700;color:var(--ink-2)}
  .bd-nav-links a:hover{background:var(--ink-tint)}
  .bd-nav-links a.on{color:var(--ink)}
  .bd-btn-cta{display:inline-flex;gap:8px;align-items:center;padding:10px 18px 10px 12px;border-radius:999px;background:var(--grad-cta);color:#fff;font-size:14px;font-weight:800;white-space:nowrap}
  .bd-btn-play{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center}

  /* SHELL */
  .bd-shell{max-width:1160px;margin:0 auto;padding:0 28px}

  /* BODY */
  .bd-body{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:32px;align-items:start;padding:32px 0 72px}
  .bd-body>*{min-width:0}

  /* MAIN */
  .bd-main{background:#fff;border-radius:20px;border:1.5px solid var(--ink-border);box-shadow:var(--shadow);padding:32px 36px}

  /* BREADCRUMB */
  .bd-crumb{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-muted);margin-bottom:22px;flex-wrap:wrap}
  .bd-crumb-back{font-weight:700;color:var(--ink-2);display:inline-flex;align-items:center;gap:4px}
  .bd-crumb-back:hover{color:var(--magenta)}
  .bd-crumb-sep{color:var(--ink-border-strong)}
  .bd-crumb-meta{margin-left:auto;font-weight:500}

  /* TITLE */
  .bd-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:10px}
  .bd-h1{font-family:var(--font-d);font-size:clamp(26px,3.5vw,40px);font-weight:800;letter-spacing:-.025em;line-height:1.1;margin:0 0 16px}
  .bd-lead{font-family:var(--font-d);font-size:17px;font-weight:500;color:var(--ink-2);line-height:1.6;margin-bottom:24px}
  .bd-lead p{margin:.4em 0}

  /* AUTHOR */
  .bd-author{background:rgba(187,137,248,.07);border-radius:14px;padding:14px 16px;margin-bottom:26px;display:flex;align-items:center;gap:14px}
  .bd-author-av{width:48px;height:48px;border-radius:50%;background:var(--grad);color:#fff;font-family:var(--font-d);font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .bd-author-info{flex:1;min-width:0}
  .bd-author-name{font-size:14px;font-weight:700;margin-bottom:2px}
  .bd-author-role{font-size:12px;color:var(--ink-muted)}
  .bd-author-link{color:var(--ink);border-bottom:1px solid rgba(45,32,32,.2)}
  .bd-author-link:hover{color:var(--magenta);border-bottom-color:var(--magenta)}
  .bd-author-actions{display:flex;gap:8px;flex-shrink:0}
  .bd-icon-btn{width:34px;height:34px;border-radius:50%;border:1.5px solid var(--ink-border-strong);display:flex;align-items:center;justify-content:center;color:var(--ink-muted);background:transparent;cursor:pointer}
  .bd-icon-btn:hover{border-color:var(--ink-2);color:var(--ink-2)}

  /* HERO COVER */
  .bd-cover{aspect-ratio:16/9;border-radius:16px;margin-bottom:30px;box-shadow:var(--shadow);overflow:hidden;background-size:cover;background-position:center}

  /* PROSE */
  .bd-prose{font-size:16px;font-weight:500;color:var(--ink-2);line-height:1.75}
  .bd-prose p{margin:0 0 18px}
  .bd-prose p:last-child{margin-bottom:0}
  .bd-prose strong,.bd-prose b{color:var(--ink);font-weight:700}
  .bd-prose em,.bd-prose i{font-style:italic}
  .bd-prose u{text-decoration:underline;text-underline-offset:3px}
  .bd-prose s{text-decoration:line-through}
  .bd-prose a{color:var(--ink);background:linear-gradient(transparent 62%,rgba(238,91,159,.18) 62%);font-weight:600}
  .bd-prose a:hover{background:linear-gradient(transparent 62%,rgba(238,91,159,.38) 62%)}
  .bd-prose h1{font-family:var(--font-d);font-size:clamp(22px,2.5vw,30px);font-weight:800;letter-spacing:-.02em;line-height:1.15;margin:1.8em 0 .35em}
  .bd-prose h2{font-family:var(--font-d);font-size:clamp(18px,2vw,24px);font-weight:800;letter-spacing:-.02em;line-height:1.2;margin:1.6em 0 0}
  .bd-prose h2+.bd-h2-line{width:44px;height:3px;background:#fde859;border-radius:2px;margin:.5em 0 1em}
  .bd-prose h3{font-family:var(--font-d);font-size:clamp(15px,1.7vw,19px);font-weight:800;letter-spacing:-.015em;line-height:1.3;margin:1.4em 0 .3em}
  .bd-prose ul{list-style:disc;padding-left:22px;margin:.5em 0 1em}
  .bd-prose ol{list-style:decimal;padding-left:22px;margin:.5em 0 1em}
  .bd-prose li{margin:.25em 0;line-height:1.65}
  .bd-prose blockquote{border-left:3px solid var(--magenta);padding:14px 20px;background:rgba(187,137,248,.06);border-radius:0 12px 12px 0;margin:1.2em 0;font-family:var(--font-d);font-size:17px;font-style:italic;font-weight:500;line-height:1.5}
  .bd-prose code{background:#f0eee7;border-radius:5px;padding:2px 6px;font-size:13px;font-family:ui-monospace,monospace;color:#d4537e}
  .bd-prose pre{background:#1e1e1e;color:#d4d4d4;border-radius:12px;padding:16px;overflow-x:auto;font-size:13px;margin:1em 0}
  .bd-prose pre code{background:none;padding:0;color:inherit}
  .bd-prose hr{border:none;border-top:1px solid var(--ink-border);margin:2em 0}
  .bd-prose img{display:block;max-width:100%;height:auto;border-radius:12px;margin:1em auto}
  .bd-prose iframe{width:100%;min-height:360px;border:0;border-radius:12px;display:block;margin:1em 0}
  .bd-prose table{width:100%;border-collapse:collapse;margin:1em 0;font-size:14px}
  .bd-prose th{border:1px solid #e0e0e0;padding:10px 12px;background:#f5f5f5;font-weight:700;text-align:left;vertical-align:top}
  .bd-prose td{border:1px solid #e0e0e0;padding:10px 12px;vertical-align:top}
  .bd-prose--end{margin-top:28px;padding-top:28px;border-top:1px solid var(--ink-border)}

  /* CTA INLINE */
  .bd-cta-inline{background:linear-gradient(135deg,rgba(253,232,89,.18) 0%,rgba(248,166,104,.12) 100%);border:1.5px solid rgba(253,232,89,.45);border-radius:20px;padding:22px;margin:32px 0;display:flex;gap:16px;align-items:center}
  .bd-cta-icon{width:72px;height:72px;border-radius:14px;background:linear-gradient(135deg,#fde859,#f8a668);flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(248,166,104,.3)}
  .bd-cta-body{flex:1;min-width:0}
  .bd-cta-eyebrow{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px}
  .bd-cta-title{font-family:var(--font-d);font-size:17px;font-weight:800;letter-spacing:-.02em;margin:0 0 3px}
  .bd-cta-meta{font-size:13px;color:var(--ink-muted);margin-bottom:12px}
  .bd-btn-inline{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:999px;background:var(--grad-cta);color:#fff;font-size:13px;font-weight:800;box-shadow:var(--shadow-cta)}

  /* SHARE */
  .bd-share{display:flex;align-items:center;gap:14px;padding:18px 0;border-top:1px solid var(--ink-border);border-bottom:1px solid var(--ink-border);margin:28px 0}
  .bd-share-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-muted)}
  .bd-share-btns{display:flex;gap:10px}

  /* PREV/NEXT */
  .bd-navpn{display:flex;gap:14px;margin-top:28px}
  .bd-navpn-item{flex:1;padding:16px 18px;border:1.5px solid var(--ink-border);border-radius:14px;display:flex;gap:12px;align-items:center;transition:border-color .2s}
  .bd-navpn-item:hover{border-color:var(--ink-border-strong);background:var(--ink-tint)}
  .bd-navpn-item--next{justify-content:flex-end;text-align:right}
  .bd-navpn-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px}
  .bd-navpn-title{font-family:var(--font-d);font-size:13px;font-weight:800;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .bd-navpn-icon{flex-shrink:0;color:var(--ink-muted)}

  /* SIDEBAR */
  .bd-sidebar{display:flex;flex-direction:column;gap:20px;position:sticky;top:80px}
  .bd-sb-cta{background:linear-gradient(135deg,rgba(248,166,104,.12),rgba(238,91,159,.12));border:1.5px solid rgba(238,91,159,.2);border-radius:20px;padding:20px;text-align:center}
  .bd-sb-cta-logo{width:52px;height:52px;border-radius:50%;background:var(--grad);margin:0 auto 10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-family:var(--font-d);font-size:13px}
  .bd-sb-cta-title{font-family:var(--font-d);font-size:16px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px}
  .bd-sb-cta-desc{font-size:12px;color:var(--ink-2);line-height:1.55;margin-bottom:14px}
  .bd-btn-primary{display:block;background:var(--grad-cta);color:#fff;padding:11px;border-radius:999px;text-align:center;font-size:13px;font-weight:800;box-shadow:var(--shadow-cta)}
  .bd-sb-section{background:#fff;border-radius:16px;border:1.5px solid var(--ink-border);padding:18px 16px}
  .bd-sb-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2);margin-bottom:14px;display:flex;align-items:center;gap:8px}
  .bd-sb-label::after{content:"";flex:1;height:1px;background:var(--ink-divider)}

  /* TOC */
  .bd-toc{padding-left:4px;border-left:2px solid var(--ink-border);display:flex;flex-direction:column;gap:2px}
  .bd-toc-item{padding:5px 0 5px 12px;font-size:12px;font-weight:500;color:var(--ink-muted);cursor:pointer;border-left:2px solid transparent;margin-left:-2px;transition:color .15s}
  .bd-toc-item:hover{color:var(--ink-2)}
  .bd-toc-item.active{border-left-color:var(--magenta);font-family:var(--font-d);font-weight:700;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}

  /* RELATED */
  .bd-related-list{display:flex;flex-direction:column;gap:10px}
  .bd-related-item{display:flex;gap:10px;align-items:center}
  .bd-related-item:hover .bd-related-title{color:var(--magenta)}
  .bd-related-thumb{width:52px;height:52px;border-radius:10px;flex-shrink:0;background-size:cover;background-position:center}
  .bd-related-title{font-family:var(--font-d);font-size:12px;font-weight:800;line-height:1.3;margin-bottom:2px}
  .bd-related-meta{font-size:10px;color:var(--ink-muted)}

  /* FIXED CTA */
  .bd-cta-fixed{position:fixed;bottom:24px;right:24px;z-index:60;display:inline-flex;align-items:center;gap:8px;background:var(--grad-cta);color:#fff;padding:12px 20px 12px 12px;border-radius:999px;font-weight:800;font-size:14px;box-shadow:var(--shadow-cta)}
  .bd-cta-fixed-play{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center}

  /* RESPONSIVE */
  @media(max-width:960px){
    .bd-body{grid-template-columns:1fr;padding:20px 0 48px}
    .bd-sidebar{position:static}
    .bd-main{padding:22px 20px}
  }
  @media(max-width:640px){
    .bd-shell{padding:0 16px}
    .bd-main{padding:18px 16px}
    .bd-h1{font-size:24px}
    .bd-navpn{flex-direction:column}
    .bd-nav-links{display:none}
  }
`;

export function BlogDetailStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
