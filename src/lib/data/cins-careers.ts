import { cfImageNormalizeAccount, SINE_ART_CF_ACCOUNT } from "@/lib/cfImageUrl";
import { CINS_SUPABASE_URL, getCinsSupabaseReadClient } from "@/lib/cins/client";
import type { CareerCard } from "@/types/career";

/**
 * CINS Supabase — ngành đào tạo đại học (schema thực tế):
 *
 * ```sql
 * SELECT slug, tieu_de, thumbnail, cover_id, meta->>'ma_nganh' AS ma_nganh
 * FROM article_bai_viet
 * WHERE loai_bai_viet = 'nganh_dao_tao'
 *   AND trang_thai_noi_dung = 'published';
 * -- thumbnail / cover_id: UUID → Cloudflare Images (imagedelivery.net)
 * ```
 *
 * Bảng cũ `bai_viet_nganh_hoc` không tồn tại trên project CINS hiện tại.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** thumbnail / cover_id: URL đầy đủ, path storage, hoặc UUID Cloudflare Images. */
function resolveCareerThumbnail(raw: string | null | undefined): string | null {
  let t = raw?.trim() ?? "";
  if (!t) return null;

  if (UUID_RE.test(t)) {
    return `https://imagedelivery.net/${SINE_ART_CF_ACCOUNT}/${t}/public`;
  }

  if (t.startsWith("//")) t = `https:${t}`;
  if (!/^https?:\/\//i.test(t)) {
    const origin = CINS_SUPABASE_URL.replace(/\/$/, "");
    const path = t.startsWith("/") ? t : `/${t}`;
    t = `${origin}${path}`;
  }
  return cfImageNormalizeAccount(t) ?? t;
}

const CINS_SITE = "https://cins.vn";

const GRAD_ROTATION: string[] = [
  "linear-gradient(135deg,#f8a668,#fde859)",
  "linear-gradient(135deg,#ee5b9f,#bb89f8)",
  "linear-gradient(135deg,#bb89f8,#6efec0)",
  "linear-gradient(135deg,#6efec0,#fde859)",
  "linear-gradient(135deg,#fde859,#f8a668)",
  "linear-gradient(135deg,#f8a668,#ee5b9f)",
  "linear-gradient(135deg,#ee5b9f,#fde859)",
];

const TINT_ROTATION: string[] = [
  "rgba(248,166,104,.08)",
  "rgba(238,91,159,.08)",
  "rgba(187,137,248,.08)",
  "rgba(110,254,192,.08)",
  "rgba(253,232,89,.1)",
  "rgba(248,166,104,.1)",
  "rgba(238,91,159,.06)",
];

const EMOJI_ROTATION = ["🎓", "📚", "✨", "🎨", "📐", "🏛️", "🖌️", "💼"];

/** Thứ tự ưu tiên ticker trang chủ — các ngành gắn năng khiếu mỹ thuật Sine Art. */
const HOMEPAGE_MAJOR_SLUG_ORDER = [
  "thiet-ke-do-hoa",
  "cong-nghe-dien-anh-truyen-hinh",
  "thiet-ke-thoi-trang",
  "hoi-hoa",
  "kien-truc",
  "ky-thuat-xay-dung",
  "thiet-ke-noi-that",
  "thiet-ke-cong-nghiep",
  "my-thuat-da-phuong-tien",
  "nghe-thuat-so",
  "thiet-ke-my-thuat-so",
  "do-hoa",
  "kien-truc-canh-quan",
  "quy-hoach-vung-va-do-thi",
  "su-pham-my-thuat",
];

type CinsArticleMeta = {
  ma_nganh?: string | number | null;
};

type ArticleNganhDaoTaoRow = {
  slug: string | null;
  tieu_de: string | null;
  thumbnail: string | null;
  cover_id: string | null;
  meta: CinsArticleMeta | null;
};

function pickMaNganh(meta: CinsArticleMeta | null | undefined): string {
  const raw = meta?.ma_nganh;
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return "";
}

function pickThumbnailRaw(row: ArticleNganhDaoTaoRow): string | null {
  const thumb = row.thumbnail?.trim();
  if (thumb) return thumb;
  const cover = row.cover_id?.trim();
  if (cover) return cover;
  return null;
}

function pickImageUrl(row: ArticleNganhDaoTaoRow): string | null {
  return resolveCareerThumbnail(pickThumbnailRaw(row));
}

function majorSortIndex(slug: string): number {
  const idx = HOMEPAGE_MAJOR_SLUG_ORDER.indexOf(slug);
  return idx === -1 ? HOMEPAGE_MAJOR_SLUG_ORDER.length : idx;
}

function mapRow(row: ArticleNganhDaoTaoRow, index: number): CareerCard | null {
  const slug = row.slug?.trim();
  const title = row.tieu_de?.trim();
  if (!slug || !title) return null;

  const sub = pickMaNganh(row.meta);
  const i = index % GRAD_ROTATION.length;
  const imageUrl = pickImageUrl(row);

  return {
    slug,
    title,
    sub,
    href: `${CINS_SITE}/nganh-hoc/${encodeURIComponent(slug)}`,
    imageUrl,
    emoji: EMOJI_ROTATION[index % EMOJI_ROTATION.length]!,
    tint: TINT_ROTATION[i]!,
    grad: GRAD_ROTATION[i]!,
  };
}

/**
 * Ngành đào tạo đại học từ CINS `article_bai_viet` (loai_bai_viet = nganh_dao_tao).
 */
export async function fetchNganhHocCardsFromCins(limit = 24): Promise<CareerCard[]> {
  const { data, error } = await getCinsSupabaseReadClient()
    .from("article_bai_viet")
    .select("slug, tieu_de, thumbnail, cover_id, meta")
    .eq("loai_bai_viet", "nganh_dao_tao")
    .eq("trang_thai_noi_dung", "published");

  if (error || !data?.length) return [];

  const sorted = [...(data as ArticleNganhDaoTaoRow[])].sort((a, b) => {
    const slugA = a.slug?.trim() ?? "";
    const slugB = b.slug?.trim() ?? "";
    const orderDiff = majorSortIndex(slugA) - majorSortIndex(slugB);
    if (orderDiff !== 0) return orderDiff;
    return (a.tieu_de?.trim() ?? "").localeCompare(b.tieu_de?.trim() ?? "", "vi");
  });

  const out: CareerCard[] = [];
  sorted.slice(0, limit).forEach((row, idx) => {
    const card = mapRow(row, idx);
    if (card) out.push(card);
  });
  return out;
}
