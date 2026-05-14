/**
 * Xuất ảnh showcase bài học viên — canvas 1000×1000 (PNG).
 * Bố cục: trái = nhãn + thông tin, phải = ảnh bài; footer tối = logo + icon (Web→FB→IG→YT→TT) + sineart.vn.
 * Chỉ gọi từ client (`"use client"` component).
 */

export type BhvShowcaseExportInput = {
  photoUrl: string | null;
  hocVien: string;
  lop: string;
  gvHuongDan: string;
  /** Hiển thị dạng chuỗi, vd. "2026" hoặc "—" */
  khoaThi: string;
};

const W = 1000;
const H = 1000;
/** File PNG xuất ra đúng 1000×1000 pixel. */
const SCALE = 1;

const BG = "#f5f7f7";
const INK = "#2a2a2a";
const LABEL = "#9a9a9a";
const FOOTER_BG = "#1a1a1a";
const FOOTER_FG = "#ffffff";

const FOOTER_H = 100;
const MAIN_H = H - FOOTER_H;
const PAD = 40;
const LEFT_COL_W = 340;
const GAP_MID = 28;

function loadImage(url: string, crossOrigin: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function loadSvgAsImage(svg: string): Promise<HTMLImageElement | null> {
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return loadImage(url, false);
}

function tryLoadBrandLogo(origin: string): Promise<HTMLImageElement | null> {
  const bases = [`${origin}/brand/logo.png`, `${origin}/brand/sine-art-logo.png`, `${origin}/logo.png`];
  return (async () => {
    for (const u of bases) {
      const img = await loadImage(u, true);
      if (img) return img;
    }
    return null;
  })();
}

/** Thứ tự: Web → Facebook → Instagram → YouTube → TikTok (trắng, nền trong suốt). */
const FOOTER_ICONS_SVG: string[] = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${FOOTER_FG}" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a14 14 0 0 1 0 20M12 2a14 14 0 0 0 0 20"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${FOOTER_FG}"><path d="M9 8h4V6.2c0-.69.05-1.93 2.14-1.93H16V2h-3c-3.62 0-4.34 2.17-4.34 4.15V8H7v4h1.66v8H13v-8h3.09l.45-4H13V8.35c0-1.14.68-1.73 1.65-1.73h1.86V8H9z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${FOOTER_FG}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.5" fill="${FOOTER_FG}" stroke="none"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${FOOTER_FG}" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3V9z" fill="${FOOTER_FG}" stroke="none"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${FOOTER_FG}"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.71 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>`,
];

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const ir = img.width / img.height;
  const br = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > br) {
    sw = sh * br;
    sx = (img.width - sw) / 2;
  } else {
    sh = sw / br;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function oneLineEllipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  const ell = "…";
  let t = text;
  while (t.length > 1 && ctx.measureText(t + ell).width > maxW) t = t.slice(0, -1);
  return t + ell;
}

function drawSineArtWordmark(ctx: CanvasRenderingContext2D, x: number, y: number, maxW: number) {
  const grd = ctx.createLinearGradient(x, y, x + maxW, y + 24);
  grd.addColorStop(0, "#f8a668");
  grd.addColorStop(1, "#ee5ca2");
  ctx.save();
  ctx.font = "bold 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillStyle = grd;
  ctx.fillText("Sine Art", x, y + 20);
  ctx.restore();
}

/**
 * Vẽ card 1000×1000 và trả về PNG (`Blob`).
 */
export async function renderBhvShowcaseCardPng(
  input: BhvShowcaseExportInput,
  opts?: { siteOrigin?: string },
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("renderBhvShowcaseCardPng chỉ chạy trên trình duyệt.");
  }
  const origin = opts?.siteOrigin ?? (typeof window !== "undefined" ? window.location.origin : "");

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được canvas.");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const artX = PAD + LEFT_COL_W + GAP_MID;
  const artY = PAD;
  const artW = W - artX - PAD;
  const artH = MAIN_H - PAD * 2;
  const artR = 12;

  const brandLogo = await tryLoadBrandLogo(origin);

  const footerIcons = await Promise.all(FOOTER_ICONS_SVG.map((s) => loadSvgAsImage(s)));

  // --- Cột trái: nhãn + giá trị ---
  let ty = PAD + 8;
  const labelW = LEFT_COL_W - 8;
  const blocks: { cap: string; val: string }[] = [
    { cap: "HỌC VIÊN", val: input.hocVien.trim() || "—" },
    { cap: "LỚP", val: input.lop.trim() || "—" },
    { cap: "GIẢNG VIÊN", val: input.gvHuongDan.trim() || "—" },
    { cap: "KHÓA THI", val: input.khoaThi.trim() || "—" },
  ];

  for (const { cap, val } of blocks) {
    ctx.fillStyle = LABEL;
    ctx.font = "600 11px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.letterSpacing = "0.14em";
    ctx.fillText(cap, PAD, ty);
    ctx.letterSpacing = "0";
    ty += 18;
    ctx.fillStyle = INK;
    ctx.font = "bold 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
    const shown = oneLineEllipsize(ctx, val, labelW);
    ctx.fillText(shown, PAD, ty);
    ty += 44;
  }

  // --- Ảnh bên phải ---
  ctx.save();
  roundRectPath(ctx, artX, artY, artW, artH, artR);
  ctx.clip();
  ctx.fillStyle = "#e8e8ea";
  ctx.fillRect(artX, artY, artW, artH);

  let artImg: HTMLImageElement | null = null;
  if (input.photoUrl?.trim()) {
    artImg = await loadImage(input.photoUrl.trim(), true);
    if (!artImg) artImg = await loadImage(input.photoUrl.trim(), false);
  }
  if (artImg) {
    drawCover(ctx, artImg, artX, artY, artW, artH);
  } else {
    ctx.fillStyle = "#c5c5c9";
    ctx.font = "600 18px system-ui, sans-serif";
    ctx.fillText("Chưa có ảnh", artX + artW / 2 - 52, artY + artH / 2);
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, artX, artY, artW, artH, artR);
  ctx.stroke();

  // --- Footer ---
  const fy0 = H - FOOTER_H;
  ctx.fillStyle = FOOTER_BG;
  ctx.fillRect(0, fy0, W, FOOTER_H);

  const footerMid = fy0 + FOOTER_H / 2 + 6;
  let lx = PAD;
  const logoH = 34;
  if (brandLogo) {
    const lw = (brandLogo.width / brandLogo.height) * logoH;
    ctx.drawImage(brandLogo, lx, fy0 + (FOOTER_H - logoH) / 2, lw, logoH);
    lx += lw + 14;
  } else {
    drawSineArtWordmark(ctx, lx, fy0 + (FOOTER_H - 28) / 2, 120);
    lx += 130;
  }
  ctx.fillStyle = FOOTER_FG;
  ctx.font = "bold 19px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("SINE ART", lx, footerMid);

  const siteUrl = "sineart.vn";
  const iconSize = 28;
  const iconGap = 12;
  ctx.font = "600 17px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(siteUrl, W - PAD, footerMid);
  ctx.textAlign = "left";

  let ix = W - PAD - ctx.measureText(siteUrl).width - iconGap - iconSize;
  for (let i = footerIcons.length - 1; i >= 0; i--) {
    const ic = footerIcons[i];
    if (ic) {
      ctx.drawImage(ic, ix, fy0 + (FOOTER_H - iconSize) / 2, iconSize, iconSize);
    }
    ix -= iconSize + iconGap;
  }
  ctx.textBaseline = "alphabetic";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Không tạo được file PNG."));
      },
      "image/png",
      1,
    );
  });
}

export function downloadPngBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
