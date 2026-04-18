import type { Metadata } from "next";
import Script from "next/script";

import NavBar from "../_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

import KienThucNenTangView from "./KienThucNenTangView";

export const metadata: Metadata = {
  title: "Cơ sở tạo hình — 7 yếu tố nền tảng | Thư viện Sine Art",
  description:
    "Bài giảng Cơ sở tạo hình tại thư viện Sine Art: 7 yếu tố thị giác và 7 nguyên lý tổ chức — nền tảng cho học sinh thi khối H, V.",
  keywords: [
    "cơ sở tạo hình",
    "yếu tố thị giác",
    "nguyên lý tổ chức",
    "khối H",
    "khối V",
    "Sine Art",
  ],
  alternates: {
    canonical: "https://sineart.vn/kien-thuc-nen-tang",
  },
  openGraph: {
    title: "Cơ sở tạo hình — 7 yếu tố nền tảng | Sine Art",
    description:
      "Ngôn ngữ thị giác nền tảng cho học sinh thi khối H, V và người mới học vẽ.",
    locale: "vi_VN",
    type: "article",
  },
  robots: { index: true, follow: true },
};

const jsonLdArticle = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Cơ sở tạo hình — 7 yếu tố nền tảng",
  description:
    "Cơ sở tạo hình nghiên cứu các yếu tố và nguyên lý thị giác — nền tảng cho mọi ngành sáng tạo và kỳ thi khối H, V.",
  author: { "@type": "Person", name: "Thầy Tú" },
  publisher: {
    "@type": "Organization",
    name: "Sine Art",
    logo: {
      "@type": "ImageObject",
      url: "https://sineart.vn/logo.png",
    },
  },
  datePublished: "2026-04-18",
  dateModified: "2026-04-18",
  inLanguage: "vi-VN",
  articleSection: "Lý thuyết cơ sở",
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Cơ sở tạo hình là gì?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cơ sở tạo hình là môn học nền tảng trong mỹ thuật, nghiên cứu có hệ thống các yếu tố thị giác cơ bản và các nguyên lý tổ chức chúng thành một tổng thể có giá trị thẩm mỹ.",
      },
    },
    {
      "@type": "Question",
      name: "Người mới có thể tự học Cơ sở tạo hình không?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Có thể tự học lý thuyết, nhưng phần thực hành bố cục và màu sắc cần có giảng viên chấm sửa bài để mắt học viên được hiệu chỉnh đúng hướng.",
      },
    },
  ],
};

export default async function KienThucNenTangPage() {
  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  return (
    <>
      <Script
        id="ktn-jsonld-article"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <Script
        id="ktn-jsonld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <div className="sa-root kien-thuc-nen-tang-root">
        <NavBar khoaHocGroups={khoaHocGroups} />
        <KienThucNenTangView />
      </div>
    </>
  );
}
