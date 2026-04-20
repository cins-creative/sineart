"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Square,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

import AdminRichTextEditor from "@/app/admin/_components/AdminRichTextEditor";
import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";

export type AdminBlogRow = {
  id: number;
  created_at: string;
  title: string | null;
  thumbnail: string | null;
  feature: boolean | null;
  nguon: string | null;
  image_alt: string | null;
};

type FullBlog = AdminBlogRow & {
  opening: string | null;
  content: string | null;
  ending: string | null;
};

type Props = {
  initialBlogs: AdminBlogRow[];
  missingServiceRole?: boolean;
  loadError?: string;
};

type ModalMode =
  | { kind: "create" }
  | { kind: "edit"; id: number; initial: FullBlog };

const PAGE_SIZE = 20;

function fmtDate(iso: string): string {
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

export default function QuanLyBlogView({ initialBlogs, missingServiceRole, loadError }: Props) {
  const [blogs, setBlogs] = useState<AdminBlogRow[]>(initialBlogs);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  // Modal state (edit/create thủ công)
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [loadingFull, setLoadingFull] = useState<number | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3200);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return blogs;
    return blogs.filter((b) => {
      const t = (b.title ?? "").toLowerCase();
      const n = (b.nguon ?? "").toLowerCase();
      return t.includes(q) || n.includes(q);
    });
  }, [blogs, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  async function handleDelete(id: number) {
    if (!window.confirm("Xoá bài viết này khỏi Supabase? Hành động không hoàn tác.")) return;
    try {
      const res = await fetch("/admin/api/blog-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setBlogs((prev) => prev.filter((b) => b.id !== id));
      notify("Đã xoá bài viết.", true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      notify(`Lỗi xoá: ${msg}`, false);
    }
  }

  async function handleToggleFeature(row: AdminBlogRow) {
    const next = !row.feature;
    try {
      const res = await fetch("/admin/api/blog-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, feature: next }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setBlogs((prev) => prev.map((b) => (b.id === row.id ? { ...b, feature: next } : b)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      notify(`Lỗi cập nhật: ${msg}`, false);
    }
  }

  function handleOpenCreate() {
    setModal({ kind: "create" });
  }

  async function handleOpenEdit(id: number) {
    setLoadingFull(id);
    try {
      const res = await fetch(`/admin/api/blog-get?id=${id}`, { method: "GET" });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; data?: FullBlog };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setModal({ kind: "edit", id, initial: json.data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      notify(`Lỗi mở bài viết: ${msg}`, false);
    } finally {
      setLoadingFull(null);
    }
  }

  function handleRowUpdated(row: AdminBlogRow) {
    setBlogs((prev) => prev.map((b) => (b.id === row.id ? row : b)));
  }

  function handleRowCreated(row: AdminBlogRow) {
    setBlogs((prev) => [row, ...prev]);
  }

  return (
    <div className="qlb-root">
      <style>{QLB_CSS}</style>

      <header className="qlb-header">
        <div>
          <h1 className="qlb-h1">Quản lý Blog</h1>
        </div>
      </header>

      {missingServiceRole ? (
        <div className="qlb-warn">
          <AlertTriangle size={16} />
          <span>Thiếu <code>SUPABASE_SERVICE_ROLE_KEY</code> — không thể đọc/ghi bảng.</span>
        </div>
      ) : null}
      {loadError ? (
        <div className="qlb-warn">
          <AlertTriangle size={16} />
          <span>Lỗi tải danh sách: {loadError}</span>
        </div>
      ) : null}

      {/* ========== PHẦN B: BATCH IMPORT ========== */}
      <BatchImporter onRowCreated={handleRowCreated} onToast={notify} />

      {/* ========== PHẦN C: LIST ========== */}
      <section className="qlb-section">
        <header className="qlb-section-head">
          <div className="qlb-section-title">
            <span>Danh sách bài đã có</span>
            <span className="qlb-badge">{filtered.length}</span>
          </div>
          <div className="qlb-section-tools">
            <div className="qlb-url-input qlb-search">
              <Search size={14} />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tiêu đề hoặc nguồn..."
              />
            </div>
            <button type="button" className="qlb-btn qlb-btn-primary qlb-btn-sm2" onClick={handleOpenCreate}>
              <Plus size={14} />
              <span>Thêm bài mới</span>
            </button>
          </div>
        </header>

        <div className="qlb-table-wrap">
          <table className="qlb-table">
            <thead>
              <tr>
                <th className="qlb-col-thumb">Ảnh</th>
                <th className="qlb-col-title">Tiêu đề</th>
                <th className="qlb-col-nguon">Nguồn</th>
                <th className="qlb-col-feat">Nổi bật</th>
                <th className="qlb-col-date">Ngày tạo</th>
                <th className="qlb-col-act">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="qlb-empty">
                    Chưa có bài viết nào.
                  </td>
                </tr>
              ) : (
                pageRows.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.thumbnail ? (
                        <div className="qlb-row-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={b.thumbnail} alt={b.image_alt ?? b.title ?? ""} />
                        </div>
                      ) : (
                        <div className="qlb-row-thumb qlb-row-thumb-empty">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="qlb-cell-title">{b.title || <em>(không tiêu đề)</em>}</td>
                    <td className="qlb-cell-nguon">
                      {b.nguon ? (
                        <a href={b.nguon} target="_blank" rel="noreferrer">
                          {tryDomain(b.nguon)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`qlb-star ${b.feature ? "is-on" : ""}`}
                        onClick={() => handleToggleFeature(b)}
                        title={b.feature ? "Bỏ đánh dấu nổi bật" : "Đánh dấu nổi bật"}
                      >
                        <Star size={14} />
                      </button>
                    </td>
                    <td className="qlb-cell-date">{fmtDate(b.created_at)}</td>
                    <td>
                      <div className="qlb-row-actions">
                        <button
                          type="button"
                          className="qlb-btn qlb-btn-ghost qlb-btn-sm"
                          onClick={() => handleOpenEdit(b.id)}
                          disabled={loadingFull === b.id}
                        >
                          {loadingFull === b.id ? (
                            <Loader2 size={13} className="qlb-spin" />
                          ) : (
                            <Edit3 size={13} />
                          )}
                          <span>Sửa</span>
                        </button>
                        <a
                          className="qlb-btn qlb-btn-ghost qlb-btn-sm"
                          href={`/blogs/${b.id}-${slugify(b.title ?? "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={13} />
                          <span>Xem</span>
                        </a>
                        <button
                          type="button"
                          className="qlb-btn qlb-btn-danger qlb-btn-sm"
                          onClick={() => handleDelete(b.id)}
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
          <nav className="qlb-pager" aria-label="Phân trang">
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
        <BlogEditorModal
          mode={modal}
          onClose={() => setModal(null)}
          onCreated={handleRowCreated}
          onUpdated={handleRowUpdated}
          onToast={notify}
        />
      ) : null}

      {toast ? (
        <div className={`qlb-toast ${toast.ok ? "is-ok" : "is-err"}`}>
          {toast.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span>{toast.msg}</span>
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// BlogEditorModal — dùng cho cả Tạo mới & Chỉnh sửa (thủ công)
// ──────────────────────────────────────────────────────────────

type EditorFormState = {
  title: string;
  thumbnail: string;
  image_alt: string;
  nguon: string;
  feature: boolean;
  opening: string;
  content: string;
  ending: string;
};

function initialFormFromMode(mode: ModalMode): EditorFormState {
  if (mode.kind === "create") {
    return {
      title: "",
      thumbnail: "",
      image_alt: "",
      nguon: "",
      feature: false,
      opening: "",
      content: "",
      ending: "",
    };
  }
  const v = mode.initial;
  return {
    title: v.title ?? "",
    thumbnail: v.thumbnail ?? "",
    image_alt: v.image_alt ?? "",
    nguon: v.nguon ?? "",
    feature: !!v.feature,
    opening: v.opening ?? "",
    content: v.content ?? "",
    ending: v.ending ?? "",
  };
}

function BlogEditorModal({
  mode,
  onClose,
  onCreated,
  onUpdated,
  onToast,
}: {
  mode: ModalMode;
  onClose: () => void;
  onCreated: (row: AdminBlogRow) => void;
  onUpdated: (row: AdminBlogRow) => void;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [form, setForm] = useState<EditorFormState>(() => initialFormFromMode(mode));
  const [saving, setSaving] = useState(false);
  const [uploadingAny, setUploadingAny] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [saving, onClose]);

  function update<K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    setSaving(true);
    try {
      if (mode.kind === "create") {
        const res = await fetch("/admin/api/blog-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            thumbnail: form.thumbnail.trim() || null,
            image_alt: form.image_alt.trim() || form.title.trim(),
            opening: form.opening || null,
            content: form.content || null,
            ending: form.ending || null,
            nguon: form.nguon.trim() || null,
            feature: form.feature,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          row?: AdminBlogRow;
        };
        if (!res.ok || !json.ok || !json.row) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        onCreated(json.row);
        onToast("Đã tạo bài viết mới.", true);
        onClose();
      } else {
        const res = await fetch("/admin/api/blog-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: mode.id,
            title: form.title.trim(),
            thumbnail: form.thumbnail.trim() || null,
            image_alt: form.image_alt.trim() || form.title.trim(),
            opening: form.opening || null,
            content: form.content || null,
            ending: form.ending || null,
            nguon: form.nguon.trim() || null,
            feature: form.feature,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          row?: AdminBlogRow;
        };
        if (!res.ok || !json.ok || !json.row) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        onUpdated(json.row);
        onToast("Đã cập nhật bài viết.", true);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      onToast(`Lỗi lưu: ${msg}`, false);
    } finally {
      setSaving(false);
    }
  }

  const titleText = mode.kind === "create" ? "Tạo bài viết mới" : `Sửa bài viết #${mode.id}`;

  return (
    <div className="qlb-modal-backdrop" onClick={saving ? undefined : onClose}>
      <div className="qlb-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titleText}>
        <header className="qlb-modal-head">
          <h3 className="qlb-modal-title">{titleText}</h3>
          <button type="button" className="qlb-modal-close" onClick={onClose} disabled={saving}>
            <X size={16} />
          </button>
        </header>

        <div className="qlb-modal-body">
          <div className="qlb-modal-grid">
            <div className="qlb-modal-col-left">
              <AdminCfImageInput
                label="Ảnh thumbnail"
                value={form.thumbnail}
                onValueChange={(url) => update("thumbnail", url)}
                preview="banner"
              />

              <label className="qlb-field">
                <span className="qlb-label">Tiêu đề *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  disabled={saving}
                  placeholder="Tiêu đề bài viết"
                />
              </label>

              <label className="qlb-field">
                <span className="qlb-label">Image alt (SEO)</span>
                <input
                  type="text"
                  value={form.image_alt}
                  onChange={(e) => update("image_alt", e.target.value)}
                  disabled={saving}
                  placeholder="Mô tả ngắn gọn ảnh thumbnail"
                />
              </label>

              <label className="qlb-field">
                <span className="qlb-label">URL nguồn</span>
                <input
                  type="url"
                  value={form.nguon}
                  onChange={(e) => update("nguon", e.target.value)}
                  disabled={saving}
                  placeholder="https://..."
                />
              </label>

              <label className="qlb-toggle">
                <input
                  type="checkbox"
                  checked={form.feature}
                  onChange={(e) => update("feature", e.target.checked)}
                  disabled={saving}
                />
                <span>Đánh dấu là bài nổi bật (Featured)</span>
              </label>
            </div>

            <div className="qlb-modal-col-right">
              <div className="qlb-editor-block">
                <span className="qlb-label">Opening (mở bài)</span>
                <AdminRichTextEditor
                  value={form.opening}
                  onChange={(html) => update("opening", html)}
                  onUploadChange={setUploadingAny}
                  placeholder="Đoạn mở bài — thường in đậm, tóm lược ý chính..."
                  minHeight="120px"
                  maxHeight="260px"
                />
              </div>

              <div className="qlb-editor-block">
                <span className="qlb-label">Nội dung chính</span>
                <AdminRichTextEditor
                  value={form.content}
                  onChange={(html) => update("content", html)}
                  onUploadChange={setUploadingAny}
                  placeholder="Nội dung đầy đủ. Dán ảnh, thêm heading H2/H3, list..."
                  minHeight="360px"
                  maxHeight="560px"
                />
              </div>

              <div className="qlb-editor-block">
                <span className="qlb-label">Ending (đoạn giới thiệu Sine Art)</span>
                <AdminRichTextEditor
                  value={form.ending}
                  onChange={(html) => update("ending", html)}
                  onUploadChange={setUploadingAny}
                  placeholder="Đoạn cuối giới thiệu Sine Art..."
                  minHeight="120px"
                  maxHeight="260px"
                />
              </div>
            </div>
          </div>
        </div>

        <footer className="qlb-modal-foot">
          {uploadingAny ? (
            <span className="qlb-modal-upload-note">
              <Loader2 size={13} className="qlb-spin" />
              <span>Ảnh đang upload lên Cloudflare...</span>
            </span>
          ) : (
            <span />
          )}
          <div className="qlb-modal-actions">
            <button type="button" className="qlb-btn qlb-btn-ghost" onClick={onClose} disabled={saving}>
              Huỷ
            </button>
            <button
              type="button"
              className="qlb-btn qlb-btn-primary"
              onClick={handleSubmit}
              disabled={saving || uploadingAny}
            >
              {saving ? <Loader2 size={16} className="qlb-spin" /> : <Save size={16} />}
              <span>{saving ? "Đang lưu..." : mode.kind === "create" ? "Tạo bài" : "Lưu thay đổi"}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ProgressStep({
  active,
  done,
  children,
}: {
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`qlb-step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
      <span className="qlb-step-dot">{done ? <Check size={11} /> : active ? <Loader2 size={11} className="qlb-spin" /> : null}</span>
      <span>{children}</span>
    </div>
  );
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function tryDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ──────────────────────────────────────────────────────────────
// BatchImporter — paste nhiều URL, tự động import & lưu Supabase
// ──────────────────────────────────────────────────────────────

type BatchStatus = "pending" | "importing" | "saving" | "done" | "error";

type BatchItem = {
  id: string;
  url: string;
  status: BatchStatus;
  title?: string;
  error?: string;
};

type ImportData = {
  title: string;
  thumbnail: string;
  image_alt: string;
  opening: string;
  content: string;
  ending: string;
  nguon: string;
};

function BatchImporter({
  onRowCreated,
  onToast,
}: {
  onRowCreated: (row: AdminBlogRow) => void;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const validUrls = useMemo(() => {
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => {
        try { new URL(l); return true; } catch { return false; }
      });
  }, [raw]);

  const updateItem = useCallback((id: string, patch: Partial<BatchItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  async function handleStart() {
    if (!validUrls.length) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStopRequested(false);

    const initial: BatchItem[] = validUrls.map((url, i) => ({
      id: `batch-${i}-${Date.now()}`,
      url,
      status: "pending",
    }));
    setItems(initial);
    setRunning(true);

    for (const item of initial) {
      if (controller.signal.aborted) break;

      updateItem(item.id, { status: "importing" });

      // Step 1: import
      let data: ImportData | null = null;
      try {
        const res = await fetch("/admin/api/blog-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: item.url }),
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; data?: ImportData };
        if (!res.ok || !json.ok || !json.data) throw new Error(json.error || `HTTP ${res.status}`);
        data = json.data;
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") break;
        const msg = err instanceof Error ? err.message : "Lỗi import";
        updateItem(item.id, { status: "error", error: msg });
        continue;
      }

      if (controller.signal.aborted) break;
      updateItem(item.id, { status: "saving", title: data.title });

      // Step 2: save
      try {
        const res = await fetch("/admin/api/blog-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            thumbnail: data.thumbnail,
            image_alt: data.image_alt || data.title,
            opening: data.opening,
            content: data.content,
            ending: data.ending,
            nguon: data.nguon,
            feature: false,
          }),
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; row?: AdminBlogRow };
        if (!res.ok || !json.ok || !json.row) throw new Error(json.error || `HTTP ${res.status}`);
        onRowCreated(json.row!);
        updateItem(item.id, { status: "done", title: data.title });
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") break;
        const msg = err instanceof Error ? err.message : "Lỗi lưu";
        updateItem(item.id, { status: "error", error: msg });
      }
    }

    setRunning(false);
    setStopRequested(false);
    const finalItems = await new Promise<BatchItem[]>((resolve) => {
      setItems((prev) => { resolve(prev); return prev; });
    });
    const done = finalItems.filter((i) => i.status === "done").length;
    const err = finalItems.filter((i) => i.status === "error").length;
    if (done > 0 || err > 0) {
      onToast(`Batch xong: ${done} thành công${err ? `, ${err} lỗi` : ""}.`, err === 0);
    }
  }

  function handleStop() {
    setStopRequested(true);
    abortRef.current?.abort();
  }

  function handleReset() {
    setItems([]);
    setRaw("");
    setStopRequested(false);
    abortRef.current = null;
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const errCount = items.filter((i) => i.status === "error").length;
  const total = items.length;

  return (
    <section className="qlb-section qlb-batch-section">
      <header
        className="qlb-section-head qlb-batch-toggle"
        onClick={() => setOpen((v) => !v)}
        style={{ cursor: "pointer" }}
      >
        <div className="qlb-section-title">
          <Layers size={16} className="qlb-accent-icon" />
          <span>Batch Import nhiều URL</span>
          {total > 0 && (
            <span className="qlb-badge">
              {doneCount}/{total}
              {errCount > 0 ? ` · ${errCount} lỗi` : ""}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </header>

      {open && (
        <div className="qlb-batch-body">
          <p className="qlb-batch-hint">
            Dán nhiều URL (mỗi dòng 1 URL). Hệ thống sẽ xử lý tuần tự và tự động lưu vào Supabase — không cần preview thủ công.
          </p>

          <textarea
            className="qlb-batch-textarea"
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setItems([]); }}
            placeholder={"https://example.com/bai-viet-1\nhttps://example.com/bai-viet-2\nhttps://example.com/bai-viet-3"}
            rows={6}
            disabled={running}
          />

          {validUrls.length > 0 && items.length === 0 && (
            <p className="qlb-batch-count">
              <Check size={13} style={{ color: "#059669" }} />
              {validUrls.length} URL hợp lệ — sẵn sàng xử lý
            </p>
          )}

          <div className="qlb-actions">
            {items.length > 0 && !running && (
              <button type="button" className="qlb-btn qlb-btn-ghost" onClick={handleReset}>
                <RefreshCw size={15} />
                <span>Nhập mới</span>
              </button>
            )}
            {running && (
              <button type="button" className="qlb-btn qlb-btn-danger" onClick={handleStop} disabled={stopRequested}>
                {stopRequested ? <Loader2 size={14} className="qlb-spin" /> : <Square size={14} />}
                <span>{stopRequested ? "Đang dừng..." : "Dừng lại"}</span>
              </button>
            )}
            {!running && items.length === 0 && (
              <button
                type="button"
                className="qlb-btn qlb-btn-primary"
                onClick={handleStart}
                disabled={validUrls.length === 0}
              >
                <Wand2 size={16} />
                <span>Bắt đầu import {validUrls.length > 0 ? `(${validUrls.length} bài)` : ""}</span>
              </button>
            )}
          </div>

          {items.length > 0 && (
            <div className="qlb-batch-list">
              {items.map((it, idx) => (
                <div key={it.id} className={`qlb-batch-item qlb-batch-item--${it.status}`}>
                  <span className="qlb-batch-num">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="qlb-batch-icon">
                    {it.status === "pending" && <span className="qlb-batch-dot" />}
                    {(it.status === "importing" || it.status === "saving") && (
                      <Loader2 size={14} className="qlb-spin" />
                    )}
                    {it.status === "done" && <Check size={14} />}
                    {it.status === "error" && <AlertTriangle size={14} />}
                  </span>
                  <div className="qlb-batch-info">
                    <span className="qlb-batch-title">
                      {it.title || it.url.replace(/^https?:\/\//, "").slice(0, 72)}
                    </span>
                    {it.status === "importing" && (
                      <span className="qlb-batch-sub">Đang đọc & viết lại...</span>
                    )}
                    {it.status === "saving" && (
                      <span className="qlb-batch-sub">Đang lưu vào Supabase...</span>
                    )}
                    {it.status === "error" && (
                      <span className="qlb-batch-sub qlb-batch-sub--err">{it.error}</span>
                    )}
                    {it.status === "done" && (
                      <span className="qlb-batch-sub qlb-batch-sub--ok">Đã lưu</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const QLB_CSS = `
  .qlb-root{display:flex;flex-direction:column;gap:20px;padding:4px 0 48px;font-family:'Be Vietnam Pro',system-ui,-apple-system,sans-serif;color:#2d2020}
  .qlb-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:4px 4px 0}
  .qlb-h1{font-size:22px;font-weight:700;margin:0 0 4px;color:#1a1a1a;letter-spacing:-.01em}
  .qlb-sub{font-size:13px;color:#6b5c5c;margin:0;max-width:640px;line-height:1.5}
  .qlb-sub code{background:#fff4ec;padding:1px 6px;border-radius:6px;font-size:12px;color:#c45127}

  .qlb-warn{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;background:#fff4e8;border:1px solid #f8d4a8;color:#a54b0b;font-size:13px}
  .qlb-warn code{background:rgba(255,255,255,.6);padding:1px 6px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px}

  .qlb-section{background:#ffffff;border:1px solid rgba(45,32,32,.08);border-radius:14px;padding:18px 20px;box-shadow:0 6px 18px rgba(45,32,32,.04)}
  .qlb-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
  .qlb-section-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;letter-spacing:-.005em}
  .qlb-section-tools{display:flex;align-items:center;gap:8px}
  .qlb-accent-icon{color:#ee5b9f}
  .qlb-badge{background:#fff4ec;color:#c45127;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:600}

  .qlb-import{display:flex;flex-direction:column;gap:14px}
  .qlb-url-row{display:flex;gap:10px;align-items:stretch}
  .qlb-url-input{flex:1;display:flex;align-items:center;gap:8px;background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:10px;padding:0 12px;transition:all .15s ease}
  .qlb-url-input:focus-within{background:#fff;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qlb-url-input svg{color:#9c8a8a;flex-shrink:0}
  .qlb-url-input input{flex:1;background:none;border:none;outline:none;padding:11px 0;font-size:14px;color:#2d2020;font-family:inherit}
  .qlb-url-input input::placeholder{color:#a89e9e}
  .qlb-search{max-width:280px;flex:0 1 280px}

  .qlb-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;border:1px solid transparent;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .15s ease;white-space:nowrap;font-family:inherit}
  .qlb-btn:disabled{opacity:.6;cursor:not-allowed}
  .qlb-btn-primary{background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;box-shadow:0 4px 12px rgba(238,91,159,.25)}
  .qlb-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(238,91,159,.3)}
  .qlb-btn-ghost{background:#fafafa;color:#5a4a4a;border-color:rgba(45,32,32,.1)}
  .qlb-btn-ghost:hover:not(:disabled){background:#f0ece8;color:#2d2020}
  .qlb-btn-danger{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
  .qlb-btn-danger:hover:not(:disabled){background:#fee2e2}
  .qlb-btn-sm{padding:6px 10px;font-size:12px}
  .qlb-btn-sm2{padding:8px 14px;font-size:13px}

  .qlb-spin{animation:qlb-spin .8s linear infinite}
  @keyframes qlb-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

  .qlb-progress{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:12px 14px;background:#fff8f2;border:1px dashed #f8d4a8;border-radius:10px}
  .qlb-step{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#9c8a8a;font-weight:500}
  .qlb-step.is-active{color:#c45127}
  .qlb-step.is-done{color:#059669}
  .qlb-step-dot{width:16px;height:16px;border-radius:50%;background:#fff;border:1.5px solid currentColor;display:inline-flex;align-items:center;justify-content:center}
  .qlb-progress-label{margin-left:auto;font-size:12.5px;color:#c45127;font-weight:600}

  .qlb-preview{display:flex;flex-direction:column;gap:14px;padding-top:6px}
  .qlb-preview-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  .qlb-preview-title{font-size:15px;font-weight:600;margin:0}
  .qlb-nguon-tag{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#6b5c5c;background:#fafafa;padding:4px 10px;border-radius:100px;border:1px solid rgba(45,32,32,.06);max-width:460px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .qlb-nguon-tag a{color:inherit;text-decoration:none}
  .qlb-nguon-tag a:hover{color:#ee5b9f}

  .qlb-preview-body{display:grid;grid-template-columns:240px 1fr;gap:20px;align-items:start}
  @media (max-width:720px){.qlb-preview-body{grid-template-columns:1fr}}
  .qlb-thumb-wrap{border-radius:10px;overflow:hidden;background:#fafafa;border:1px solid rgba(45,32,32,.06);aspect-ratio:16/9}
  .qlb-thumb{width:100%;height:100%;object-fit:cover;display:block}
  .qlb-thumb-placeholder{aspect-ratio:16/9;border:1px dashed rgba(45,32,32,.15);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#9c8a8a;font-size:12px}

  .qlb-fields{display:flex;flex-direction:column;gap:10px}
  .qlb-field{display:flex;flex-direction:column;gap:4px}
  .qlb-label{font-size:12px;font-weight:600;color:#6b5c5c;letter-spacing:.02em;text-transform:uppercase}
  .qlb-field input{padding:10px 12px;border-radius:8px;border:1px solid rgba(45,32,32,.12);background:#fff;font-size:14px;font-family:inherit;color:#2d2020;transition:all .15s ease}
  .qlb-field input:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qlb-toggle{display:flex;align-items:center;gap:8px;font-size:13px;color:#5a4a4a;cursor:pointer;padding:6px 0;user-select:none}
  .qlb-toggle input{width:16px;height:16px;accent-color:#ee5b9f}

  .qlb-collapsible{background:#fafafa;border:1px solid rgba(45,32,32,.06);border-radius:10px;padding:12px 14px}
  .qlb-collapsible>summary{cursor:pointer;font-size:13px;font-weight:600;color:#5a4a4a;padding:2px 0;user-select:none;list-style:none;display:flex;align-items:center;gap:6px}
  .qlb-collapsible>summary::-webkit-details-marker{display:none}
  .qlb-collapsible>summary::before{content:"▸";font-size:10px;color:#9c8a8a;transition:transform .15s ease}
  .qlb-collapsible[open]>summary::before{transform:rotate(90deg)}
  .qlb-rich{margin-top:10px;padding-top:10px;border-top:1px solid rgba(45,32,32,.06);font-size:14px;line-height:1.65;color:#3d3030}
  .qlb-rich h2{font-size:17px;font-weight:700;margin:14px 0 6px;color:#2d2020}
  .qlb-rich h3{font-size:15px;font-weight:700;margin:12px 0 4px}
  .qlb-rich p{margin:0 0 10px}
  .qlb-rich ul,.qlb-rich ol{margin:0 0 10px;padding-left:22px}
  .qlb-rich li{margin-bottom:4px}
  .qlb-rich img{max-width:100%;height:auto;border-radius:8px;margin:8px 0;display:block}
  .qlb-rich img+p>em,.qlb-rich img+em{display:block;text-align:center;font-size:12px;color:#9c8a8a;margin-top:-4px;margin-bottom:10px;font-style:italic}
  .qlb-rich table{width:100%;border-collapse:collapse;margin:1em 0;font-size:13px;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(45,32,32,.06)}
  .qlb-rich thead{background:linear-gradient(135deg,rgba(248,166,104,.12),rgba(238,91,159,.1))}
  .qlb-rich th{border:1px solid rgba(45,32,32,.1);padding:10px 13px;font-weight:700;text-align:left;vertical-align:top;font-size:12px;letter-spacing:.01em}
  .qlb-rich td{border:1px solid rgba(45,32,32,.07);padding:9px 13px;vertical-align:top;line-height:1.55}
  .qlb-rich tr:nth-child(even) td{background:rgba(250,248,244,.8)}
  .qlb-rich .tip-box{background:linear-gradient(135deg,rgba(253,232,89,.12),rgba(248,166,104,.08));border:1.5px solid rgba(248,166,104,.35);border-left:4px solid #f8a668;border-radius:0 8px 8px 0;padding:11px 14px;margin:1em 0;font-size:13.5px;line-height:1.6}
  .qlb-rich .tip-box strong{color:#2d2020;font-weight:700}
  .qlb-rich a{color:#ee5b9f;text-decoration:underline}
  .qlb-rich strong{color:#2d2020;font-weight:700}

  .qlb-actions{display:flex;justify-content:flex-end;gap:10px;padding-top:6px;border-top:1px solid rgba(45,32,32,.06)}

  .qlb-table-wrap{border:1px solid rgba(45,32,32,.06);border-radius:10px;overflow-x:auto;background:#fff}
  .qlb-table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:780px}
  .qlb-table thead{background:#fafafa}
  .qlb-table th{text-align:left;padding:11px 14px;font-weight:600;color:#6b5c5c;font-size:12px;text-transform:uppercase;letter-spacing:.02em;border-bottom:1px solid rgba(45,32,32,.06)}
  .qlb-table td{padding:12px 14px;border-bottom:1px solid rgba(45,32,32,.04);vertical-align:middle}
  .qlb-table tr:last-child td{border-bottom:none}
  .qlb-table tr:hover td{background:#fffaf3}
  .qlb-col-thumb{width:72px}
  .qlb-col-feat{width:70px;text-align:center}
  .qlb-col-date{width:150px;white-space:nowrap}
  .qlb-col-act{width:240px}
  .qlb-cell-title{font-weight:600;color:#2d2020;line-height:1.4;max-width:340px}
  .qlb-cell-nguon a{color:#5a4a4a;text-decoration:none;font-size:12px}
  .qlb-cell-nguon a:hover{color:#ee5b9f;text-decoration:underline}
  .qlb-cell-date{color:#9c8a8a;font-size:12px}
  .qlb-empty{text-align:center;padding:40px 20px !important;color:#9c8a8a;font-style:italic}

  .qlb-row-thumb{width:48px;height:48px;border-radius:8px;overflow:hidden;background:#fafafa;border:1px solid rgba(45,32,32,.05)}
  .qlb-row-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .qlb-row-thumb-empty{display:flex;align-items:center;justify-content:center;color:#c8bcbc}

  .qlb-star{background:none;border:none;cursor:pointer;padding:6px;border-radius:50%;color:#d4c7c7;display:inline-flex;transition:all .15s ease}
  .qlb-star:hover{background:#fff4ec;color:#f8a668}
  .qlb-star.is-on{color:#ee5b9f}
  .qlb-star.is-on svg{fill:currentColor}

  .qlb-row-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}

  .qlb-pager{display:flex;justify-content:center;align-items:center;gap:16px;padding-top:14px;font-size:13px;color:#6b5c5c}
  .qlb-pager button{background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;font-family:inherit;color:#5a4a4a}
  .qlb-pager button:disabled{opacity:.4;cursor:not-allowed}
  .qlb-pager button:hover:not(:disabled){background:#fff4ec;border-color:#f8a668;color:#c45127}

  .qlb-toast{position:fixed;bottom:24px;right:24px;display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:10px;box-shadow:0 12px 32px rgba(45,32,32,.18);font-size:13.5px;font-weight:500;z-index:220;animation:qlb-toast-in .25s ease}
  .qlb-toast.is-ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
  .qlb-toast.is-err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
  @keyframes qlb-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

  /* ── Modal editor ────────────────────────────────────────── */
  .qlb-modal-backdrop{position:fixed;inset:0;background:rgba(45,32,32,.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;animation:qlb-backdrop-in .18s ease}
  @keyframes qlb-backdrop-in{from{opacity:0}to{opacity:1}}
  .qlb-modal{background:#fff;border-radius:14px;box-shadow:0 24px 72px rgba(45,32,32,.3);width:100%;max-width:1100px;max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden;animation:qlb-modal-in .22s ease}
  @keyframes qlb-modal-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
  .qlb-modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid rgba(45,32,32,.08);background:linear-gradient(180deg,#fffaf5,#fff)}
  .qlb-modal-title{margin:0;font-size:16px;font-weight:700;color:#2d2020;letter-spacing:-.005em}
  .qlb-modal-close{background:none;border:none;cursor:pointer;padding:6px;border-radius:50%;color:#9c8a8a;display:inline-flex;transition:all .15s ease}
  .qlb-modal-close:hover:not(:disabled){background:#fff4ec;color:#c45127}
  .qlb-modal-body{overflow-y:auto;padding:20px 22px;flex:1}
  .qlb-modal-grid{display:grid;grid-template-columns:340px 1fr;gap:24px;align-items:start}
  @media (max-width:960px){.qlb-modal-grid{grid-template-columns:1fr}}
  .qlb-modal-col-left{display:flex;flex-direction:column;gap:14px;position:sticky;top:0}
  .qlb-modal-col-right{display:flex;flex-direction:column;gap:16px;min-width:0}
  .qlb-editor-block{display:flex;flex-direction:column;gap:6px}
  .qlb-modal-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 22px;border-top:1px solid rgba(45,32,32,.08);background:#fafafa}
  .qlb-modal-upload-note{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#c45127}
  .qlb-modal-actions{display:flex;gap:10px}

  /* ── Batch importer ──────────────────────────────────────── */
  .qlb-batch-toggle{cursor:pointer;user-select:none}
  .qlb-batch-toggle:hover .qlb-section-title{color:#ee5b9f}
  .qlb-batch-body{display:flex;flex-direction:column;gap:12px;padding-top:4px}
  .qlb-batch-hint{font-size:13px;color:#6b5c5c;margin:0;line-height:1.5}
  .qlb-batch-textarea{width:100%;border:1px solid rgba(45,32,32,.12);border-radius:10px;padding:12px 14px;font-size:13px;font-family:ui-monospace,SFMono-Regular,monospace;color:#2d2020;background:#fafafa;resize:vertical;outline:none;transition:all .15s ease;line-height:1.7}
  .qlb-batch-textarea:focus{background:#fff;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qlb-batch-textarea:disabled{opacity:.6;cursor:not-allowed}
  .qlb-batch-count{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#059669;margin:0}
  .qlb-batch-list{display:flex;flex-direction:column;gap:2px;border:1px solid rgba(45,32,32,.07);border-radius:10px;overflow:hidden;background:#fff}
  .qlb-batch-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(45,32,32,.04);transition:background .1s}
  .qlb-batch-item:last-child{border-bottom:none}
  .qlb-batch-item--importing,.qlb-batch-item--saving{background:#fffaf2}
  .qlb-batch-item--done{background:#f0fdf4}
  .qlb-batch-item--error{background:#fef2f2}
  .qlb-batch-num{font-size:11px;font-weight:700;color:#9c8a8a;min-width:20px;padding-top:2px;font-family:ui-monospace,monospace}
  .qlb-batch-icon{flex-shrink:0;padding-top:2px;width:16px;display:flex;align-items:center;justify-content:center}
  .qlb-batch-item--done .qlb-batch-icon{color:#059669}
  .qlb-batch-item--error .qlb-batch-icon{color:#b91c1c}
  .qlb-batch-item--importing .qlb-batch-icon,.qlb-batch-item--saving .qlb-batch-icon{color:#c45127}
  .qlb-batch-dot{display:block;width:8px;height:8px;border-radius:50%;background:#d4c7c7;margin:3px auto}
  .qlb-batch-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
  .qlb-batch-title{font-size:13px;font-weight:600;color:#2d2020;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .qlb-batch-item--pending .qlb-batch-title{color:#9c8a8a;font-weight:500}
  .qlb-batch-sub{font-size:11.5px;color:#9c8a8a}
  .qlb-batch-sub--ok{color:#059669;font-weight:600}
  .qlb-batch-sub--err{color:#b91c1c}
`;
