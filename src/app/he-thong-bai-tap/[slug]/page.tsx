import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NavBar from "@/app/_components/NavBar";
import { getBaiTapByHeThongSlug, getBaiTapListForMon } from "@/lib/data/bai-tap";
import {
  exerciseIndexInSortedAsc,
  getHeThongBaiTapAccess,
} from "@/lib/data/hoc-vien-bai-tap-access";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import HeThongBaiTapBreadcrumb from "./HeThongBaiTapBreadcrumb";
import HvSessionFromClassroomSync from "./HvSessionFromClassroomSync";
import HeThongBaiTapLockedGate from "./HeThongBaiTapLockedGate";
import HeThongBaiTapStudentOnlyGate from "./HeThongBaiTapStudentOnlyGate";
import HeThongBaiTapView from "./HeThongBaiTapView";
import { getGalleryItemsForBaiTapExercise } from "@/lib/data/hv-bai-hoc-vien-gallery";
import "@/app/khoa-hoc/khoa-hoc-detail.css";
import "../he-thong-bai-tap.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bai = await getBaiTapByHeThongSlug(slug);
  if (!bai) {
    return {
      title: "Bài tập — Sine Art",
    };
  }
  return {
    title: `${bai.ten_bai_tap} (Bài ${bai.bai_so}) — ${bai.mon_hoc.ten_mon_hoc} — Sine Art`,
    description: `Hướng dẫn bài tập ${bai.ten_bai_tap} (${bai.mon_hoc.ten_mon_hoc}) tại Sine Art.`,
  };
}

export default async function HeThongBaiTapSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bai = await getBaiTapByHeThongSlug(slug);
  if (!bai) notFound();

  const [{ courses }, siblingsAll, workGalleryItems] = await Promise.all([
    getKhoaHocPageData(),
    getBaiTapListForMon(bai.mon_hoc.id),
    getGalleryItemsForBaiTapExercise(bai.id),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  const siblingsSorted = siblingsAll
    .filter((x) => x.is_visible)
    .sort((a, b) => a.bai_so - b.bai_so);

  const access = await getHeThongBaiTapAccess(bai.mon_hoc.id, siblingsSorted);
  const currentAscIndex = exerciseIndexInSortedAsc(siblingsSorted, bai.id);
  const canViewBaiTap = access.viewer === "hv" || access.viewer === "gv";
  /** Chặn khi HV (không áp dụng GV) đã vào trang nhưng bài hiện tại vượt quá `tien_do_hoc`. */
  const blocked =
    access.viewer === "hv" &&
    currentAscIndex >= 0 &&
    currentAscIndex > access.maxAccessibleIndex;
  const maxBaiSoLabel =
    access.maxAccessibleIndex >= 0 && siblingsSorted[access.maxAccessibleIndex]
      ? `Bài ${siblingsSorted[access.maxAccessibleIndex].bai_so}`
      : null;

  return (
    <>
      <HvSessionFromClassroomSync />
      <NavBar khoaHocGroups={khoaHocGroups} />
      <div className="sa-root khoa-hoc-page htbt-root">
        <div className="kd-page">
          <h1 className="sr-only">
            Bài {bai.bai_so} — {bai.ten_bai_tap} — {bai.mon_hoc.ten_mon_hoc}
          </h1>
          <HeThongBaiTapBreadcrumb bai={bai} />
          {!canViewBaiTap ? (
            <HeThongBaiTapStudentOnlyGate
              bai={bai}
              variant={access.viewer === "anon" ? "sign_in" : "not_student"}
            />
          ) : blocked ? (
            <HeThongBaiTapLockedGate maxBaiSoLabel={maxBaiSoLabel} />
          ) : (
            <HeThongBaiTapView
              bai={bai}
              siblingsSorted={siblingsSorted}
              access={access}
              workGalleryItems={workGalleryItems}
            />
          )}
        </div>
      </div>
    </>
  );
}
