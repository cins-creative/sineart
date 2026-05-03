import QuanLyBaiHocVienSessionAndData from "@/app/admin/dashboard/quan-ly-bai-hoc-vien/QuanLyBaiHocVienSessionAndData";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function QuanLyBaiHocVienPage({ searchParams }: PageProps) {
  return <QuanLyBaiHocVienSessionAndData searchParams={searchParams} />;
}
