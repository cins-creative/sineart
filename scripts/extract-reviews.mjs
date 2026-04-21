import { readFileSync, writeFileSync } from 'fs';

const INPUT = 'C:/Users/DELL/Downloads/Sine Art - Google Maps (4_21_2026 11\uFF1A40\uFF1A38 AM).html';
const OUTDIR = 'C:/Users/DELL/Desktop/Sine Art new/sineart-web/scripts';

const html = readFileSync(INPUT, 'utf8');

/**
 * Cards start with: <div class="m6QErb XiKgde"><div class="jftiEf fontBodyMedium" aria-label="NAME" data-review-id=XYZ>
 * 70 cards total in file. Split by "m6QErb XiKgde" or directly by "jftiEf fontBodyMedium".
 */
const marker = 'class="jftiEf fontBodyMedium"';
const positions = [];
let p = 0;
while ((p = html.indexOf(marker, p)) !== -1) {
  positions.push(p);
  p += marker.length;
}
console.log('Found', positions.length, 'cards');

const decodeHtml = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const stripTags = (s) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');

function parseCard(cardHtml, cardStart) {
  // Aria-label contains reviewer name on outer div
  const ariaNameM = cardHtml.match(/aria-label="([^"]+)"\s+data-review-id=/);
  const name = ariaNameM ? decodeHtml(ariaNameM[1]).trim() : '';

  const reviewIdM = cardHtml.match(/data-review-id=([A-Za-z0-9_\-+/=]+)/);
  const reviewId = reviewIdM ? reviewIdM[1] : '';

  // Avatar inside <img class=NBa7we ... src="...">
  // Skip base64 data URIs (fallback image). Use the real googleusercontent URL.
  let avatar = '';
  const imgMatches = [...cardHtml.matchAll(/<img[^>]*class=NBa7we[^>]*src="([^"]+)"/g)];
  for (const m of imgMatches) {
    const src = m[1];
    if (!src.startsWith('data:')) {
      avatar = src;
      break;
    }
  }
  // Fallback: srcset
  if (!avatar) {
    const srcsetM = cardHtml.match(/<img[^>]*class=NBa7we[^>]*srcset="([^"]+)"/);
    if (srcsetM) avatar = srcsetM[1].split(/\s+/)[0];
  }
  // Fallback: <a class=WEBjve data-href="..."> won't give avatar. Google lazy-loads avatars;
  // if still empty, saved page may have only data-url. Check for data-src.
  if (!avatar) {
    const dataSrcM = cardHtml.match(/<img[^>]*class=NBa7we[^>]*data-src="([^"]+)"/);
    if (dataSrcM) avatar = dataSrcM[1];
  }

  // Stars — aria-label="5 sao"
  const starsM = cardHtml.match(/class=kvMYJc\s+role=img\s+aria-label="(\d)\s*sao"/);
  const stars = starsM ? Number(starsM[1]) : null;

  // Relative time
  const timeM = cardHtml.match(/class=rsqaWe>([^<]+)<\/span>/);
  const time = timeM ? decodeHtml(timeM[1]).trim() : '';

  // Review text (may be truncated ending with "…")
  const textM = cardHtml.match(/class=wiI7pd>([\s\S]*?)<\/span>/);
  let text = '';
  let truncated = false;
  if (textM) {
    text = decodeHtml(stripTags(textM[1])).trim();
    if (text.endsWith('…') || text.endsWith('...')) truncated = true;
  }

  // Reviewer profile URL
  const profileM = cardHtml.match(/data-href="(https:\/\/www\.google\.com\/maps\/contrib\/[^"]+)"/);
  const profile = profileM ? profileM[1] : '';

  // Photos uploaded with review — Google uses <button class="Tya61d" style="background-image: url('...')">
  // Or sometimes <img> in KtCyie. Let's search for background-image url pattern AND ensure it's inside a photo block.
  const photos = [];
  const photoRe = /background-image:\s*url\(&quot;?([^")]+?)&quot;?\)/g;
  let pm;
  while ((pm = photoRe.exec(cardHtml)) !== null) {
    const url = decodeHtml(pm[1]).replace(/\\/g, '');
    // Skip googleusercontent avatars (they're already captured); photos are lh3.googleusercontent.com/p/...
    if (url.includes('lh') && !photos.includes(url)) photos.push(url);
  }
  // Alternative: plain url() without &quot;
  const photoRe2 = /background-image:\s*url\(([^)]+)\)/g;
  let pm2;
  while ((pm2 = photoRe2.exec(cardHtml)) !== null) {
    let url = pm2[1].replace(/^['"]|['"]$/g, '').replace(/&quot;/g, '').trim();
    if (url.startsWith('http') && url.includes('lh') && !photos.includes(url)) {
      photos.push(url);
    }
  }

  return { reviewId, name, avatar, profile, stars, time, text, truncated, photos };
}

const results = [];
for (let i = 0; i < positions.length; i++) {
  const start = positions[i];
  const end = i + 1 < positions.length ? positions[i + 1] : start + 12000;
  const cardHtml = html.slice(start - 200, end);
  results.push(parseCard(cardHtml, start));
}

writeFileSync(`${OUTDIR}/reviews-all.json`, JSON.stringify(results, null, 2), 'utf8');

const fiveStars = results.filter((r) => r.stars === 5 && r.text && r.text.length > 30);
writeFileSync(`${OUTDIR}/reviews-5star.json`, JSON.stringify(fiveStars, null, 2), 'utf8');

const withPhotos = fiveStars.filter((r) => r.photos.length > 0);

console.log(`Total: ${results.length}`);
console.log(`5-star with meaningful text: ${fiveStars.length}`);
console.log(`5-star with photos: ${withPhotos.length}`);
console.log(`Truncated texts: ${fiveStars.filter((r) => r.truncated).length}`);

// Preview first few
console.log('\n=== First 3 reviews ===');
for (const r of fiveStars.slice(0, 3)) {
  console.log('---');
  console.log('Name:', r.name);
  console.log('Time:', r.time);
  console.log('Stars:', r.stars);
  console.log('Truncated:', r.truncated);
  console.log('Avatar:', r.avatar.slice(0, 100));
  console.log('Photos:', r.photos.length);
  console.log('Text:', r.text.slice(0, 200));
}
