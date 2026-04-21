"use client";

/**
 * Style cho trang /tra-cuu-thong-tin (listing).
 * Clone từ `.sa-blog` của BlogStyles, đổi prefix sang `.sa-tracuu`, và thêm:
 *   - `filter-selects`   : 2 dropdown (trường, loại)
 *   - `type-chip(-row)`  : badge loại bài
 *   - `thumb-year`       : badge năm trên thumbnail
 *   - `card-excerpt`     : mô tả ngắn trong card
 *   - `empty-state`      : khi không có kết quả
 */

const css = `
  .sa-tracuu{--bg:#fff;--ink:#2d2020;--ink-2:rgba(45,32,32,.78);--ink-muted:rgba(45,32,32,.56);--font-display:"Be Vietnam Pro","Grandstander",system-ui,sans-serif;--font-body:"Quicksand",system-ui,sans-serif;--cat-hh:#fde859;--cat-bc:#6efec0;--cat-tt:#bb89f8;--cat-dg:#f8a668;--grad:linear-gradient(135deg,#f8a668,#ee5b9f);--grad-cta:linear-gradient(145deg,#fbc08a 0%,#f8a668 22%,#ee5b9f 78%,#d9468a 100%);background:#fff;color:var(--ink);font-family:var(--font-body)}
  .sa-tracuu *{box-sizing:border-box}.sa-tracuu a{text-decoration:none;color:inherit}.sa-tracuu button{font-family:inherit}.sa-tracuu .shell{max-width:1200px;margin:0 auto;padding:0 28px}

  /* HERO */
  .sa-tracuu .page-hero{position:relative;padding:72px 0 48px;overflow:hidden;isolation:isolate}
  .sa-tracuu .page-hero-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 85% 15%,rgba(248,166,104,.22) 0%,transparent 45%),radial-gradient(circle at 8% 80%,rgba(187,137,248,.22) 0%,transparent 40%),radial-gradient(circle at 60% 90%,rgba(110,254,192,.18) 0%,transparent 40%),#ffffff}
  .sa-tracuu .blob{position:absolute;border-radius:50%;z-index:-1}
  .sa-tracuu .blob-a{width:90px;height:90px;background:var(--cat-hh);top:90px;left:5%;opacity:.75}
  .sa-tracuu .blob-b{width:36px;height:36px;background:#ee5b9f;top:140px;right:8%}
  .sa-tracuu .blob-c{width:54px;height:54px;background:var(--cat-bc);bottom:40px;right:34%}
  .sa-tracuu .page-hero-inner{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:end}
  .sa-tracuu .ph-eyebrow{display:inline-flex;gap:8px;align-items:center;padding:7px 14px 7px 8px;border-radius:999px;background:rgba(255,255,255,.7);border:1.5px solid rgba(45,32,32,.08);font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin-bottom:20px}
  .sa-tracuu .ph-eyebrow .dot{width:20px;height:20px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center}
  .sa-tracuu .page-hero h1{margin:0 0 18px;font-family:var(--font-display);font-size:clamp(40px,5vw,60px);font-weight:800;line-height:1.02;letter-spacing:-.035em}
  .sa-tracuu .page-hero h1 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-tracuu .lead{margin:0;max-width:52ch;font-size:17px;line-height:1.6;color:var(--ink-2)}
  .sa-tracuu .ph-side{display:flex;flex-direction:column;gap:10px}
  .sa-tracuu .ph-stat{display:flex;gap:10px;align-items:baseline;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.6);border:1.5px solid rgba(45,32,32,.08)}
  .sa-tracuu .ph-stat .n{font-family:var(--font-display);font-size:28px;font-weight:800}
  .sa-tracuu .ph-stat .n em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-tracuu .ph-stat .l{font-size:13px;font-weight:600;color:var(--ink-2)}
  .sa-tracuu .ph-stat .l span{color:var(--ink-muted);font-weight:500}

  /* FILTER BAR — offset top=70px để né navbar fixed trên desktop (≥900px).
     Mobile (<900px) navbar ở đáy nên top:0 hợp lý — override trong media query.
     KHÔNG dùng backdrop-filter ở đây vì sẽ conflict với backdrop-filter của navbar
     ngay phía trên (cả hai stack composite → Chrome flatten, mất blur navbar). */
  .sa-tracuu .filter-section{position:sticky;top:70px;z-index:20;background:#fff;border-top:1px solid rgba(45,32,32,.06);border-bottom:1px solid rgba(45,32,32,.06)}
  .sa-tracuu .filter-bar{padding:16px 0;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
  .sa-tracuu .search-input{display:flex;gap:10px;align-items:center;padding:10px 18px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);background:#fff;min-width:260px;flex:1;max-width:340px}
  .sa-tracuu .search-input input{border:0;outline:none;background:transparent;flex:1;min-width:0;font-size:13px;font-family:inherit}
  .sa-tracuu .filter-selects{display:flex;gap:8px;flex-wrap:wrap;flex:1;justify-content:flex-end;align-items:center}
  .sa-tracuu .filter-selects select{appearance:none;-webkit-appearance:none;padding:10px 34px 10px 16px;border-radius:999px;border:1.5px solid rgba(45,32,32,.12);background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232d2020' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 14px center;font-size:13px;font-weight:700;color:var(--ink-2);cursor:pointer;max-width:240px}
  .sa-tracuu .filter-selects select:focus{outline:none;border-color:#ee5b9f}
  .sa-tracuu .filter-clear{padding:9px 14px;border-radius:999px;border:1.5px solid rgba(238,91,159,.4);background:rgba(238,91,159,.08);color:#c8397a;font-size:12px;font-weight:800;cursor:pointer;transition:background .15s}
  .sa-tracuu .filter-clear:hover{background:rgba(238,91,159,.15)}

  /* LIST BODY */
  .sa-tracuu .list-body{padding:40px 0 64px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:40px;align-items:start}
  .sa-tracuu .list-body>*{min-width:0}
  .sa-tracuu .sec-label{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted);display:flex;gap:10px;align-items:center;margin-bottom:16px}
  .sa-tracuu .sec-label:after{content:"";flex:1;height:1px;background:rgba(45,32,32,.1)}
  .sa-tracuu .cat-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
  .sa-tracuu .cat-dot.neutral{border:1px solid rgba(45,32,32,.18);background:#f0f0f0}

  /* FEATURED */
  .sa-tracuu .featured-card{display:grid;grid-template-columns:1fr 1fr;background:#fff;border:1.5px solid rgba(45,32,32,.07);border-radius:20px;overflow:hidden;box-shadow:0 4px 18px rgba(45,32,32,.06);margin-bottom:0;align-items:stretch;transition:transform .2s,box-shadow .2s}
  .sa-tracuu .featured-card:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(45,32,32,.1)}
  .sa-tracuu .featured-thumb{min-height:100%;height:100%;background:linear-gradient(135deg,#fde859 0%,#f8a668 50%,#ee5b9f 100%);position:relative;background-size:cover;background-position:center}
  .sa-tracuu .featured-badge{position:absolute;top:16px;left:16px;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.92);font-size:10px;font-weight:800;letter-spacing:.12em}
  .sa-tracuu .featured-meta{padding:32px 34px;display:flex;flex-direction:column;justify-content:center}
  .sa-tracuu .cat-row{display:flex;gap:8px;align-items:center;margin-bottom:14px;font-size:12px}
  .sa-tracuu .cat-name{font-weight:700;color:var(--ink-2)}
  .sa-tracuu .cat-sep{color:rgba(45,32,32,.2)}
  .sa-tracuu .cat-time{color:var(--ink-muted);font-weight:500}
  .sa-tracuu .featured-meta h2{margin:0 0 14px;font-family:var(--font-display);font-size:28px;font-weight:800;line-height:1.15;letter-spacing:-.025em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .sa-tracuu .excerpt{margin:0 0 14px;font-size:14px;line-height:1.65;color:var(--ink-2);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .sa-tracuu .author-row{display:flex;gap:10px;align-items:center;font-size:12px;margin-top:14px}
  .sa-tracuu .avatar{width:28px;height:28px;border-radius:50%;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0}
  .sa-tracuu .author-name{font-weight:700}
  .sa-tracuu .author-date{color:var(--ink-muted);font-weight:500}

  /* CARD */
  .sa-tracuu .card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  .sa-tracuu .card{display:flex;flex-direction:column;background:#fff;border:1.5px solid rgba(45,32,32,.07);border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(45,32,32,.04);transition:transform .2s,box-shadow .2s}
  .sa-tracuu .card:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(45,32,32,.1)}
  .sa-tracuu .card-thumb{aspect-ratio:4/3;position:relative;background-size:cover;background-position:center}
  .sa-tracuu .thumb-badge{position:absolute;top:12px;left:12px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.92);font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;max-width:calc(100% - 64px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sa-tracuu .thumb-year{position:absolute;top:12px;right:12px;padding:4px 10px;border-radius:999px;background:rgba(45,32,32,.82);color:#fff;font-size:10px;font-weight:800;letter-spacing:.06em}
  .sa-tracuu .card-body{padding:18px 20px 16px;display:flex;flex-direction:column;flex:1}
  .sa-tracuu .card-body .cat-row{margin-bottom:10px;font-size:11px}
  .sa-tracuu .card-title{margin:0 0 10px;font-family:var(--font-display);font-size:16px;font-weight:800;line-height:1.3;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .sa-tracuu .card-excerpt{margin:0 0 12px;font-size:12.5px;line-height:1.55;color:var(--ink-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;flex:1}
  .sa-tracuu .card-footer{display:flex;gap:8px;align-items:center;padding-top:12px;border-top:1px solid rgba(45,32,32,.07);font-size:11px}
  .sa-tracuu .card-footer .avatar{width:22px;height:22px;font-size:9px}

  /* TYPE CHIP */
  .sa-tracuu .type-chip-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
  .sa-tracuu .type-chip{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:linear-gradient(135deg,rgba(248,166,104,.18),rgba(238,91,159,.16));border:1px solid rgba(238,91,159,.25);font-size:10.5px;font-weight:800;letter-spacing:.02em;color:#a4336b;white-space:nowrap}
  .sa-tracuu .type-chip--more{background:rgba(45,32,32,.06);border-color:rgba(45,32,32,.12);color:var(--ink-muted)}

  /* PAGINATION */
  .sa-tracuu .pagination{margin-top:36px;padding-top:28px;border-top:1px solid rgba(45,32,32,.08);display:flex;gap:12px;justify-content:center;align-items:center}
  .sa-tracuu .page-btn{width:42px;height:42px;border-radius:50%;border:1.5px solid rgba(45,32,32,.12);display:flex;justify-content:center;align-items:center;background:#fff;font-size:16px;color:var(--ink-2);cursor:pointer;transition:border-color .15s}
  .sa-tracuu .page-btn:hover{border-color:var(--ink-2)}
  .sa-tracuu .page-num-group{display:flex;gap:4px;align-items:center}
  .sa-tracuu .page-num{min-width:38px;height:38px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:700;border:0;background:transparent;display:flex;align-items:center;justify-content:center;transition:background .15s;cursor:pointer}
  .sa-tracuu .page-num.active{background:var(--grad);color:#fff}
  .sa-tracuu .page-num:not(.active):hover{background:rgba(45,32,32,.06)}
  .sa-tracuu .page-dots{color:rgba(45,32,32,.25);padding:0 4px;font-size:13px;font-weight:700}

  /* EMPTY */
  .sa-tracuu .empty-state{padding:60px 20px;text-align:center;color:rgba(45,32,32,.45);font-size:15px;border:1.5px dashed rgba(45,32,32,.12);border-radius:16px}

  /* SIDEBAR */
  .sa-tracuu .sidebar{display:flex;flex-direction:column;gap:28px;position:sticky;top:148px;min-width:0;max-width:100%;overflow:hidden}
  .sa-tracuu .sb-cta{background:radial-gradient(circle at 0% 0%,rgba(248,166,104,.25),transparent 55%),radial-gradient(circle at 100% 100%,rgba(238,91,159,.22),transparent 55%),#fff;border:1.5px solid rgba(238,91,159,.2);border-radius:20px;padding:24px 22px}
  .sa-tracuu .sb-cta-logo{width:56px;height:56px;border-radius:16px;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;margin:0 0 14px}
  .sa-tracuu .sb-cta-title{font-family:var(--font-display);font-size:20px;font-weight:800;line-height:1.2;margin:0 0 8px}
  .sa-tracuu .sb-cta-title em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-tracuu .sb-cta-desc{margin:0 0 18px;font-size:13px;line-height:1.55;color:var(--ink-2)}
  .sa-tracuu .btn-primary{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--grad-cta);color:#fff;padding:12px 16px;border-radius:999px;width:100%;font-size:13px;font-weight:800}
  .sa-tracuu .sb-cta-secondary{display:block;text-align:center;font-size:12px;font-weight:700;color:var(--ink-muted);padding:12px 8px 2px}
  .sa-tracuu .sb-section-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:18px;display:flex;gap:10px;align-items:center}
  .sa-tracuu .sb-section-label:after{content:"";flex:1;height:1px;background:rgba(45,32,32,.1)}
  .sa-tracuu .popular-list{display:flex;flex-direction:column;gap:16px}
  .sa-tracuu .popular-item{display:flex;gap:14px;align-items:flex-start}
  .sa-tracuu .popular-num{font-family:var(--font-display);font-size:32px;font-weight:800;line-height:.9;min-width:36px;flex-shrink:0;color:rgba(45,32,32,.15)}
  .sa-tracuu .popular-num.top1{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sa-tracuu .popular-title{font-family:var(--font-display);font-size:13px;font-weight:800;line-height:1.3;margin:0 0 4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .sa-tracuu .popular-meta{font-size:11px;color:var(--ink-muted);font-weight:600;display:inline-flex;gap:6px;align-items:center}
  .sa-tracuu .popular-meta .cat-dot{width:6px;height:6px}

  @media (max-width:1080px){
    .sa-tracuu .list-body{grid-template-columns:minmax(0,1fr) 240px;gap:24px}
    .sa-tracuu .featured-card{grid-template-columns:1fr}
    .sa-tracuu .featured-thumb{aspect-ratio:16/9;height:auto;min-height:auto}
    .sa-tracuu .featured-meta{padding:24px}
    .sa-tracuu .featured-meta h2{font-size:24px}
  }
  @media (max-width:900px){
    .sa-tracuu .page-hero-inner{grid-template-columns:1fr;gap:32px}
    .sa-tracuu .list-body{grid-template-columns:1fr}
    .sa-tracuu .card-grid{grid-template-columns:1fr 1fr}
    .sa-tracuu .sidebar{position:static}
    .sa-tracuu .filter-section{position:static}
  }
  @media (max-width:620px){
    .sa-tracuu .card-grid{grid-template-columns:1fr}
    .sa-tracuu .filter-selects{justify-content:flex-start;width:100%}
    .sa-tracuu .filter-selects select{max-width:100%;flex:1}
    .sa-tracuu .search-input{max-width:none;min-width:0}
    .sa-tracuu .featured-meta h2{font-size:22px}
    .sa-tracuu .page-hero h1{font-size:36px}
  }
`;

export function TraCuuStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
