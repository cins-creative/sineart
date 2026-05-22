import { cache } from "react";

import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { countDangHocByLopIds } from "@/lib/data/class-seat-dang-hoc";
import { isTenMonHinhHoa } from "@/lib/ql-lop-hoc/level-hinh-hoa";
import { createStaticClient } from "@/lib/supabase/static";
import type { NavOpenClass } from "@/constants/navigation";
import type { KhoaHocCourseCard } from "@/types/khoa-hoc";

type LopNavRow = {
  id: number;
  mon_hoc: number | null;
  class_name: string | null;
  class_full_name: string | null;
  avatar?: string | null;
  level_hinh_hoa?: string | null;
  is_active?: boolean | null;
};

function resolveNavLopThumbnail(
  avatar: string | null | undefined,
  monFallback: string | null | undefined
): string | null {
  const raw = String(avatar ?? "").trim() || String(monFallback ?? "").trim() || null;
  if (!raw) return null;
  return cfImageForThumbnail(raw) || raw;
}

/**
 * Lớp «đang mở» cho menu nav: `is_active`, còn chỗ (hoặc sắp hết).
 * Link về `#schedule` trên trang khóa + `monId` cho đăng ký học phí.
 */
async function fetchNavOpenClassesByMonIdUncached(
  courses: KhoaHocCourseCard[]
): Promise<Map<number, NavOpenClass[]>> {
  const out = new Map<number, NavOpenClass[]>();
  if (!courses.length) return out;

  const supabase = createStaticClient();
  if (!supabase) return out;

  const monIds = [...new Set(courses.map((c) => c.id).filter((id) => id > 0))];
  const slugByMon = new Map(courses.map((c) => [c.id, c.slug]));
  const monThumbById = new Map(
    courses.map((c) => [c.id, c.thumbnail?.trim() || null] as const)
  );

  const selFull =
    "id, mon_hoc, class_name, class_full_name, avatar, level_hinh_hoa, is_active";
  const selMin = "id, mon_hoc, class_name, class_full_name, is_active";

  let lopRows: LopNavRow[] = [];
  const first = await supabase
    .from("ql_lop_hoc")
    .select(selFull)
    .in("mon_hoc", monIds)
    .order("id", { ascending: true });

  if (first.error) {
    const msg = first.error.message.toLowerCase();
    if (msg.includes("column") || msg.includes("schema")) {
      const retry = await supabase
        .from("ql_lop_hoc")
        .select(selMin)
        .in("mon_hoc", monIds)
        .order("id", { ascending: true });
      if (retry.error || !retry.data?.length) return out;
      lopRows = retry.data as LopNavRow[];
    } else {
      return out;
    }
  } else {
    lopRows = (first.data ?? []) as LopNavRow[];
  }

  if (!lopRows.length) return out;

  const lopIds = lopRows
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const [{ data: monRows }, filledByLop] = await Promise.all([
    supabase.from("ql_mon_hoc").select("id, si_so, ten_mon_hoc").in("id", monIds),
    countDangHocByLopIds(supabase, lopIds),
  ]);

  const seatByMon = new Map<number, number>();
  const tenMonById = new Map<number, string>();
  for (const m of (monRows ?? []) as { id?: unknown; si_so?: unknown; ten_mon_hoc?: unknown }[]) {
    const id = Number(m.id);
    if (!Number.isFinite(id)) continue;
    const si = Number(m.si_so ?? 0);
    seatByMon.set(id, Number.isFinite(si) && si > 0 ? si : 20);
    tenMonById.set(id, String(m.ten_mon_hoc ?? "").trim());
  }

  for (const monId of monIds) {
    out.set(monId, []);
  }

  for (const r of lopRows) {
    if (r.is_active === false) continue;
    const monId = Number(r.mon_hoc);
    if (!Number.isFinite(monId) || monId <= 0) continue;

    const filled = filledByLop.get(Number(r.id)) ?? 0;
    const total = seatByMon.get(monId) ?? 20;
    if (filled >= total) continue;

    const ratio = total > 0 ? filled / total : 0;
    const seatHint = ratio >= 0.8 ? "Sắp hết" : "Còn chỗ";

    const slug = slugByMon.get(monId);
    const baseHref = slug ? `/khoa-hoc/${slug}` : "/khoa-hoc";
    const scheduleHref = `${baseHref}#schedule`;

    let label =
      String(r.class_full_name ?? "").trim() ||
      String(r.class_name ?? "").trim() ||
      "Lớp đang mở";

    const showLevel = isTenMonHinhHoa(tenMonById.get(monId) ?? null);
    const lv = String(r.level_hinh_hoa ?? "").trim();
    if (showLevel && lv) {
      label = `${label} · ${lv}`;
    }

    const item: NavOpenClass = {
      lopId: Number(r.id),
      label,
      href: `${scheduleHref}`,
      thumbnailUrl: resolveNavLopThumbnail(r.avatar, monThumbById.get(monId)),
      seatHint,
    };

    const list = out.get(monId);
    if (list) list.push(item);
  }

  return out;
}

export const fetchNavOpenClassesByMonId = cache(fetchNavOpenClassesByMonIdUncached);
