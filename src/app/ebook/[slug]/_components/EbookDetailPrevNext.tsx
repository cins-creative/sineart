import Link from "next/link";

import {
  buildEbookHref,
  ebookGradFor,
  fetchAdjacentEbooks,
} from "@/lib/data/ebook";

export async function EbookDetailPrevNext({ currentId }: { currentId: number }) {
  const { prev, next } = await fetchAdjacentEbooks(currentId);
  if (!prev && !next) return null;

  return (
    <div className="ebd-navpn">
      {prev ? (
        <Link href={buildEbookHref(prev.slug)} className="ebd-navpn-item">
          <span className="ebd-navpn-icon" aria-hidden>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </span>
          <div
            className="ebd-navpn-thumb"
            style={prev.thumbnail ? undefined : { background: ebookGradFor(prev.id) }}
          >
            {prev.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prev.thumbnail}
                alt=""
                className="ebd-navpn-thumb-img"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
          <div className="ebd-navpn-text">
            <div className="ebd-navpn-label">Ebook trước</div>
            <div className="ebd-navpn-title">{prev.title}</div>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={buildEbookHref(next.slug)}
          className="ebd-navpn-item ebd-navpn-item--next"
        >
          <div className="ebd-navpn-text">
            <div className="ebd-navpn-label">Ebook kế</div>
            <div className="ebd-navpn-title">{next.title}</div>
          </div>
          <div
            className="ebd-navpn-thumb"
            style={next.thumbnail ? undefined : { background: ebookGradFor(next.id) }}
          >
            {next.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={next.thumbnail}
                alt=""
                className="ebd-navpn-thumb-img"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
          <span className="ebd-navpn-icon" aria-hidden>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
