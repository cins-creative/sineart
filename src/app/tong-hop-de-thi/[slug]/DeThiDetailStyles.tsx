"use client";

/**
 * Style bổ sung cho /tong-hop-de-thi/[slug].
 * Trang detail dùng lại class prefix `.bd` của BlogDetailStyles; thêm:
 *   - `.bd-dt-hero`        : khối hero 2-column (thumbnail + meta)
 *   - `.bd-dt-badges`      : hàng badge (môn / năm / loại mẫu / trường)
 *   - `.bd-dt-badge`       : pill base
 *   - `.bd-dt-badge--mon`  : màu theo môn (background inline)
 *   - `.bd-dt-badge--year` : dark chip cho năm
 *   - `.bd-dt-badge--mau`  : outline cho loại mẫu
 *   - `.bd-dt-badge--tr`   : outline tím cho trường
 *   - `.bd-dt-related`     : grid liên quan
 *   - `.bd-sb-works`       : sidebar "Bài học viên Sine Art" (masonry CSS columns)
 */

const css = `
  /* Hero — 1 cột: tiêu đề/badges trên, ảnh đề thi to full-width phía dưới.
     Ảnh là <button> để click mở lightbox; aspect-ratio cố định 4/3,
     object-fit: contain để hiển thị trọn đề thi dù ảnh portrait hay landscape. */
  .bd-dt-hero{display:flex;flex-direction:column;gap:20px;margin:0 0 28px}
  .bd-dt-hero-head{display:flex;flex-direction:column;gap:14px;min-width:0}
  .bd-dt-title{margin:0;letter-spacing:-.01em}

  .bd-dt-hero-img{position:relative;display:block;width:100%;aspect-ratio:8/9;border-radius:18px;overflow:hidden;background:linear-gradient(160deg,#f7f2ec,#ede4d7);box-shadow:0 14px 40px rgba(45,32,32,.10);border:1.5px solid rgba(45,32,32,.06);padding:0;cursor:zoom-in;transition:transform .25s ease,box-shadow .25s ease}
  .bd-dt-hero-img:hover{transform:translateY(-1px);box-shadow:0 18px 48px rgba(45,32,32,.14)}
  .bd-dt-hero-img:focus-visible{outline:3px solid rgba(238,92,162,.55);outline-offset:3px}
  .bd-dt-hero-img img{width:100%;height:100%;object-fit:contain;display:block;background:transparent}
  .bd-dt-hero-img--empty{cursor:default}
  .bd-dt-hero-img .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Be Vietnam Pro',sans-serif;font-weight:800;font-size:28px;letter-spacing:-.01em;color:rgba(45,32,32,.28);padding:24px;text-align:center}

  .bd-dt-hero-zoom{position:absolute;bottom:14px;right:14px;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:rgba(45,32,32,.78);color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.02em;backdrop-filter:blur(6px);opacity:.92;transition:opacity .2s ease,transform .2s ease;pointer-events:none}
  .bd-dt-hero-img:hover .bd-dt-hero-zoom{opacity:1;transform:translateY(-1px)}

  .bd-dt-badges{display:flex;flex-wrap:wrap;gap:8px}
  .bd-dt-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:.02em;line-height:1.2;border:1.5px solid transparent;color:#2d2020}
  .bd-dt-badge--mon{color:#2d2020;border-color:rgba(45,32,32,.12)}
  .bd-dt-badge--year{background:rgba(45,32,32,.85);color:#fff;border-color:transparent}
  .bd-dt-badge--mau{background:rgba(253,232,89,.22);border-color:rgba(253,232,89,.6);color:#7a5c00}
  .bd-dt-badge--tr{background:rgba(187,137,248,.12);border-color:rgba(187,137,248,.35);color:#5f3ea7}

  .bd-dt-excerpt{margin:0;font-size:16px;line-height:1.6;color:rgba(45,32,32,.78);font-weight:500}

  /* body_html render — nhẹ, tôn trọng inline style OCR pipeline đã sinh. */
  .bd-dt-body{font-family:'Quicksand',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:#2d2020;scroll-margin-top:100px}
  .bd-dt-body h1,.bd-dt-body h2,.bd-dt-body h3{font-family:'Be Vietnam Pro',sans-serif;letter-spacing:-.02em;color:#1a1a1a;line-height:1.25}
  .bd-dt-body h1{font-size:22px;font-weight:800;margin:1.4em 0 .4em}
  .bd-dt-body h2{font-size:20px;font-weight:800;margin:1.3em 0 .5em}
  .bd-dt-body h3{font-size:17px;font-weight:700;margin:1.2em 0 .3em}
  .bd-dt-body p{margin:0 0 12px}
  .bd-dt-body ul,.bd-dt-body ol{margin:8px 0;padding-left:20px}
  .bd-dt-body li{margin-bottom:4px;line-height:1.6}
  .bd-dt-body a{color:#d63384;text-decoration:underline;text-underline-offset:3px}
  .bd-dt-body strong,.bd-dt-body b{font-weight:700;color:#1a1a1a}
  .bd-dt-body img{max-width:100%;height:auto;border-radius:12px;display:block;margin:12px auto}
  .bd-dt-body hr{border:none;border-top:1px solid rgba(45,32,32,.08);margin:2em 0}
  .bd-dt-body table{width:100%;border-collapse:separate;border-spacing:0;margin:18px 0;font-size:14px}
  .bd-dt-body th,.bd-dt-body td{padding:11px 14px;vertical-align:top}
  .bd-dt-body thead th{font-weight:800}
  .bd-dt-body .hero,.bd-dt-body .card{border-radius:16px;padding:14px}

  /* Tiêu chí chấm bài — inject từ page.tsx theo mkt_de_thi.mon.
     Khung figure khoá aspect 1:1, ảnh object-fit:contain để hiển thị trọn tiêu chí
     (có ảnh landscape / portrait khác nhau giữa các môn). */
  .bd-dt-body .bd-dt-tieuchi{display:flex;flex-direction:column;gap:18px;margin:28px 0 8px}
  .bd-dt-body .bd-dt-tieuchi-fig{position:relative;margin:0;border-radius:18px;overflow:hidden;background:#f7f2ec;border:1.5px solid rgba(45,32,32,.06);box-shadow:0 8px 24px rgba(45,32,32,.06);aspect-ratio:1/1}
  .bd-dt-body .bd-dt-tieuchi-fig img{display:block;width:100%;height:100%;object-fit:contain;border-radius:0;margin:0}

  /* Related grid — 3 cột desktop, 1 cột mobile */
  .bd-dt-related{margin-top:44px;padding-top:28px;border-top:1px solid rgba(45,32,32,.08)}
  .bd-dt-related h3{margin:0 0 16px;font-family:'Be Vietnam Pro',sans-serif;font-size:18px;font-weight:800;letter-spacing:-.02em}
  .bd-dt-related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .bd-dt-rcard{display:flex;flex-direction:column;background:#fff;border:1.5px solid rgba(45,32,32,.07);border-radius:14px;overflow:hidden;transition:transform .2s,box-shadow .2s;will-change:transform}
  .bd-dt-rcard:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(45,32,32,.08)}
  .bd-dt-rcard-thumb{aspect-ratio:4/3;background-size:cover;background-position:center;background-color:#f5f1ec}
  .bd-dt-rcard-body{padding:12px 14px;display:flex;flex-direction:column;gap:6px}
  .bd-dt-rcard-title{margin:0;font-family:'Be Vietnam Pro',sans-serif;font-size:13.5px;font-weight:800;line-height:1.3;letter-spacing:-.01em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .bd-dt-rcard-meta{font-size:11px;font-weight:600;color:rgba(45,32,32,.56)}

  /* Sidebar: Bài học viên Sine Art — layout masonry dùng CSS columns.
     Items xếp theo chiều cao tự nhiên của ảnh; 2 cột trên sidebar hẹp. */
  .bd-sb-works{padding:18px 16px 16px}
  .bd-sb-works-grid{column-count:2;column-gap:6px}
  .bd-sb-work{position:relative;display:block;margin:0 0 6px;border-radius:8px;overflow:hidden;background:#f5f1ec;border:1px solid rgba(45,32,32,.06);break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;transition:transform .2s ease,box-shadow .2s ease}
  .bd-sb-work:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(45,32,32,.10)}
  .bd-sb-work img{width:100%;height:auto;display:block}
  .bd-sb-work-ph{width:100%;aspect-ratio:3/4;background:linear-gradient(135deg,#f7f2ec,#ede4d7)}
  .bd-sb-works-note{margin-top:12px;font-size:11px;line-height:1.45;color:rgba(45,32,32,.58);font-weight:500;text-align:center;font-style:italic}

  @media (max-width:900px){
    .bd-dt-hero-img{aspect-ratio:4/5.1}
    .bd-dt-related-grid{grid-template-columns:1fr 1fr}
    .bd-sb-works-grid{column-count:3}
  }
  @media (max-width:520px){
    .bd-dt-related-grid{grid-template-columns:1fr}
    .bd-sb-works-grid{column-count:2}
  }
`;

export function DeThiDetailStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
