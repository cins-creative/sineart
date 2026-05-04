import QuanLyMediaView from "@/app/admin/dashboard/quan-ly-media/QuanLyMediaView";
import type { HrNhanSuStaffOption } from "@/lib/data/admin-quan-ly-media";
import {
  collectStaffIdsFromMediaProjects,
  fetchHrNhanSuByIds,
  fetchMktQuanLyMediaRowsWindow,
  MEDIA_INITIAL_FETCH_LIMIT,
} from "@/lib/data/admin-quan-ly-media";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const EMPTY_STAFF_OPTS: HrNhanSuStaffOption[] = [];

export default async function QuanLyMediaPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return <QuanLyMediaView initialProjects={[]} missingServiceRole />;
  }

  const initialRes = await fetchMktQuanLyMediaRowsWindow(supabase, 0, MEDIA_INITIAL_FETCH_LIMIT - 1);
  if (!initialRes.ok) {
    const showGrantSqlHelp = initialRes.error.toLowerCase().includes("permission denied");
    return (
      <QuanLyMediaView initialProjects={[]} loadError={initialRes.error} showGrantSqlHelp={showGrantSqlHelp} />
    );
  }

  const staffIds = collectStaffIdsFromMediaProjects(initialRes.rows);
  const staffRes = await fetchHrNhanSuByIds(supabase, staffIds);

  const staffNameById = staffRes.ok ? staffRes.map : {};
  const staffAvatarById = staffRes.ok ? staffRes.avatarById : {};

  return (
    <QuanLyMediaView
      initialProjects={initialRes.rows}
      staffNameById={staffNameById}
      staffAvatarById={staffAvatarById}
      mediaTeamStaff={EMPTY_STAFF_OPTS}
      mediaBanStaffFilter={EMPTY_STAFF_OPTS}
    />
  );
}
