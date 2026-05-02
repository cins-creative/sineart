import type { Metadata } from "next";
import { Suspense } from "react";

import { EbookKhoaHocNav } from "../_components/EbookKhoaHocNav";
import { EbookKhoaHocNavSkeleton } from "../_components/EbookKhoaHocNav.skeleton";
import { EbookDetailStyles } from "./EbookDetailStyles";
import { EbookDetailMain } from "./_components/EbookDetailMain";
import { EbookDetailMainSkeleton } from "./_components/EbookDetailMain.skeleton";

import { fetchAllEbooks, fetchEbookBySlug } from "@/lib/data/ebook";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 600;

/**
 * Pre-generate static params cho mọi slug hiện có trong `mkt_ebooks`.
 * Dùng `fetchAllEbooks` (React `cache`) nên không tốn thêm query vs listing.
 */
export async function generateStaticParams() {
  const all = await fetchAllEbooks();
  return all.filter((e) => e.slug).map((e) => ({ slug: e.slug }));
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ebook = await fetchEbookBySlug(slug);
  if (!ebook) {
    return {
      title: "Không tìm thấy ebook — Sine Art Library",
      robots: { index: false, follow: false },
    };
  }
  const title = `${ebook.title} — Sine Art Library`;
  const description = stripHtml(ebook.content).slice(0, 180).trim();
  return {
    title,
    description: description || `Ebook ${ebook.title} — Sine Art Library`,
    alternates: { canonical: `https://sineart.vn/ebook/${ebook.slug}` },
    openGraph: {
      type: "article",
      title,
      description: description || ebook.title,
      url: `https://sineart.vn/ebook/${ebook.slug}`,
      images: ebook.thumbnail ? [ebook.thumbnail] : undefined,
    },
  };
}

export default async function EbookDetailPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="sa-root sa-ebook-detail">
      <EbookDetailStyles />
      <Suspense fallback={<EbookKhoaHocNavSkeleton />}>
        <EbookKhoaHocNav />
      </Suspense>
      <Suspense fallback={<EbookDetailMainSkeleton />}>
        <EbookDetailMain slug={slug} />
      </Suspense>
    </div>
  );
}
