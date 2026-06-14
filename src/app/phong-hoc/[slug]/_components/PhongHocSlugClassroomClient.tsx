"use client";

import dynamic from "next/dynamic";

import type { PhongHocClassroomShell } from "@/lib/data/phong-hoc-classroom-shell";

import { PhongHocSlugClassroomSectionSkeleton } from "./PhongHocSlugClassroomSection.skeleton";

const ClassroomClient = dynamic(() => import("../../ClassroomClient"), {
  loading: () => <PhongHocSlugClassroomSectionSkeleton />,
});

export type PhongHocSlugClassroomClientProps = {
  classSlug: string;
  adImageUrl: string;
  initialLopShell: PhongHocClassroomShell | null;
};

export function PhongHocSlugClassroomClient({
  classSlug,
  adImageUrl,
  initialLopShell,
}: PhongHocSlugClassroomClientProps) {
  return (
    <ClassroomClient
      classSlug={classSlug}
      adImageUrl={adImageUrl}
      initialLopShell={initialLopShell}
    />
  );
}
