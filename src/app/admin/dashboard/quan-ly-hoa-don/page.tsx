import QuanLyHoaDonSessionAndData from "@/app/admin/dashboard/quan-ly-hoa-don/QuanLyHoaDonSessionAndData";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ days?: string }>;
};

export default function AdminQuanLyHoaDonPage({ searchParams }: Props) {
  return <QuanLyHoaDonSessionAndData searchParams={searchParams} />;
}
