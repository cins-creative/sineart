/**
 * Scoped CSS cho trang `/ebook` (listing).
 *
 * Root class `.sa-ebook` — mọi rule đều prefix để không leak sang trang khác.
 * Design token: đồng bộ với `.sa-tracuu` / `.sa-blog` (page-hero, shell, pill).
 */

const css = `
  .sa-ebook{--bg:#fff;--ink:#2d2020;--ink-2:rgba(45,32,32,.78);--ink-muted:rgba(45,32,32,.56);--font-display:"Be Vietnam Pro","Grandstander",system-ui,sans-serif;--font-body:"Quicksand",system-ui,sans-serif;--grad:linear-gradient(90deg,#f8a568,#ee5ca2);background:#fefcf9;color:var(--ink);font-family:var(--font-body);min-height:100vh}
  .sa-ebook *{box-sizing:border-box}
  .sa-ebook a{color:inherit;text-decoration:none}
  .sa-ebook button{font-family:inherit}
  .sa-ebook .eb-shell{max-width:1200px;margin:0 auto;padding:0 28px}

  /* HERO (reuse page-hero pattern) */
  .sa-ebook .page-hero{position:relative;padding:72px 0 48px;overflow:hidden;isolation:isolate}
  .sa-ebook .page-hero-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 85% 15%,rgba(248,166,104,.22) 0%,transparent 45%),radial-gradient(circle at 8% 80%,rgba(187,137,248,.22) 0%,transparent 40%),radial-gradient(circle at 60% 90%,rgba(110,254,192,.18) 0%,transparent 40%),#ffffff}
  .sa-ebook .blob{position:absolute;border-radius:50%;z-index:-1}
  .sa-ebook .blob-a{width:90px;height:90px;background:#fde859;top:90px;left:5%;opacity:.75}
  .sa-ebook .blob-b{width:36px;height:36px;background:#ee5b9f;top:140px;right:8%}
  .sa-ebook .blob-c{width:54px;height:54px;background:#6efec0;bottom:40px;right:34%}
  .sa-ebook .page-hero-inner{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:end;max-width:1200px;margin:0 auto;padding:0 28px}
  .sa-ebook .ph-eyebrow{display:inline-flex;gap:8px;align-items:center;padding:7px 14px 7px 8px;border-radius:999px;background:rgba(255,255,255,.7);border:1.5px solid rgba(45,32,32,.08);font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin-bottom:20px}
  .sa-ebook .ph-eyebrow .dot{width:20px;height:20px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center;font-size:12px}
  .sa-ebook .page-hero h1{margin:0 0 18px;font-family:var(--font-display);font-size:clamp(40px,5vw,60px);font-weight:800;line-height:1.02;letter-spacing:-.035em}
  .sa-ebook .page-hero h1 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-ebook .lead{margin:0;max-width:52ch;font-size:17px;line-height:1.6;color:var(--ink-2)}
  .sa-ebook .ph-side{display:flex;flex-direction:column;gap:10px}
  .sa-ebook .ph-stat{background:rgba(255,255,255,.6);border:1.5px solid rgba(45,32,32,.08);border-radius:16px;padding:14px 18px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;backdrop-filter:blur(8px)}
  .sa-ebook .ph-stat .n{font-family:var(--font-display);font-size:34px;font-weight:800;line-height:1;letter-spacing:-.03em;min-width:64px}
  .sa-ebook .ph-stat .n em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-ebook .ph-stat .l{font-size:12.5px;line-height:1.45;color:var(--ink-2);font-weight:700}
  .sa-ebook .ph-stat .l span{font-weight:600;color:var(--ink-muted)}

  /* Body shell + toolbar */
  .sa-ebook .eb-body{max-width:1200px;margin:0 auto;padding:0 28px 80px}
  .sa-ebook .eb-toolbar{display:flex;flex-direction:column;gap:14px;margin:8px 0 28px;padding-top:8px}
  .sa-ebook .eb-search{position:relative;width:100%;max-width:520px}
  .sa-ebook .eb-search input{width:100%;height:46px;padding:0 44px 0 44px;border-radius:14px;border:1.5px solid rgba(45,32,32,.10);background:#fff;font:600 15px/1.2 Quicksand,ui-sans-serif,system-ui,sans-serif;color:#2d2020;transition:border-color .18s,box-shadow .18s}
  .sa-ebook .eb-search input:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.2)}
  .sa-ebook .eb-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(45,32,32,.45)}
  .sa-ebook .eb-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(45,32,32,.08);color:rgba(45,32,32,.55);border:0;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;cursor:pointer;transition:background .15s}
  .sa-ebook .eb-search-clear:hover{background:rgba(45,32,32,.16)}

  .sa-ebook .eb-pillrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .sa-ebook .eb-pill{padding:8px 14px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);background:#fff;font:700 13px/1 Quicksand;color:rgba(45,32,32,.72);cursor:pointer;transition:all .18s;white-space:nowrap}
  .sa-ebook .eb-pill:hover{border-color:rgba(45,32,32,.35);color:#2d2020}
  .sa-ebook .eb-pill.is-active{background:var(--grad);border-color:transparent;color:#fff;box-shadow:0 4px 14px rgba(238,92,162,.25)}
  .sa-ebook .eb-pill-count{display:inline-block;margin-left:6px;font-weight:800;opacity:.85;font-size:11.5px}

  /* Grid */
  .sa-ebook .eb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:22px}
  @media (min-width:760px){.sa-ebook .eb-grid{gap:28px}}

  /* Card */
  .sa-ebook .eb-card{display:flex;flex-direction:column;gap:10px;background:transparent;border:0;padding:0;text-align:left;cursor:pointer;font-family:inherit;color:inherit;transition:transform .22s}
  .sa-ebook .eb-card:hover{transform:translateY(-4px)}
  .sa-ebook .eb-card-thumb{position:relative;width:100%;aspect-ratio:3/4;overflow:hidden;border-radius:14px;box-shadow:0 8px 24px rgba(45,32,32,.12);transition:box-shadow .22s}
  .sa-ebook .eb-card:hover .eb-card-thumb{box-shadow:0 14px 32px rgba(45,32,32,.18)}
  .sa-ebook .eb-card-thumb-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block}
  .sa-ebook .eb-card-featured{position:absolute;top:10px;left:10px;display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:999px;background:var(--grad);color:#fff;font:800 10.5px/1 Quicksand;letter-spacing:.3px;box-shadow:0 4px 12px rgba(238,92,162,.35)}
  .sa-ebook .eb-card-body{display:flex;flex-direction:column;gap:6px;padding:2px 2px 0}
  .sa-ebook .eb-card-title{font:700 15px/1.35 Quicksand;color:#2d2020;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden}
  .sa-ebook .eb-card-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font:600 12px/1 Quicksand;color:rgba(45,32,32,.55)}
  .sa-ebook .eb-card-cats{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}
  .sa-ebook .eb-cat{padding:3px 8px;border-radius:999px;font:700 10.5px/1 Quicksand;letter-spacing:.2px}

  .sa-ebook .eb-empty{text-align:center;padding:80px 20px;color:rgba(45,32,32,.45);font-weight:600}

  /* Preview slide-over */
  .sa-ebook .eb-preview-backdrop{position:fixed;inset:0;background:rgba(20,12,12,.55);backdrop-filter:blur(4px);z-index:100;display:flex;justify-content:flex-end}
  .sa-ebook .eb-preview{position:relative;width:min(560px,96vw);max-height:100vh;height:100vh;background:#fefcf9;overflow-y:auto;border-left:1px solid rgba(45,32,32,.08);display:flex;flex-direction:column}
  .sa-ebook .eb-preview-close{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.85);color:#2d2020;border:0;display:grid;place-items:center;cursor:pointer;z-index:2;transition:background .15s;box-shadow:0 2px 8px rgba(0,0,0,.12)}
  .sa-ebook .eb-preview-close:hover{background:#fff}
  .sa-ebook .eb-preview-hero{position:relative;width:100%;aspect-ratio:4/3;overflow:hidden;background:#f4ece4}
  .sa-ebook .eb-preview-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block}
  .sa-ebook .eb-preview-body{padding:20px 22px 28px;display:flex;flex-direction:column;gap:14px}
  .sa-ebook .eb-preview-title{font:800 22px/1.25 Quicksand;color:#2d2020;margin:0}
  .sa-ebook .eb-preview-meta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font:700 13px/1 Quicksand;color:rgba(45,32,32,.6)}
  .sa-ebook .eb-preview-cats{display:flex;flex-wrap:wrap;gap:5px}
  .sa-ebook .eb-preview-content{font:500 14.5px/1.7 Quicksand;color:rgba(45,32,32,.82)}
  .sa-ebook .eb-preview-content p{margin:0 0 10px}
  .sa-ebook .eb-preview-content a{color:#ee5ca2;text-decoration:underline}
  .sa-ebook .eb-preview-demos{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:2px}
  .sa-ebook .eb-preview-demos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;display:block;background:#f4ece4}
  .sa-ebook .eb-preview-ctas{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
  .sa-ebook .eb-btn{display:inline-flex;align-items:center;gap:6px;padding:11px 18px;border-radius:12px;font:800 14px/1 Quicksand;cursor:pointer;border:0;transition:transform .15s,box-shadow .15s;text-decoration:none}
  .sa-ebook .eb-btn--primary{background:var(--grad);color:#fff;box-shadow:0 6px 18px rgba(238,92,162,.28)}
  .sa-ebook .eb-btn--primary:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(238,92,162,.36)}
  .sa-ebook .eb-btn--ghost{background:rgba(45,32,32,.06);color:#2d2020}
  .sa-ebook .eb-btn--ghost:hover{background:rgba(45,32,32,.12)}

  @media (max-width:900px){
    .sa-ebook .page-hero-inner{grid-template-columns:1fr;gap:32px}
  }
  @media (max-width:540px){
    .sa-ebook .eb-grid{grid-template-columns:repeat(2,1fr);gap:16px}
    .sa-ebook .eb-card-title{font-size:14px}
    .sa-ebook .page-hero h1{font-size:36px}
  }
`;

export function EbookStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
