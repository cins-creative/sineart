import { KhoaHocPageSkeleton } from "@/components/skeletons";
import "./khoa-hoc.css";

export default function KhoaHocLoading() {
  return (
    <div className="sa-root khoa-hoc-page">
      <KhoaHocPageSkeleton />
    </div>
  );
}
