import { getBySlug } from "@/data/ly-thuyet";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { buildLyThuyetHref } from "@/lib/data/ly-thuyet-shared";
import { parseVideoBaiGiangEntries, youtubeVideoId } from "@/lib/utils/youtube";

type LyRow =
  | { kind: "article"; slug: string; key: string }
  | { kind: "youtube"; label: string; embed: string; key: string };

/**
 * "Lý thuyết cần xem trước" — checklist: bài Thư viện (thumbnail + link bài viết)
 * hoặc video YouTube (định dạng cũ trong DB).
 *
 * `video_ly_thuyet`: mỗi phần tử là **slug** bài `/kien-thuc-nen-tang/[slug]`,
 * hoặc một dòng/chuỗi URL YouTube (`Nhãn - URL` hoặc URL trần).
 */
export default function HeThongBaiTapLyThuyetList({
  videos,
}: {
  videos: string[];
}) {
  const rows: LyRow[] = [];
  for (let i = 0; i < videos.length; i++) {
    const raw = videos[i];
    const t = raw.trim();
    if (!t) continue;
    const article = getBySlug(t);
    if (article) {
      rows.push({ kind: "article", slug: t, key: `lib-${t}-${i}` });
      continue;
    }
    const entries = parseVideoBaiGiangEntries(t);
    for (let j = 0; j < entries.length; j++) {
      const e = entries[j];
      rows.push({
        kind: "youtube",
        label: e.label.trim(),
        embed: e.embed,
        key: `yt-${i}-${j}-${e.embed}`,
      });
    }
  }

  if (rows.length === 0) return null;

  return (
    <ol className="htbt-lt-stack" role="list">
      {rows.map((row, i) => {
        const step = String(i + 1).padStart(2, "0");

        if (row.kind === "article") {
          const art = getBySlug(row.slug)!;
          const thumbRaw = art.thumbnail ?? art.hero_image ?? null;
          const thumb = thumbRaw ? cfImageForThumbnail(thumbRaw) ?? thumbRaw : null;
          const href = buildLyThuyetHref(row.slug);
          return (
            <li key={row.key} className="htbt-lt-row htbt-lt-row--article">
              <a
                href={href}
                className="htbt-lt-row-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Mở bài Thư viện: ${art.ten}`}
              >
                <span className="htbt-lt-step" aria-hidden>
                  {step}
                </span>
                <div className="htbt-lt-row-thumb">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" loading="lazy" />
                  ) : (
                    <div className="htbt-lt-row-thumb-fallback" aria-hidden>
                      📖
                    </div>
                  )}
                </div>
                <div className="htbt-lt-row-meta">
                  <div className="htbt-lt-row-title">{art.ten}</div>
                  <div className="htbt-lt-row-src">
                    Thư viện · {art.nhom}
                    <svg
                      className="htbt-lt-row-ext"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M14 3h7v7" />
                      <path d="M10 14 21 3" />
                      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                    </svg>
                  </div>
                </div>
              </a>
            </li>
          );
        }

        const id = youtubeVideoId(row.embed);
        const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
        const watchHref = id ? `https://www.youtube.com/watch?v=${id}` : row.embed;
        const title = row.label.trim() || `Video lý thuyết ${i + 1}`;
        return (
          <li key={row.key} className="htbt-lt-row">
            <a
              href={watchHref}
              target="_blank"
              rel="noopener noreferrer"
              className="htbt-lt-row-link"
              aria-label={`Mở YouTube: ${title}`}
            >
              <span className="htbt-lt-step" aria-hidden>
                {step}
              </span>
              <div className="htbt-lt-row-thumb">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" loading="lazy" />
                ) : null}
                <span className="htbt-lt-row-play" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.5v13l11-6.5-11-6.5z" />
                  </svg>
                </span>
              </div>
              <div className="htbt-lt-row-meta">
                <div className="htbt-lt-row-title">{title}</div>
                <div className="htbt-lt-row-src">
                  YouTube
                  <svg
                    className="htbt-lt-row-ext"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M14 3h7v7" />
                    <path d="M10 14 21 3" />
                    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                  </svg>
                </div>
              </div>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
