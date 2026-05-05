"use client";

import { usePathname } from "next/navigation";

import HomeAdBanner from "./HomeAdBanner";

/** Ẩn banner public trên /admin và /phong-hoc (phong-hoc dùng .adb riêng). */
export default function ConditionalHomeAdBannerClient({
  imageUrl,
  clickUrl = "",
}: {
  imageUrl: string;
  clickUrl?: string;
}) {
  const pathname = usePathname();
  if (!pathname) return null;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  if (pathname === "/phong-hoc" || pathname.startsWith("/phong-hoc/")) return null;
  return <HomeAdBanner imageUrl={imageUrl} clickUrl={clickUrl} />;
}
