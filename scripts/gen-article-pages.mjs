/**
 * Generator: tạo page.tsx cho mỗi bài lý thuyết.
 * node scripts/gen-article-pages.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SLUGS = [
  "co-so-tao-hinh",
  "nguyen-ly-thi-giac",
  "phuong-phap-ve-gioi-han",
  "phuong-phap-ve-cau-truc",
  "ly-thuyet-phoi-canh",
  "diem-tap-trung",
  "bo-cuc-sac-do",
  "ti-le-co-the-nguoi",
  "khong-gian-mau",
  "ly-thuyet-hoa-sac",
  "he-thong-mau-munsell",
  "mo-hinh-cong-tru-mau",
  "thuoc-tinh-mau-sac",
  "mau-sac-qua-thiet-bi-dien-tu",
  "cac-he-mau-vat-ly",
  "phoi-canh-khi-quyen",
  "shading-la-gi",
  "ly-thuyet-vat-lieu",
  "bo-cuc-trong-tranh",
  "bo-cuc-trong-thiet-ke",
];

for (const slug of SLUGS) {
  const dir = path.join(ROOT, "src", "app", "kien-thuc-nen-tang", slug);
  fs.mkdirSync(dir, { recursive: true });

  const pagePath = path.join(dir, "page.tsx");

  // Đừng ghi đè nếu đã có page.tsx thật (không phải generated stub)
  if (fs.existsSync(pagePath)) {
    const existing = fs.readFileSync(pagePath, "utf8");
    if (!existing.includes("AUTO-GENERATED STUB")) {
      console.log(`  skip (has real page): ${slug}`);
      continue;
    }
  }

  const content = `// AUTO-GENERATED STUB — thay thế bằng block components dần dần.
// Xem brief: BRIEF_hardcode_ly_thuyet.md
import type { Metadata } from "next";
import { getBySlug } from "@/data/ly-thuyet";
import { ArticleLayout } from "@/components/library/ArticleLayout";
import LibraryContent from "@/app/kien-thuc-nen-tang/_components/LibraryContent";
import { CONTENT_HTML, VIDEO_URL, VIDEO_REF_URL } from "./_content";

const SLUG = "${slug}";

export function generateMetadata(): Metadata {
  const a = getBySlug(SLUG)!;
  return {
    title: \`\${a.ten} — Thư viện Sine Art\`,
    description: a.mo_ta,
    keywords: a.tags,
    alternates: { canonical: \`https://sineart.vn/kien-thuc-nen-tang/\${SLUG}\` },
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
      {VIDEO_URL && (
        <div className="bleed break" style={{ padding: 0, background: "#000", aspectRatio: "16/9" }}>
          <iframe
            src={VIDEO_URL}
            title="Video bài giảng"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </div>
      )}

      {/* HTML content từ _content.ts — thay dần bằng block components */}
      <LibraryContent html={CONTENT_HTML} />

      {VIDEO_REF_URL && (
        <div className="bleed break" style={{ padding: 0, background: "#000", aspectRatio: "16/9" }}>
          <iframe
            src={VIDEO_REF_URL}
            title="Video tham khảo"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </div>
      )}
    </ArticleLayout>
  );
}
`;

  fs.writeFileSync(pagePath, content, "utf8");
  console.log(`  ✓ ${slug}/page.tsx`);
}

console.log("\nDone.");
