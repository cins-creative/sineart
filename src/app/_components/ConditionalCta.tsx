"use client";

import { usePathname } from "next/navigation";
import CtaSection from "./CtaSection";

/** Ẩn CTA footer trên phòng học fullscreen. */
export default function ConditionalCta() {
  const pathname = usePathname();
  if (pathname === "/phong-hoc" || pathname?.startsWith("/phong-hoc/")) {
    return null;
  }
  if (pathname === "/admin" || pathname?.startsWith("/admin/")) {
    return null;
  }
  return <CtaSection />;
}
