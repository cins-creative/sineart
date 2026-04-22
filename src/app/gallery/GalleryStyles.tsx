/**
 * Scoped CSS cho trang `/gallery` (listing tác phẩm học viên).
 *
 * Root class `.sa-gallery` — token + pattern đồng bộ với `/ebook`, `/blogs`,
 * `/tra-cuu-thong-tin`: page-hero, eb-search, eb-catdd, lightbox custom.
 *
 * Grid engine: reuse `GalleryJustifiedRows` (generic class names
 * `gallery-justified-*`). Khi root là `.sa-gallery`, style override bằng
 * specificity cao hơn so với `sineart-home.css` (không import vào page).
 */

const css = `
  .sa-gallery{--bg:#fefcf9;--ink:#2d2020;--ink-2:rgba(45,32,32,.78);--ink-muted:rgba(45,32,32,.56);--font-display:"Be Vietnam Pro","Grandstander",system-ui,sans-serif;--font-body:"Quicksand",system-ui,sans-serif;--grad:linear-gradient(90deg,#f8a568,#ee5ca2);background:var(--bg);color:var(--ink);font-family:var(--font-body);min-height:100vh}
  .sa-gallery *{box-sizing:border-box}
  .sa-gallery a{color:inherit;text-decoration:none}
  .sa-gallery button{font-family:inherit}
  .sa-gallery .g-shell{max-width:1200px;margin:0 auto;padding:0 28px}

  /* ── HERO (đồng pattern page-hero) ────────────────────────────────── */
  .sa-gallery .page-hero{position:relative;padding:72px 0 48px;overflow:hidden;isolation:isolate}
  .sa-gallery .page-hero-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 82% 18%,rgba(248,166,104,.22) 0%,transparent 45%),radial-gradient(circle at 8% 80%,rgba(187,137,248,.22) 0%,transparent 40%),radial-gradient(circle at 55% 95%,rgba(110,254,192,.18) 0%,transparent 40%),#ffffff}
  .sa-gallery .blob{position:absolute;border-radius:50%;z-index:-1}
  .sa-gallery .blob-a{width:90px;height:90px;background:#fde859;top:90px;left:5%;opacity:.75}
  .sa-gallery .blob-b{width:36px;height:36px;background:#ee5b9f;top:140px;right:8%}
  .sa-gallery .blob-c{width:54px;height:54px;background:#6efec0;bottom:40px;right:34%}
  .sa-gallery .page-hero-inner{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:end;max-width:1200px;margin:0 auto;padding:0 28px}
  .sa-gallery .ph-eyebrow{display:inline-flex;gap:8px;align-items:center;padding:7px 14px 7px 8px;border-radius:999px;background:rgba(255,255,255,.7);border:1.5px solid rgba(45,32,32,.08);font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin-bottom:20px}
  .sa-gallery .ph-eyebrow .dot{width:20px;height:20px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center;font-size:12px}
  .sa-gallery .page-hero h1{margin:0 0 18px;font-family:var(--font-display);font-size:clamp(40px,5vw,60px);font-weight:800;line-height:1.02;letter-spacing:-.035em}
  .sa-gallery .page-hero h1 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-gallery .lead{margin:0;max-width:52ch;font-size:17px;line-height:1.6;color:var(--ink-2)}
  .sa-gallery .ph-side{display:flex;flex-direction:column;gap:10px}
  .sa-gallery .ph-stat{background:rgba(255,255,255,.6);border:1.5px solid rgba(45,32,32,.08);border-radius:16px;padding:14px 18px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;backdrop-filter:blur(8px)}
  .sa-gallery .ph-stat .n{font-family:var(--font-display);font-size:34px;font-weight:800;line-height:1;letter-spacing:-.03em;min-width:64px}
  .sa-gallery .ph-stat .n em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-gallery .ph-stat .l{font-size:12.5px;line-height:1.45;color:var(--ink-2);font-weight:700}
  .sa-gallery .ph-stat .l span{font-weight:600;color:var(--ink-muted)}

  /* ── BODY SHELL ──────────────────────────────────────────────────── */
  .sa-gallery .g-body{max-width:1200px;margin:0 auto;padding:0 28px 80px}

  /* ── TOOLBAR (search + dropdown + segmented) ─────────────────────── */
  .sa-gallery .g-toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:8px 0 28px;padding-top:8px}
  .sa-gallery .g-search{position:relative;flex:1 1 280px;min-width:260px;max-width:460px}
  .sa-gallery .g-search input{width:100%;height:46px;padding:0 44px;border-radius:14px;border:1.5px solid rgba(45,32,32,.10);background:#fff;font:600 15px/1.2 Quicksand,ui-sans-serif,system-ui,sans-serif;color:#2d2020;transition:border-color .18s,box-shadow .18s}
  .sa-gallery .g-search input:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.2)}
  .sa-gallery .g-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(45,32,32,.45)}
  .sa-gallery .g-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(45,32,32,.08);color:rgba(45,32,32,.55);border:0;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;cursor:pointer;transition:background .15s}
  .sa-gallery .g-search-clear:hover{background:rgba(45,32,32,.16)}

  /* Dropdown môn học (tái dùng pattern eb-catdd) */
  .sa-gallery .g-dd{position:relative;flex-shrink:0}
  .sa-gallery .g-dd-trigger{display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 12px 0 14px;border-radius:14px;border:1.5px solid rgba(45,32,32,.12);background:#fff;font:700 14px/1 Quicksand;color:#2d2020;cursor:pointer;transition:border-color .18s,box-shadow .18s;min-width:220px}
  .sa-gallery .g-dd-trigger:hover{border-color:rgba(45,32,32,.28)}
  .sa-gallery .g-dd-trigger.is-open{border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.2)}
  .sa-gallery .g-dd-trigger.has-value{border-color:#ee5ca2}
  .sa-gallery .g-dd-trigger > svg:first-child{color:rgba(45,32,32,.55);flex-shrink:0}
  .sa-gallery .g-dd-label{color:rgba(45,32,32,.7);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
  .sa-gallery .g-dd-label strong{color:#2d2020;font-weight:800;margin-left:4px}
  .sa-gallery .g-dd-count{font-weight:800;color:rgba(45,32,32,.55);font-size:13px;flex-shrink:0}
  .sa-gallery .g-dd-chev{margin-left:auto;color:rgba(45,32,32,.5);transition:transform .18s;flex-shrink:0}
  .sa-gallery .g-dd-trigger.is-open .g-dd-chev{transform:rotate(180deg)}
  .sa-gallery .g-dd-clear{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:rgba(45,32,32,.1);color:rgba(45,32,32,.65);cursor:pointer;margin-left:2px;flex-shrink:0;transition:background .15s,color .15s}
  .sa-gallery .g-dd-clear:hover{background:rgba(238,92,162,.15);color:#ee5ca2}
  .sa-gallery .g-dd-panel{position:absolute;top:calc(100% + 6px);left:0;min-width:100%;max-width:340px;max-height:380px;overflow-y:auto;background:#fff;border:1.5px solid rgba(45,32,32,.10);border-radius:14px;box-shadow:0 16px 40px rgba(45,32,32,.14);z-index:20;padding:6px;display:flex;flex-direction:column;gap:2px;animation:gDdIn .14s ease}
  @keyframes gDdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
  .sa-gallery .g-dd-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;border:0;border-radius:10px;background:transparent;color:#2d2020;font:700 13.5px/1.2 Quicksand;cursor:pointer;transition:background .12s,color .12s;text-align:left;width:100%}
  .sa-gallery .g-dd-item:hover{background:rgba(45,32,32,.06)}
  .sa-gallery .g-dd-item.is-active{background:var(--grad);color:#fff;box-shadow:0 3px 10px rgba(238,92,162,.25)}
  .sa-gallery .g-dd-item-count{font-weight:800;font-size:12px;opacity:.75;flex-shrink:0;padding:2px 7px;border-radius:999px;background:rgba(45,32,32,.06)}
  .sa-gallery .g-dd-item.is-active .g-dd-item-count{background:rgba(255,255,255,.22);color:#fff;opacity:.95}

  /* Segmented toggle Tất cả / Bài mẫu */
  .sa-gallery .g-seg{display:inline-flex;gap:4px;padding:4px;border-radius:12px;border:1.5px solid rgba(45,32,32,.10);background:#fff;box-shadow:0 2px 8px rgba(45,32,32,.05);height:46px;align-items:center;flex-shrink:0}
  .sa-gallery .g-seg-btn{display:inline-flex;align-items:center;gap:6px;padding:0 14px;height:100%;border:0;border-radius:8px;font:800 13px/1 Quicksand;color:rgba(45,32,32,.62);background:transparent;cursor:pointer;transition:all .18s;white-space:nowrap}
  .sa-gallery .g-seg-btn:hover:not(.is-active){color:rgba(45,32,32,.9)}
  .sa-gallery .g-seg-btn.is-active{background:var(--grad);color:#fff;box-shadow:0 3px 10px rgba(238,92,162,.22)}
  .sa-gallery .g-seg-count{font-weight:800;font-size:11.5px;opacity:.7;padding:2px 6px;border-radius:999px;background:rgba(45,32,32,.06)}
  .sa-gallery .g-seg-btn.is-active .g-seg-count{background:rgba(255,255,255,.22);color:#fff;opacity:.95}

  /* Summary line */
  .sa-gallery .g-summary{display:flex;align-items:center;gap:10px;margin:0 0 18px;font:700 13.5px/1.3 Quicksand;color:var(--ink-muted)}
  .sa-gallery .g-summary strong{color:#2d2020;font-weight:800}
  .sa-gallery .g-summary .g-reset{margin-left:auto;display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:8px;border:0;background:rgba(45,32,32,.06);color:#2d2020;font:800 12.5px/1 Quicksand;cursor:pointer;transition:background .15s}
  .sa-gallery .g-reset:hover{background:rgba(238,92,162,.12);color:#ee5ca2}

  /* ── GRID (justified layout engine) ──────────────────────────────── */
  .sa-gallery .gallery-justified-root{position:relative;width:100%}
  .sa-gallery .gallery-justified-tile{position:absolute;border-radius:12px;overflow:hidden;background:#f4ece4;box-shadow:0 4px 12px rgba(45,32,32,.08);transition:box-shadow .22s,transform .22s;will-change:transform}
  .sa-gallery .gallery-justified-tile:hover{box-shadow:0 12px 28px rgba(45,32,32,.16);transform:translateY(-2px)}
  .sa-gallery .gallery-justified-btn{display:block;width:100%;height:100%;border:0;padding:0;margin:0;background:transparent;cursor:zoom-in;position:relative;overflow:hidden}
  .sa-gallery .gallery-justified-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s cubic-bezier(.22,.61,.36,1)}
  .sa-gallery .gallery-justified-btn:hover .gallery-justified-img{transform:scale(1.04)}
  .sa-gallery .gallery-justified-placeholder{width:100%;height:100%;background:linear-gradient(135deg,#f4ece4,#e8dfd5)}
  .sa-gallery .gallery-justified-skeleton{position:absolute;inset:0;background:linear-gradient(90deg,#f4ece4,#ece3d8,#f4ece4);background-size:200% 100%;animation:gSkel 1.4s linear infinite;border-radius:12px}
  @keyframes gSkel{0%{background-position:200% 0}100%{background-position:-200% 0}}

  /* Load more + empty */
  .sa-gallery .g-more{display:flex;margin:36px auto 0;padding:12px 24px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);background:#fff;color:#2d2020;font:800 14px/1 Quicksand;cursor:pointer;transition:all .18s;align-items:center;gap:8px}
  .sa-gallery .g-more:hover{border-color:transparent;background:var(--grad);color:#fff;box-shadow:0 8px 20px rgba(238,92,162,.25);transform:translateY(-1px)}
  .sa-gallery .g-empty{text-align:center;padding:80px 20px;color:rgba(45,32,32,.5);font:700 14.5px/1.5 Quicksand}
  .sa-gallery .g-empty strong{display:block;font:800 17px/1.3 "Be Vietnam Pro",Quicksand;color:#2d2020;margin-bottom:6px}

  /* ── LIGHTBOX ────────────────────────────────────────────────────── */
  .sa-gallery-lb{position:fixed;inset:0;z-index:1000;background:rgba(20,12,12,.82);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;animation:gLbFade .22s ease}
  @keyframes gLbFade{from{opacity:0}to{opacity:1}}
  .sa-gallery-lb-body{position:relative;max-width:1240px;width:100%;height:calc(100vh - 48px);display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;animation:gLbIn .26s cubic-bezier(.22,.61,.36,1)}
  @keyframes gLbIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
  .sa-gallery-lb-stage{position:relative;background:#1a1414;border-radius:16px;overflow:hidden;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0}
  .sa-gallery-lb-img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block}
  .sa-gallery-lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.95);color:#2d2020;border:0;display:grid;place-items:center;cursor:pointer;transition:background .15s,transform .15s;box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:2}
  .sa-gallery-lb-nav:hover{background:#fff;transform:translateY(-50%) scale(1.08)}
  .sa-gallery-lb-nav:disabled{opacity:.35;cursor:not-allowed}
  .sa-gallery-lb-nav:disabled:hover{transform:translateY(-50%) scale(1);background:rgba(255,255,255,.95)}
  .sa-gallery-lb-prev{left:12px}
  .sa-gallery-lb-next{right:12px}
  .sa-gallery-lb-close{position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.95);color:#2d2020;border:0;display:grid;place-items:center;cursor:pointer;transition:background .15s,transform .15s;z-index:5;box-shadow:0 4px 12px rgba(0,0,0,.3)}
  .sa-gallery-lb-close:hover{background:#fff;transform:rotate(90deg)}
  .sa-gallery-lb-counter{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);padding:6px 14px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font:700 12.5px/1 Quicksand;backdrop-filter:blur(6px);z-index:2;letter-spacing:.05em}

  .sa-gallery-lb-meta{background:#fefcf9;border-radius:16px;padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
  .sa-gallery-lb-meta h3{margin:0;font:800 20px/1.25 "Be Vietnam Pro",Quicksand;color:#2d2020}
  .sa-gallery-lb-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font:800 11px/1 Quicksand;letter-spacing:.04em;background:var(--grad);color:#fff;box-shadow:0 4px 10px rgba(238,92,162,.22);align-self:flex-start}
  .sa-gallery-lb-field{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:10px;background:rgba(45,32,32,.04)}
  .sa-gallery-lb-field-k{font:800 11px/1 Quicksand;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-muted)}
  .sa-gallery-lb-field-v{font:700 14px/1.35 Quicksand;color:#2d2020}
  .sa-gallery-lb-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:10px;border-top:1px solid rgba(45,32,32,.08)}
  .sa-gallery-lb-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border:1.5px solid rgba(45,32,32,.12);border-radius:10px;background:#fff;color:#2d2020;font:800 12.5px/1 Quicksand;cursor:pointer;transition:all .15s;text-decoration:none}
  .sa-gallery-lb-btn:hover{border-color:transparent;background:var(--grad);color:#fff;box-shadow:0 4px 12px rgba(238,92,162,.22)}
  .sa-gallery-lb-loading{position:absolute;inset:0;display:grid;place-items:center;color:rgba(255,255,255,.6);font:700 13px/1 Quicksand;pointer-events:none}

  /* ── RESPONSIVE ──────────────────────────────────────────────────── */
  @media (max-width:960px){
    .sa-gallery .page-hero-inner{grid-template-columns:1fr;gap:32px}
    .sa-gallery-lb-body{grid-template-columns:1fr;height:auto;max-height:calc(100vh - 48px)}
    .sa-gallery-lb-stage{min-height:60vh}
    .sa-gallery-lb-meta{max-height:34vh}
  }
  @media (max-width:640px){
    .sa-gallery .page-hero{padding:52px 0 36px}
    .sa-gallery .page-hero h1{font-size:36px}
    .sa-gallery .g-search{max-width:none;flex-basis:100%}
    .sa-gallery .g-dd{width:100%}
    .sa-gallery .g-dd-trigger{width:100%;min-width:0}
    .sa-gallery .g-dd-panel{max-width:none;right:0}
    .sa-gallery .g-seg{width:100%;justify-content:stretch}
    .sa-gallery .g-seg-btn{flex:1;justify-content:center}
    .sa-gallery-lb{padding:12px}
    .sa-gallery-lb-body{gap:12px;height:calc(100vh - 24px)}
    .sa-gallery-lb-nav{width:40px;height:40px}
  }
`;

export function GalleryStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
