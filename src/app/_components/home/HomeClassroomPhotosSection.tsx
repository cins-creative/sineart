import ClassroomPhotosSection from "@/app/_components/ClassroomPhotosSection";
import { getHomeClassroomPhotoUrls } from "@/lib/data/home-classroom-photos";

export async function HomeClassroomPhotosSection() {
  const urls = await getHomeClassroomPhotoUrls();
  if (urls.length === 0) return null;
  return <ClassroomPhotosSection urls={urls} />;
}
