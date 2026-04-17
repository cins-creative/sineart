import { redirect } from "next/navigation";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";

type Props = { children: React.ReactNode };

/** Kiểm tra session admin rồi render `children` (Suspense bọc bên ngoài nếu cần). */
export default async function AdminSessionGate({ children }: Props) {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");
  return <>{children}</>;
}
