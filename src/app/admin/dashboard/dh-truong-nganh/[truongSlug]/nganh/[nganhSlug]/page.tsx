import DhPairDetailSessionAndData from "./DhPairDetailSessionAndData";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ truongSlug: string; nganhSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function DhNganhDetailPage({ params, searchParams }: Props) {
  return <DhPairDetailSessionAndData params={params} searchParams={searchParams} />;
}
