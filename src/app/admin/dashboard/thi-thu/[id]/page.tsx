import { notFound } from "next/navigation";

import ThiThuEditorClient from "../ThiThuEditorClient";
import type { ThiThuEditorTab } from "@/types/thi-thu-editor";
import { fetchBaiNopForKy, fetchThiThuKyByIdService } from "@/lib/data/thi-thu";

export const dynamic = "force-dynamic";

function tabFromSearchParams(sp: Record<string, string | string[] | undefined>): ThiThuEditorTab | undefined {
  const raw = sp.tab;
  const t = Array.isArray(raw) ? raw[0] : raw;
  if (t === "nop" || t === "info") return t;
  if (t === "lich" || t === "de") return "info";
  return undefined;
}

function savedFlashFromSearchParams(sp: Record<string, string | string[] | undefined>): boolean {
  const raw = sp.saved;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "1" || v === "true";
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
  const initialSavedFlash = savedFlashFromSearchParams(sp);

  const row = await fetchThiThuKyByIdService(id);
  if (!row) notFound();
  const baiNop = await fetchBaiNopForKy(id);

  return (
    <ThiThuEditorClient
      initial={row}
      baiNop={baiNop}
      initialTab={initialTab}
      initialSavedFlash={initialSavedFlash}
    />
  );
}
