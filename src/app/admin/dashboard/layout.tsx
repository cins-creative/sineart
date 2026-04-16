import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import AdminShell from "@/app/admin/_components/AdminShell";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";
import { verifyAdminSessionToken } from "@/lib/admin/jwt-admin";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const tok = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(tok);
  if (!session) redirect("/admin");

  let staffRole: string | null = null;
  let staffAvatar: string | null = null;
  const supabase = createServiceRoleClient();
  if (supabase) {
    const profile = await fetchAdminStaffShellProfile(supabase, session.staffId);
    staffRole = profile.vai_tro;
    staffAvatar = profile.avatar;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F4F2]" />}>
      <AdminShell
        staffName={session.name}
        staffEmail={session.email}
        staffRole={staffRole}
        staffAvatarUrl={staffAvatar}
      >
        {children}
      </AdminShell>
    </Suspense>
  );
}
