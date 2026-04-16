import type { Metadata } from "next";
import NavBar from "../../_components/NavBar";
import {
  getGlobalTeacherPortfolioSlides,
  getHocPhiBlockData,
  getKhoaHocDetailBySlug,
  getKhoaHocPageData,
  getOngoingClassesForMon,
  resolveMonIdForKhoaSlug,
} from "@/lib/data/courses-page";
import { getBaiTapListForMon } from "@/lib/data/bai-tap";
import { getStudentGalleryForKhoaHocPage } from "@/lib/data/hv-bai-hoc-vien-gallery";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import { notFound } from "next/navigation";
import "../khoa-hoc.css";
import "../khoa-hoc-detail.css";
import KhoaHocDetailView from "../_components/KhoaHocDetailView";

export const revalidate = 300;

/** Fallback tiêu đề khi không load được DB (slug mới = tên môn đã slugify) */
const SLUG_LABELS: Record<string, string> = {
  "hinh-hoa": "Hình họa",
  "trang-tri-mau": "Trang trí màu",
  "bo-cuc-mau": "Bố cục màu",
  "sine-kids": "Sine Kids",
  background: "Background",
  offline: "Offline",
  "my-thuat-bo-tro": "Mỹ thuật bổ trợ",
  "hinh-hoa-online-cap-toc": "Luyện thi cấp tốc",
  "hinh-hoa-online": "Hình họa Online",
  "trang-tri-mau-online": "Trang trí màu Online",
  "bo-cuc-mau-online": "Bố cục màu Online",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getKhoaHocDetailBySlug(slug);
  const title = detail?.tenMonHoc ?? SLUG_LABELS[slug] ?? slug;
  return {
    title: `${title} — Khóa học — Sine Art`,
    description:
      detail?.tinhChat?.slice(0, 160) ??
      "Chi tiết khóa học tại Sine Art — học vẽ, mỹ thuật.",
  };
}

export default async function KhoaHocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [detailBySlug, { courses }, teacherPortfolioSlides] = await Promise.all([
    getKhoaHocDetailBySlug(slug),
    getKhoaHocPageData(),
    getGlobalTeacherPortfolioSlides(),
  ]);
  const monIdForFee =
    detailBySlug?.id ?? (await resolveMonIdForKhoaSlug(slug));
  const detail =
    detailBySlug ??
    (monIdForFee != null
      ? await getKhoaHocDetailBySlug(`mon-${monIdForFee}`)
      : null);
  const fallbackFromCourses =
    monIdForFee != null
      ? courses.find((c) => c.id === monIdForFee)?.tenMonHoc
      : undefined;
  const fallback = SLUG_LABELS[slug] ?? fallbackFromCourses;
  if (!detail && !fallback && monIdForFee == null) notFound();

  /** Cùng chuỗi với `h1.kd-title` trong KhoaHocDetailView — lọc gallery bài học viên */
  const galleryCourseTitle = detail?.tenMonHoc ?? fallback ?? slug;
  const [hocPhiBlock, studentGallery, baiTapList, ongoingClasses] = await Promise.all([
    monIdForFee != null ? getHocPhiBlockData(monIdForFee) : Promise.resolve(null),
    getStudentGalleryForKhoaHocPage(detail, galleryCourseTitle),
    monIdForFee != null
      ? getBaiTapListForMon(monIdForFee)
      : Promise.resolve([]),
    monIdForFee != null
      ? getOngoingClassesForMon(monIdForFee, detail?.hinhThucTag ?? "Tại lớp")
      : Promise.resolve([]),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  return (
    <>
      <NavBar khoaHocGroups={khoaHocGroups} />
      <div className="sa-root khoa-hoc-page" style={{ height: "fit-content" }}>
        <KhoaHocDetailView
          detail={detail}
          fallbackTitle={detail ? undefined : fallback}
          studentGallery={studentGallery}
          hocPhiBlock={hocPhiBlock}
          hocPhiMonId={monIdForFee ?? null}
          teacherPortfolioSlides={teacherPortfolioSlides}
          baiTapList={baiTapList}
          ongoingClasses={ongoingClasses}
        />
      </div>
    </>
  );
}
