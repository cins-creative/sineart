import type { Metadata } from "next";
import { Suspense } from "react";

import { PhongHocClassroomWithAd } from "./_components/PhongHocClassroomWithAd";
import { PhongHocClassroomSkeleton } from "./_components/PhongHocClassroomSkeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Phòng học — ${decodeURIComponent(slug)} — Sine Art`,
  };
}

export default async function PhongHocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<PhongHocClassroomSkeleton />}>
      <PhongHocClassroomWithAd classSlug={slug} />
    </Suspense>
  );
}
