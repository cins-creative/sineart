import StatStrip from "@/app/_components/StatStrip";
import { getHomeStatStripData } from "@/lib/data/home";

export async function HomeStatStripSection() {
  const stats = await getHomeStatStripData();
  return (
    <StatStrip students={stats.students} years={stats.years} groups={stats.groups} />
  );
}
