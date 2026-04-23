"use client";

/**
 * Style cho /tong-hop-de-thi (listing).
 * Tông Sine Art đồng bộ với `.sa-tracuu` (prefix `.sa-dethi`).
 * Các khối riêng cho trang đề thi:
 *   - `filter-mon-row`  : hàng pill môn (filter chính, đặt trước)
 *   - `mon-pill`        : pill chọn môn (toggle)
 *   - `ms-*`            : multi-select popover (Trường / Loại mẫu)
 *   - `card-thumb`      : thumbnail overlay Môn + Năm
 */

const css = `
  .sa-dethi{--bg:#fff;--ink:#2d2020;--ink-2:rgba(45,32,32,.78);--ink-muted:rgba(45,32,32,.56);--font-display:"Be Vietnam Pro","Grandstander",system-ui,sans-serif;--font-body:"Quicksand",system-ui,sans-serif;--cat-hh:#fde859;--cat-bc:#6efec0;--cat-tt:#bb89f8;--cat-dg:#f8a668;--grad:linear-gradient(135deg,#f8a668,#ee5b9f);--grad-cta:linear-gradient(145deg,#fbc08a 0%,#f8a668 22%,#ee5b9f 78%,#d9468a 100%);background:#fff;color:var(--ink);font-family:var(--font-body)}
  .sa-dethi *{box-sizing:border-box}.sa-dethi a{text-decoration:none;color:inherit}.sa-dethi button{font-family:inherit}.sa-dethi .shell{max-width:1200px;margin:0 auto;padding:0 28px}

  /* HERO — tông vàng-cam-tím đặc trưng môn màu */
  .sa-dethi .page-hero{position:relative;padding:72px 0 48px;overflow:hidden;isolation:isolate}
  .sa-dethi .page-hero-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 85% 15%,rgba(110,254,192,.24) 0%,transparent 45%),radial-gradient(circle at 8% 80%,rgba(187,137,248,.22) 0%,transparent 40%),radial-gradient(circle at 60% 90%,rgba(248,166,104,.18) 0%,transparent 40%),#ffffff}
  .sa-dethi .blob{position:absolute;border-radius:50%;z-index:-1}
  .sa-dethi .blob-a{width:90px;height:90px;background:var(--cat-bc);top:90px;left:5%;opacity:.8}
  .sa-dethi .blob-b{width:36px;height:36px;background:var(--cat-tt);top:140px;right:8%}
  .sa-dethi .blob-c{width:54px;height:54px;background:var(--cat-hh);bottom:40px;right:34%;opacity:.8}
  .sa-dethi .page-hero-inner{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:end}
  .sa-dethi .ph-eyebrow{display:inline-flex;gap:8px;align-items:center;padding:7px 14px 7px 8px;border-radius:999px;background:rgba(255,255,255,.7);border:1.5px solid rgba(45,32,32,.08);font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin-bottom:20px}
  .sa-dethi .ph-eyebrow .dot{width:20px;height:20px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center}
  .sa-dethi .page-hero h1{margin:0 0 18px;font-family:var(--font-display);font-size:clamp(40px,5vw,60px);font-weight:800;line-height:1.02;letter-spacing:-.035em}
  .sa-dethi .page-hero h1 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-dethi .lead{margin:0;max-width:52ch;font-size:17px;line-height:1.6;color:var(--ink-2)}
  .sa-dethi .ph-side{display:flex;flex-direction:column;gap:10px}
  .sa-dethi .ph-stat{display:flex;gap:10px;align-items:baseline;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.6);border:1.5px solid rgba(45,32,32,.08)}
  .sa-dethi .ph-stat .n{font-family:var(--font-display);font-size:28px;font-weight:800}
  .sa-dethi .ph-stat .n em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-dethi .ph-stat .l{font-size:13px;font-weight:600;color:var(--ink-2)}
  .sa-dethi .ph-stat .l span{color:var(--ink-muted);font-weight:500}

  /* FILTER — sticky top dưới NavBar (desktop:70px). Mobile navbar ở đáy → static. */
  .sa-dethi .filter-section{position:sticky;top:70px;z-index:20;background:#fff;border-top:1px solid rgba(45,32,32,.06);border-bottom:1px solid rgba(45,32,32,.06)}
  .sa-dethi .filter-wrap{padding:16px 0 14px;display:flex;flex-direction:column;gap:12px}

  /* Môn pills — hàng filter chính */
  .sa-dethi .filter-mon-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .sa-dethi .filter-mon-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-muted);margin-right:4px}
  .sa-dethi .mon-pill{display:inline-flex;gap:6px;align-items:center;padding:8px 14px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);background:#fff;font-size:12.5px;font-weight:800;color:var(--ink-2);cursor:pointer;transition:all .15s}
  .sa-dethi .mon-pill .dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex-shrink:0}
  .sa-dethi .mon-pill:hover{border-color:rgba(45,32,32,.3)}
  .sa-dethi .mon-pill--active{border-color:var(--ink);color:var(--ink);background:rgba(45,32,32,.04);box-shadow:inset 0 0 0 1px var(--ink)}

  /* Dòng dưới: search + năm + multi-select + clear */
  .sa-dethi .filter-row2{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
  .sa-dethi .search-input{display:flex;gap:10px;align-items:center;padding:10px 18px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);background:#fff;min-width:220px;flex:1;max-width:320px}
  .sa-dethi .search-input input{border:0;outline:none;background:transparent;flex:1;min-width:0;font-size:13px;font-family:inherit;color:var(--ink)}
  .sa-dethi .filter-selects{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end;flex:1}
  .sa-dethi .filter-selects select{appearance:none;-webkit-appearance:none;padding:10px 34px 10px 16px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232d2020' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 14px center;font-size:13px;font-weight:700;color:var(--ink-2);cursor:pointer;max-width:220px}
  .sa-dethi .filter-selects select:focus{outline:none;border-color:#ee5b9f}
  .sa-dethi .filter-clear{padding:9px 14px;border-radius:999px;border:1.5px solid rgba(238,91,159,.4);background:rgba(238,91,159,.08);color:#c8397a;font-size:12px;font-weight:800;cursor:pointer;transition:background .15s}
  .sa-dethi .filter-clear:hover{background:rgba(238,91,159,.15)}

  /* Multi-select (Loại mẫu / Trường) */
  .sa-dethi .ms-wrap{position:relative}
  .sa-dethi .ms-btn{appearance:none;padding:10px 34px 10px 16px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232d2020' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 14px center;font-size:13px;font-weight:700;color:var(--ink-2);cursor:pointer;max-width:260px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;display:inline-flex;align-items:center;gap:6px}
  .sa-dethi .ms-btn--active{border-color:#ee5b9f;color:#c8397a;background-color:rgba(238,91,159,.06)}
  .sa-dethi .ms-count{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#ee5b9f;color:#fff;font-size:10.5px;font-weight:800}
  .sa-dethi .ms-panel{position:absolute;top:calc(100% + 6px);left:0;min-width:260px;max-width:340px;max-height:340px;overflow-y:auto;background:#fff;border:1.5px solid rgba(45,32,32,.12);border-radius:16px;box-shadow:0 12px 32px rgba(45,32,32,.12);padding:8px;z-index:40}
  .sa-dethi .ms-item{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;color:var(--ink-2);transition:background .12s}
  .sa-dethi .ms-item:hover{background:rgba(45,32,32,.05)}
  .sa-dethi .ms-item input{accent-color:#ee5b9f;width:14px;height:14px;flex-shrink:0}
  .sa-dethi .ms-item--special{font-weight:800;color:var(--ink);background:linear-gradient(135deg,rgba(248,166,104,.08),rgba(238,91,159,.06))}
  .sa-dethi .ms-item--special:hover{background:linear-gradient(135deg,rgba(248,166,104,.15),rgba(238,91,159,.12))}
  .sa-dethi .ms-divider{height:1px;background:rgba(45,32,32,.08);margin:6px 0}
  .sa-dethi .ms-empty{padding:16px 10px;font-size:12px;color:var(--ink-muted);text-align:center}

  /* LIST BODY */
  .sa-dethi .list-body{padding:28px 0 64px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:40px;align-items:start}
  .sa-dethi .list-body>*{min-width:0}
  .sa-dethi .sec-label{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted);display:flex;gap:10px;align-items:center;margin-bottom:16px}
  .sa-dethi .sec-label:after{content:"";flex:1;height:1px;background:rgba(45,32,32,.1)}

  /* CARD */
  .sa-dethi .card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  .sa-dethi .card{display:flex;flex-direction:column;background:#fff;border:1.5px solid rgba(45,32,32,.07);border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(45,32,32,.04);transition:transform .2s ease,box-shadow .2s ease;will-change:transform}
  .sa-dethi .card:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(45,32,32,.1)}
  .sa-dethi .card-thumb{aspect-ratio:4/5;position:relative;background-size:cover;background-position:center;background-color:#f5f1ec}
  .sa-dethi .thumb-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:24px;letter-spacing:-.01em;color:rgba(45,32,32,.28);text-align:center;padding:16px}
  .sa-dethi .card-body{padding:16px 18px 14px;display:flex;flex-direction:column;flex:1;gap:10px}
  .sa-dethi .card-truong{font-size:11px;font-weight:700;color:var(--ink-2);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .sa-dethi .cat-sep{color:rgba(45,32,32,.2)}
  .sa-dethi .card-title{margin:0;font-family:var(--font-display);font-size:14.5px;font-weight:800;line-height:1.35;letter-spacing:-.015em;word-break:break-word;overflow-wrap:anywhere}
  .sa-dethi .card-meta{font-size:12px;color:var(--ink-muted);font-weight:600;display:inline-flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:8px;border-top:1px solid rgba(45,32,32,.07)}
  .sa-dethi .card-meta .sep{color:rgba(45,32,32,.2)}

  /* PAGINATION */
  .sa-dethi .pagination{margin-top:36px;padding-top:28px;border-top:1px solid rgba(45,32,32,.08);display:flex;gap:12px;justify-content:center;align-items:center}
  .sa-dethi .page-btn{width:42px;height:42px;border-radius:50%;border:1.5px solid rgba(45,32,32,.12);display:flex;justify-content:center;align-items:center;background:#fff;font-size:16px;color:var(--ink-2);cursor:pointer;transition:border-color .15s}
  .sa-dethi .page-btn:hover{border-color:var(--ink-2)}
  .sa-dethi .page-num-group{display:flex;gap:4px;align-items:center}
  .sa-dethi .page-num{min-width:38px;height:38px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:700;border:0;background:transparent;display:flex;align-items:center;justify-content:center;transition:background .15s;cursor:pointer}
  .sa-dethi .page-num.active{background:var(--grad);color:#fff}
  .sa-dethi .page-num:not(.active):hover{background:rgba(45,32,32,.06)}
  .sa-dethi .page-dots{color:rgba(45,32,32,.25);padding:0 4px;font-size:13px;font-weight:700}

  /* EMPTY */
  .sa-dethi .empty-state{padding:60px 20px;text-align:center;color:rgba(45,32,32,.45);font-size:15px;border:1.5px dashed rgba(45,32,32,.12);border-radius:16px}

  /* SIDEBAR */
  .sa-dethi .sidebar{display:flex;flex-direction:column;gap:28px;position:sticky;top:148px;min-width:0;max-width:100%;overflow:hidden}
  .sa-dethi .sb-cta{background:radial-gradient(circle at 0% 0%,rgba(248,166,104,.25),transparent 55%),radial-gradient(circle at 100% 100%,rgba(238,91,159,.22),transparent 55%),#fff;border:1.5px solid rgba(238,91,159,.2);border-radius:20px;padding:24px 22px}
  .sa-dethi .sb-cta-logo{width:56px;height:56px;border-radius:16px;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;margin:0 0 14px}
  .sa-dethi .sb-cta-title{font-family:var(--font-display);font-size:20px;font-weight:800;line-height:1.2;margin:0 0 8px}
  .sa-dethi .sb-cta-title em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-dethi .sb-cta-desc{margin:0 0 18px;font-size:13px;line-height:1.55;color:var(--ink-2)}
  .sa-dethi .btn-primary{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--grad-cta);color:#fff;padding:12px 16px;border-radius:999px;width:100%;font-size:13px;font-weight:800}
  .sa-dethi .sb-cta-secondary{display:block;text-align:center;font-size:12px;font-weight:700;color:var(--ink-muted);padding:12px 8px 2px}
  .sa-dethi .sb-section-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:18px;display:flex;gap:10px;align-items:center}
  .sa-dethi .sb-section-label:after{content:"";flex:1;height:1px;background:rgba(45,32,32,.1)}
  .sa-dethi .popular-list{display:flex;flex-direction:column;gap:16px}
  .sa-dethi .popular-item{display:flex;gap:14px;align-items:flex-start}
  .sa-dethi .popular-num{font-family:var(--font-display);font-size:32px;font-weight:800;line-height:.9;min-width:36px;flex-shrink:0;color:rgba(45,32,32,.15)}
  .sa-dethi .popular-num.top1{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-dethi .popular-title{font-family:var(--font-display);font-size:13px;font-weight:800;line-height:1.3;margin:0 0 4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .sa-dethi .popular-meta{font-size:11px;color:var(--ink-muted);font-weight:600}

  @media (max-width:1080px){
    .sa-dethi .list-body{grid-template-columns:minmax(0,1fr) 240px;gap:24px}
  }
  @media (max-width:900px){
    .sa-dethi .page-hero-inner{grid-template-columns:1fr;gap:32px}
    .sa-dethi .list-body{grid-template-columns:1fr}
    .sa-dethi .card-grid{grid-template-columns:1fr 1fr}
    .sa-dethi .sidebar{position:static}
    .sa-dethi .filter-section{position:static}
  }
  @media (max-width:620px){
    .sa-dethi .card-grid{grid-template-columns:1fr}
    .sa-dethi .filter-selects{justify-content:flex-start;width:100%}
    .sa-dethi .filter-selects select{max-width:100%;flex:1}
    .sa-dethi .search-input{max-width:none;min-width:0}
    .sa-dethi .page-hero h1{font-size:36px}
  }
`;

export function DeThiStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
