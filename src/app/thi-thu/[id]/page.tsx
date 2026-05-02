import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ThiThuStyles } from "../ThiThuStyles";
import ThiThuRoomClient from "./ThiThuRoomClient";
import { ThiThuNavBarSection } from "../_components/ThiThuNavBarSection";
import { ThiThuNavBarSectionSkeleton } from "../_components/ThiThuNavBarSection.skeleton";
import { fetchThiThuKyByIdPublic, fetchThiThuKyByIdService } from "@/lib/data/thi-thu";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  try {
    const { id } = await props.params;
    let row = await fetchThiThuKyByIdPublic(id);
    if (!row) {
      const admin = await getAdminSessionOrNull();
      if (admin) row = await fetchThiThuKyByIdService(id);
    }
    if (!row) {
      return { title: "Không tìm thấy — Sine Art" };
    }
    return {
      title: `${row.tieu_de} — Thi thử Sine Art`,
      description: "Phòng thi thử trực tuyến Sine Art.",
    };
  } catch (e) {
    console.error("[thi-thu metadata]", e);
    return { title: "Thi thử — Sine Art" };
  }
}

export default async function ThiThuRoomPage(props: PageProps) {
  const { id } = await props.params;
  const sp = (await props.searchParams) ?? {};
  const previewRaw = typeof sp.preview === "string" ? sp.preview : null;

  const admin = await getAdminSessionOrNull();
  let row = await fetchThiThuKyByIdPublic(id);
  if (!row && admin) {
    row = await fetchThiThuKyByIdService(id);
  }
  if (!row) notFound();

  const previewAllowed = Boolean(admin && previewRaw);

  return (
    <div className="sa-root sa-thi-thu min-h-[100dvh]">
      <ThiThuStyles />
      <Suspense fallback={<ThiThuNavBarSectionSkeleton />}>
        <ThiThuNavBarSection />
      </Suspense>
      {/* Desktop: nav sticky top (~72px) — tránh đè lên nội dung phòng thi */}
      <div className="min-[900px]:pt-[76px]">
        <ThiThuRoomClient initialKy={row} previewQuery={previewRaw} previewAllowed={previewAllowed} />
      </div>
    </div>
  );
}
