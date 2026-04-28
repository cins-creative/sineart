import DhTruongNganhSessionAndData from "./DhTruongNganhSessionAndData";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function DhTruongNganhPage({ searchParams }: Props) {
  return <DhTruongNganhSessionAndData searchParams={searchParams} />;
}
