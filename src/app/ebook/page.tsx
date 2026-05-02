import type { Metadata } from "next";
import { Suspense } from "react";

import { EbookCatalogSection } from "./_components/EbookCatalogSection";
import { EbookCatalogSectionSkeleton } from "./_components/EbookCatalogSection.skeleton";
import { EbookKhoaHocNav } from "./_components/EbookKhoaHocNav";
import { EbookKhoaHocNavSkeleton } from "./_components/EbookKhoaHocNav.skeleton";
import { EbookStyles } from "./EbookStyles";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Free ebook mỹ thuật — Sine Art Library",
  description:
    "Thư viện ebook mỹ thuật miễn phí: lịch sử mỹ thuật, giải phẫu, phối cảnh, trang trí, hoạt hình… tuyển chọn & biên soạn bởi Sine Art.",
  alternates: { canonical: "https://sineart.vn/ebook" },
};

export default function EbookListPage() {
  return (
    <div className="sa-root sa-ebook">
      <EbookStyles />
      <Suspense fallback={<EbookKhoaHocNavSkeleton />}>
        <EbookKhoaHocNav />
      </Suspense>
      <Suspense fallback={<EbookCatalogSectionSkeleton />}>
        <EbookCatalogSection />
      </Suspense>
    </div>
  );
}
