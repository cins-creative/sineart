import Link from "next/link";

import {
  buildEbookHref,
  ebookGradFor,
  fetchRelatedEbooks,
} from "@/lib/data/ebook";

export async function EbookDetailRelatedAside({
  currentId,
  categories,
}: {
  currentId: number;
  categories: string[];
}) {
  const related = await fetchRelatedEbooks(currentId, categories, 4);
  if (related.length === 0) return null;

  return (
    <div className="ebd-sb-section">
      <div className="ebd-sb-label">Ebook liên quan</div>
      <div className="ebd-sb-list">
        {related.map((r) => (
          <Link key={r.id} href={buildEbookHref(r.slug)} className="ebd-sb-item">
            <div
              className="ebd-sb-thumb"
              style={
                r.thumbnail
                  ? {
                      backgroundImage: `url(${JSON.stringify(r.thumbnail)})`,
                    }
                  : { background: ebookGradFor(r.id) }
              }
            />
            <div>
              <div className="ebd-sb-title">{r.title}</div>
              <div className="ebd-sb-meta">
                {r.pages != null ? `${r.pages} trang` : "Ebook"}
                {r.categories[0] ? ` · ${r.categories[0]}` : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
