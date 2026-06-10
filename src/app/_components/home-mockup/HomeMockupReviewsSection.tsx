import ReviewsSection from "@/app/_components/ReviewsSection";
import { getHomeReviewsData } from "@/lib/data/home";

/** Reviews carousel + ticker — cùng component & data như trang chủ cũ. */
export async function HomeMockupReviewsSection() {
  const reviews = await getHomeReviewsData();
  return <ReviewsSection reviews={reviews} />;
}
