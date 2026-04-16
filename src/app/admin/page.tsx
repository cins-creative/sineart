import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AdminLoginView from "@/app/admin/_components/AdminLoginView";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";
import { verifyAdminSessionToken } from "@/lib/admin/jwt-admin";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  const jar = await cookies();
  const tok = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(tok);
  if (session) redirect("/admin/dashboard");
  const { notice } = await searchParams;
  const showUpdated =
    typeof notice === "string" && notice.trim().toLowerCase() === "password_updated";
  return <AdminLoginView passwordUpdatedBanner={showUpdated} />;
}
