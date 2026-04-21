/**
 * Gallery ảnh hiển thị đầu bài viết /tra-cuu-thong-tin/[slug].
 *
 * Mục đích chính: SEO ảnh. Mỗi ảnh có:
 *  - `alt` auto-sinh từ tiêu đề bài viết + số thứ tự
 *  - `title` (tooltip) khớp alt
 *  - Ảnh đầu `loading="eager"` + `fetchpriority="high"` (LCP-friendly)
 *  - Ảnh sau `loading="lazy"`
 *
 * Dùng Cloudflare Images variant để tối ưu dung lượng mà vẫn giữ chất lượng
 * cho Google Image search. Không dùng next/image vì ảnh external + muốn
 * markup `<img>` hiện rõ trong HTML source để crawler index.
 */

import { cfImageForThumbnail, cfImageForLightbox } from "@/lib/cfImageUrl";

type Props = {
  images: string[];
  title: string;
};

function buildAlt(title: string, index: number, total: number): string {
  if (total <= 1) return title;
  return `${title} - Ảnh ${index + 1}/${total}`;
}

export function TraCuuAlbumGallery({ images, title }: Props) {
  const urls = images.filter((u) => typeof u === "string" && u.trim().length > 0);
  if (urls.length === 0) return null;

  const count = urls.length;
  // Class hint cho layout: 1 ảnh → hero; 2 → đôi; ≥3 → grid.
  const layoutClass =
    count === 1 ? "bd-tc-album--one" : count === 2 ? "bd-tc-album--two" : "bd-tc-album--grid";

  return (
    <section className={`bd-tc-album ${layoutClass}`} aria-label={`Thư viện ảnh: ${title}`}>
      {urls.map((url, i) => {
        const thumb = cfImageForThumbnail(url) ?? url;
        const full = cfImageForLightbox(url) ?? url;
        const alt = buildAlt(title, i, count);
        return (
          <figure key={`${i}-${url}`} className="bd-tc-album-fig">
            <a
              href={full}
              target="_blank"
              rel="noopener noreferrer"
              className="bd-tc-album-link"
              aria-label={alt}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt={alt}
                title={alt}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                {...(i === 0 ? { fetchPriority: "high" as const } : {})}
                className="bd-tc-album-img"
              />
            </a>
          </figure>
        );
      })}
    </section>
  );
}
