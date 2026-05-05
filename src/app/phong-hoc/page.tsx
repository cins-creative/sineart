import type { Metadata } from "next";

import { getHomeAdConfig, shouldShowAd } from "@/lib/data/home-ad";

import ClassroomClient from "./ClassroomClient";

export const metadata: Metadata = {
  title: "Phòng học online — Sine Art",
  description: "Không gian học trực tuyến Sine Art — video, chat và tài nguyên lớp.",
};

export default async function PhongHocPage() {
  const adConfig = await getHomeAdConfig();
  const showAd = shouldShowAd(adConfig, "class");
  const adImageUrl = showAd ? adConfig.ads : "";
  const adClickUrl = showAd ? adConfig.clickUrl : "";
  return <ClassroomClient adImageUrl={adImageUrl} adClickUrl={adClickUrl} />;
}
