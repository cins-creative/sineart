"use client";

import {
  AlertTriangle,
  BookOpen,
  Check,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import AdminRichTextEditor from "@/app/admin/_components/AdminRichTextEditor";

import EbookPdfImporter, { type ImportResult } from "./EbookPdfImporter";

export type AdminEbookRow = {
  id: number;
  slug: string;
  title: string;
  so_trang: number | null;
  featured: boolean;
  categories: string[];
  thumbnail: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type FullEbook = AdminEbookRow & {
  image_demo: string[];
  img_src_link: string[];
  html_embed: string | null;
  content: string | null;
  noi_dung_sach: string | null;
};

type Props = {
  initialEbooks: AdminEbookRow[];
  missingServiceRole?: boolean;
  loadError?: string;
};

type ModalMode =
  | { kind: "create" }
  | { kind: "edit"; id: number; initial: FullEbook };

const PAGE_SIZE = 20;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function QuanLyEbookView({ initialEbooks, missingServiceRole, loadError }: Props) {
  const [ebooks, setEbooks] = useState<AdminEbookRow[]>(initialEbooks);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const [modal, setModal] = useState<ModalMode | null>(null);
  const [loadingFull, setLoadingFull] = useState<number | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3200);
  };

  const allCats = useMemo(() => {
    const s = new Set<string>();
    for (const e of ebooks) for (const c of e.categories) s.add(c);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "vi"));
  }, [ebooks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ebooks.filter((e) => {
      if (catFilter && !e.categories.includes(catFilter)) return false;
      if (!q) return true;
      const hay = `${e.title} ${e.slug} ${e.categories.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [ebooks, query, catFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  async function handleDelete(id: number, title: string) {
    if (!window.confirm(`Xoá ebook "${title}" khỏi Supabase?\nHành động không hoàn tác.`)) return;
    try {
      const res = await fetch("/admin/api/ebook-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setEbooks((prev) => prev.filter((e) => e.id !== id));
      notify("Đã xoá ebook.", true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      notify(`Lỗi xoá: ${msg}`, false);
    }
  }

  async function handleToggleFeature(row: AdminEbookRow) {
    const next = !row.featured;
    try {
      const res = await fetch("/admin/api/ebook-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, featured: next }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setEbooks((prev) => prev.map((e) => (e.id === row.id ? { ...e, featured: next } : e)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      notify(`Lỗi cập nhật: ${msg}`, false);
    }
  }

  async function handleOpenEdit(id: number) {
    setLoadingFull(id);
    try {
      const res = await fetch(`/admin/api/ebook-get?id=${id}`, { method: "GET" });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        data?: Record<string, unknown>;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const d = json.data;
      const initial: FullEbook = {
        id: Number(d.id),
        slug: (d.slug as string | null) ?? "",
        title: (d.title as string | null) ?? "",
        so_trang: d.so_trang == null ? null : Number(d.so_trang),
        featured: (d.featured as boolean | null) ?? false,
        categories: Array.isArray(d.categories)
          ? (d.categories as unknown[]).filter((x): x is string => typeof x === "string")
          : [],
        thumbnail: (d.thumbnail as string | null) ?? null,
        image_demo: Array.isArray(d.image_demo)
          ? (d.image_demo as unknown[]).filter((x): x is string => typeof x === "string")
          : [],
        img_src_link: Array.isArray(d.img_src_link)
          ? (d.img_src_link as unknown[]).filter((x): x is string => typeof x === "string")
          : [],
        html_embed: (d.html_embed as string | null) ?? null,
        content: (d.content as string | null) ?? null,
        noi_dung_sach: (d.noi_dung_sach as string | null) ?? null,
        created_at: (d.created_at as string | null) ?? null,
        updated_at: (d.updated_at as string | null) ?? null,
      };
      setModal({ kind: "edit", id, initial });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      notify(`Lỗi mở ebook: ${msg}`, false);
    } finally {
      setLoadingFull(null);
    }
  }

  function handleRowUpdated(row: AdminEbookRow) {
    setEbooks((prev) => prev.map((e) => (e.id === row.id ? row : e)));
  }

  function handleRowCreated(row: AdminEbookRow) {
    setEbooks((prev) => [row, ...prev]);
  }

  return (
    <div className="qle-root">
      <style>{QLE_CSS}</style>

      <header className="qle-header">
        <div>
          <h1 className="qle-h1">Quản lý Ebook</h1>
          <p className="qle-sub">
            Quản lý kho ebook hiển thị tại <code>/ebook</code>. Mỗi bản ghi là 1 row trong bảng <code>mkt_ebooks</code>.
          </p>
        </div>
      </header>

      {missingServiceRole ? (
        <div className="qle-warn">
          <AlertTriangle size={16} />
          <span>
            Thiếu <code>SUPABASE_SERVICE_ROLE_KEY</code> — không thể đọc/ghi bảng.
          </span>
        </div>
      ) : null}
      {loadError ? (
        <div className="qle-warn">
          <AlertTriangle size={16} />
          <span>Lỗi tải danh sách: {loadError}</span>
        </div>
      ) : null}

      <section className="qle-section">
        <header className="qle-section-head">
          <div className="qle-section-title">
            <BookOpen size={16} className="qle-accent-icon" />
            <span>Danh sách ebook</span>
            <span className="qle-badge">{filtered.length}</span>
          </div>
          <div className="qle-section-tools">
            <div className="qle-url-input qle-search">
              <Search size={14} />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tiêu đề / slug / chủ đề..."
              />
            </div>
            <select
              className="qle-select"
              value={catFilter}
              onChange={(e) => {
                setCatFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả chủ đề</option>
              {allCats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="qle-btn qle-btn-primary qle-btn-sm2"
              onClick={() => setModal({ kind: "create" })}
            >
              <Plus size={14} />
              <span>Thêm ebook</span>
            </button>
          </div>
        </header>

        <div className="qle-table-wrap">
          <table className="qle-table">
            <thead>
              <tr>
                <th className="qle-col-thumb">Bìa</th>
                <th className="qle-col-title">Tiêu đề</th>
                <th className="qle-col-cat">Chủ đề</th>
                <th className="qle-col-pages">Trang</th>
                <th className="qle-col-feat">Nổi bật</th>
                <th className="qle-col-date">Ngày tạo</th>
                <th className="qle-col-act">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="qle-empty">
                    {query || catFilter ? "Không có ebook nào khớp bộ lọc." : "Chưa có ebook nào."}
                  </td>
                </tr>
              ) : (
                pageRows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.thumbnail ? (
                        <div className="qle-row-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={e.thumbnail} alt={e.title} />
                        </div>
                      ) : (
                        <div className="qle-row-thumb qle-row-thumb-empty">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="qle-cell-title">
                      <div className="qle-title-main">{e.title || <em>(không tiêu đề)</em>}</div>
                      <div className="qle-title-slug">/{e.slug}</div>
                    </td>
                    <td className="qle-cell-cats">
                      {e.categories.length === 0 ? (
                        <span className="qle-muted">—</span>
                      ) : (
                        <div className="qle-cat-chips">
                          {e.categories.slice(0, 3).map((c) => (
                            <span key={c} className="qle-cat-chip">
                              {c}
                            </span>
                          ))}
                          {e.categories.length > 3 ? (
                            <span className="qle-cat-chip qle-cat-chip-more">
                              +{e.categories.length - 3}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="qle-cell-pages">{e.so_trang ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className={`qle-star ${e.featured ? "is-on" : ""}`}
                        onClick={() => handleToggleFeature(e)}
                        title={e.featured ? "Bỏ đánh dấu nổi bật" : "Đánh dấu nổi bật"}
                      >
                        <Star size={14} />
                      </button>
                    </td>
                    <td className="qle-cell-date">{fmtDate(e.created_at)}</td>
                    <td>
                      <div className="qle-row-actions">
                        <button
                          type="button"
                          className="qle-btn qle-btn-ghost qle-btn-sm"
                          onClick={() => handleOpenEdit(e.id)}
                          disabled={loadingFull === e.id}
                        >
                          {loadingFull === e.id ? (
                            <Loader2 size={13} className="qle-spin" />
                          ) : (
                            <Edit3 size={13} />
                          )}
                          <span>Sửa</span>
                        </button>
                        {e.slug ? (
                          <a
                            className="qle-btn qle-btn-ghost qle-btn-sm"
                            href={`/ebook/${e.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={13} />
                            <span>Xem</span>
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="qle-btn qle-btn-danger qle-btn-sm"
                          onClick={() => handleDelete(e.id, e.title)}
                        >
                          <Trash2 size={13} />
                          <span>Xoá</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <nav className="qle-pager" aria-label="Phân trang">
            <button type="button" disabled={curPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ← Trước
            </button>
            <span>
              Trang {curPage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={curPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau →
            </button>
          </nav>
        ) : null}
      </section>

      {modal ? (
        <EbookEditorModal
          mode={modal}
          onClose={() => setModal(null)}
          onCreated={handleRowCreated}
          onUpdated={handleRowUpdated}
          onToast={notify}
          knownCategories={allCats}
        />
      ) : null}

      {toast ? (
        <div className={`qle-toast ${toast.ok ? "is-ok" : "is-err"}`}>
          {toast.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span>{toast.msg}</span>
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Editor modal
// ──────────────────────────────────────────────────────────────

type FormState = {
  title: string;
  slug: string;
  so_trang: string; // keep as string for input
  featured: boolean;
  categories: string[];
  thumbnail: string;
  image_demo: string[];
  img_src_link: string; // multiline text for textarea
  html_embed: string;
  content: string;
  noi_dung_sach: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

const MAX_DEMO_IMAGES = 8;
const DEFAULT_DEMO_SLOTS = 4;

function initialFormFromMode(mode: ModalMode): FormState {
  if (mode.kind === "create") {
    return {
      title: "",
      slug: "",
      so_trang: "",
      featured: false,
      categories: [],
      thumbnail: "",
      image_demo: Array.from({ length: DEFAULT_DEMO_SLOTS }, () => ""),
      img_src_link: "",
      html_embed: "",
      content: "",
      noi_dung_sach: "",
    };
  }
  const v = mode.initial;
  const demos = [...v.image_demo].slice(0, MAX_DEMO_IMAGES);
  // Giữ ít nhất 1 slot để user thấy UI (sẽ filter rỗng khi submit)
  if (demos.length === 0) {
    for (let i = 0; i < DEFAULT_DEMO_SLOTS; i += 1) demos.push("");
  }
  return {
    title: v.title ?? "",
    slug: v.slug ?? "",
    so_trang: v.so_trang == null ? "" : String(v.so_trang),
    featured: v.featured,
    categories: [...v.categories],
    thumbnail: v.thumbnail ?? "",
    image_demo: demos,
    img_src_link: v.img_src_link.join("\n"),
    html_embed: v.html_embed ?? "",
    content: v.content ?? "",
    noi_dung_sach: v.noi_dung_sach ?? "",
  };
}

function EbookEditorModal({
  mode,
  onClose,
  onCreated,
  onUpdated,
  onToast,
  knownCategories,
}: {
  mode: ModalMode;
  onClose: () => void;
  onCreated: (row: AdminEbookRow) => void;
  onUpdated: (row: AdminEbookRow) => void;
  onToast: (msg: string, ok: boolean) => void;
  knownCategories: string[];
}) {
  const [form, setForm] = useState<FormState>(() => initialFormFromMode(mode));
  const [saving, setSaving] = useState(false);
  const [uploadingAny, setUploadingAny] = useState(false);
  const [pdfImporting, setPdfImporting] = useState(false);
  const [pdfPickerOpen, setPdfPickerOpen] = useState(false);
  const [catInput, setCatInput] = useState("");
  const [slugTouched, setSlugTouched] = useState(mode.kind === "edit");

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [saving, onClose]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTitleChange(next: string) {
    update("title", next);
    if (!slugTouched) {
      update("slug", slugify(next));
    }
  }

  function addCategory(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (form.categories.includes(t)) return;
    update("categories", [...form.categories, t]);
  }

  function removeCategory(c: string) {
    update(
      "categories",
      form.categories.filter((x) => x !== c),
    );
  }

  function setDemoUrl(idx: number, url: string) {
    const next = [...form.image_demo];
    next[idx] = url;
    update("image_demo", next);
  }

  function addDemoSlot() {
    if (form.image_demo.length >= MAX_DEMO_IMAGES) return;
    update("image_demo", [...form.image_demo, ""]);
  }

  function removeDemoSlot(idx: number) {
    const next = form.image_demo.filter((_, i) => i !== idx);
    update("image_demo", next);
  }

  function parseImgSrcLink(): string[] {
    return form.img_src_link
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  function handlePdfImportComplete(result: ImportResult) {
    setForm((prev) => {
      const nextDemos =
        result.demoUrls.length > 0
          ? result.demoUrls.slice(0, MAX_DEMO_IMAGES)
          : prev.image_demo;
      return {
        ...prev,
        img_src_link: result.urls.join("\n"),
        so_trang: result.pageCount > 0 ? String(result.pageCount) : prev.so_trang,
        thumbnail: result.thumbnailUrl ?? prev.thumbnail,
        image_demo: nextDemos,
      };
    });
    const parts: string[] = [`${result.urls.length}/${result.pageCount} trang`];
    if (result.thumbnailUrl) parts.push("bìa đã đặt");
    if (result.demoUrls.length > 0) parts.push(`${result.demoUrls.length} ảnh demo`);
    onToast(`Đã áp dụng: ${parts.join(" · ")}.`, result.urls.length === result.pageCount);
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      onToast("Tiêu đề không được để trống.", false);
      return;
    }
    if (uploadingAny) {
      onToast("Chờ ảnh upload xong rồi lưu.", false);
      return;
    }
    if (pdfImporting) {
      onToast("Chờ import PDF xong rồi lưu.", false);
      return;
    }

    const soTrangParsed = form.so_trang.trim() ? Number(form.so_trang) : null;
    if (soTrangParsed != null && (!Number.isFinite(soTrangParsed) || soTrangParsed <= 0)) {
      onToast("Số trang phải là số nguyên dương.", false);
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        so_trang: soTrangParsed,
        featured: form.featured,
        categories: form.categories,
        thumbnail: form.thumbnail.trim() || null,
        image_demo: form.image_demo.filter((s) => s.trim().length > 0),
        img_src_link: parseImgSrcLink(),
        html_embed: form.html_embed.trim() || null,
        content: form.content || null,
        noi_dung_sach: form.noi_dung_sach || null,
      };

      if (mode.kind === "create") {
        const res = await fetch("/admin/api/ebook-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          row?: Record<string, unknown>;
        };
        if (!res.ok || !json.ok || !json.row) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        onCreated(rowFromApi(json.row));
        onToast("Đã tạo ebook mới.", true);
        onClose();
      } else {
        const res = await fetch("/admin/api/ebook-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mode.id, ...body }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          row?: Record<string, unknown>;
        };
        if (!res.ok || !json.ok || !json.row) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        onUpdated(rowFromApi(json.row));
        onToast("Đã cập nhật ebook.", true);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      onToast(`Lỗi lưu: ${msg}`, false);
    } finally {
      setSaving(false);
    }
  }

  const titleText = mode.kind === "create" ? "Tạo ebook mới" : `Sửa ebook #${mode.id}`;

  return (
    <div className="qle-modal-backdrop" onClick={saving ? undefined : onClose}>
      <div
        className="qle-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={titleText}
      >
        <header className="qle-modal-head">
          <h3 className="qle-modal-title">{titleText}</h3>
          <button
            type="button"
            className="qle-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="qle-modal-body">
          <div className={`qle-modal-grid ${pdfPickerOpen ? "is-picker-wide" : ""}`}>
            {/* CỘT TRÁI — META, BÌA, NỘI DUNG */}
            <div className="qle-modal-col-left">
              <AdminCfImageInput
                label="Ảnh bìa (thumbnail)"
                value={form.thumbnail}
                onValueChange={(url) => update("thumbnail", url)}
                preview="banner"
              />

              <label className="qle-field">
                <span className="qle-label">Tiêu đề *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  disabled={saving}
                  placeholder="Vd. Xenoblade Chronicles 2: Collected Works"
                />
              </label>

              <label className="qle-field">
                <span className="qle-label">
                  Slug (URL)
                  <span className="qle-label-hint">/ebook/{form.slug || "…"}</span>
                </span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("slug", e.target.value);
                  }}
                  disabled={saving}
                  placeholder="auto-gen từ tiêu đề"
                />
              </label>

              <div className="qle-field-row">
                <label className="qle-field">
                  <span className="qle-label">Số trang</span>
                  <input
                    type="number"
                    min={1}
                    value={form.so_trang}
                    onChange={(e) => update("so_trang", e.target.value)}
                    disabled={saving}
                    placeholder="Vd. 376"
                  />
                </label>
                <label className="qle-toggle">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => update("featured", e.target.checked)}
                    disabled={saving}
                  />
                  <span>Ebook nổi bật</span>
                </label>
              </div>

              <div className="qle-field">
                <span className="qle-label">Chủ đề (categories)</span>
                <div className="qle-tag-input">
                  {form.categories.map((c) => (
                    <span key={c} className="qle-tag">
                      {c}
                      <button
                        type="button"
                        aria-label={`Xoá chủ đề ${c}`}
                        onClick={() => removeCategory(c)}
                        disabled={saving}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    list="qle-cat-list"
                    value={catInput}
                    onChange={(e) => setCatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addCategory(catInput);
                        setCatInput("");
                      } else if (e.key === "Backspace" && !catInput && form.categories.length > 0) {
                        removeCategory(form.categories[form.categories.length - 1]!);
                      }
                    }}
                    onBlur={() => {
                      if (catInput.trim()) {
                        addCategory(catInput);
                        setCatInput("");
                      }
                    }}
                    disabled={saving}
                    placeholder={form.categories.length ? "Thêm chủ đề..." : "Nhập chủ đề rồi Enter"}
                  />
                  <datalist id="qle-cat-list">
                    {knownCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <span className="qle-hint">Enter hoặc dấu phẩy để thêm. Gợi ý từ các chủ đề đã dùng.</span>
              </div>

              <div className="qle-field">
                <span className="qle-label">HTML embed flipbook</span>
                <textarea
                  value={form.html_embed}
                  onChange={(e) => update("html_embed", e.target.value)}
                  disabled={saving}
                  placeholder="<iframe src='...' .../> — embed từ Heyzine / Flipsnack / ..."
                  rows={4}
                  className="qle-textarea qle-textarea-mono"
                />
              </div>

              <div className="qle-editor-block">
                <span className="qle-label">Tóm tắt (content)</span>
                <AdminRichTextEditor
                  value={form.content}
                  onChange={(html) => update("content", html)}
                  onUploadChange={setUploadingAny}
                  placeholder="Tóm tắt ngắn hiển thị ở slide-over preview..."
                  minHeight="140px"
                  maxHeight="280px"
                />
              </div>

              <div className="qle-editor-block">
                <span className="qle-label">Nội dung chi tiết (noi_dung_sach)</span>
                <AdminRichTextEditor
                  value={form.noi_dung_sach}
                  onChange={(html) => update("noi_dung_sach", html)}
                  onUploadChange={setUploadingAny}
                  placeholder="Bài giới thiệu chi tiết, mục lục, giới thiệu tác giả..."
                  minHeight="200px"
                  maxHeight="420px"
                />
              </div>
            </div>

            {/* CỘT PHẢI — ẢNH & PDF IMPORT */}
            <div className="qle-modal-col-right">
              <div className="qle-field">
                <span className="qle-label">
                  Ảnh demo (image_demo)
                  <span className="qle-label-hint">
                    {form.image_demo.filter((u) => u.trim().length > 0).length} /{" "}
                    {MAX_DEMO_IMAGES}
                  </span>
                </span>
                <div className="qle-demo-grid">
                  {form.image_demo.map((u, idx) => (
                    <div key={idx} className="qle-demo-slot">
                      <AdminCfImageInput
                        label={`Ảnh demo ${idx + 1}`}
                        value={u}
                        onValueChange={(url) => setDemoUrl(idx, url)}
                        preview="banner"
                        compact
                      />
                      {form.image_demo.length > 1 ? (
                        <button
                          type="button"
                          className="qle-demo-remove"
                          onClick={() => removeDemoSlot(idx)}
                          disabled={saving}
                          title={`Xoá ảnh demo ${idx + 1}`}
                          aria-label={`Xoá ảnh demo ${idx + 1}`}
                        >
                          <X size={12} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {form.image_demo.length < MAX_DEMO_IMAGES ? (
                  <button
                    type="button"
                    className="qle-btn qle-btn-ghost qle-btn-sm qle-demo-add"
                    onClick={addDemoSlot}
                    disabled={saving}
                  >
                    <Plus size={13} />
                    <span>Thêm ảnh demo ({form.image_demo.length}/{MAX_DEMO_IMAGES})</span>
                  </button>
                ) : null}
                <span className="qle-hint">
                  Hiển thị ở slide-over preview khi user bấm vào card. Trang /ebook hiện tại lấy 4
                  ảnh đầu; các slot còn lại để dự phòng. Có thể để trống nếu không cần.
                </span>
              </div>

              <div className="qle-field">
                <span className="qle-label">Import nhanh từ PDF</span>
                <EbookPdfImporter
                  slugHint={form.slug}
                  onBusyChange={setPdfImporting}
                  onPhaseChange={(ph) => setPdfPickerOpen(ph === "picker")}
                  onComplete={handlePdfImportComplete}
                />
                <span className="qle-hint">
                  Upload 1 file PDF → tự tách từng trang thành ảnh, upload Cloudflare Images, rồi
                  fill vào ô <b>Danh sách ảnh trang</b> + <b>Số trang</b> + <b>Bìa</b> (nếu trống).
                </span>
              </div>

              <div className="qle-field">
                <span className="qle-label">
                  Danh sách ảnh trang (img_src_link)
                  <span className="qle-label-hint">
                    {parseImgSrcLink().length} URL
                  </span>
                </span>
                <textarea
                  value={form.img_src_link}
                  onChange={(e) => update("img_src_link", e.target.value)}
                  disabled={saving}
                  placeholder={"Mỗi dòng 1 URL ảnh trang sách:\nhttps://imagedelivery.net/.../page-01/public\nhttps://imagedelivery.net/.../page-02/public"}
                  rows={8}
                  className="qle-textarea qle-textarea-mono"
                />
                <span className="qle-hint">
                  Hiển thị ở grid 2 cột khi user mở trang chi tiết. Mỗi dòng 1 URL Cloudflare Images.
                </span>
              </div>
            </div>
          </div>
        </div>

        <footer className="qle-modal-foot">
          {uploadingAny ? (
            <span className="qle-modal-upload-note">
              <Loader2 size={13} className="qle-spin" />
              <span>Ảnh đang upload lên Cloudflare...</span>
            </span>
          ) : pdfImporting ? (
            <span className="qle-modal-upload-note">
              <Loader2 size={13} className="qle-spin" />
              <span>Đang import PDF — chờ xong rồi mới Lưu được...</span>
            </span>
          ) : (
            <span />
          )}
          <div className="qle-modal-actions">
            <button
              type="button"
              className="qle-btn qle-btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="qle-btn qle-btn-primary"
              onClick={handleSubmit}
              disabled={saving || uploadingAny || pdfImporting}
            >
              {saving ? <Loader2 size={16} className="qle-spin" /> : <Save size={16} />}
              <span>
                {saving ? "Đang lưu..." : mode.kind === "create" ? "Tạo ebook" : "Lưu thay đổi"}
              </span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function rowFromApi(raw: Record<string, unknown>): AdminEbookRow {
  return {
    id: Number(raw.id),
    slug: (raw.slug as string | null) ?? "",
    title: (raw.title as string | null) ?? "",
    so_trang: raw.so_trang == null ? null : Number(raw.so_trang),
    featured: (raw.featured as boolean | null) ?? false,
    categories: Array.isArray(raw.categories)
      ? (raw.categories as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    thumbnail: (raw.thumbnail as string | null) ?? null,
    created_at: (raw.created_at as string | null) ?? null,
    updated_at: (raw.updated_at as string | null) ?? null,
  };
}

const QLE_CSS = `
  .qle-root{display:flex;flex-direction:column;gap:20px;padding:4px 0 48px;font-family:'Be Vietnam Pro',system-ui,-apple-system,sans-serif;color:#2d2020}
  .qle-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:4px 4px 0}
  .qle-h1{font-size:22px;font-weight:700;margin:0 0 4px;color:#1a1a1a;letter-spacing:-.01em}
  .qle-sub{font-size:13px;color:#6b5c5c;margin:0;max-width:640px;line-height:1.5}
  .qle-sub code{background:#fff4ec;padding:1px 6px;border-radius:6px;font-size:12px;color:#c45127}

  .qle-warn{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;background:#fff4e8;border:1px solid #f8d4a8;color:#a54b0b;font-size:13px}
  .qle-warn code{background:rgba(255,255,255,.6);padding:1px 6px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px}

  .qle-section{background:#ffffff;border:1px solid rgba(45,32,32,.08);border-radius:14px;padding:18px 20px;box-shadow:0 6px 18px rgba(45,32,32,.04)}
  .qle-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
  .qle-section-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;letter-spacing:-.005em}
  .qle-section-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .qle-accent-icon{color:#ee5b9f}
  .qle-badge{background:#fff4ec;color:#c45127;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:600}

  .qle-url-input{display:flex;align-items:center;gap:8px;background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:10px;padding:0 12px;transition:all .15s ease}
  .qle-url-input:focus-within{background:#fff;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qle-url-input svg{color:#9c8a8a;flex-shrink:0}
  .qle-url-input input{flex:1;background:none;border:none;outline:none;padding:9px 0;font-size:13.5px;color:#2d2020;font-family:inherit}
  .qle-url-input input::placeholder{color:#a89e9e}
  .qle-search{max-width:280px;flex:0 1 280px}
  .qle-select{background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:10px;padding:9px 12px;font-size:13px;color:#2d2020;font-family:inherit;cursor:pointer;transition:all .15s ease}
  .qle-select:hover{background:#fff;border-color:#f8a668}
  .qle-select:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}

  .qle-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;border:1px solid transparent;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .15s ease;white-space:nowrap;font-family:inherit}
  .qle-btn:disabled{opacity:.6;cursor:not-allowed}
  .qle-btn-primary{background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;box-shadow:0 4px 12px rgba(238,91,159,.25)}
  .qle-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(238,91,159,.3)}
  .qle-btn-ghost{background:#fafafa;color:#5a4a4a;border-color:rgba(45,32,32,.1)}
  .qle-btn-ghost:hover:not(:disabled){background:#f0ece8;color:#2d2020}
  .qle-btn-danger{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
  .qle-btn-danger:hover:not(:disabled){background:#fee2e2}
  .qle-btn-sm{padding:6px 10px;font-size:12px}
  .qle-btn-sm2{padding:8px 14px;font-size:13px}

  .qle-spin{animation:qle-spin .8s linear infinite}
  @keyframes qle-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

  .qle-table-wrap{border:1px solid rgba(45,32,32,.06);border-radius:10px;overflow-x:auto;background:#fff}
  .qle-table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:880px}
  .qle-table thead{background:#fafafa}
  .qle-table th{text-align:left;padding:11px 14px;font-weight:600;color:#6b5c5c;font-size:12px;text-transform:uppercase;letter-spacing:.02em;border-bottom:1px solid rgba(45,32,32,.06)}
  .qle-table td{padding:12px 14px;border-bottom:1px solid rgba(45,32,32,.04);vertical-align:middle}
  .qle-table tr:last-child td{border-bottom:none}
  .qle-table tr:hover td{background:#fffaf3}
  .qle-col-thumb{width:72px}
  .qle-col-pages{width:70px;text-align:center}
  .qle-col-feat{width:70px;text-align:center}
  .qle-col-date{width:150px;white-space:nowrap}
  .qle-col-act{width:240px}
  .qle-cell-title{max-width:320px}
  .qle-title-main{font-weight:600;color:#2d2020;line-height:1.35}
  .qle-title-slug{font-size:11.5px;color:#9c8a8a;font-family:ui-monospace,SFMono-Regular,monospace;margin-top:2px}
  .qle-cell-cats{max-width:220px}
  .qle-cat-chips{display:flex;flex-wrap:wrap;gap:4px}
  .qle-cat-chip{background:rgba(238,91,159,.1);color:#b31e62;padding:2px 8px;border-radius:100px;font-size:11.5px;font-weight:500;white-space:nowrap}
  .qle-cat-chip-more{background:rgba(45,32,32,.06);color:#6b5c5c}
  .qle-cell-pages{text-align:center;color:#5a4a4a;font-variant-numeric:tabular-nums}
  .qle-cell-date{color:#9c8a8a;font-size:12px}
  .qle-muted{color:#c8bcbc}
  .qle-empty{text-align:center;padding:40px 20px !important;color:#9c8a8a;font-style:italic}

  .qle-row-thumb{width:44px;height:58px;border-radius:6px;overflow:hidden;background:#fafafa;border:1px solid rgba(45,32,32,.05)}
  .qle-row-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .qle-row-thumb-empty{display:flex;align-items:center;justify-content:center;color:#c8bcbc}

  .qle-star{background:none;border:none;cursor:pointer;padding:6px;border-radius:50%;color:#d4c7c7;display:inline-flex;transition:all .15s ease}
  .qle-star:hover{background:#fff4ec;color:#f8a668}
  .qle-star.is-on{color:#ee5b9f}
  .qle-star.is-on svg{fill:currentColor}

  .qle-row-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}

  .qle-pager{display:flex;justify-content:center;align-items:center;gap:16px;padding-top:14px;font-size:13px;color:#6b5c5c}
  .qle-pager button{background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;font-family:inherit;color:#5a4a4a}
  .qle-pager button:disabled{opacity:.4;cursor:not-allowed}
  .qle-pager button:hover:not(:disabled){background:#fff4ec;border-color:#f8a668;color:#c45127}

  .qle-toast{position:fixed;bottom:24px;right:24px;display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:10px;box-shadow:0 12px 32px rgba(45,32,32,.18);font-size:13.5px;font-weight:500;z-index:220;animation:qle-toast-in .25s ease}
  .qle-toast.is-ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
  .qle-toast.is-err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
  @keyframes qle-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

  /* ── Modal ─────────────────────────────────────────────── */
  .qle-modal-backdrop{position:fixed;inset:0;background:rgba(45,32,32,.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;animation:qle-backdrop-in .18s ease}
  @keyframes qle-backdrop-in{from{opacity:0}to{opacity:1}}
  .qle-modal{background:#fff;border-radius:14px;box-shadow:0 24px 72px rgba(45,32,32,.3);width:100%;max-width:1260px;max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden;animation:qle-modal-in .22s ease;transition:max-width .3s ease}
  .qle-modal:has(.qle-modal-grid.is-picker-wide){max-width:1440px}
  @keyframes qle-modal-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
  .qle-modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid rgba(45,32,32,.08);background:linear-gradient(180deg,#fffaf5,#fff)}
  .qle-modal-title{margin:0;font-size:16px;font-weight:700;color:#2d2020;letter-spacing:-.005em}
  .qle-modal-close{background:none;border:none;cursor:pointer;padding:6px;border-radius:50%;color:#9c8a8a;display:inline-flex;transition:all .15s ease}
  .qle-modal-close:hover:not(:disabled){background:#fff4ec;color:#c45127}
  .qle-modal-body{overflow-y:auto;padding:20px 22px;flex:1}
  .qle-modal-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start;transition:grid-template-columns .25s ease}
  .qle-modal-grid.is-picker-wide{grid-template-columns:1fr}
  .qle-modal-grid.is-picker-wide .qle-modal-col-left{display:none}
  @media (max-width:960px){.qle-modal-grid{grid-template-columns:1fr}}
  .qle-modal-col-left{display:flex;flex-direction:column;gap:14px;min-width:0}
  .qle-modal-col-right{display:flex;flex-direction:column;gap:16px;min-width:0}
  .qle-modal-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 22px;border-top:1px solid rgba(45,32,32,.08);background:#fafafa}
  .qle-modal-upload-note{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#c45127}
  .qle-modal-actions{display:flex;gap:10px}

  .qle-field{display:flex;flex-direction:column;gap:6px}
  .qle-field-row{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end}
  .qle-label{font-size:12px;font-weight:600;color:#6b5c5c;letter-spacing:.02em;text-transform:uppercase;display:flex;align-items:center;justify-content:space-between;gap:8px}
  .qle-label-hint{text-transform:none;letter-spacing:0;font-weight:500;color:#9c8a8a;font-size:11.5px;font-family:ui-monospace,SFMono-Regular,monospace}
  .qle-hint{font-size:11.5px;color:#9c8a8a;line-height:1.5}
  .qle-field input[type="text"],.qle-field input[type="url"],.qle-field input[type="number"]{padding:10px 12px;border-radius:8px;border:1px solid rgba(45,32,32,.12);background:#fff;font-size:14px;font-family:inherit;color:#2d2020;transition:all .15s ease;width:100%}
  .qle-field input:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qle-toggle{display:flex;align-items:center;gap:8px;font-size:13px;color:#5a4a4a;cursor:pointer;padding:10px 12px;background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:8px;user-select:none;white-space:nowrap}
  .qle-toggle input{width:16px;height:16px;accent-color:#ee5b9f}

  .qle-textarea{width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(45,32,32,.12);background:#fff;font-size:13.5px;font-family:inherit;color:#2d2020;transition:all .15s ease;resize:vertical;line-height:1.55}
  .qle-textarea:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qle-textarea-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;background:#fafafa}

  .qle-editor-block{display:flex;flex-direction:column;gap:6px}

  .qle-tag-input{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(45,32,32,.12);border-radius:8px;background:#fff;min-height:42px}
  .qle-tag-input:focus-within{border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qle-tag-input input{flex:1;min-width:140px;border:none;outline:none;background:none;padding:4px 0;font-size:13.5px;font-family:inherit;color:#2d2020}
  .qle-tag{display:inline-flex;align-items:center;gap:4px;background:rgba(238,91,159,.12);color:#b31e62;padding:3px 4px 3px 10px;border-radius:100px;font-size:12.5px;font-weight:500}
  .qle-tag button{background:rgba(255,255,255,.4);border:none;width:18px;height:18px;border-radius:50%;cursor:pointer;color:inherit;display:inline-flex;align-items:center;justify-content:center;padding:0;transition:all .15s ease}
  .qle-tag button:hover:not(:disabled){background:#fff;color:#b91c1c}

  .qle-demo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  @media (max-width:560px){.qle-demo-grid{grid-template-columns:1fr}}
  .qle-demo-slot{position:relative}
  .qle-demo-remove{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.94);border:1px solid rgba(45,32,32,.12);color:#b91c1c;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;box-shadow:0 2px 6px rgba(45,32,32,.15);transition:all .15s ease;padding:0}
  .qle-demo-remove:hover:not(:disabled){background:#fef2f2;border-color:#fecaca;transform:scale(1.08)}
  .qle-demo-remove:disabled{opacity:.4;cursor:not-allowed}
  .qle-demo-add{align-self:flex-start;margin-top:2px}
`;
