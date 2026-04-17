import ChiNhanhSessionAndData from "@/app/admin/dashboard/chi-nhanh/ChiNhanhSessionAndData";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function ChiNhanhPage({ searchParams }: Props) {
  return <ChiNhanhSessionAndData searchParams={searchParams} />;
}
