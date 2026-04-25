import type { Metadata } from "next";

import { getHomeAdConfig, shouldShowAd } from "@/lib/data/home-ad";

import ClassroomClient from "./ClassroomClient";

export const metadata: Metadata = {
  title: "Phòng học online — Sine Art",
  description: "Không gian học trực tuyến Sine Art — video, chat và tài nguyên lớp.",
};

export default async function PhongHocPage() {
  const adConfig = await getHomeAdConfig();
  const adImageUrl = shouldShowAd(adConfig, "class") ? adConfig.ads : "";
  return <ClassroomClient adImageUrl={adImageUrl} />;
}
