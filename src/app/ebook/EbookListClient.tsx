"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  ExternalLink,
  FileText,
  Search,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  buildEbookHref,
  ebookCatColor,
  ebookGradFor,
  type EbookItem,
} from "@/lib/data/ebook-shared";

type Props = {
  items: EbookItem[];
  categories: string[];
};

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : String(d.getFullYear());
}

function FeaturedBadge() {
  return (
    <span className="eb-card-featured">
      <Star size={10} strokeWidth={3} fill="currentColor" />
      NỔI BẬT
    </span>
  );
}

export default function EbookListClient({ items, categories }: Props) {
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>(""); // "" = tất cả
  const [previewId, setPreviewId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((e) => {
      if (activeCat && !e.categories.includes(activeCat)) return false;
      if (!needle) return true;
      const hay = `${e.title} ${e.categories.join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q, activeCat]);

  const countByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of categories) m.set(c, 0);
    for (const it of items) {
      for (const c of it.categories) {
        if (m.has(c)) m.set(c, (m.get(c) ?? 0) + 1);
      }
    }
    return m;
  }, [items, categories]);

  const preview = previewId != null
    ? items.find((e) => e.id === previewId) ?? null
    : null;

  return (
    <div className="eb-body">
      <div className="eb-toolbar">
        <div className="eb-search">
          <Search size={18} className="eb-search-icon" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên sách, chủ đề…"
            aria-label="Tìm ebook"
          />
          {q && (
            <button
              type="button"
              className="eb-search-clear"
              onClick={() => setQ("")}
              aria-label="Xoá tìm kiếm"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="eb-pillrow" role="tablist" aria-label="Lọc theo chủ đề">
            <button
              type="button"
              role="tab"
              aria-selected={!activeCat}
              className={`eb-pill${!activeCat ? " is-active" : ""}`}
              onClick={() => setActiveCat("")}
            >
              Tất cả
              <span className="eb-pill-count">· {items.length}</span>
            </button>
            {categories.map((c) => {
              const count = countByCat.get(c) ?? 0;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={activeCat === c}
                  className={`eb-pill${activeCat === c ? " is-active" : ""}`}
                  onClick={() => setActiveCat(activeCat === c ? "" : c)}
                >
                  {c}
                  <span className="eb-pill-count">· {count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="eb-empty">
          {q || activeCat
            ? "Không tìm thấy ebook phù hợp. Thử từ khoá / chủ đề khác."
            : "Chưa có ebook nào."}
        </div>
      ) : (
        <div className="eb-grid">
          {filtered.map((b) => {
            const year = formatYear(b.created_at);
            return (
              <button
                key={b.id}
                type="button"
                className="eb-card"
                onClick={() => setPreviewId(b.id)}
                aria-label={`Xem chi tiết ${b.title}`}
              >
                <div
                  className="eb-card-thumb"
                  style={{
                    background: b.thumbnail ? "#f2ece5" : ebookGradFor(b.id),
                  }}
                >
                  {b.thumbnail && (
                    // Cloudflare Images: dùng plain <img> (unoptimized) để tránh
                    // cấu hình domain ở `next.config.js` + fill/loader.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.thumbnail}
                      alt={b.title}
                      loading="lazy"
                      decoding="async"
                      className="eb-card-thumb-img"
                    />
                  )}
                  {b.featured && <FeaturedBadge />}
                </div>
                <div className="eb-card-body">
                  <h3 className="eb-card-title">{b.title}</h3>
                  <div className="eb-card-meta">
                    {b.pages != null && (
                      <span>
                        <FileText
                          size={11}
                          style={{ verticalAlign: "-1px", marginRight: 3 }}
                        />
                        {b.pages} trang
                      </span>
                    )}
                    {year && (
                      <>
                        <span aria-hidden>·</span>
                        <span>
                          <Calendar
                            size={11}
                            style={{ verticalAlign: "-1px", marginRight: 3 }}
                          />
                          {year}
                        </span>
                      </>
                    )}
                  </div>
                  {b.categories.length > 0 && (
                    <div className="eb-card-cats">
                      {b.categories.slice(0, 2).map((c) => {
                        const { bg, fg } = ebookCatColor(c);
                        return (
                          <span
                            key={c}
                            className="eb-cat"
                            style={{ background: bg, color: fg }}
                          >
                            {c}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {preview && (
          <EbookPreview
            key={preview.id}
            ebook={preview}
            onClose={() => setPreviewId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EbookPreview({
  ebook,
  onClose,
}: {
  ebook: EbookItem;
  onClose: () => void;
}) {
  const router = useRouter();

  // Esc to close + lock body scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const hero =
    ebook.thumbnail ?? ebook.image_demo[0] ?? ebook.img_src_link[0] ?? null;

  // Ưu tiên `image_demo`; thiếu thì fallback lấy 4 ảnh đầu của `img_src_link`.
  const demos =
    ebook.image_demo.length > 0
      ? ebook.image_demo.slice(0, 4)
      : ebook.img_src_link.slice(0, 4);

  const year = formatYear(ebook.created_at);
  const href = buildEbookHref(ebook.slug);
  const contentSafe = useMemo(() => {
    // Tóm tắt HTML từ admin — strip <script> để an toàn. Trust level tương
    // đương blog.
    return ebook.content.replace(/<\/?(script|iframe)[^>]*>/gi, "");
  }, [ebook.content]);

  return (
    <motion.div
      className="eb-preview-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết ${ebook.title}`}
    >
      <motion.div
        className="eb-preview"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="eb-preview-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div
          className="eb-preview-hero"
          style={{ background: hero ? "#f4ece4" : ebookGradFor(ebook.id) }}
        >
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero}
              alt={ebook.title}
              className="eb-preview-hero-img"
              loading="eager"
              decoding="async"
            />
          )}
        </div>

        <div className="eb-preview-body">
          <h2 className="eb-preview-title">{ebook.title}</h2>

          <div className="eb-preview-meta">
            {ebook.pages != null && (
              <span>
                <FileText
                  size={13}
                  style={{ verticalAlign: "-2px", marginRight: 4 }}
                />
                {ebook.pages} trang
              </span>
            )}
            {year && (
              <>
                <span aria-hidden>·</span>
                <span>
                  <Calendar
                    size={13}
                    style={{ verticalAlign: "-2px", marginRight: 4 }}
                  />
                  Xuất bản {year}
                </span>
              </>
            )}
            {ebook.featured && (
              <>
                <span aria-hidden>·</span>
                <span style={{ color: "#ee5ca2", fontWeight: 800 }}>
                  <Star
                    size={12}
                    fill="currentColor"
                    style={{ verticalAlign: "-1px", marginRight: 4 }}
                  />
                  Ebook nổi bật
                </span>
              </>
            )}
          </div>

          {ebook.categories.length > 0 && (
            <div className="eb-preview-cats">
              {ebook.categories.map((c) => {
                const { bg, fg } = ebookCatColor(c);
                return (
                  <span
                    key={c}
                    className="eb-cat"
                    style={{ background: bg, color: fg }}
                  >
                    {c}
                  </span>
                );
              })}
            </div>
          )}

          {contentSafe && (
            <div
              className="eb-preview-content"
              dangerouslySetInnerHTML={{ __html: contentSafe }}
            />
          )}

          {!contentSafe && ebook.noi_dung_sach && (
            <div className="eb-preview-content">
              {stripHtml(ebook.noi_dung_sach).slice(0, 280)}
              {stripHtml(ebook.noi_dung_sach).length > 280 ? "…" : ""}
            </div>
          )}

          {demos.length > 0 && (
            <div className="eb-preview-demos">
              {demos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt={`${ebook.title} — trang ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          )}

          <div className="eb-preview-ctas">
            <button
              type="button"
              className="eb-btn eb-btn--primary"
              onClick={() => router.push(href)}
            >
              <BookOpen size={16} strokeWidth={2.4} />
              Đọc sách
            </button>
            <Link href={href} className="eb-btn eb-btn--ghost">
              <ExternalLink size={16} strokeWidth={2.4} />
              Trang chi tiết
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
