import KhoaHocEditSessionAndData from "@/app/admin/dashboard/khoa-hoc/[monId]/KhoaHocEditSessionAndData";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ monId: string }> };

export default function AdminKhoaHocEditPage({ params }: Props) {
  return <KhoaHocEditSessionAndData params={params} />;
}
