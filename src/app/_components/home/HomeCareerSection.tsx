import CareerSection from "@/app/_components/CareerSection";
import { getHomeCareersData } from "@/lib/data/home";

export async function HomeCareerSection() {
  const careers = await getHomeCareersData();
  return <CareerSection careers={careers} />;
}
