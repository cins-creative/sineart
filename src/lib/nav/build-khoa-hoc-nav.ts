import { cache } from "react";

import type { NavKhoaHocGroup, NavOpenClass } from "@/constants/navigation";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import type { CourseGroupId, KhoaHocCourseCard } from "@/types/khoa-hoc";

import { fetchNavOpenClassesByMonId } from "./fetch-khoa-hoc-nav-lops";

const GROUP_ORDER: CourseGroupId[] = ["lthi", "digital", "kids", "botro"];

const GROUP_TITLE: Record<CourseGroupId, string> = {
  lthi: "Luyện thi & bổ trợ",
  digital: "Digital",
  kids: "Kids",
  botro: "Bổ trợ",
};

/** Emoji gợi nhóm — giữ dạng ô màu gần nav cũ */
const GROUP_EMOJI: Record<CourseGroupId, string> = {
  lthi: "🟨",
  digital: "💻",
  kids: "🟦",
  botro: "🟪",
};

/** Chia khóa học theo `inferCourseGroup` — thứ tự trong nhóm giữ `thu_tu_hien_thi` (từ query). */
export function buildKhoaHocNavFromCourses(
  courses: KhoaHocCourseCard[],
  openByMonId?: Map<number, NavOpenClass[]> | null
): NavKhoaHocGroup[] {
  const by = new Map<CourseGroupId, KhoaHocCourseCard[]>();
  for (const g of GROUP_ORDER) by.set(g, []);
  for (const c of courses) {
    const list = by.get(c.group);
    if (list) list.push(c);
  }

  const out: NavKhoaHocGroup[] = [];
  for (const g of GROUP_ORDER) {
    const list = by.get(g) ?? [];
    if (!list.length) continue;
    out.push({
      title: GROUP_TITLE[g],
      items: list.map((c) => ({
        emoji: GROUP_EMOJI[g],
        label: c.tenMonHoc.trim() || "Khóa học",
        monId: c.id,
        openClasses: openByMonId?.get(c.id) ?? [],
        hinhThucTag: c.hinhThucTag,
        navHinhThucLabel: c.hinhThucNavLabel ?? undefined,
        href: `/khoa-hoc/${c.slug}`,
      })),
    });
  }
  return out;
}

/** Nav «Khóa học» + danh sách lớp đang mở — dùng cho `NavBar` toàn site. */
async function getKhoaHocNavGroupsUncached(): Promise<NavKhoaHocGroup[]> {
  const { courses } = await getKhoaHocPageData();
  const openByMon = await fetchNavOpenClassesByMonId(courses);
  return buildKhoaHocNavFromCourses(courses, openByMon);
}

export const getKhoaHocNavGroups = cache(getKhoaHocNavGroupsUncached);
