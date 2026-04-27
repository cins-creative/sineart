import BctcTuDongSessionAndData from "@/app/admin/dashboard/bctc-tu-dong/BctcTuDongSessionAndData";

export const dynamic = "force-dynamic";

export default async function AdminBctcTuDongPage({
  searchParams,
}: {
  searchParams: Promise<{ nam?: string }>;
}) {
  const sp = await searchParams;
  return <BctcTuDongSessionAndData namParam={sp.nam} />;
}
