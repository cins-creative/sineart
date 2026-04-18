import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import ConditionalCta from "./_components/ConditionalCta";
import "./globals.css";
import "./sineart-home.css";

const quicksand = Quicksand({
  subsets: ["latin", "vietnamese"],
  variable: "--font-quicksand",
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
      className={`${quicksand.variable} ${quicksand.className} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex w-full min-w-0 flex-col overflow-x-clip" suppressHydrationWarning>
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
        <ConditionalCta />
      </body>
    </html>
  );
}
