import sharp from "sharp";

const MAX_EDGE_PX = 1600;
const WEBP_QUALITY = 82;

/**
 * Resize (giữ tỉ lệ, không phóng to) + nén WebP trước khi gửi Worker Cloudflare Images.
 */
export async function optimizeBufferForCfUpload(
  buf: Buffer,
  uniquePart?: string,
): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  let img = sharp(buf).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w > MAX_EDGE_PX || h > MAX_EDGE_PX) {
    img = img.resize(MAX_EDGE_PX, MAX_EDGE_PX, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const out = await img.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
  const suffix = uniquePart?.replace(/[^\w.-]+/g, "") || randomSlug();
  return { buffer: out, filename: `classroom-${Date.now()}-${suffix}.webp` };
}

function randomSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}
