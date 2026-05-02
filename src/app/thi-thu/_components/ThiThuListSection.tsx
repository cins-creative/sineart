import ThiThuListClient from "../ThiThuListClient";
import { fetchThiThuPublishedList } from "@/lib/data/thi-thu";

export async function ThiThuListSection() {
  const rows = await fetchThiThuPublishedList();
  return <ThiThuListClient rows={rows} />;
}
