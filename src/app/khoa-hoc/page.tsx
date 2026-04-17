import type { Metadata } from "next";
import { Suspense } from "react";
import { KhoaHocPageSkeleton } from "@/components/skeletons";
import "./khoa-hoc.css";
import { KhoaHocPageContent } from "./KhoaHocPageContent";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Khóa học — Sine Art",
  description:
    "Danh sách khóa học mỹ thuật — theo dữ liệu môn học, lớp mở và ghi danh.",
};

export default function KhoaHocPage({
  searchParams,
}: {
  searchParams: Promise<{ nhom?: string }>;
}) {
  return (
    <div className="sa-root khoa-hoc-page khoa-hoc-catalog">
      <Suspense fallback={<KhoaHocPageSkeleton />}>
        <KhoaHocPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
