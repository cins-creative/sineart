import { readFileSync, writeFileSync } from 'fs';

const DATA = JSON.parse(
  readFileSync('C:/Users/DELL/Desktop/Sine Art new/sineart-web/scripts/reviews-5star.json', 'utf8'),
);

const esc = (s) => (s ?? '').replace(/'/g, "''");

const lines = [];
lines.push('-- ============================================================');
lines.push(`-- Google Maps reviews → ql_danh_gia`);
lines.push(`-- Generated: ${new Date().toISOString()}`);
lines.push(`-- Total: ${DATA.length} reviews (5-sao, có nội dung ≥ 30 ký tự)`);
lines.push('--');
lines.push('-- GHI CHÚ QUAN TRỌNG:');
lines.push('-- 1. Các dòng có -- [TRUNCATED] là review bị cắt ở Google Maps (kết thúc bằng "…").');
lines.push('--    Bạn cần mở từng review trên Google Maps, bấm "Xem thêm" rồi sửa noi_dung cho đủ.');
lines.push('-- 2. avatar_url để trống. Xem README bên dưới để upload ảnh lên Cloudflare Images và paste URL.');
lines.push('-- 3. khoa_hoc (FK → ql_mon_hoc.id) để NULL. Gán thủ công trong Supabase Studio sau khi');
lines.push('--    đọc nội dung review để đoán môn học (vd "hình họa" → id môn Hình hoạ).');
lines.push('-- ============================================================');
lines.push('');
lines.push('INSERT INTO ql_danh_gia');
lines.push('  (ten_nguoi, avatar_url, noi_dung, so_sao, nguon, hien_thi)');
lines.push('VALUES');

const rows = DATA.map((r, i) => {
  const comment = r.truncated ? '  -- [TRUNCATED] ' : '  -- ';
  const trailing = i === DATA.length - 1 ? ';' : ',';
  return `  ('${esc(r.name)}', NULL, '${esc(r.text)}', 5, 'Google Maps', true)${trailing}${comment}${r.time} · ${r.reviewId}`;
});
lines.push(rows.join('\n'));
lines.push('');

writeFileSync(
  'C:/Users/DELL/Desktop/Sine Art new/sineart-web/scripts/reviews-insert.sql',
  lines.join('\n'),
  'utf8',
);
console.log('Wrote reviews-insert.sql (' + DATA.length + ' rows)');
console.log('Truncated count:', DATA.filter((r) => r.truncated).length);
