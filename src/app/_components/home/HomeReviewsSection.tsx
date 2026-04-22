import ReviewsSection from "@/app/_components/ReviewsSection";
import { getHomeReviewsData } from "@/lib/data/home";

export async function HomeReviewsSection() {
  const reviews = await getHomeReviewsData();
  return <ReviewsSection reviews={reviews} />;
}
