import { notFound } from "next/navigation";
import KhoaHocDetailView from "../../_components/KhoaHocDetailView";
import { SLUG_LABELS } from "../slug-labels";
import {
  getBaiTapGroupsForLoaiKhoaHoc,
  getBaiTapListForMon,
} from "@/lib/data/bai-tap";
import {
  getGlobalTeacherPortfolioSlides,
  getHocPhiBlockData,
  getKhoaHocDetailBySlug,
  getKhoaHocPageData,
  getKhoaHocReviewStats,
  getOngoingClassesForMon,
  resolveMonIdForKhoaSlug,
} from "@/lib/data/courses-page";
import { getStudentGalleryForKhoaHocPage } from "@/lib/data/hv-bai-hoc-vien-gallery";

type Props = {
  slug: string;
};

/**
 * Boundary dữ liệu cho toàn bộ detail view (client component nhận full props).
 * Stream độc lập với `KhoaHocSlugNavSection` — NavBar có thể hiện trước khi
 * `hp_*` / `hv_*` / `ql_*` xong.
 * Logic Supabase copy nguyên từ `KhoaHocSlugPageContent` cũ.
 */
export async function KhoaHocSlugDetailSection({ slug }: Props) {
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
  const loaiKhoaHocForFee =
    detail?.loaiKhoaHoc?.trim() ??
    courses.find((c) => c.id === monIdForFee)?.loaiKhoaHoc?.trim() ??
    null;
  const hocPhiAllowCapToc = loaiKhoaHocForFee === "Luyện thi";
  const fallbackFromCourses =
    monIdForFee != null
      ? courses.find((c) => c.id === monIdForFee)?.tenMonHoc
      : undefined;
  const fallback = SLUG_LABELS[slug] ?? fallbackFromCourses;
  if (!detail && !fallback && monIdForFee == null) notFound();

  /** Cùng chuỗi với `h1.kd-title` trong KhoaHocDetailView — lọc gallery bài học viên */
  const galleryCourseTitle = detail?.tenMonHoc ?? fallback ?? slug;

  /**
   * Khóa "tổng hợp" Luyện thi (vd: "Luyện thi tại lớp") không có `bai_tap` trực tiếp.
   * Thay vì hiển thị empty, fetch các môn con cùng `loai_khoa_hoc = 'Luyện thi'`
   * (thường là Hình họa / Trang trí màu / Bố cục màu) và render tabs giáo trình.
   */
  const isLuyenThiAggregate = loaiKhoaHocForFee === "Luyện thi";
  const hinhThucPreferred = detail?.hinhThucTag ?? null;

  const [
    hocPhiBlock,
    studentGallery,
    baiTapList,
    baiTapGroups,
    ongoingClasses,
    reviewStats,
  ] = await Promise.all([
    monIdForFee != null ? getHocPhiBlockData(monIdForFee) : Promise.resolve(null),
    getStudentGalleryForKhoaHocPage(detail, galleryCourseTitle),
    monIdForFee != null
      ? getBaiTapListForMon(monIdForFee)
      : Promise.resolve([]),
    isLuyenThiAggregate
      ? getBaiTapGroupsForLoaiKhoaHoc("Luyện thi", {
          excludeMonId: monIdForFee,
          hinhThucPreferred,
        })
      : Promise.resolve([]),
    monIdForFee != null
      ? getOngoingClassesForMon(monIdForFee, detail?.hinhThucTag ?? "Tại lớp")
      : Promise.resolve([]),
    getKhoaHocReviewStats(monIdForFee ?? null),
  ]);

  /** Nếu môn hiện tại đã có bài tập trực tiếp → ưu tiên (giữ flow cũ); chỉ dùng groups
   * khi bản thân mon `baiTapList` trống nhưng có môn con Luyện thi. */
  const effectiveGroups =
    baiTapList.length === 0 && baiTapGroups.length > 0 ? baiTapGroups : [];

  return (
    <div className="sa-root khoa-hoc-page" style={{ height: "fit-content" }}>
      <KhoaHocDetailView
        detail={detail}
        fallbackTitle={detail ? undefined : fallback}
        studentGallery={studentGallery}
        hocPhiBlock={hocPhiBlock}
        hocPhiMonId={monIdForFee ?? null}
        hocPhiAllowCapToc={hocPhiAllowCapToc}
        teacherPortfolioSlides={teacherPortfolioSlides}
        baiTapList={baiTapList}
        baiTapGroups={effectiveGroups}
        ongoingClasses={ongoingClasses}
        reviewStats={reviewStats}
      />
    </div>
  );
}
