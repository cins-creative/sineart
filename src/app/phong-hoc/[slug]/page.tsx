import type { Metadata } from "next";

import { getHomeAdConfig, shouldShowAd } from "@/lib/data/home-ad";

import ClassroomClient from "../ClassroomClient";

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
  const adConfig = await getHomeAdConfig();
  const adHtml = shouldShowAd(adConfig, "class") ? adConfig.ads : "";
  return <ClassroomClient classSlug={slug} adHtml={adHtml} />;
}
