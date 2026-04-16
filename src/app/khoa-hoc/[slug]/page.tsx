import type { Metadata } from "next";
import { Suspense } from "react";
import { KhoaHocDetailPageSkeleton } from "@/components/skeletons";
import { getKhoaHocDetailBySlug } from "@/lib/data/courses-page";
import "../khoa-hoc.css";
import "../khoa-hoc-detail.css";
import { KhoaHocSlugPageContent } from "./KhoaHocSlugPageContent";
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

export default function KhoaHocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<KhoaHocDetailPageSkeleton />}>
      <KhoaHocSlugPageContent params={params} />
    </Suspense>
  );
}
