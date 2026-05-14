import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import localFont from "next/font/local";
import ConditionalCta from "./_components/ConditionalCta";
import ConditionalHomeAdBanner from "./_components/ConditionalHomeAdBanner";
import SeoOrganizationJsonLd from "./_components/SeoOrganizationJsonLd";
import { SITE_OG_DEFAULT_IMAGE } from "@/lib/seo/site-jsonld";
import "./globals.css";
import "./sineart-home.css";
import "./sineart-home-v2.css";

/** Quicksand — latin / latin-ext / vietnamese (woff2 từ @fontsource, đặt tại `src/fonts/quicksand`). */
const quicksand = localFont({
  src: [
    { path: "../fonts/quicksand/quicksand-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/quicksand/quicksand-latin-ext-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/quicksand/quicksand-vietnamese-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/quicksand/quicksand-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/quicksand/quicksand-latin-ext-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/quicksand/quicksand-vietnamese-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/quicksand/quicksand-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/quicksand/quicksand-latin-ext-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/quicksand/quicksand-vietnamese-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/quicksand/quicksand-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/quicksand/quicksand-latin-ext-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/quicksand/quicksand-vietnamese-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-quicksand",
  display: "swap",
});

/** Be Vietnam Pro — display/heading (500, 700, 800, 900). */
const beVietnamPro = localFont({
  src: [
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-latin-ext-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-vietnamese-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-latin-ext-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-vietnamese-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-latin-800-normal.woff2", weight: "800", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-latin-ext-800-normal.woff2", weight: "800", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-vietnamese-800-normal.woff2", weight: "800", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-latin-900-normal.woff2", weight: "900", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-latin-ext-900-normal.woff2", weight: "900", style: "normal" },
    { path: "../fonts/be-vietnam-pro/be-vietnam-pro-vietnamese-900-normal.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sineart.vn"),
  title: {
    default: "Sine Art – Trường vẽ mỹ thuật nền tảng tại TP.HCM",
    template: "%s | Sine Art",
  },
  description:
    "Sine Art là trường dạy vẽ mỹ thuật tại TP.HCM, chuyên luyện thi hình họa, bố cục màu, trang trí màu cho học sinh THPT và mỹ thuật căn bản người đi làm.",
  keywords: [
    "học vẽ",
    "trường vẽ",
    "mỹ thuật",
    "hình họa",
    "bố cục màu",
    "trang trí màu",
    "TP.HCM",
    "luyện thi đại học mỹ thuật",
    "Luyện thi Đại học Kiến trúc TP.HCM",
    "Luyện thi Đại học Văn Lang",
    "Luyện thi đại học Tôn Đức Thắng",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Sine Art",
    url: "https://sineart.vn",
    images: [
      {
        url: SITE_OG_DEFAULT_IMAGE,
        width: 1200,
        height: 630,
        alt: "Sine Art – Trường vẽ mỹ thuật nền tảng tại TP.HCM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [SITE_OG_DEFAULT_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${quicksand.variable} ${beVietnamPro.variable} ${quicksand.className} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex w-full min-w-0 flex-col overflow-x-clip" suppressHydrationWarning>
        <SeoOrganizationJsonLd />
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
        <ConditionalCta />
        <ConditionalHomeAdBanner />
        <Analytics />
      </body>
    </html>
  );
}
