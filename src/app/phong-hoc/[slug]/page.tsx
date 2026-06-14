import type { Metadata } from "next";
import { Suspense } from "react";

import { getPhongHocClassroomShellBySlug } from "@/lib/data/phong-hoc-classroom-shell";

import { PhongHocSlugClassroomSection } from "./_components/PhongHocSlugClassroomSection";
import { PhongHocSlugClassroomSectionSkeleton } from "./_components/PhongHocSlugClassroomSection.skeleton";

/** Shell lớp (tiêu đề, Meet) — client vẫn refresh Realtime sau khi đăng nhập. */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shell = await getPhongHocClassroomShellBySlug(slug);
  const label = shell?.className ?? decodeURIComponent(slug);
  return {
    title: `Phòng học — ${label} — Sine Art`,
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
