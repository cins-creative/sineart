import type { Metadata } from "next";
import { Suspense } from "react";
import { DongHocPhiNavSection } from "./_components/DongHocPhiNavSection";
import { DongHocPhiNavSectionSkeleton } from "./_components/DongHocPhiNavSection.skeleton";
import { DongHocPhiPaymentSection } from "./_components/DongHocPhiPaymentSection";
import { DongHocPhiPaymentSectionSkeleton } from "./_components/DongHocPhiPaymentSection.skeleton";
import "./donghocphi.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đóng học phí — Sine Art",
  description:
    "Thanh toán và gia hạn học phí khóa học tại Sine Art — an toàn, minh bạch.",
  alternates: { canonical: "https://sineart.vn/donghocphi" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function readSingle(param: string | string[] | undefined): string | null {
  if (Array.isArray(param)) return param[0] ?? null;
  return typeof param === "string" ? param : null;
}

export default async function DongHocPhiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const preselectedMonId = Number(readSingle(params.monId) ?? 0) || null;
  const courseName = readSingle(params.course);
  const initialEmail = readSingle(params.email)?.trim() || null;

  return (
    <div className="sa-root khoa-hoc-page">
      <Suspense fallback={<DongHocPhiNavSectionSkeleton />}>
        <DongHocPhiNavSection />
      </Suspense>

      <Suspense fallback={<DongHocPhiPaymentSectionSkeleton />}>
        <DongHocPhiPaymentSection
          preselectedMonId={preselectedMonId}
          courseName={courseName}
          initialEmail={initialEmail}
        />
      </Suspense>
    </div>
  );
}
