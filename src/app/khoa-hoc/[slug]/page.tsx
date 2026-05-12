import type { Metadata } from "next";
import { Suspense } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getHocPhiBlockData,
  getKhoaHocDetailBySlug,
  getKhoaHocReviewStats,
  resolveMonIdForKhoaSlug,
} from "@/lib/data/courses-page";
import {
  buildKhoaHocDetailBreadcrumbJsonLd,
  buildKhoaHocDetailCourseJsonLd,
  buildKhoaHocDetailFaqJsonLd,
} from "@/lib/seo/khoa-hoc-detail-jsonld";
import { stripHtmlToPlain } from "@/lib/seo/plain-text";
import { SITE_OG_DEFAULT_IMAGE } from "@/lib/seo/site-jsonld";
import "../khoa-hoc.css";
import "../khoa-hoc-detail.css";
import { KhoaHocHocPhiSeoSnapshot } from "../_components/KhoaHocHocPhiSeoSnapshot";
import { KhoaHocSlugDetailSection } from "./_components/KhoaHocSlugDetailSection";
import { KhoaHocSlugDetailSectionSkeleton } from "./_components/KhoaHocSlugDetailSection.skeleton";
import { KhoaHocSlugNavSection } from "./_components/KhoaHocSlugNavSection";
import { KhoaHocSlugNavSectionSkeleton } from "./_components/KhoaHocSlugNavSection.skeleton";
import { SLUG_LABELS } from "./slug-labels";

export const revalidate = 3600;

type DetailNonNull = NonNullable<Awaited<ReturnType<typeof getKhoaHocDetailBySlug>>>;

function courseDescription(detail: DetailNonNull): string {
  const fromIntro = stripHtmlToPlain(detail.gioiThieuMonHocHtml, 155);
  if (fromIntro) return fromIntro;
  const sub = detail.tinhChat?.trim();
  if (sub) return sub.length > 155 ? `${sub.slice(0, 154)}…` : sub;
  return `Học ${detail.tenMonHoc.trim()} tại Sine Art TP.HCM — giáo trình bài bản, sửa bài 1-1, lớp mới khai giảng hàng tuần. Online & tại lớp.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getKhoaHocDetailBySlug(slug);
  const titleBase = detail?.tenMonHoc?.trim() ?? SLUG_LABELS[slug] ?? slug;
  const title = detail
    ? `Khóa học ${detail.tenMonHoc.trim()} tại Sine Art — ${detail.hinhThucTag}`
    : `Khóa học ${titleBase} tại Sine Art`;
  const description = detail
    ? courseDescription(detail)
    : "Chi tiết khóa học tại Sine Art — học vẽ, mỹ thuật.";
  const keywords = detail
    ? [
        `học ${detail.tenMonHoc.trim().toLowerCase()}`,
        `${detail.tenMonHoc.trim().toLowerCase()} online`,
        "luyện thi mỹ thuật TP.HCM",
        "Sine Art",
      ]
    : ["khóa học mỹ thuật", "Sine Art", "TP.HCM"];

  const canonical = `https://sineart.vn/khoa-hoc/${encodeURIComponent(slug)}`;
  const imgUrl = (detail?.thumbnail?.trim() || SITE_OG_DEFAULT_IMAGE).trim();
  const ogImages = [{ url: imgUrl, width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Sine Art",
      locale: "vi_VN",
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imgUrl],
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
  const monId = detail?.id ?? (await resolveMonIdForKhoaSlug(slug)) ?? null;

  const [hocPhiBlock, reviewStats] = await Promise.all([
    monId != null ? getHocPhiBlockData(monId) : Promise.resolve(null),
    getKhoaHocReviewStats(monId),
  ]);

  const faqSchema = buildKhoaHocDetailFaqJsonLd();

  return (
    <>
      {detail ? (
        <JsonLd
          schema={buildKhoaHocDetailCourseJsonLd(detail, slug, hocPhiBlock, reviewStats)}
        />
      ) : null}
      {detail ? <JsonLd schema={faqSchema} /> : null}
      {detail ? <JsonLd schema={buildKhoaHocDetailBreadcrumbJsonLd(detail, slug)} /> : null}
      {detail && hocPhiBlock ? (
        <KhoaHocHocPhiSeoSnapshot detail={detail} hocPhiBlock={hocPhiBlock} />
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
