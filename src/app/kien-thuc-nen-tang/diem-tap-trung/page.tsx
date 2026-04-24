// AUTO-GENERATED STUB — thay thế bằng block components dần dần.
// Xem brief: BRIEF_hardcode_ly_thuyet.md
import type { Metadata } from "next";
import { getBySlug } from "@/data/ly-thuyet";
import { ArticleLayout } from "@/components/library/ArticleLayout";
import LibraryContent from "@/app/kien-thuc-nen-tang/_components/LibraryContent";
import VideoEmbed from "@/components/library/blocks/VideoEmbed";
import { CONTENT_HTML, VIDEO_URL, VIDEO_REF_URL } from "./_content";

const SLUG = "diem-tap-trung";

export function generateMetadata(): Metadata {
  const a = getBySlug(SLUG)!;
  return {
    title: `${a.ten} — Thư viện Sine Art`,
    description: a.mo_ta,
    keywords: a.tags,
    alternates: { canonical: `https://sineart.vn/kien-thuc-nen-tang/${SLUG}` },
    openGraph: {
      title: a.ten,
      description: a.mo_ta,
      type: "article",
      locale: "vi_VN",
    },
  };
}

export default function Page() {
  return (
    <ArticleLayout slug={SLUG}>
      <VideoEmbed url={VIDEO_URL} title="Video bài giảng" />

      {/* HTML content từ _content.ts — thay dần bằng block components */}
      <LibraryContent html={CONTENT_HTML} />

      <VideoEmbed url={VIDEO_REF_URL} title="Video tham khảo" />
    </ArticleLayout>
  );
}
