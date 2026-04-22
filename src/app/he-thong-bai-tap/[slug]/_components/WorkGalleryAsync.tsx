import GallerySection from "@/app/_components/GallerySection";
import { getGalleryItemsForBaiTapExercise } from "@/lib/data/hv-bai-hoc-vien-gallery";
import { sortGalleryItemsByScoreDesc } from "@/lib/gallery-display-sort";

/**
 * Stream cụm gallery "Mở rộng" — `hv_bai_hoc_vien` query riêng nên không chặn `LessonBodyAsync`.
 * Render song song với bài gallery khác (không `Promise.all` ở page cha).
 *
 * Sắp xếp: score DESC (null xếp sau, cùng điểm thì id mới hơn trước). DB đã `.order("score", desc)`
 * nhưng vẫn sort lại ở đây để bảo đảm hành vi khi props đi qua nhiều bước map/filter.
 */
export default async function WorkGalleryAsync({ baiTapId }: { baiTapId: number }) {
  const rawItems = await getGalleryItemsForBaiTapExercise(baiTapId);
  const items = sortGalleryItemsByScoreDesc(rawItems);
  return (
    <GallerySection
      items={items}
      monHocTabs={[]}
      tabMode="work_kind"
      sectionTitle="Tranh bài tập"
      showSectionTitle={false}
      sectionTitleAs="div"
      galleryWrapId="htbt-tranh-bai"
      showFooterCta={false}
      rootClassName="htbt-work-gallery"
    />
  );
}
