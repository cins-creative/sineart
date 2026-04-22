import type { Metadata } from "next";
import { Suspense } from "react";
import { getKhoaHocDetailBySlug } from "@/lib/data/courses-page";
import "../khoa-hoc.css";
import "../khoa-hoc-detail.css";
import { KhoaHocSlugDetailSection } from "./_components/KhoaHocSlugDetailSection";
import { KhoaHocSlugDetailSectionSkeleton } from "./_components/KhoaHocSlugDetailSection.skeleton";
import { KhoaHocSlugNavSection } from "./_components/KhoaHocSlugNavSection";
import { KhoaHocSlugNavSectionSkeleton } from "./_components/KhoaHocSlugNavSection.skeleton";
import { SLUG_LABELS } from "./slug-labels";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getKhoaHocDetailBySlug(slug);
  const title = detail?.tenMonHoc ?? SLUG_LABELS[slug] ?? slug;
  return {
    title: `${title} — Khóa học — Sine Art`,
    description:
      detail?.tinhChat?.slice(0, 160) ??
      "Chi tiết khóa học tại Sine Art — học vẽ, mỹ thuật.",
  };
}

export default async function KhoaHocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <>
      <Suspense fallback={<KhoaHocSlugNavSectionSkeleton />}>
        <KhoaHocSlugNavSection />
      </Suspense>
      <Suspense fallback={<KhoaHocSlugDetailSectionSkeleton />}>
        <KhoaHocSlugDetailSection slug={slug} />
      </Suspense>
    </>
  );
}
