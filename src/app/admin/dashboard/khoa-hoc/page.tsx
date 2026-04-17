import KhoaHocSessionAndData from "@/app/admin/dashboard/khoa-hoc/KhoaHocSessionAndData";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function AdminKhoaHocPage({ searchParams }: Props) {
  return <KhoaHocSessionAndData searchParams={searchParams} />;
}
