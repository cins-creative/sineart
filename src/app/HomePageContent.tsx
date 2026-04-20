import CareerSection from "./_components/CareerSection";
import CoursesSection from "./_components/CoursesSection";
import CtaBandSection from "./_components/CtaBandSection";
import GallerySection from "./_components/GallerySection";
import HeroSection from "./_components/HeroSection";
import NavBar from "./_components/NavBar";
import ReviewsSection from "./_components/ReviewsSection";
import StatStrip from "./_components/StatStrip";
import TeachersSection from "./_components/TeachersSection";
import VideoSection from "./_components/VideoSection";
import WhySection from "./_components/WhySection";
import { getHomePageData } from "@/lib/data/home";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

export async function HomePageContent() {
  const [data, { courses }] = await Promise.all([
    getHomePageData(),
    getKhoaHocPageData(),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  return (
    <>
      <NavBar khoaHocGroups={khoaHocGroups} />
      <HeroSection />
      <StatStrip
        students={data.stats.students}
        years={data.stats.years}
        groups={data.stats.groups}
      />
      <div className="page-inner">
        <CoursesSection />
        <WhySection />
        <VideoSection />
        <ReviewsSection reviews={data.reviews} />
        <GallerySection
          items={data.gallery}
          monHocTabs={data.galleryMonHocTabs}
        />
      </div>
      <CareerSection careers={data.careers} />
      <TeachersSection slides={data.teacherArtSlides} />
      <CtaBandSection />
    </>
  );
}
