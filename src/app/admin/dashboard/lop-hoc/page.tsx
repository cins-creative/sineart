import LopHocSessionAndData from "@/app/admin/dashboard/lop-hoc/LopHocSessionAndData";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default function AdminLopHocPage({ searchParams }: Props) {
  return <LopHocSessionAndData searchParams={searchParams} />;
}
