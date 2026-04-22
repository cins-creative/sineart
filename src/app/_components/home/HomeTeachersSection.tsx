import TeachersSection from "@/app/_components/TeachersSection";
import { getHomeTeacherArtSlidesData } from "@/lib/data/home";

export async function HomeTeachersSection() {
  const slides = await getHomeTeacherArtSlidesData();
  return <TeachersSection slides={slides} />;
}
