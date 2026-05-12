import {
  fetchAdminDhTruongListCardAggregates,
  fetchDhTruongLookupOrdered,
  type AdminDhTruongListCard,
} from "@/lib/data/admin-dh-truong-nganh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import DhTruongListView from "./DhTruongListView";

export default async function DhTruongNganhPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return <DhTruongListView truongs={[]} missingServiceRole loadError={null} />;
  }

  const tRes = await fetchDhTruongLookupOrdered(supabase);
  if (!tRes.ok) {
    return <DhTruongListView truongs={[]} loadError={tRes.error} />;
  }

  const aggRes = await fetchAdminDhTruongListCardAggregates(supabase);
  if (!aggRes.ok) {
    return <DhTruongListView truongs={[]} loadError={aggRes.error} />;
  }

  const cards: AdminDhTruongListCard[] = tRes.rows.map((t) => ({
    ...t,
    hocVienDangKyThi: aggRes.hvCountByTruong.get(t.id) ?? 0,
    soNganhDaoTao: aggRes.nganhCountByTruong.get(t.id) ?? 0,
  }));

  return <DhTruongListView truongs={cards} loadError={null} />;
}
