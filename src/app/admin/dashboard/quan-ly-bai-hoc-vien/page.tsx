import QuanLyBaiHocVienSessionAndData from "@/app/admin/dashboard/quan-ly-bai-hoc-vien/QuanLyBaiHocVienSessionAndData";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ tab?: string | string[] }>;
};

export default function QuanLyBaiHocVienPage({ searchParams }: PageProps) {
  return <QuanLyBaiHocVienSessionAndData searchParams={searchParams} />;
}
