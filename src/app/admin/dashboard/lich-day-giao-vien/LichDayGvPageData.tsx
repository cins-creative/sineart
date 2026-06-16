import { redirect } from "next/navigation";

import { fetchAdminChiNhanhOptions } from "@/lib/data/admin-chi-nhanh";
import { fetchLichDayGvTeacherOptions, fetchLichDayGvWeek } from "@/lib/data/admin-lich-day-gv";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { mondayOfToday, parseMondayParam } from "@/lib/lich-day-gv/config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import LichDayGvView from "./LichDayGvView";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function spOne(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function LichDayGvPageData({ searchParams }: Props) {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
      </div>
    );
  }

  const sp = await searchParams;
  const tuanBatDau = parseMondayParam(spOne(sp.tuan)) || mondayOfToday();

  const branchRes = await fetchAdminChiNhanhOptions(supabase);
  const branches = branchRes.options;
  const branchError = branchRes.error;

  const chiNhanhRaw = spOne(sp.chi_nhanh);
  let chiNhanhId = Number(chiNhanhRaw);
  if (!Number.isFinite(chiNhanhId) || chiNhanhId <= 0) {
    chiNhanhId = branches[0]?.id ?? 0;
  }

  const [weekRes, teachersRes] =
    chiNhanhId > 0
      ? await Promise.all([
          fetchLichDayGvWeek(supabase, { chi_nhanh_id: chiNhanhId, tuan_bat_dau: tuanBatDau }),
          fetchLichDayGvTeacherOptions(supabase),
        ])
      : [
          { ok: false as const, error: "Chưa có chi nhánh.", missingTable: false, permissionDenied: false },
          { ok: false as const, error: "Chưa có chi nhánh." },
        ];

  return (
    <LichDayGvView
      branches={branches}
      branchError={branchError}
      chiNhanhId={chiNhanhId}
      tuanBatDau={tuanBatDau}
      assignments={weekRes.ok ? weekRes.assignments : []}
      scheduleError={weekRes.ok ? null : weekRes.error}
      missingTable={!weekRes.ok && weekRes.missingTable === true}
      permissionDenied={!weekRes.ok && weekRes.permissionDenied === true}
      teachers={teachersRes.ok ? teachersRes.teachers : []}
      teachersError={teachersRes.ok ? null : teachersRes.error}
    />
  );
}
