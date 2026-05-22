"use client";

import { usePathname } from "next/navigation";

import HomeAdBanner from "./HomeAdBanner";

/**
 * Banner floating «Home» — chỉ trên trang chủ `/`.
 * Các trang public khác (gallery, khoa-hoc, …) không hiện.
 * Phòng học dùng banner `.adb` riêng khi `visible_where` là `class` hoặc `both`.
 */
export default function ConditionalHomeAdBannerClient({ imageUrl }: { imageUrl: string }) {
  const pathname = usePathname();
  if (!pathname || pathname !== "/") return null;
  return <HomeAdBanner imageUrl={imageUrl} />;
}
