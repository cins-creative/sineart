import DhTruongDetailSessionAndData from "./DhTruongDetailSessionAndData";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ truongSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function DhTruongDetailPage({ params, searchParams }: Props) {
  return <DhTruongDetailSessionAndData params={params} searchParams={searchParams} />;
}
