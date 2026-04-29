import type { Metadata } from "next";
import { Be_Vietnam_Pro, Quicksand } from "next/font/google";
import ConditionalCta from "./_components/ConditionalCta";
import ConditionalHomeAdBanner from "./_components/ConditionalHomeAdBanner";
import SeoOrganizationJsonLd from "./_components/SeoOrganizationJsonLd";
import "./globals.css";
import "./sineart-home.css";
import "./sineart-home-v2.css";

const quicksand = Quicksand({
  subsets: ["latin", "vietnamese"],
  variable: "--font-quicksand",
});

/** Font display — dùng cho heading theo design system mới (Be Vietnam Pro, weight 500–900). */
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "700", "800", "900"],
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
  },
  twitter: {
    card: "summary_large_image",
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
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
        <ConditionalCta />
        <ConditionalHomeAdBanner />
      </body>
    </html>
  );
}
