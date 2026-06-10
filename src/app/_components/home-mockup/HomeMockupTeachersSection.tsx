import TeachersSection from "@/app/_components/TeachersSection";
import { getHomeTeacherArtSlidesData } from "@/lib/data/home";

/** Carousel tác phẩm GV — cùng component & data như trang chủ cũ (`#giao-vien`). */
export async function HomeMockupTeachersSection() {
  const slides = await getHomeTeacherArtSlidesData();
  return <TeachersSection slides={slides} />;
}
