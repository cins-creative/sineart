import GallerySection from "@/app/_components/GallerySection";
import { getHomeGallerySectionData } from "@/lib/data/home";

export async function HomeGallerySection() {
  const { gallery, galleryMonHocTabs } = await getHomeGallerySectionData();
  return (
    <GallerySection items={gallery} monHocTabs={galleryMonHocTabs} />
  );
}
