import { fetchDhTruongLookupOrdered } from "@/lib/data/admin-dh-truong-nganh";
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

  return <DhTruongListView truongs={tRes.rows} loadError={null} />;
}
