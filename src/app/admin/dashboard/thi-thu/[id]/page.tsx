import { notFound } from "next/navigation";

import ThiThuEditorClient from "../ThiThuEditorClient";
import { fetchBaiNopForKy, fetchDeThiForKyAdmin, fetchThiThuKyByIdService } from "@/lib/data/thi-thu";

export const dynamic = "force-dynamic";

export default async function AdminThiThuEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await fetchThiThuKyByIdService(id);
  if (!row) notFound();
  const [baiNop, deThi] = await Promise.all([fetchBaiNopForKy(id), fetchDeThiForKyAdmin(id)]);

  return <ThiThuEditorClient initial={row} initialDeThi={deThi} baiNop={baiNop} />;
}
