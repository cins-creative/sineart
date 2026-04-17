import QuanLyMediaView from "@/app/admin/dashboard/quan-ly-media/QuanLyMediaView";
import {
  fetchHrNhanSuStaffNameById,
  fetchMarketingMediaStaffOptions,
  fetchMediaBanStaffOptions,
  fetchMktQuanLyMediaRows,
} from "@/lib/data/admin-quan-ly-media";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function QuanLyMediaPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return <QuanLyMediaView initialProjects={[]} missingServiceRole />;
  }

  const [res, staffRes, mediaTeamRes, mediaBanFilterRes] = await Promise.all([
    fetchMktQuanLyMediaRows(supabase),
    fetchHrNhanSuStaffNameById(supabase),
    fetchMarketingMediaStaffOptions(supabase),
    fetchMediaBanStaffOptions(supabase),
  ]);
  if (!res.ok) {
    const showGrantSqlHelp = res.error.toLowerCase().includes("permission denied");
    return <QuanLyMediaView initialProjects={[]} loadError={res.error} showGrantSqlHelp={showGrantSqlHelp} />;
  }

  const staffNameById = staffRes.ok ? staffRes.map : {};
  const staffAvatarById = staffRes.ok ? staffRes.avatarById : {};
  const mediaTeamStaff = mediaTeamRes.ok ? mediaTeamRes.rows : [];
  const mediaBanStaffFilter = mediaBanFilterRes.ok ? mediaBanFilterRes.rows : [];
  return (
    <QuanLyMediaView
      initialProjects={res.rows}
      staffNameById={staffNameById}
      staffAvatarById={staffAvatarById}
      mediaTeamStaff={mediaTeamStaff}
      mediaBanStaffFilter={mediaBanStaffFilter}
    />
  );
}
