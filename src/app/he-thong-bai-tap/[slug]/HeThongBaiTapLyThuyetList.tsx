import { parseVideoBaiGiangEntries, youtubeVideoId } from "@/lib/utils/youtube";

/**
 * "Lý thuyết cần xem trước" — vertical stack dạng checklist (bắt buộc xem).
 * Mỗi row: thumbnail 16:9 + title · click mở YouTube.
 *
 * Input: `video_ly_thuyet: string[]` từ `hv_he_thong_bai_tap`; mỗi item
 * có thể là `Nhãn - URL` hoặc URL trần.
 */
export default function HeThongBaiTapLyThuyetList({
  videos,
}: {
  videos: string[];
}) {
  const raw = videos.join("\n");
  const entries = parseVideoBaiGiangEntries(raw);
  if (entries.length === 0) return null;

  return (
    <ol className="htbt-lt-stack" role="list">
      {entries.map((e, i) => {
        const id = youtubeVideoId(e.embed);
        const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
        const watchHref = id ? `https://www.youtube.com/watch?v=${id}` : e.embed;
        const title = e.label.trim() || `Lý thuyết ${i + 1}`;
        return (
          <li key={`${e.embed}-${i}`} className="htbt-lt-row">
            <a
              href={watchHref}
              target="_blank"
              rel="noopener noreferrer"
              className="htbt-lt-row-link"
              aria-label={`Mở YouTube: ${title}`}
            >
              <span className="htbt-lt-step" aria-hidden>
                {String(i + 1).padStart(2, "0")}
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
