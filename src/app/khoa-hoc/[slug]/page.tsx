import type { Metadata } from "next";
import { Suspense } from "react";
import { getKhoaHocDetailBySlug } from "@/lib/data/courses-page";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import "../khoa-hoc.css";
import "../khoa-hoc-detail.css";
import { KhoaHocSlugDetailSection } from "./_components/KhoaHocSlugDetailSection";
import { KhoaHocSlugDetailSectionSkeleton } from "./_components/KhoaHocSlugDetailSection.skeleton";
import { KhoaHocSlugNavSection } from "./_components/KhoaHocSlugNavSection";
import { KhoaHocSlugNavSectionSkeleton } from "./_components/KhoaHocSlugNavSection.skeleton";
import { SLUG_LABELS } from "./slug-labels";

export const revalidate = 300;

function courseDescription(detail: NonNullable<Awaited<ReturnType<typeof getKhoaHocDetailBySlug>>>): string {
  const fromIntro = stripHtmlToPlain(detail.gioiThieuMonHocHtml, 155);
  if (fromIntro) return fromIntro;
  const sub = detail.tinhChat?.trim();
  if (sub) return sub.length > 155 ? `${sub.slice(0, 154)}…` : sub;
  return "Chi tiết khóa học tại Sine Art — học vẽ, mỹ thuật.";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getKhoaHocDetailBySlug(slug);
  const title = detail?.tenMonHoc ?? SLUG_LABELS[slug] ?? slug;
  const description = detail ? courseDescription(detail) : "Chi tiết khóa học tại Sine Art — học vẽ, mỹ thuật.";
  const canonical = `https://sineart.vn/khoa-hoc/${encodeURIComponent(slug)}`;
  const ogImages =
    detail?.thumbnail?.trim() ? [{ url: detail.thumbnail.trim(), width: 1200, height: 630 }] : undefined;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages?.map((i) => i.url),
    },
  };
}

function courseJsonLd(detail: NonNullable<Awaited<ReturnType<typeof getKhoaHocDetailBySlug>>>, slug: string) {
  const descPlain =
    stripHtmlToPlain(detail.gioiThieuMonHocHtml, 5000) ||
    detail.tinhChat?.trim() ||
    detail.tenMonHoc;
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: detail.tenMonHoc,
    description: descPlain,
    url: `https://sineart.vn/khoa-hoc/${encodeURIComponent(slug)}`,
    provider: {
      "@type": "Organization",
      name: "Sine Art",
      url: "https://sineart.vn",
    },
  };
}

export default async function KhoaHocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getKhoaHocDetailBySlug(slug);
  const jsonLd = detail ? courseJsonLd(detail, slug) : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <Suspense fallback={<KhoaHocSlugNavSectionSkeleton />}>
        <KhoaHocSlugNavSection />
      </Suspense>
      <Suspense fallback={<KhoaHocSlugDetailSectionSkeleton />}>
        <KhoaHocSlugDetailSection slug={slug} />
      </Suspense>
    </>
  );
}
