import type { Metadata } from "next";

import NavBar from "@/app/_components/NavBar";
import PrivacyPolicyClient from "@/app/privacy/PrivacyPolicyClient";
import { getKhoaHocNavGroups } from "@/lib/nav/build-khoa-hoc-nav";
import { SITE_ORIGIN } from "@/lib/seo/site-jsonld";

import "./privacy.css";

export const dynamic = "force-static";

const PAGE_PATH = "/privacy" as const;
const PAGE_URL = `${SITE_ORIGIN}${PAGE_PATH}` as const;

export const metadata: Metadata = {
  title: "Privacy Policy — Sine Art Teacher",
  description:
    "Privacy Policy for the Sine Art Teacher app: authentication, classroom chat, student artwork, and LiveKit video.",
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy — Sine Art Teacher | Sine Art",
    description:
      "How Sine Art collects and uses data in the Teacher app and online classroom.",
    url: PAGE_URL,
    siteName: "Sine Art",
    locale: "en_US",
    type: "website",
  },
};

export default async function PrivacyPage() {
  const khoaHocGroups = await getKhoaHocNavGroups();

  return (
    <div className="sa-root min-h-[100dvh] bg-[#fdf7f3] font-[family-name:var(--font-quicksand)] text-[var(--ink,#2d2020)]">
      <NavBar khoaHocGroups={khoaHocGroups} />
      <main className="min-[900px]:pt-[76px]">
        <PrivacyPolicyClient />
      </main>
    </div>
  );
}
