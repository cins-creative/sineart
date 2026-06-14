import { unstable_cache } from "next/cache";
import { cache } from "react";

import type { LopHocMeetRow } from "@/lib/phong-hoc/lop-hoc-meet-fields";
import {
  normalizePhongHocPathSlug,
  phongHocSlugFromClassName,
} from "@/lib/phong-hoc/classroom-url";
import { createStaticClient } from "@/lib/supabase/static";

export type PhongHocClassroomShell = {
  pathSlug: string;
  lopHocId: number;
  className: string;
  classFullName: string | null;
  meet: LopHocMeetRow;
  monHocId: number | null;
  tenMonHoc: string | null;
};

type LopShellRow = {
  id: number;
  class_name: string;
  class_full_name: string | null;
  meeting_room: string | null;
  url_google_meet: string | null;
  url_google_meet_set_at: string | null;
  device: string | null;
  url_class: string | null;
  mon_hoc: { id: number; ten_mon_hoc: string | null } | { id: number; ten_mon_hoc: string | null }[] | null;
};

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function mapShellRow(row: LopShellRow): PhongHocClassroomShell {
  const pathSlug = phongHocSlugFromClassName(row.class_name);
  const embRaw = row.mon_hoc;
  const emb = Array.isArray(embRaw) ? embRaw[0] : embRaw;
  const mid = emb?.id;
  return {
    pathSlug,
    lopHocId: row.id,
    className: row.class_name.trim(),
    classFullName: trimOrNull(row.class_full_name),
    meet: {
      meeting_room: trimOrNull(row.meeting_room),
      url_google_meet: trimOrNull(row.url_google_meet),
      url_google_meet_set_at: trimOrNull(row.url_google_meet_set_at),
      device: trimOrNull(row.device),
    },
    monHocId: mid != null && Number.isFinite(mid) && mid > 0 ? mid : null,
    tenMonHoc: trimOrNull(emb?.ten_mon_hoc),
  };
}

function rowMatchesSlug(row: LopShellRow, slug: string): boolean {
  if (phongHocSlugFromClassName(row.class_name) === slug) return true;
  const urlClass = row.url_class?.trim();
  if (urlClass && normalizePhongHocPathSlug(urlClass) === slug) return true;
  return false;
}

async function loadAllLopShellRowsUncached(): Promise<LopShellRow[]> {
  const sb = createStaticClient();
  if (!sb) return [];

  const selectWithSetAt =
    "id, class_name, class_full_name, meeting_room, url_google_meet, url_google_meet_set_at, device, url_class, mon_hoc ( id, ten_mon_hoc )";

  let { data, error } = await sb.from("ql_lop_hoc").select(selectWithSetAt);

  const missingSetAtCol =
    error &&
    (String(error.message).toLowerCase().includes("url_google_meet_set_at") ||
      String(error.message).toLowerCase().includes("schema cache") ||
      (error as { code?: string }).code === "42703");

  if (missingSetAtCol) {
    const retry = await sb
      .from("ql_lop_hoc")
      .select(
        "id, class_name, class_full_name, meeting_room, url_google_meet, device, url_class, mon_hoc ( id, ten_mon_hoc )"
      );
    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error || !data) return [];

  return (data as unknown as LopShellRow[]).filter(
    (r) => typeof r.id === "number" && typeof r.class_name === "string" && r.class_name.trim() !== ""
  );
}

const loadAllLopShellRows = unstable_cache(loadAllLopShellRowsUncached, ["phong-hoc-lop-shell-index"], {
  revalidate: 300,
});

/**
 * Metadata lớp theo slug URL `/phong-hoc/[slug]` — cache 5 phút, dùng prefetch shell (tiêu đề, Meet, môn).
 */
export const getPhongHocClassroomShellBySlug = cache(
  async (rawSlug: string): Promise<PhongHocClassroomShell | null> => {
    const slug = normalizePhongHocPathSlug(rawSlug);
    if (!slug) return null;

    const rows = await loadAllLopShellRows();
    for (const row of rows) {
      if (rowMatchesSlug(row, slug)) return mapShellRow(row);
    }
    return null;
  }
);
