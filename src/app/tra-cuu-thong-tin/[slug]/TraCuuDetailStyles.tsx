"use client";

/**
 * Bổ sung style cho trang /tra-cuu-thong-tin/[slug].
 * Trang detail dùng lại class prefix `.bd` của BlogDetailStyles — file này chỉ thêm:
 *   - `.bd-tc-badges`     : hàng badge trường/loại dưới breadcrumb
 *   - `.bd-tc-badge`      : pill chung
 *   - `.bd-tc-badge--truong` / `--type` / `--year` : biến thể màu
 */

const css = `
  .bd-tc-badges{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
  .bd-tc-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:.02em;line-height:1.2;border:1.5px solid transparent}
  .bd-tc-badge--truong{background:rgba(187,137,248,.12);border-color:rgba(187,137,248,.35);color:#5f3ea7}
  .bd-tc-badge--type{background:linear-gradient(135deg,rgba(248,166,104,.16),rgba(238,91,159,.14));border-color:rgba(238,91,159,.3);color:#a4336b}
  .bd-tc-badge--year{background:rgba(45,32,32,.82);color:#fff;border-color:transparent}
  .bd-tc-badge-dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.6}

  .bd-tc-meta{display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:12px;color:rgba(45,32,32,.56);margin:0 0 20px}
  .bd-tc-meta .sep{color:rgba(45,32,32,.2)}

  /* Container render body_html — tối giản, KHÔNG đè inline style của Claude
     (mirror .qlt-preview-body trong admin editor để public & preview đồng bộ). */
  .bd-tc-body{font-family:'Quicksand',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:#2d2020;scroll-margin-top:100px}
  .bd-tc-body h1{font-size:22px;font-weight:800;margin:1.4em 0 .4em;color:#1a1a1a;line-height:1.2;scroll-margin-top:100px}
  .bd-tc-body h2{font-size:20px;font-weight:800;margin:1.3em 0 .5em;color:#1a1a1a;line-height:1.25;scroll-margin-top:100px}
  .bd-tc-body h3{font-size:17px;font-weight:700;margin:1.2em 0 .3em;color:#1a1a1a;line-height:1.3;scroll-margin-top:100px}
  .bd-tc-body p{margin:0 0 12px}
  .bd-tc-body ul,.bd-tc-body ol{margin:8px 0;padding-left:20px}
  .bd-tc-body li{margin-bottom:4px;line-height:1.6}
  .bd-tc-body a{color:#d63384;text-decoration:underline;text-underline-offset:3px}
  .bd-tc-body strong,.bd-tc-body b{font-weight:700;color:#1a1a1a}
  .bd-tc-body hr{border:none;border-top:1px solid rgba(45,32,32,.08);margin:2em 0}
  .bd-tc-body img{max-width:100%;height:auto;border-radius:10px}
  /* Table defaults — padding cho ô + margin, KHÔNG áp border/background toàn cục
     để inline style của Claude (gradient header, zebra row, v.v.) tự quyết. */
  .bd-tc-body table{width:100%;border-collapse:separate;border-spacing:0;margin:18px 0;font-size:14px}
  .bd-tc-body th,.bd-tc-body td{padding:11px 14px;vertical-align:top}
  .bd-tc-body thead th{font-weight:800}

  /* Grid defaults — gap + margin khi Claude quên khai báo.
     Inline style="gap:..." của Claude sẽ override do specificity cao hơn. */
  .bd-tc-body [class*="grid" i],
  .bd-tc-body [class*="stats" i],
  .bd-tc-body [class*="cards" i]{gap:14px;margin:16px 0}

  /* Container card defaults — padding + border-radius khi Claude quên khai báo.
     Áp dụng cho các class phổ biến Claude thường dùng. */
  .bd-tc-body .hero,
  .bd-tc-body .card,
  .bd-tc-body .box,
  .bd-tc-body .panel,
  .bd-tc-body [class*="info-box" i],
  .bd-tc-body [class*="method" i]:not([class*="methods" i]),
  .bd-tc-body [class*="section-card" i],
  .bd-tc-body [class*="feature" i]:not([class*="features" i]){padding:20px 24px;border-radius:14px}

  /* Khoảng cách tối thiểu giữa các section block con trực tiếp. */
  .bd-tc-body > * + *{margin-top:14px}

  /* ─── Album gallery đầu bài ───
     Ảnh thông tin tuyển sinh thường tỉ lệ 1:1 → dùng khung vuông đều + object-fit:contain
     để KHÔNG bị crop; phần trống dùng background nhẹ. */
  .bd-tc-album{display:grid;gap:10px;margin:14px 0 22px}
  .bd-tc-album-fig{margin:0;padding:0;overflow:hidden;border-radius:12px;background:#faf6f2;aspect-ratio:1/1}
  .bd-tc-album-link{display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:0}
  .bd-tc-album-img{display:block;max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;transition:transform .35s ease}
  .bd-tc-album-link:hover .bd-tc-album-img{transform:scale(1.03)}

  /* 1 ảnh: giới hạn bề ngang để không quá to */
  .bd-tc-album--one{justify-content:center}
  .bd-tc-album--one .bd-tc-album-fig{max-width:420px;width:100%}

  /* 2 ảnh: 2 cột đều */
  .bd-tc-album--two{grid-template-columns:1fr 1fr}

  /* 3+ ảnh: grid 3 cột đều, mỗi ô vuông — fit trọn ảnh 1:1 */
  .bd-tc-album--grid{grid-template-columns:repeat(3,1fr)}

  @media (max-width:640px){
    .bd-tc-album--two{grid-template-columns:1fr 1fr;gap:8px}
    .bd-tc-album--grid{grid-template-columns:repeat(2,1fr);gap:8px}
  }
`;

export function TraCuuDetailStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
