import LichDayGvSessionAndData from "@/app/admin/dashboard/lich-day-giao-vien/LichDayGvSessionAndData";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function LichDayGiaoVienPage({ searchParams }: Props) {
  return <LichDayGvSessionAndData searchParams={searchParams} />;
}
