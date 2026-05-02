import { notFound } from "next/navigation";

import ThiThuEditorClient from "../ThiThuEditorClient";
import type { ThiThuEditorTab } from "@/types/thi-thu-editor";
import { fetchBaiNopForKy, fetchDeThiForKyAdmin, fetchThiThuKyByIdService } from "@/lib/data/thi-thu";

export const dynamic = "force-dynamic";

function tabFromSearchParams(sp: Record<string, string | string[] | undefined>): ThiThuEditorTab | undefined {
  const raw = sp.tab;
  const t = Array.isArray(raw) ? raw[0] : raw;
  if (t === "de" || t === "lich" || t === "nop" || t === "info") return t;
  return undefined;
}

export default async function AdminThiThuEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const initialTab = tabFromSearchParams(sp);

  const row = await fetchThiThuKyByIdService(id);
  if (!row) notFound();
  const [baiNop, deThi] = await Promise.all([fetchBaiNopForKy(id), fetchDeThiForKyAdmin(id)]);

  return <ThiThuEditorClient initial={row} initialDeThi={deThi} baiNop={baiNop} initialTab={initialTab} />;
}
