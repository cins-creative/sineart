import { DongHocPhiNavSectionSkeleton } from "./_components/DongHocPhiNavSection.skeleton";
import { DongHocPhiPaymentSectionSkeleton } from "./_components/DongHocPhiPaymentSection.skeleton";
import "./donghocphi.css";

/** Fallback điều hướng `/donghocphi` — cùng layout với `page.tsx`. */
export default function DongHocPhiLoading() {
  return (
    <div className="sa-root khoa-hoc-page">
      <DongHocPhiNavSectionSkeleton />
      <DongHocPhiPaymentSectionSkeleton />
    </div>
  );
}
