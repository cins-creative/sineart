import DhTruongDetailSessionAndData from "./DhTruongDetailSessionAndData";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ truongSlug: string }>;
};

export default function DhTruongDetailPage({ params }: Props) {
  return <DhTruongDetailSessionAndData params={params} />;
}
