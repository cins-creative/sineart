import { redirect } from "next/navigation";

import { HOA_CU_KHO_PATH } from "@/lib/data/admin-hoa-cu";

export const dynamic = "force-dynamic";

export default function QuanLyHoaCuIndexPage() {
  redirect(HOA_CU_KHO_PATH);
}
