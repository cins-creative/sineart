import { cinsSupabase } from "@/lib/cins/client";
import type { CareerCard } from "@/types/career";

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

type BaiVietNganhHocRow = {
  slug: string | null;
  name: string | null;
  ma_nganh: string | null;
  thumbnail: string | null;
};

function mapRow(row: BaiVietNganhHocRow, index: number): CareerCard | null {
  const slug = row.slug?.trim();
  const title = row.name?.trim();
  if (!slug || !title) return null;

  const sub = row.ma_nganh?.trim() || "";
  const i = index % GRAD_ROTATION.length;
  const imageUrl = row.thumbnail?.trim() || null;

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
 * Bài viết ngành học đại học (`bai_viet_nganh_hoc`): name, ma_nganh, thumbnail.
 */
export async function fetchNganhHocCardsFromCins(limit = 24): Promise<CareerCard[]> {
  const { data, error } = await cinsSupabase
    .from("bai_viet_nganh_hoc")
    .select("slug, name, ma_nganh, thumbnail")
    .order("index", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const out: CareerCard[] = [];
  (data as BaiVietNganhHocRow[]).forEach((row, idx) => {
    const card = mapRow(row, idx);
    if (card) out.push(card);
  });
  return out;
}
