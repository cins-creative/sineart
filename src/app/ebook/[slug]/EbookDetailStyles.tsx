/**
 * Scoped CSS cho `/ebook/[slug]` (detail page).
 *
 * Root class `.sa-ebook-detail` — không leak với trang khác.
 */

const css = `
  .sa-ebook-detail{--bg:#fefcf9;--ink:#2d2020;--ink-2:rgba(45,32,32,.78);--ink-muted:rgba(45,32,32,.56);--font-display:"Be Vietnam Pro","Grandstander",system-ui,sans-serif;--font-body:"Quicksand",system-ui,sans-serif;--grad:linear-gradient(90deg,#f8a568,#ee5ca2);background:var(--bg);color:var(--ink);font-family:var(--font-body);min-height:100vh}
  .sa-ebook-detail *{box-sizing:border-box}
  .sa-ebook-detail a{color:inherit;text-decoration:none}
  .sa-ebook-detail button{font-family:inherit}

  .sa-ebook-detail .ebd-shell{max-width:1200px;margin:0 auto;padding:0 28px}
  .sa-ebook-detail .ebd-body{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:48px;padding:32px 0 80px}
  .sa-ebook-detail .ebd-main{min-width:0}

  /* Breadcrumb */
  .sa-ebook-detail .ebd-crumb{display:flex;align-items:center;gap:8px;font:700 13px/1 Quicksand;color:var(--ink-muted);margin-bottom:18px}
  .sa-ebook-detail .ebd-crumb-back{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:8px;background:rgba(45,32,32,.06);transition:background .15s}
  .sa-ebook-detail .ebd-crumb-back:hover{background:rgba(45,32,32,.12)}
  .sa-ebook-detail .ebd-crumb-sep{opacity:.5}

  /* Compact header — thumb + meta */
  .sa-ebook-detail .ebd-header{display:grid;grid-template-columns:140px minmax(0,1fr);gap:24px;align-items:flex-start;padding:20px 20px 24px;background:#fff;border:1.5px solid rgba(45,32,32,.08);border-radius:20px;box-shadow:0 6px 20px rgba(45,32,32,.05)}
  .sa-ebook-detail .ebd-h-thumb{position:relative;width:140px;aspect-ratio:3/4;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(45,32,32,.18)}
  .sa-ebook-detail .ebd-h-thumb-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  .sa-ebook-detail .ebd-h-info{display:flex;flex-direction:column;gap:12px;min-width:0}
  .sa-ebook-detail .ebd-h-eyebrow{display:inline-flex;align-items:center;gap:6px;font:800 11px/1 Quicksand;letter-spacing:.4px;text-transform:uppercase;color:#ee5ca2}
  .sa-ebook-detail .ebd-h-title{font:800 clamp(24px,3vw,32px)/1.2 "Be Vietnam Pro",Quicksand;color:#2d2020;letter-spacing:-.02em;margin:0}
  .sa-ebook-detail .ebd-h-cats{display:flex;flex-wrap:wrap;gap:5px}
  .sa-ebook-detail .ebd-h-cat{padding:4px 10px;border-radius:999px;font:700 11px/1 Quicksand}
  .sa-ebook-detail .ebd-h-meta{display:flex;flex-wrap:wrap;gap:12px;align-items:center;font:600 13.5px/1 Quicksand;color:var(--ink-muted)}
  .sa-ebook-detail .ebd-h-meta strong{color:#2d2020;font-weight:800}

  /* CTA row */
  .sa-ebook-detail .ebd-cta-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
  .sa-ebook-detail .ebd-btn{display:inline-flex;align-items:center;gap:6px;padding:11px 18px;border-radius:12px;font:800 14px/1 Quicksand;cursor:pointer;border:0;transition:transform .15s,box-shadow .15s;text-decoration:none}
  .sa-ebook-detail .ebd-btn:disabled{opacity:.5;cursor:not-allowed}
  .sa-ebook-detail .ebd-btn--primary{background:var(--grad);color:#fff;box-shadow:0 6px 18px rgba(238,92,162,.28)}
  .sa-ebook-detail .ebd-btn--primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 22px rgba(238,92,162,.36)}
  .sa-ebook-detail .ebd-btn--ghost{background:rgba(45,32,32,.06);color:#2d2020}
  .sa-ebook-detail .ebd-btn--ghost:hover{background:rgba(45,32,32,.12)}

  /* Section */
  .sa-ebook-detail .ebd-section{margin-top:36px}
  .sa-ebook-detail .ebd-sec-title{font:800 13px/1 Quicksand;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-muted);margin:0 0 14px;display:flex;align-items:center;gap:10px}
  .sa-ebook-detail .ebd-sec-title::before{content:"";display:inline-block;width:20px;height:2px;background:var(--grad);border-radius:2px}

  /* Flipbook */
  .sa-ebook-detail .ebd-flipbook{margin-top:28px}
  .sa-ebook-detail .ebd-flipbook-wrap{position:relative;width:100%;aspect-ratio:4/3;overflow:hidden;border-radius:16px;background:#1a1414;box-shadow:0 12px 32px rgba(45,32,32,.2)}
  .sa-ebook-detail .ebd-flipbook-embed{position:absolute;inset:0;width:100%;height:100%}
  .sa-ebook-detail .ebd-flipbook-embed iframe{width:100%!important;height:100%!important;border:0!important;display:block}
  .sa-ebook-detail .ebd-flipbook-embed > *{width:100%!important;height:100%!important}
  .sa-ebook-detail .ebd-flipbook-fullscreen{position:absolute;top:12px;right:12px;z-index:5;background:rgba(255,255,255,.9);color:#2d2020;border:0;width:40px;height:40px;border-radius:10px;display:grid;place-items:center;cursor:pointer;transition:background .15s;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  .sa-ebook-detail .ebd-flipbook-fullscreen:hover{background:#fff}
  .sa-ebook-detail .ebd-flipbook.is-fullscreen .ebd-flipbook-wrap{aspect-ratio:auto;width:100vw;height:100vh;border-radius:0}

  /* Prose (content + noi_dung_sach) */
  .sa-ebook-detail .ebd-prose{font:500 15.5px/1.72 Quicksand;color:rgba(45,32,32,.88)}
  .sa-ebook-detail .ebd-prose > *:first-child{margin-top:0}
  .sa-ebook-detail .ebd-prose > *:last-child{margin-bottom:0}
  .sa-ebook-detail .ebd-prose p{margin:0 0 16px}
  .sa-ebook-detail .ebd-prose h2{font:800 22px/1.3 "Be Vietnam Pro",Quicksand;margin:32px 0 12px;color:#2d2020}
  .sa-ebook-detail .ebd-prose h3{font:800 18px/1.3 "Be Vietnam Pro",Quicksand;margin:24px 0 10px;color:#2d2020}
  .sa-ebook-detail .ebd-prose a{color:#ee5ca2;text-decoration:underline;text-underline-offset:2px}
  .sa-ebook-detail .ebd-prose ul,.sa-ebook-detail .ebd-prose ol{padding-left:1.4em;margin:0 0 16px}
  .sa-ebook-detail .ebd-prose li{margin:0 0 6px}
  .sa-ebook-detail .ebd-prose strong{color:#2d2020;font-weight:800}
  .sa-ebook-detail .ebd-prose img{max-width:100%;height:auto;border-radius:10px;display:block;margin:14px 0}
  .sa-ebook-detail .ebd-prose blockquote{margin:16px 0;padding:12px 18px;border-left:3px solid #ee5ca2;background:rgba(238,92,162,.06);border-radius:0 10px 10px 0;font-style:italic}

  /* Pages grid (img_src_link) */
  .sa-ebook-detail .ebd-pages{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}
  .sa-ebook-detail .ebd-page{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(45,32,32,.08);transition:box-shadow .2s}
  .sa-ebook-detail .ebd-page:hover{box-shadow:0 8px 22px rgba(45,32,32,.14)}
  .sa-ebook-detail .ebd-pages-img{width:100%;height:auto;display:block;object-fit:contain;background:#f4ece4}

  /* Custom flipbook reader (EbookFlipbook.tsx) */
  .sa-ebook-detail .ebd-fb{margin-top:28px}
  .sa-ebook-detail .ebd-fb-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap}
  .sa-ebook-detail .ebd-fb-modes{display:flex;gap:4px;padding:4px;border-radius:999px;border:1.5px solid rgba(45,32,32,.10);background:#fff;box-shadow:0 2px 8px rgba(45,32,32,.06)}
  .sa-ebook-detail .ebd-fb-mode{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:0;border-radius:999px;font:800 13px/1 Quicksand;color:rgba(45,32,32,.6);background:transparent;cursor:pointer;transition:all .18s}
  .sa-ebook-detail .ebd-fb-mode:hover:not(.is-active){color:rgba(45,32,32,.88)}
  .sa-ebook-detail .ebd-fb-mode.is-active{background:var(--grad);color:#fff;box-shadow:0 4px 12px rgba(238,92,162,.25)}
  .sa-ebook-detail .ebd-fb-count{font:700 12px/1 Quicksand;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-muted)}

  .sa-ebook-detail .ebd-fb-stage-wrap{max-width:960px;margin:0 auto}
  .sa-ebook-detail .ebd-fb-stage{position:relative;margin:0 auto}
  .sa-ebook-detail .ebd-fb-shadow{position:absolute;left:48px;right:48px;bottom:-22px;height:40px;border-radius:50%;filter:blur(28px);z-index:0;pointer-events:none}
  .sa-ebook-detail .ebd-fb-book{position:relative;margin:0 auto;max-width:960px;width:100%;z-index:1}

  .sa-ebook-detail .ebd-fb-ctrl{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:520px;margin:40px auto 0}
  .sa-ebook-detail .ebd-fb-nav{width:48px;height:48px;border:2px solid rgba(45,32,32,.10);border-radius:50%;background:#fff;color:#2d2020;display:grid;place-items:center;cursor:pointer;transition:transform .15s,opacity .15s;padding:0}
  .sa-ebook-detail .ebd-fb-nav:hover:not(:disabled){transform:scale(1.05)}
  .sa-ebook-detail .ebd-fb-nav:disabled{opacity:.4;cursor:not-allowed}
  .sa-ebook-detail .ebd-fb-meter{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;min-width:0}
  .sa-ebook-detail .ebd-fb-label{margin:0;font:800 13.5px/1 "Be Vietnam Pro",Quicksand;color:#2d2020;white-space:nowrap}
  .sa-ebook-detail .ebd-fb-dots{display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:100%}
  .sa-ebook-detail .ebd-fb-dot{height:6px;border:0;border-radius:999px;cursor:pointer;transition:width .22s,background .22s;padding:0;flex-shrink:0}
  .sa-ebook-detail .ebd-fb-dot:disabled{cursor:not-allowed}

  .sa-ebook-detail .ebd-fb-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;max-width:880px;margin:0 auto}
  .sa-ebook-detail .ebd-fb-card{position:relative;overflow:hidden;border:2px solid rgba(45,32,32,.06);border-radius:14px;background:#fbf7f2}
  .sa-ebook-detail .ebd-fb-card-img{width:100%;height:auto;display:block;object-fit:contain}

  /* Adjacent (prev/next) */
  .sa-ebook-detail .ebd-navpn{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:48px}
  .sa-ebook-detail .ebd-navpn-item{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1.5px solid rgba(45,32,32,.1);border-radius:14px;background:#fff;transition:border-color .18s,box-shadow .18s}
  .sa-ebook-detail .ebd-navpn-item:hover{border-color:#ee5ca2;box-shadow:0 6px 18px rgba(238,92,162,.14)}
  .sa-ebook-detail .ebd-navpn-item--next{justify-content:flex-end;text-align:right}
  .sa-ebook-detail .ebd-navpn-label{font:700 11px/1 Quicksand;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px}
  .sa-ebook-detail .ebd-navpn-title{font:800 14px/1.35 "Be Vietnam Pro",Quicksand;color:#2d2020;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden}
  .sa-ebook-detail .ebd-navpn-icon{color:#ee5ca2;flex-shrink:0}

  /* Sidebar */
  .sa-ebook-detail .ebd-sidebar{position:sticky;top:24px;align-self:start;display:flex;flex-direction:column;gap:18px}
  .sa-ebook-detail .ebd-sb-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px;background:#fff;border:1.5px solid rgba(45,32,32,.08);border-radius:14px}
  .sa-ebook-detail .ebd-sb-stat{display:flex;flex-direction:column;gap:4px}
  .sa-ebook-detail .ebd-sb-stat-k{font:700 11px/1 Quicksand;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-muted)}
  .sa-ebook-detail .ebd-sb-stat-v{font:800 15px/1.25 "Be Vietnam Pro",Quicksand;color:#2d2020}
  .sa-ebook-detail .ebd-sb-section{padding:16px;background:#fff;border:1.5px solid rgba(45,32,32,.08);border-radius:14px}
  .sa-ebook-detail .ebd-sb-label{font:800 11px/1 Quicksand;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:12px}
  .sa-ebook-detail .ebd-sb-list{display:flex;flex-direction:column;gap:10px}
  .sa-ebook-detail .ebd-sb-item{display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:10px;transition:background .15s}
  .sa-ebook-detail .ebd-sb-item:hover{background:rgba(45,32,32,.04)}
  .sa-ebook-detail .ebd-sb-thumb{width:52px;height:68px;border-radius:6px;background-size:cover;background-position:center;flex-shrink:0;box-shadow:0 2px 6px rgba(45,32,32,.15)}
  .sa-ebook-detail .ebd-sb-title{font:800 13px/1.35 "Be Vietnam Pro",Quicksand;color:#2d2020;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;margin-bottom:4px}
  .sa-ebook-detail .ebd-sb-meta{font:600 11.5px/1.2 Quicksand;color:var(--ink-muted)}

  @media (max-width:1000px){
    .sa-ebook-detail .ebd-body{grid-template-columns:1fr;gap:32px}
    .sa-ebook-detail .ebd-sidebar{position:static}
  }
  @media (max-width:720px){
    .sa-ebook-detail .ebd-header{grid-template-columns:100px 1fr;gap:16px;padding:16px}
    .sa-ebook-detail .ebd-h-thumb{width:100px}
    .sa-ebook-detail .ebd-pages{grid-template-columns:1fr;gap:14px}
    .sa-ebook-detail .ebd-flipbook-wrap{aspect-ratio:3/4}
    .sa-ebook-detail .ebd-navpn{grid-template-columns:1fr}
    .sa-ebook-detail .ebd-fb-grid{grid-template-columns:1fr;gap:14px}
    .sa-ebook-detail .ebd-fb-ctrl{max-width:100%;gap:10px;margin-top:28px}
    .sa-ebook-detail .ebd-fb-nav{width:44px;height:44px}
    .sa-ebook-detail .ebd-fb-toolbar{justify-content:center}
    .sa-ebook-detail .ebd-fb-shadow{display:none}
  }
`;

export function EbookDetailStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
