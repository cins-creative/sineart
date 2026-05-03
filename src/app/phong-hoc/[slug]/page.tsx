import type { Metadata } from "next";
import { Suspense } from "react";

import { PhongHocSlugClassroomSection } from "./_components/PhongHocSlugClassroomSection";
import { PhongHocSlugClassroomSectionSkeleton } from "./_components/PhongHocSlugClassroomSection.skeleton";

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

/**
 * Streaming: default export không `await` data — shell nhận `params` Promise, khối fetch nằm trong
 * `PhongHocSlugClassroomSection` + Suspense (skeleton route trong `loading.tsx`).
 */
export default function PhongHocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<PhongHocSlugClassroomSectionSkeleton />}>
      <PhongHocSlugClassroomSection params={params} />
    </Suspense>
  );
}
