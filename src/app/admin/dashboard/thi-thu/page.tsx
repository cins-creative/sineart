import { countBaiNopByKyIds, fetchThiThuAdminList } from "@/lib/data/thi-thu";

import ThiThuAdminListClient from "./ThiThuAdminListClient";

export const dynamic = "force-dynamic";

export default async function AdminThiThuListPage() {
  const rows = await fetchThiThuAdminList();
  const ids = rows.map((r) => r.id);
  const counts = await countBaiNopByKyIds(ids);

  return <ThiThuAdminListClient rows={rows} counts={counts} />;
}
