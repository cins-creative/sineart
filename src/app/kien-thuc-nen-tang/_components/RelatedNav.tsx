import "server-only";

import Link from "next/link";

import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import {
  buildLyThuyetHref,
  computePrevNext,
  computeRelated,
  fetchAllLyThuyet,
  fetchLyThuyetBySlug,
} from "@/lib/data/ly-thuyet";

type Props = {
  /** Slug của bài đang đọc — server component tự fetch lại current
   *  (qua `cache()` → cùng promise với page.tsx, không phát sinh DB call). */
  slug: string;
};

/**
 * Section "Bài cùng chủ đề" + Prev/Next ở cuối bài.
 *
 * Tách Suspense boundary riêng vì:
 * - Cần `fetchAllLyThuyet()` (query list chậm) để tính prev/next/related.
 * - Section này ở cuối trang, user chưa scroll tới lúc đầu → không cần
 *   block render hero + body.
 *
 * Trade-off: fetch 2 query (current + all), nhưng cả 2 đều được `cache()`
 * wrap nên chỉ là memoized Promise lookup — không extra DB round-trip.
 */
export default async function RelatedNav({ slug }: Props) {
  const [current, allItems] = await Promise.all([
    fetchLyThuyetBySlug(slug),
    fetchAllLyThuyet(),
  ]);

  if (!current) return null;

  const { prev, next } = computePrevNext(allItems, current);
  const related = computeRelated(allItems, current, 4);

  if (related.length === 0 && !prev && !next) return null;

  return (
    <div className="related-section">
      {related.length > 0 ? (
        <>
          <p className="sec-lbl">Bài cùng chủ đề</p>
          <div className="rel-grid">
            {related.map((r, i) => {
              const thumb = r.thumbnail
                ? cfImageForThumbnail(r.thumbnail) ?? r.thumbnail
                : null;
              return (
                <Link
                  key={r.id}
                  href={buildLyThuyetHref(r.slug)}
                  className="rel-card"
                >
                  <div className="rel-th">
                    {thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={thumb}
                        alt={r.ten}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span>{String(i + 1).padStart(2, "0")}</span>
                    )}
                  </div>
                  <div>
                    <p className="rel-t">{r.ten}</p>
                    <p className="rel-s">
                      {r.nhom ?? "Thư viện"} · {r.readingMin} phút
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}

      {prev || next ? (
        <div
          className="pn"
          data-only-prev={!next && prev ? "" : undefined}
          data-only-next={!prev && next ? "" : undefined}
        >
          {prev ? (
            <Link
              href={buildLyThuyetHref(prev.slug)}
              className="pn-a pn-prev-c"
            >
              <p className="pn-l">← Bài trước</p>
              <p className="pn-t">{prev.ten}</p>
            </Link>
          ) : null}
          {next ? (
            <Link
              href={buildLyThuyetHref(next.slug)}
              className="pn-a pn-next-c"
            >
              <p className="pn-l">Bài tiếp theo →</p>
              <p
                className="pn-t"
                style={{ color: "#fff", fontStyle: "normal" }}
              >
                {next.ten}
              </p>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
