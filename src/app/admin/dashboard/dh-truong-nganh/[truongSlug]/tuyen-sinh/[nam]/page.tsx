import DhTuyenSinhNamSessionAndData from "./DhTuyenSinhNamSessionAndData";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ truongSlug: string; nam: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function DhTuyenSinhNamPage({ params, searchParams }: Props) {
  return <DhTuyenSinhNamSessionAndData params={params} searchParams={searchParams} />;
}
