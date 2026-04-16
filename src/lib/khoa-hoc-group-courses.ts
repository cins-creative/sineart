import type { CourseGroupId, KhoaHocCourseCard } from "@/types/khoa-hoc";

export type GroupedCourses = Record<CourseGroupId, KhoaHocCourseCard[]>;

export function groupCoursesByGroup(courses: KhoaHocCourseCard[]): GroupedCourses {
  const lthi: KhoaHocCourseCard[] = [];
  const digital: KhoaHocCourseCard[] = [];
  const kids: KhoaHocCourseCard[] = [];
  const botro: KhoaHocCourseCard[] = [];
  for (const c of courses) {
    if (c.group === "lthi") lthi.push(c);
    else if (c.group === "digital") digital.push(c);
    else if (c.group === "kids") kids.push(c);
    else botro.push(c);
  }
  return { lthi, digital, kids, botro };
}
