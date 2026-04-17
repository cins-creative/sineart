import { redirect } from "next/navigation";

import AdminLoginView from "@/app/admin/_components/AdminLoginView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  const session = await getAdminSessionOrNull();
  if (session) redirect("/admin/dashboard");
  const { notice } = await searchParams;
  const n = typeof notice === "string" ? notice.trim().toLowerCase() : "";
  const showUpdated = n === "password_updated";
  const showInactive = n === "inactive";
  return (
    <AdminLoginView passwordUpdatedBanner={showUpdated} sessionEndedInactiveBanner={showInactive} />
  );
}
