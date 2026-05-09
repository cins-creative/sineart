import { redirect } from "next/navigation";

import QuanLyBaiHocVienSessionAndData from "@/app/admin/dashboard/quan-ly-bai-hoc-vien/QuanLyBaiHocVienSessionAndData";
import { adminBhvPathSegmentFromTab, adminBhvTabFromPathSegment } from "@/lib/data/admin-quan-ly-bai-hoc-vien";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tab: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuanLyBaiHocVienTabPage({ params, searchParams }: PageProps) {
  const { tab: raw } = await params;
  const routeTab = adminBhvTabFromPathSegment(raw);
  if (!routeTab) {
    redirect("/admin/dashboard/quan-ly-bai-hoc-vien/cho");
  }
  const canonical = adminBhvPathSegmentFromTab(routeTab);
  if (raw !== canonical) {
    redirect(`/admin/dashboard/quan-ly-bai-hoc-vien/${canonical}`);
  }
  return <QuanLyBaiHocVienSessionAndData searchParams={searchParams} routeTab={routeTab} />;
}
