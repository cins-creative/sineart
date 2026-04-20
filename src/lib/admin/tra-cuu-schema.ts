/**
 * Schema + helper dùng chung cho CRUD `tra_cuu_thong_tin` phía admin.
 * Không đụng DB — chỉ normalize input/output.
 */

export const TRA_CUU_TYPE_OPTIONS = [
  { value: "phuong-thuc-tuyen-sinh", label: "Phương thức tuyển sinh" },
  { value: "diem-chuan", label: "Điểm chuẩn" },
  { value: "cach-tinh-diem", label: "Cách tính điểm" },
  { value: "chuong-trinh-hoc", label: "Chương trình học" },
  { value: "kinh-nghiem-thi", label: "Kinh nghiệm thi" },
  { value: "ti-le-choi", label: "Tỉ lệ chọi" },
] as const;

export type TraCuuTypeValue = (typeof TRA_CUU_TYPE_OPTIONS)[number]["value"];

export const TRA_CUU_TYPE_VALUES: ReadonlySet<string> = new Set(
  TRA_CUU_TYPE_OPTIONS.map((o) => o.value),
);

export type AdminTraCuuListRow = {
  id: number;
  created_at: string;
  slug: string | null;
  title: string | null;
  thumbnail_url: string | null;
  thumbnail_alt: string | null;
  nam: number | null;
  excerpt: string | null;
  is_featured: boolean | null;
  published_at: string | null;
  truong_ids: number[];
  type: string[];
};

export type AdminTraCuuFullRow = AdminTraCuuListRow & {
  body_html: string | null;
  updated_at: string | null;
};

export type TruongLookupRow = { id: number; ten: string };

/** Cột SELECT cho danh sách (không kèm `body_html` dài). */
export const TRA_CUU_LIST_COLS =
  "id, created_at, slug, title, thumbnail_url, thumbnail_alt, nam, excerpt, is_featured, published_at, truong_ids, type";

/** Cột SELECT chi tiết (có `body_html`). */
export const TRA_CUU_FULL_COLS = `${TRA_CUU_LIST_COLS}, body_html, updated_at`;

export function mapRowToList(raw: Record<string, unknown>): AdminTraCuuListRow {
  return {
    id: Number(raw.id),
    created_at: String(raw.created_at ?? ""),
    slug: asStrOrNull(raw.slug),
    title: asStrOrNull(raw.title),
    thumbnail_url: asStrOrNull(raw.thumbnail_url),
    thumbnail_alt: asStrOrNull(raw.thumbnail_alt),
    nam: asIntOrNull(raw.nam),
    excerpt: asStrOrNull(raw.excerpt),
    is_featured: typeof raw.is_featured === "boolean" ? raw.is_featured : null,
    published_at: asStrOrNull(raw.published_at),
    truong_ids: asIntArray(raw.truong_ids),
    type: asStrArray(raw.type),
  };
}

export function mapRowToFull(raw: Record<string, unknown>): AdminTraCuuFullRow {
  return {
    ...mapRowToList(raw),
    body_html: asStrOrNull(raw.body_html),
    updated_at: asStrOrNull(raw.updated_at),
  };
}

function asStrOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function asIntOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function asIntArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const it of v) {
    const n = Number(it);
    if (Number.isFinite(n)) out.push(Math.trunc(n));
  }
  return out;
}

function asStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const it of v) {
    if (typeof it === "string" && it.trim()) out.push(it.trim());
  }
  return out;
}

/** Slugify tiếng Việt — dùng cho cả UI preview và fallback phía server. */
export function slugifyVi(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

/** Chuẩn hoá payload để insert/update — chỉ giữ field hợp lệ. */
export type TraCuuUpsertPayload = {
  slug: string | null;
  title: string | null;
  thumbnail_url: string | null;
  thumbnail_alt: string | null;
  nam: number | null;
  excerpt: string | null;
  body_html: string | null;
  is_featured: boolean | null;
  published_at: string | null;
  truong_ids: number[] | null;
  type: TraCuuTypeValue[] | null;
};

type LooseInput = Record<string, unknown>;

/**
 * Ứng cho cả insert & partial update. Khi field không có trong input, trả về `undefined`
 * ở vị trí tương ứng → caller chỉ patch field có mặt trong `input`.
 */
export function normalizeUpsert(input: LooseInput): Partial<TraCuuUpsertPayload> {
  const patch: Partial<TraCuuUpsertPayload> = {};
  if ("slug" in input) patch.slug = asStrOrNull(input.slug);
  if ("title" in input) patch.title = asStrOrNull(input.title);
  if ("thumbnail_url" in input) patch.thumbnail_url = asStrOrNull(input.thumbnail_url);
  if ("thumbnail_alt" in input) patch.thumbnail_alt = asStrOrNull(input.thumbnail_alt);
  if ("nam" in input) patch.nam = asIntOrNull(input.nam);
  if ("excerpt" in input) patch.excerpt = asStrOrNull(input.excerpt);
  if ("body_html" in input) patch.body_html = asStrOrNull(input.body_html);
  if ("is_featured" in input) {
    patch.is_featured = typeof input.is_featured === "boolean" ? input.is_featured : null;
  }
  if ("published_at" in input) patch.published_at = asStrOrNull(input.published_at);
  if ("truong_ids" in input) {
    const arr = asIntArray(input.truong_ids);
    patch.truong_ids = arr;
  }
  if ("type" in input) {
    const arr = asStrArray(input.type).filter((v): v is TraCuuTypeValue =>
      TRA_CUU_TYPE_VALUES.has(v),
    );
    patch.type = arr;
  }
  return patch;
}
