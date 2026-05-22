import NavBar from "../_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { parseNhomSearchParam } from "@/lib/khoa-hoc-course-filters";
import { getKhoaHocNavGroups } from "@/lib/nav/build-khoa-hoc-nav";
import KhoaHocBento from "./_components/KhoaHocBento";
import KhoaHocCatalogJsonLd from "./_components/KhoaHocCatalogJsonLd";

export async function KhoaHocPageContent({
  searchParams,
}: {
  searchParams: Promise<{ nhom?: string }>;
}) {
  const params = await searchParams;
  const [{ courses }, khoaHocGroups] = await Promise.all([
    getKhoaHocPageData(),
    getKhoaHocNavGroups(),
  ]);
  const nhom = parseNhomSearchParam(params.nhom);

  return (
    <>
      <KhoaHocCatalogJsonLd courses={courses} />
      <NavBar khoaHocGroups={khoaHocGroups} />
      <KhoaHocBento courses={courses} initialFilter={nhom ?? "all"} />
    </>
  );
}
