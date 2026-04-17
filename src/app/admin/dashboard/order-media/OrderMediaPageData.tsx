import { redirect } from "next/navigation";

import OrderMediaView from "@/app/admin/dashboard/order-media/OrderMediaView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchHrNhanSuStaffOptions } from "@/lib/data/admin-quan-ly-media";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function addDaysYmd(ymd: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function todayLocalYmd(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default async function OrderMediaPageData() {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="-m-4 bg-[#F5F7F7] px-6 py-6 font-sans text-[#323232] md:-m-6">
        <div className="mx-auto max-w-[720px] rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          Thiếu <code className="rounded bg-amber-100/80 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không ghi được order.
        </div>
      </div>
    );
  }

  const staffRes = await fetchHrNhanSuStaffOptions(supabase);
  const staffOptions = staffRes.ok ? staffRes.rows : [];
  const creatorRow = staffOptions.find((r) => r.id === session.staffId);
  const creatorName = creatorRow?.full_name ?? session.name;
  const creatorLabel = `${creatorName} (#${session.staffId})`;

  const defaultStartYmd = todayLocalYmd();
  const defaultEndYmd = addDaysYmd(defaultStartYmd, 7);

  return (
    <OrderMediaView creatorLabel={creatorLabel} defaultStartYmd={defaultStartYmd} defaultEndYmd={defaultEndYmd} />
  );
}
