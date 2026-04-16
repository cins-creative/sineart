import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AdminShell from "@/app/admin/_components/AdminShell";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";
import { verifyAdminSessionToken } from "@/lib/admin/jwt-admin";
import { fetchAdminStaffVaiTro } from "@/lib/data/admin-shell-user";
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
  const supabase = createServiceRoleClient();
  if (supabase) {
    staffRole = await fetchAdminStaffVaiTro(supabase, session.staffId);
  }

  return (
    <AdminShell staffName={session.name} staffEmail={session.email} staffRole={staffRole}>
      {children}
    </AdminShell>
  );
}
