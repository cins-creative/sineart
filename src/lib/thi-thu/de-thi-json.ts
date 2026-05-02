import type { ThiThuDeThiItem } from "@/types/thi-thu";

/** Body POST đôi khi gửi `de_thi` là chuỗi JSON thay vì mảng (proxy/middleware). */
export function coerceDeThiInput(raw: unknown): unknown {
  if (raw == null) return [];
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return [];
    }
  }
  return raw;
}

/** Đọc `de_thi` từ DB (json/jsonb) hoặc null. */
export function parseDeThiJson(raw: unknown): ThiThuDeThiItem[] {
  const coerced = coerceDeThiInput(raw);
  if (coerced == null) return [];
  if (!Array.isArray(coerced)) return [];
  const out: ThiThuDeThiItem[] = [];
  for (const el of coerced) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const tieu_de = typeof o.tieu_de === "string" ? o.tieu_de.trim() : "";
    const thu_tu =
      typeof o.thu_tu === "number" && Number.isFinite(o.thu_tu) ? Math.floor(o.thu_tu) : 0;
    const rawUrls = o.anh_urls ?? o.anhUrls;
    const fromPrimary = Array.isArray(rawUrls)
      ? rawUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      : [];
    const anh_urls = fromPrimary;
    out.push({ tieu_de, thu_tu, anh_urls });
  }
  return out.sort((a, b) => a.thu_tu - b.thu_tu);
}

/** Chuẩn hóa trước khi gửi API / ghi DB — bỏ đề trống tiêu đề. */
export function normalizeDeThiForSave(items: ThiThuDeThiItem[]): ThiThuDeThiItem[] {
  return items
    .map((r, i) => ({
      tieu_de: r.tieu_de.trim(),
      thu_tu: r.thu_tu > 0 ? r.thu_tu : i + 1,
      anh_urls: (r.anh_urls ?? []).filter((u) => typeof u === "string" && u.trim().length > 0),
    }))
    .filter((r) => r.tieu_de.length > 0)
    .map((r, i) => ({ ...r, thu_tu: i + 1 }))
    .sort((a, b) => a.thu_tu - b.thu_tu);
}
