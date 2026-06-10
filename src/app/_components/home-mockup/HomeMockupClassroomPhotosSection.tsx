import ClassroomPhotosSection from "@/app/_components/ClassroomPhotosSection";
import { getHomeClassroomPhotoUrls } from "@/lib/data/home-classroom-photos";

/** Ticker ảnh lớp thực tế — cùng component & data như trang chủ cũ (`#lop-thuc-te`). */
export async function HomeMockupClassroomPhotosSection() {
  const urls = await getHomeClassroomPhotoUrls();
  if (urls.length === 0) return null;
  return <ClassroomPhotosSection urls={urls} />;
}
