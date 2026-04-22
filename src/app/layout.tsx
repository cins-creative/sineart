import type { Metadata } from "next";
import { Be_Vietnam_Pro, Quicksand } from "next/font/google";
import ConditionalCta from "./_components/ConditionalCta";
import ConditionalHomeAdBanner from "./_components/ConditionalHomeAdBanner";
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
  title: "Sine Art — Trường Mỹ Thuật Sáng Tạo",
  description:
    "Trường mỹ thuật sáng tạo — mọi lứa tuổi, mọi trình độ. Học vẽ, tạo ra điều đẹp.",
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
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
        <ConditionalCta />
        <ConditionalHomeAdBanner />
      </body>
    </html>
  );
}
