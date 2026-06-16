import { Suspense } from "react";

import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import LichDayGvPageData from "./LichDayGvPageData";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LichDayGvSessionAndData({ searchParams }: Props) {
  return (
    <Suspense fallback={<AdminDashboardTableSkeleton />}>
      <LichDayGvPageData searchParams={searchParams} />
    </Suspense>
  );
}
