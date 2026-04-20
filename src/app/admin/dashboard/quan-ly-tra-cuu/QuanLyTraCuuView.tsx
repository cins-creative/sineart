"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Code2,
  Edit3,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  ScanLine,
  Search,
  Sparkles,
  Star,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";

import AdminRichTextEditor from "@/app/admin/_components/AdminRichTextEditor";
import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import {
  TRA_CUU_TYPE_OPTIONS,
  slugifyVi,
  type AdminTraCuuFullRow,
  type AdminTraCuuListRow,
  type TruongLookupRow,
} from "@/lib/admin/tra-cuu-schema";

type Props = {
  initialRows: AdminTraCuuListRow[];
  initialTruongs: TruongLookupRow[];
  missingServiceRole?: boolean;
  loadError?: string;
};

type ModalMode =
  | { kind: "create" }
  | { kind: "edit"; id: number; initial: AdminTraCuuFullRow };

const PAGE_SIZE = 20;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function typeLabel(v: string): string {
  return TRA_CUU_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export default function QuanLyTraCuuView({
  initialRows,
  initialTruongs,
  missingServiceRole,
  loadError,
}: Props) {
  const [rows, setRows] = useState<AdminTraCuuListRow[]>(initialRows);
  const [truongs] = useState<TruongLookupRow[]>(initialTruongs);
  const [query, setQuery] = useState("");
  const [fTruong, setFTruong] = useState<number | "">("");
  const [fType, setFType] = useState<string | "">("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [loadingFull, setLoadingFull] = useState<number | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3200);
  };

  const truongNameById = useMemo(() => {
    const m = new Map<number, string>();
    truongs.forEach((t) => m.set(t.id, t.ten));
    return m;
  }, [truongs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (fTruong !== "" && !r.truong_ids.includes(Number(fTruong))) return false;
      if (fType !== "" && !r.type.includes(String(fType))) return false;
      if (!q) return true;
      const hay = `${r.title ?? ""} ${r.excerpt ?? ""} ${r.slug ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, fTruong, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  async function handleDelete(id: number) {
    if (!window.confirm("Xoá bản ghi này khỏi Supabase? Hành động không hoàn tác.")) return;
    try {
      const res = await fetch("/admin/api/tra-cuu-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      notify("Đã xoá bản ghi.", true);
    } catch (err) {
      notify(`Lỗi xoá: ${err instanceof Error ? err.message : String(err)}`, false);
    }
  }

  async function handleToggleFeatured(row: AdminTraCuuListRow) {
    const next = !row.is_featured;
    try {
      const res = await fetch("/admin/api/tra-cuu-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, is_featured: next }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_featured: next } : r)));
    } catch (err) {
      notify(`Lỗi cập nhật: ${err instanceof Error ? err.message : String(err)}`, false);
    }
  }

  async function handleOpenEdit(id: number) {
    setLoadingFull(id);
    try {
      const res = await fetch(`/admin/api/tra-cuu-get?id=${id}`, { method: "GET" });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        data?: AdminTraCuuFullRow;
      };
      if (!res.ok || !json.ok || !json.data) throw new Error(json.error || `HTTP ${res.status}`);
      setModal({ kind: "edit", id, initial: json.data });
    } catch (err) {
      notify(`Lỗi mở bản ghi: ${err instanceof Error ? err.message : String(err)}`, false);
    } finally {
      setLoadingFull(null);
    }
  }

  function handleCreated(row: AdminTraCuuFullRow) {
    setRows((prev) => [toList(row), ...prev]);
  }
  function handleUpdated(row: AdminTraCuuFullRow) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? toList(row) : r)));
  }

  return (
    <div className="qlt-root">
      <style>{QLT_CSS}</style>

      <header className="qlt-header">
        <div>
          <h1 className="qlt-h1">Tra cứu thông tin đại học</h1>
          <p className="qlt-sub">
            Quản lý bài tra cứu: phương thức tuyển sinh, điểm chuẩn, cách tính điểm, chương trình học, kinh nghiệm thi, tỉ lệ chọi.
            Hỗ trợ <strong>đọc ảnh → HTML</strong> tự động bằng Claude để nhập nội dung nhanh.
          </p>
        </div>
      </header>

      {missingServiceRole ? (
        <div className="qlt-warn">
          <AlertTriangle size={16} />
          <span>
            Thiếu <code>SUPABASE_SERVICE_ROLE_KEY</code> — không thể đọc/ghi bảng.
          </span>
        </div>
      ) : null}
      {loadError ? (
        <div className="qlt-warn">
          <AlertTriangle size={16} />
          <span>Lỗi tải danh sách: {loadError}</span>
        </div>
      ) : null}

      <section className="qlt-section">
        <header className="qlt-section-head">
          <div className="qlt-section-title">
            <span>Danh sách bài tra cứu</span>
            <span className="qlt-badge">{filtered.length}</span>
          </div>
          <div className="qlt-section-tools">
            <div className="qlt-input qlt-search">
              <Search size={14} />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tiêu đề / slug / mô tả..."
              />
            </div>
            <select
              className="qlt-select"
              value={fTruong}
              onChange={(e) => {
                setFTruong(e.target.value === "" ? "" : Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="">Tất cả trường</option>
              {truongs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ten}
                </option>
              ))}
            </select>
            <select
              className="qlt-select"
              value={fType}
              onChange={(e) => {
                setFType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả loại</option>
              {TRA_CUU_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="qlt-btn qlt-btn-primary"
              onClick={() => setModal({ kind: "create" })}
            >
              <Plus size={14} />
              <span>Thêm bài</span>
            </button>
          </div>
        </header>

        <div className="qlt-table-wrap">
          <table className="qlt-table">
            <thead>
              <tr>
                <th className="qlt-col-thumb">Ảnh</th>
                <th className="qlt-col-title">Tiêu đề</th>
                <th className="qlt-col-truong">Trường</th>
                <th className="qlt-col-type">Loại</th>
                <th className="qlt-col-nam">Năm</th>
                <th className="qlt-col-feat">Nổi bật</th>
                <th className="qlt-col-date">Đăng</th>
                <th className="qlt-col-act">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="qlt-empty">
                    Chưa có bản ghi nào khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.thumbnail_url ? (
                        <div className="qlt-row-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.thumbnail_url} alt={r.thumbnail_alt ?? r.title ?? ""} />
                        </div>
                      ) : (
                        <div className="qlt-row-thumb qlt-row-thumb-empty">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="qlt-cell-title">
                      <div className="qlt-cell-title-text">{r.title || <em>(không tiêu đề)</em>}</div>
                      {r.slug ? <div className="qlt-cell-slug">/{r.slug}</div> : null}
                    </td>
                    <td>
                      <div className="qlt-chips">
                        {r.truong_ids.length === 0 ? (
                          <span className="qlt-muted">—</span>
                        ) : (
                          r.truong_ids.slice(0, 2).map((id) => (
                            <span className="qlt-chip qlt-chip-truong" key={id}>
                              {truongNameById.get(id) ?? `#${id}`}
                            </span>
                          ))
                        )}
                        {r.truong_ids.length > 2 ? (
                          <span className="qlt-chip qlt-chip-more">+{r.truong_ids.length - 2}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="qlt-chips">
                        {r.type.length === 0 ? (
                          <span className="qlt-muted">—</span>
                        ) : (
                          r.type.slice(0, 2).map((t) => (
                            <span className="qlt-chip qlt-chip-type" key={t}>
                              {typeLabel(t)}
                            </span>
                          ))
                        )}
                        {r.type.length > 2 ? (
                          <span className="qlt-chip qlt-chip-more">+{r.type.length - 2}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="qlt-cell-nam">{r.nam ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className={`qlt-star ${r.is_featured ? "is-on" : ""}`}
                        onClick={() => handleToggleFeatured(r)}
                        title={r.is_featured ? "Bỏ đánh dấu nổi bật" : "Đánh dấu nổi bật"}
                      >
                        <Star size={14} />
                      </button>
                    </td>
                    <td className="qlt-cell-date">{fmtDate(r.published_at)}</td>
                    <td>
                      <div className="qlt-row-actions">
                        <button
                          type="button"
                          className="qlt-btn qlt-btn-ghost qlt-btn-sm"
                          onClick={() => handleOpenEdit(r.id)}
                          disabled={loadingFull === r.id}
                        >
                          {loadingFull === r.id ? (
                            <Loader2 size={13} className="qlt-spin" />
                          ) : (
                            <Edit3 size={13} />
                          )}
                          <span>Sửa</span>
                        </button>
                        {r.slug ? (
                          <a
                            className="qlt-btn qlt-btn-ghost qlt-btn-sm"
                            href={`/tra-cuu-thong-tin/${r.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={13} />
                            <span>Xem</span>
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="qlt-btn qlt-btn-danger qlt-btn-sm"
                          onClick={() => handleDelete(r.id)}
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
          <nav className="qlt-pager" aria-label="Phân trang">
            <button
              type="button"
              disabled={curPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
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
        <TraCuuEditorModal
          mode={modal}
          truongs={truongs}
          onClose={() => setModal(null)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          onToast={notify}
        />
      ) : null}

      {toast ? (
        <div className={`qlt-toast ${toast.ok ? "is-ok" : "is-err"}`}>
          {toast.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span>{toast.msg}</span>
        </div>
      ) : null}
    </div>
  );
}

function toList(r: AdminTraCuuFullRow): AdminTraCuuListRow {
  const { body_html: _body_html, updated_at: _updated_at, ...rest } = r;
  void _body_html;
  void _updated_at;
  return rest;
}

// ──────────────────────────────────────────────────────────────
// TraCuuEditorModal
// ──────────────────────────────────────────────────────────────

type EditorForm = {
  title: string;
  slug: string;
  slugManuallyEdited: boolean;
  thumbnail_url: string;
  thumbnail_alt: string;
  nam: string;
  excerpt: string;
  body_html: string;
  is_featured: boolean;
  published_at: string;
  truong_ids: number[];
  type: string[];
};

function initialForm(mode: ModalMode): EditorForm {
  if (mode.kind === "create") {
    return {
      title: "",
      slug: "",
      slugManuallyEdited: false,
      thumbnail_url: "",
      thumbnail_alt: "",
      nam: "",
      excerpt: "",
      body_html: "",
      is_featured: false,
      published_at: "",
      truong_ids: [],
      type: [],
    };
  }
  const v = mode.initial;
  return {
    title: v.title ?? "",
    slug: v.slug ?? "",
    slugManuallyEdited: true,
    thumbnail_url: v.thumbnail_url ?? "",
    thumbnail_alt: v.thumbnail_alt ?? "",
    nam: v.nam != null ? String(v.nam) : "",
    excerpt: v.excerpt ?? "",
    body_html: v.body_html ?? "",
    is_featured: !!v.is_featured,
    published_at: v.published_at ?? "",
    truong_ids: [...v.truong_ids],
    type: [...v.type],
  };
}

function TraCuuEditorModal({
  mode,
  truongs,
  onClose,
  onCreated,
  onUpdated,
  onToast,
}: {
  mode: ModalMode;
  truongs: TruongLookupRow[];
  onClose: () => void;
  onCreated: (row: AdminTraCuuFullRow) => void;
  onUpdated: (row: AdminTraCuuFullRow) => void;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [form, setForm] = useState<EditorForm>(() => initialForm(mode));
  const [saving, setSaving] = useState(false);
  const [uploadingAny, setUploadingAny] = useState(false);
  /** "rich" = Tiptap editor | "html" = raw HTML textarea | "preview" = rendered preview */
  const [contentMode, setContentMode] = useState<"rich" | "html" | "preview">("rich");

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

  function update<K extends keyof EditorForm>(key: K, value: EditorForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onTitleChange(v: string) {
    setForm((prev) => ({
      ...prev,
      title: v,
      slug: prev.slugManuallyEdited ? prev.slug : slugifyVi(v),
    }));
  }

  function toggleTruong(id: number) {
    setForm((prev) => ({
      ...prev,
      truong_ids: prev.truong_ids.includes(id)
        ? prev.truong_ids.filter((x) => x !== id)
        : [...prev.truong_ids, id],
    }));
  }

  function toggleType(v: string) {
    setForm((prev) => ({
      ...prev,
      type: prev.type.includes(v) ? prev.type.filter((x) => x !== v) : [...prev.type, v],
    }));
  }

  function appendHtmlToContent(html: string) {
    setForm((prev) => {
      const sep = prev.body_html.trim() ? "\n\n" : "";
      return { ...prev, body_html: `${prev.body_html}${sep}${html}` };
    });
    // Claude tạo HTML có inline style → phải dùng raw textarea thay vì Tiptap
    setContentMode("html");
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
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugifyVi(form.title),
        thumbnail_url: form.thumbnail_url.trim() || null,
        thumbnail_alt: form.thumbnail_alt.trim() || form.title.trim(),
        nam: form.nam.trim() ? Number(form.nam) : null,
        excerpt: form.excerpt.trim() || null,
        body_html: form.body_html.trim() || null,
        is_featured: form.is_featured,
        published_at: form.published_at.trim() || null,
        truong_ids: form.truong_ids,
        type: form.type,
      };

      const url =
        mode.kind === "create" ? "/admin/api/tra-cuu-save" : "/admin/api/tra-cuu-update";
      const body = mode.kind === "create" ? payload : { id: mode.id, ...payload };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        row?: AdminTraCuuFullRow;
      };
      if (!res.ok || !json.ok || !json.row) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      if (mode.kind === "create") {
        onCreated(json.row);
        onToast("Đã tạo bản ghi mới.", true);
      } else {
        onUpdated(json.row);
        onToast("Đã cập nhật bản ghi.", true);
      }
      onClose();
    } catch (err) {
      onToast(`Lỗi lưu: ${err instanceof Error ? err.message : String(err)}`, false);
    } finally {
      setSaving(false);
    }
  }

  const titleText =
    mode.kind === "create" ? "Tạo bài tra cứu mới" : `Sửa bài tra cứu #${mode.id}`;

  return (
    <div className="qlt-modal-backdrop" onClick={saving ? undefined : onClose}>
      <div
        className="qlt-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={titleText}
      >
        <header className="qlt-modal-head">
          <h3 className="qlt-modal-title">{titleText}</h3>
          <button
            type="button"
            className="qlt-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="qlt-modal-body">
          <div className="qlt-modal-grid">
            {/* CỘT TRÁI — metadata */}
            <div className="qlt-modal-col-left">
              <AdminCfImageInput
                label="Ảnh thumbnail"
                value={form.thumbnail_url}
                onValueChange={(url) => update("thumbnail_url", url)}
                preview="banner"
              />

              <label className="qlt-field">
                <span className="qlt-label">Tiêu đề *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  disabled={saving}
                  placeholder="VD: Phương thức tuyển sinh ĐH Kiến trúc TP.HCM 2026"
                />
              </label>

              <label className="qlt-field">
                <span className="qlt-label">Slug</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: e.target.value,
                      slugManuallyEdited: true,
                    }))
                  }
                  disabled={saving}
                  placeholder="se-tu-sinh-tu-tieu-de"
                />
                <span className="qlt-hint">
                  URL sẽ là <code>/tra-cuu-thong-tin/{form.slug || "…"}</code>
                </span>
              </label>

              <label className="qlt-field">
                <span className="qlt-label">Image alt (SEO)</span>
                <input
                  type="text"
                  value={form.thumbnail_alt}
                  onChange={(e) => update("thumbnail_alt", e.target.value)}
                  disabled={saving}
                  placeholder="Mô tả ngắn gọn ảnh thumbnail"
                />
              </label>

              <div className="qlt-field-row">
                <label className="qlt-field">
                  <span className="qlt-label">Năm</span>
                  <input
                    type="number"
                    value={form.nam}
                    onChange={(e) => update("nam", e.target.value)}
                    disabled={saving}
                    placeholder="2026"
                  />
                </label>

                <label className="qlt-field">
                  <span className="qlt-label">Ngày đăng</span>
                  <div className="qlt-input">
                    <Calendar size={14} />
                    <input
                      type="datetime-local"
                      value={toInputDateTime(form.published_at)}
                      onChange={(e) =>
                        update("published_at", fromInputDateTime(e.target.value))
                      }
                      disabled={saving}
                    />
                  </div>
                </label>
              </div>

              <label className="qlt-field">
                <span className="qlt-label">Mô tả ngắn (excerpt)</span>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => update("excerpt", e.target.value)}
                  disabled={saving}
                  placeholder="Đoạn tóm lược hiển thị trong card listing (150–200 ký tự)."
                  rows={3}
                />
              </label>

              <fieldset className="qlt-fieldset">
                <legend className="qlt-label">Trường</legend>
                <TruongMultiSelect
                  options={truongs}
                  value={form.truong_ids}
                  onToggle={toggleTruong}
                  onClear={() => update("truong_ids", [])}
                  disabled={saving}
                />
              </fieldset>

              <fieldset className="qlt-fieldset">
                <legend className="qlt-label">Loại thông tin</legend>
                <div className="qlt-chip-picker">
                  {TRA_CUU_TYPE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={`qlt-chip-btn qlt-chip-btn-type ${
                        form.type.includes(o.value) ? "is-on" : ""
                      }`}
                      onClick={() => toggleType(o.value)}
                      disabled={saving}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="qlt-toggle">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => update("is_featured", e.target.checked)}
                  disabled={saving}
                />
                <span>Đánh dấu là bài nổi bật (Featured)</span>
              </label>
            </div>

            {/* CỘT PHẢI — content + image→HTML */}
            <div className="qlt-modal-col-right">
              <ImageToHtmlPanel
                disabled={saving}
                onInsertHtml={(html) => appendHtmlToContent(html)}
                onToast={onToast}
              />

              <div className="qlt-editor-block">
                {/* Mode tabs: Rich | HTML | Preview */}
                <div className="qlt-editor-head">
                  <span className="qlt-label">Nội dung bài tra cứu</span>
                  <div className="qlt-mode-tabs">
                    <button type="button" className={`qlt-mode-tab ${contentMode === "rich" ? "is-active" : ""}`} onClick={() => setContentMode("rich")} title="Rich text (Tiptap)">
                      <Type size={13} /><span>Rich</span>
                    </button>
                    <button type="button" className={`qlt-mode-tab ${contentMode === "html" ? "is-active" : ""}`} onClick={() => setContentMode("html")} title="HTML thô — giữ nguyên inline style">
                      <Code2 size={13} /><span>HTML</span>
                    </button>
                    <button type="button" className={`qlt-mode-tab ${contentMode === "preview" ? "is-active" : ""}`} onClick={() => setContentMode("preview")} title="Xem trước">
                      <Eye size={13} /><span>Preview</span>
                    </button>
                  </div>
                </div>

                {contentMode === "rich" ? (
                  <>
                    <p className="qlt-hint" style={{ marginBottom: 6 }}>
                      Tiptap sẽ strip inline style — dùng tab <strong>HTML</strong> để giữ design từ Claude.
                    </p>
                    <AdminRichTextEditor
                      value={form.body_html}
                      onChange={(html) => update("body_html", html)}
                      onUploadChange={setUploadingAny}
                      placeholder="Gõ thủ công — hoặc dùng Thiết kế lại ảnh rồi chuyển tab HTML."
                      minHeight="420px"
                      maxHeight="640px"
                    />
                  </>
                ) : contentMode === "html" ? (
                  <>
                    <p className="qlt-hint" style={{ marginBottom: 6 }}>
                      Chỉnh sửa HTML trực tiếp. Inline <code>style=</code> được giữ nguyên khi lưu.
                    </p>
                    <textarea
                      className="qlt-html-textarea"
                      value={form.body_html}
                      onChange={(e) => update("body_html", e.target.value)}
                      disabled={saving}
                      spellCheck={false}
                      placeholder="HTML từ Claude sẽ xuất hiện ở đây..."
                    />
                  </>
                ) : (
                  <div className="qlt-preview-wrap">
                    {form.body_html.trim() ? (
                      <div className="qlt-preview-body" dangerouslySetInnerHTML={{ __html: form.body_html }} />
                    ) : (
                      <div className="qlt-preview-empty">
                        <Eye size={32} style={{ opacity: 0.25, marginBottom: 8 }} />
                        <p>Chưa có nội dung để xem trước.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="qlt-modal-foot">
          {uploadingAny ? (
            <span className="qlt-modal-upload-note">
              <Loader2 size={13} className="qlt-spin" />
              <span>Ảnh đang upload lên Cloudflare...</span>
            </span>
          ) : (
            <span />
          )}
          <div className="qlt-modal-actions">
            <button
              type="button"
              className="qlt-btn qlt-btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="qlt-btn qlt-btn-primary"
              onClick={handleSubmit}
              disabled={saving || uploadingAny}
            >
              {saving ? <Loader2 size={16} className="qlt-spin" /> : <Save size={16} />}
              <span>
                {saving ? "Đang lưu..." : mode.kind === "create" ? "Tạo bài" : "Lưu thay đổi"}
              </span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// TruongMultiSelect — dropdown đa chọn có search
// ──────────────────────────────────────────────────────────────

function TruongMultiSelect({
  options,
  value,
  onToggle,
  onClear,
  disabled,
}: {
  options: TruongLookupRow[];
  value: number[];
  onToggle: (id: number) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.ten.toLowerCase().includes(q));
  }, [options, query]);

  const selectedNames = useMemo(() => {
    const map = new Map(options.map((o) => [o.id, o.ten]));
    return value.map((id) => map.get(id)).filter((v): v is string => !!v);
  }, [options, value]);

  if (options.length === 0) {
    return <span className="qlt-muted">Chưa có dữ liệu trường trong DB.</span>;
  }

  return (
    <div className={`qlt-ms ${open ? "is-open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="qlt-ms-trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="qlt-ms-trigger-label">
          {value.length === 0 ? (
            <span className="qlt-ms-placeholder">Chọn trường…</span>
          ) : (
            <>
              <span className="qlt-ms-count">{value.length}</span>
              <span className="qlt-ms-names">{selectedNames.join(", ")}</span>
            </>
          )}
        </span>
        <ChevronDown size={16} className="qlt-ms-caret" />
      </button>

      {value.length > 0 ? (
        <div className="qlt-ms-chips">
          {selectedNames.map((ten, i) => (
            <span key={value[i]} className="qlt-ms-chip">
              {ten}
              <button
                type="button"
                className="qlt-ms-chip-x"
                onClick={() => onToggle(value[i]!)}
                disabled={disabled}
                aria-label={`Bỏ chọn ${ten}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="qlt-ms-clear"
            onClick={onClear}
            disabled={disabled}
          >
            Xoá hết
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="qlt-ms-panel" role="listbox">
          <div className="qlt-ms-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm trường…"
              autoFocus
            />
          </div>
          <div className="qlt-ms-list">
            {filtered.length === 0 ? (
              <div className="qlt-ms-empty">Không có kết quả.</div>
            ) : (
              filtered.map((t) => {
                const checked = value.includes(t.id);
                return (
                  <label key={t.id} className={`qlt-ms-item ${checked ? "is-on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(t.id)}
                      disabled={disabled}
                    />
                    <span className="qlt-ms-box" aria-hidden="true">
                      {checked ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                    <span className="qlt-ms-name">{t.ten}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// ImageToHtmlPanel — tính năng đọc ảnh → HTML
// ──────────────────────────────────────────────────────────────

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

function ImageToHtmlPanel({
  disabled,
  onInsertHtml,
  onToast,
}: {
  disabled?: boolean;
  onInsertHtml: (html: string) => void;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [note, setNote] = useState("");
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;
    const merged = [...images];
    for (const f of incoming) {
      if (merged.length >= 8) break;
      if (f.size > 8 * 1024 * 1024) {
        onToast(`Ảnh "${f.name}" quá lớn (> 8MB) — bỏ qua.`, false);
        continue;
      }
      merged.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
      });
    }
    setImages(merged);
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f && f.type.startsWith("image/")) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled || running) return;
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  async function handleRun() {
    if (!images.length) {
      onToast("Chưa chọn ảnh nào.", false);
      return;
    }
    setRunning(true);
    try {
      const payload = await Promise.all(
        images.map(async (img) => ({
          mediaType: img.file.type,
          base64: await fileToBase64(img.file),
        })),
      );
      const res = await fetch("/admin/api/tra-cuu-image-to-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: payload, note: note.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        html?: string;
      };
      if (!res.ok || !json.ok || !json.html) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      onInsertHtml(json.html);
      onToast(`Đã thiết kế lại từ ${images.length} ảnh — HTML đã chèn vào nội dung.`, true);
      // reset
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setImages([]);
      setNote("");
      setOpen(false);
    } catch (err) {
      onToast(`Lỗi đọc ảnh: ${err instanceof Error ? err.message : String(err)}`, false);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="qlt-i2h">
      <header className="qlt-i2h-head" onClick={() => !disabled && setOpen((v) => !v)}>
          <div className="qlt-i2h-title">
          <Sparkles size={15} />
          <span>Đọc &amp; thiết kế lại ảnh → HTML (Claude)</span>
        </div>
        <span className="qlt-i2h-toggle">{open ? "Thu gọn" : "Mở"}</span>
      </header>

      {open ? (
        <div
          className={`qlt-i2h-body ${running ? "is-running" : ""}`}
          onPaste={onPaste}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <p className="qlt-i2h-desc">
            Kéo/thả ảnh (hoặc dán từ clipboard) các screenshot về tuyển sinh — Claude sẽ
            <strong> đọc toàn bộ nội dung và thiết kế lại</strong> thành HTML đẹp
            (bảng điểm có style, badge highlight số liệu, card phương thức, info box...)
            theo đúng brand màu Sine Art, rồi chèn vào ô nội dung bên dưới.
            Tối đa 8 ảnh/lượt, mỗi ảnh ≤ 8MB.
          </p>

          <div className="qlt-i2h-grid">
            <button
              type="button"
              className="qlt-i2h-drop"
              onClick={() => fileRef.current?.click()}
              disabled={disabled || running}
            >
              <Upload size={20} />
              <span>
                <strong>Chọn ảnh</strong> hoặc kéo thả / paste vào đây
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </button>

            {images.length > 0 ? (
              <div className="qlt-i2h-thumbs">
                {images.map((img, idx) => (
                  <div key={img.id} className="qlt-i2h-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.previewUrl} alt={`preview-${idx + 1}`} />
                    <button
                      type="button"
                      className="qlt-i2h-thumb-del"
                      onClick={() => removeImage(img.id)}
                      disabled={running}
                      aria-label="Xoá ảnh"
                    >
                      <X size={12} />
                    </button>
                    <span className="qlt-i2h-thumb-idx">{idx + 1}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <label className="qlt-field">
            <span className="qlt-label">Ghi chú cho AI (tuỳ chọn)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={running}
              rows={2}
              placeholder="VD: Đây là điểm chuẩn ĐH Kiến trúc TP.HCM năm 2024, ngành Thiết kế đồ hoạ."
            />
          </label>

          <div className="qlt-i2h-actions">
            <span className="qlt-i2h-count">
              {images.length}/8 ảnh đã chọn
            </span>
            <button
              type="button"
              className="qlt-btn qlt-btn-primary"
              onClick={handleRun}
              disabled={running || images.length === 0 || disabled}
            >
              {running ? <Loader2 size={15} className="qlt-spin" /> : <ScanLine size={15} />}
              <span>{running ? "Đang phân tích & thiết kế..." : "Thiết kế lại & chèn vào nội dung"}</span>
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được file."));
    reader.readAsDataURL(file);
  });
}

function toInputDateTime(iso: string | null | ""): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromInputDateTime(v: string): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString();
}

// ──────────────────────────────────────────────────────────────
// CSS
// ──────────────────────────────────────────────────────────────

const QLT_CSS = `
  .qlt-root{display:flex;flex-direction:column;gap:20px;padding:4px 0 48px;font-family:'Be Vietnam Pro',system-ui,-apple-system,sans-serif;color:#2d2020}
  .qlt-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:4px 4px 0}
  .qlt-h1{font-size:22px;font-weight:700;margin:0 0 4px;color:#1a1a1a;letter-spacing:-.01em}
  .qlt-sub{font-size:13px;color:#6b5c5c;margin:0;max-width:720px;line-height:1.55}
  .qlt-sub code{background:#fff4ec;padding:1px 6px;border-radius:6px;font-size:12px;color:#c45127}
  .qlt-sub strong{color:#c45127}

  .qlt-warn{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;background:#fff4e8;border:1px solid #f8d4a8;color:#a54b0b;font-size:13px}
  .qlt-warn code{background:rgba(255,255,255,.6);padding:1px 6px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px}

  .qlt-section{background:#fff;border:1px solid rgba(45,32,32,.08);border-radius:14px;padding:18px 20px;box-shadow:0 6px 18px rgba(45,32,32,.04)}
  .qlt-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
  .qlt-section-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600}
  .qlt-section-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .qlt-badge{background:#fff4ec;color:#c45127;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:600}

  .qlt-input{display:flex;align-items:center;gap:8px;background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:10px;padding:0 12px;transition:all .15s ease}
  .qlt-input:focus-within{background:#fff;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qlt-input svg{color:#9c8a8a;flex-shrink:0}
  .qlt-input input{flex:1;background:none;border:none;outline:none;padding:9px 0;font-size:14px;color:#2d2020;font-family:inherit}
  .qlt-input input::placeholder{color:#a89e9e}
  .qlt-search{width:260px;flex:0 0 260px}

  .qlt-select{padding:9px 12px;border-radius:10px;border:1px solid rgba(45,32,32,.1);background:#fafafa;font-size:13.5px;color:#2d2020;cursor:pointer;font-family:inherit;outline:none;transition:all .15s ease;max-width:200px}
  .qlt-select:focus{background:#fff;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}

  .qlt-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:10px;border:1px solid transparent;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .15s ease;white-space:nowrap;font-family:inherit}
  .qlt-btn:disabled{opacity:.6;cursor:not-allowed}
  .qlt-btn-primary{background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;box-shadow:0 4px 12px rgba(238,91,159,.25)}
  .qlt-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(238,91,159,.3)}
  .qlt-btn-ghost{background:#fafafa;color:#5a4a4a;border-color:rgba(45,32,32,.1)}
  .qlt-btn-ghost:hover:not(:disabled){background:#f0ece8;color:#2d2020}
  .qlt-btn-danger{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
  .qlt-btn-danger:hover:not(:disabled){background:#fee2e2}
  .qlt-btn-sm{padding:6px 10px;font-size:12px}

  .qlt-spin{animation:qlt-spin .8s linear infinite}
  @keyframes qlt-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

  .qlt-table-wrap{overflow-x:auto;margin:0 -4px}
  .qlt-table{width:100%;border-collapse:collapse;font-size:13px}
  .qlt-table thead th{text-align:left;padding:10px 12px;background:#fafafa;border-bottom:1px solid rgba(45,32,32,.08);color:#6b5c5c;font-weight:600;font-size:12px;letter-spacing:.02em;text-transform:uppercase}
  .qlt-table tbody td{padding:12px;border-bottom:1px solid rgba(45,32,32,.06);vertical-align:middle}
  .qlt-table tbody tr:hover{background:#fff9f2}
  .qlt-col-thumb{width:72px}
  .qlt-col-truong{width:200px}
  .qlt-col-type{width:200px}
  .qlt-col-nam{width:64px;text-align:center}
  .qlt-col-feat{width:70px;text-align:center}
  .qlt-col-date{width:110px}
  .qlt-col-act{width:220px}
  .qlt-empty{text-align:center;padding:36px 12px!important;color:#9c8a8a;font-style:italic}

  .qlt-row-thumb{width:56px;height:56px;border-radius:8px;overflow:hidden;background:#fafafa;border:1px solid rgba(45,32,32,.06)}
  .qlt-row-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .qlt-row-thumb-empty{display:flex;align-items:center;justify-content:center;color:#c0b5b5}

  .qlt-cell-title{max-width:320px}
  .qlt-cell-title-text{font-weight:600;color:#2d2020;line-height:1.35}
  .qlt-cell-slug{font-size:11px;color:#9c8a8a;margin-top:2px;font-family:ui-monospace,SFMono-Regular,monospace}
  .qlt-cell-nam{text-align:center;font-weight:600;color:#5a4a4a}
  .qlt-cell-date{font-size:12px;color:#6b5c5c;white-space:nowrap}
  .qlt-muted{color:#b8adad;font-size:12px}

  .qlt-chips{display:flex;flex-wrap:wrap;gap:4px}
  .qlt-chip{display:inline-flex;align-items:center;padding:3px 8px;border-radius:100px;font-size:11px;font-weight:600;line-height:1.4}
  .qlt-chip-truong{background:rgba(187,137,248,.14);color:#7c47d0}
  .qlt-chip-type{background:rgba(248,166,104,.16);color:#c45127}
  .qlt-chip-more{background:#f0ece8;color:#6b5c5c}

  .qlt-star{width:28px;height:28px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#c0b5b5;transition:all .15s ease;margin:0 auto}
  .qlt-star:hover{background:#fff4ec;color:#ee5b9f}
  .qlt-star.is-on{color:#ee5b9f;background:#ffe7f1}
  .qlt-star.is-on svg{fill:currentColor}

  .qlt-row-actions{display:flex;gap:6px;flex-wrap:wrap}
  .qlt-pager{display:flex;justify-content:center;align-items:center;gap:14px;margin-top:16px;font-size:13px;color:#6b5c5c}
  .qlt-pager button{padding:6px 12px;border-radius:8px;border:1px solid rgba(45,32,32,.1);background:#fafafa;cursor:pointer;font-family:inherit;color:#5a4a4a;transition:all .15s ease}
  .qlt-pager button:hover:not(:disabled){background:#f0ece8}
  .qlt-pager button:disabled{opacity:.4;cursor:not-allowed}

  /* ─── Modal ─── */
  .qlt-modal-backdrop{position:fixed;inset:0;background:rgba(20,12,12,.45);backdrop-filter:blur(4px);z-index:60;display:flex;align-items:center;justify-content:center;padding:20px}
  .qlt-modal{background:#fff;border-radius:16px;width:100%;max-width:1180px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(20,12,12,.3);overflow:hidden}
  .qlt-modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid rgba(45,32,32,.08);background:#fafafa}
  .qlt-modal-title{font-size:16px;font-weight:700;margin:0;color:#1a1a1a;letter-spacing:-.005em}
  .qlt-modal-close{width:32px;height:32px;border:none;background:transparent;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6b5c5c;transition:all .15s ease}
  .qlt-modal-close:hover:not(:disabled){background:#f0ece8;color:#2d2020}
  .qlt-modal-body{flex:1;overflow-y:auto;padding:20px 22px}
  .qlt-modal-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 22px;border-top:1px solid rgba(45,32,32,.08);background:#fafafa}
  .qlt-modal-upload-note{display:flex;align-items:center;gap:6px;color:#c45127;font-size:12.5px;font-weight:500}
  .qlt-modal-actions{display:flex;gap:10px}

  .qlt-modal-grid{display:grid;grid-template-columns:minmax(320px,420px) 1fr;gap:24px}
  @media (max-width:980px){.qlt-modal-grid{grid-template-columns:1fr}}
  .qlt-modal-col-left,.qlt-modal-col-right{display:flex;flex-direction:column;gap:14px}

  .qlt-field{display:flex;flex-direction:column;gap:5px}
  .qlt-field input,.qlt-field textarea{padding:10px 12px;border-radius:8px;border:1px solid rgba(45,32,32,.12);background:#fff;font-size:14px;font-family:inherit;color:#2d2020;transition:all .15s ease;resize:vertical}
  .qlt-field input:focus,.qlt-field textarea:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qlt-field .qlt-input input{padding:9px 0}
  .qlt-field-row{display:grid;grid-template-columns:120px 1fr;gap:10px}
  @media (max-width:520px){.qlt-field-row{grid-template-columns:1fr}}
  .qlt-label{font-size:12px;font-weight:600;color:#6b5c5c;letter-spacing:.02em;text-transform:uppercase}
  .qlt-hint{font-size:11.5px;color:#9c8a8a;line-height:1.4}
  .qlt-hint code{background:#fff4ec;padding:1px 6px;border-radius:6px;font-size:11px;color:#c45127;font-family:ui-monospace,SFMono-Regular,monospace}

  .qlt-toggle{display:flex;align-items:center;gap:8px;font-size:13px;color:#5a4a4a;cursor:pointer;padding:4px 0;user-select:none}
  .qlt-toggle input{width:16px;height:16px;accent-color:#ee5b9f}

  .qlt-fieldset{border:1px solid rgba(45,32,32,.08);border-radius:10px;padding:10px 12px 12px;margin:0;background:#fafafa}
  .qlt-fieldset legend{padding:0 6px}
  .qlt-chip-picker{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .qlt-chip-btn{padding:5px 12px;border-radius:100px;font-size:12px;font-weight:600;border:1px solid rgba(45,32,32,.12);background:#fff;color:#6b5c5c;cursor:pointer;transition:all .12s ease;font-family:inherit}
  .qlt-chip-btn:hover:not(:disabled){border-color:rgba(238,91,159,.4);color:#c45127}
  .qlt-chip-btn.is-on{background:linear-gradient(135deg,#f8a668,#ee5b9f);border-color:transparent;color:#fff;box-shadow:0 2px 8px rgba(238,91,159,.25)}
  .qlt-chip-btn-type.is-on{background:linear-gradient(135deg,#bb89f8,#7c47d0)}
  .qlt-chip-btn:disabled{opacity:.6;cursor:not-allowed}

  /* ─── TruongMultiSelect — dropdown đa chọn ─── */
  .qlt-ms{position:relative;margin-top:6px}
  .qlt-ms-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:9px 12px;background:#fff;border:1px solid rgba(45,32,32,.14);border-radius:10px;font-size:13px;color:#2d2020;cursor:pointer;font-family:inherit;transition:all .15s ease;text-align:left}
  .qlt-ms-trigger:hover:not(:disabled){border-color:rgba(238,91,159,.4)}
  .qlt-ms-trigger:focus-visible{outline:none;border-color:#ee5b9f;box-shadow:0 0 0 3px rgba(238,91,159,.15)}
  .qlt-ms-trigger:disabled{opacity:.6;cursor:not-allowed}
  .qlt-ms.is-open .qlt-ms-trigger{border-color:#ee5b9f;box-shadow:0 0 0 3px rgba(238,91,159,.12)}
  .qlt-ms-trigger-label{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
  .qlt-ms-placeholder{color:#9c8a8a;font-weight:500}
  .qlt-ms-count{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;border-radius:100px;background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;font-size:11px;font-weight:800}
  .qlt-ms-names{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6b5c5c;font-size:12.5px}
  .qlt-ms-caret{color:#9c8a8a;flex-shrink:0;transition:transform .18s ease}
  .qlt-ms.is-open .qlt-ms-caret{transform:rotate(180deg);color:#ee5b9f}

  .qlt-ms-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}
  .qlt-ms-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 11px;background:linear-gradient(135deg,rgba(248,166,104,.14),rgba(238,91,159,.12));border:1px solid rgba(238,91,159,.28);border-radius:100px;font-size:11.5px;font-weight:700;color:#a4336b}
  .qlt-ms-chip-x{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:none;border-radius:50%;background:rgba(164,51,107,.18);color:#a4336b;cursor:pointer;padding:0;transition:all .12s ease}
  .qlt-ms-chip-x:hover:not(:disabled){background:#a4336b;color:#fff}
  .qlt-ms-chip-x:disabled{opacity:.5;cursor:not-allowed}
  .qlt-ms-clear{margin-left:auto;padding:3px 10px;background:transparent;border:none;font-size:11.5px;font-weight:600;color:#9c8a8a;cursor:pointer;font-family:inherit;text-decoration:underline;text-underline-offset:2px}
  .qlt-ms-clear:hover:not(:disabled){color:#d63384}

  .qlt-ms-panel{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:20;background:#fff;border:1px solid rgba(45,32,32,.1);border-radius:10px;box-shadow:0 10px 32px -8px rgba(45,32,32,.22);overflow:hidden;display:flex;flex-direction:column;max-height:340px}
  .qlt-ms-search{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid rgba(45,32,32,.06);background:#fafafa;color:#9c8a8a}
  .qlt-ms-search input{flex:1;border:none;outline:none;background:transparent;font-size:13px;color:#2d2020;font-family:inherit}
  .qlt-ms-search input::placeholder{color:#c0b5b5}
  .qlt-ms-list{flex:1;overflow-y:auto;padding:4px}
  .qlt-ms-empty{padding:16px;text-align:center;font-size:12.5px;color:#9c8a8a}
  .qlt-ms-item{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:7px;cursor:pointer;transition:background .1s ease}
  .qlt-ms-item:hover{background:rgba(238,91,159,.06)}
  .qlt-ms-item.is-on{background:rgba(238,91,159,.09)}
  .qlt-ms-item input{position:absolute;opacity:0;pointer-events:none}
  .qlt-ms-box{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:1.5px solid rgba(45,32,32,.25);border-radius:4px;background:#fff;color:#fff;flex-shrink:0;transition:all .12s ease}
  .qlt-ms-item.is-on .qlt-ms-box{background:linear-gradient(135deg,#f8a668,#ee5b9f);border-color:transparent}
  .qlt-ms-name{font-size:13px;color:#2d2020;line-height:1.3}
  .qlt-ms-item.is-on .qlt-ms-name{font-weight:600}

  .qlt-editor-block{display:flex;flex-direction:column;gap:6px}
  .qlt-editor-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}

  /* ─── Mode tabs (Rich / HTML / Preview) ─── */
  .qlt-mode-tabs{display:flex;gap:3px;background:#f0ece8;border-radius:8px;padding:3px}
  .qlt-mode-tab{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:none;border-radius:6px;background:transparent;font-size:12px;font-weight:600;color:#6b5c5c;cursor:pointer;transition:all .15s ease;font-family:inherit}
  .qlt-mode-tab:hover{background:rgba(255,255,255,.7);color:#2d2020}
  .qlt-mode-tab.is-active{background:#fff;color:#2d2020;box-shadow:0 1px 4px rgba(45,32,32,.12)}
  .qlt-mode-tab.is-active svg{color:#ee5b9f}

  /* ─── Raw HTML textarea ─── */
  .qlt-html-textarea{width:100%;min-height:420px;max-height:640px;padding:14px;border:1px solid rgba(45,32,32,.12);border-radius:10px;background:#1a1a2e;color:#e2e8f0;font-family:ui-monospace,SFMono-Regular,'Fira Code',monospace;font-size:12.5px;line-height:1.7;resize:vertical;outline:none;transition:border-color .15s ease;overflow-y:auto}
  .qlt-html-textarea:focus{border-color:#bb89f8;box-shadow:0 0 0 3px rgba(187,137,248,.15)}
  .qlt-html-textarea::placeholder{color:#4a5568}
  .qlt-html-textarea:disabled{opacity:.6;cursor:not-allowed}

  /* ─── Preview panel ─── */
  .qlt-preview-wrap{min-height:420px;max-height:640px;overflow-y:auto;border:1px solid rgba(45,32,32,.08);border-radius:10px;background:#fff;padding:20px 24px}
  .qlt-preview-body{font-family:'Quicksand',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:#2d2020}
  .qlt-preview-body h2{font-size:20px;font-weight:800;margin:0 0 12px;color:#1a1a1a}
  .qlt-preview-body h3{font-size:17px;font-weight:700;margin:16px 0 8px;color:#1a1a1a}
  .qlt-preview-body p{margin:0 0 12px}
  .qlt-preview-body table{width:100%;border-collapse:collapse;margin:12px 0}
  .qlt-preview-body th,.qlt-preview-body td{padding:10px 14px;border:1px solid rgba(45,32,32,.08)}
  .qlt-preview-body ul,.qlt-preview-body ol{margin:8px 0;padding-left:20px}
  .qlt-preview-body li{margin-bottom:4px}
  .qlt-preview-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:360px;color:#9c8a8a;font-size:13px;gap:4px}


  .qlt-i2h{border:1px solid rgba(187,137,248,.25);border-radius:12px;background:linear-gradient(180deg,#faf5ff,#ffffff);overflow:hidden}
  .qlt-i2h-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;cursor:pointer;user-select:none}
  .qlt-i2h-head:hover{background:rgba(187,137,248,.06)}
  .qlt-i2h-title{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:700;color:#7c47d0}
  .qlt-i2h-toggle{font-size:12px;color:#7c47d0;font-weight:600}
  .qlt-i2h-body{padding:4px 14px 14px;display:flex;flex-direction:column;gap:12px;border-top:1px dashed rgba(187,137,248,.25)}
  .qlt-i2h-body.is-running{opacity:.8;pointer-events:none}
  .qlt-i2h-desc{margin:8px 0 0;font-size:12.5px;color:#6b5c5c;line-height:1.5}
  .qlt-i2h-grid{display:flex;flex-direction:column;gap:10px}
  .qlt-i2h-drop{display:flex;align-items:center;gap:10px;justify-content:center;padding:18px;border:2px dashed rgba(187,137,248,.4);border-radius:10px;background:#fff;color:#7c47d0;font-size:13px;cursor:pointer;transition:all .15s ease;font-family:inherit}
  .qlt-i2h-drop:hover:not(:disabled){background:rgba(187,137,248,.08);border-color:#bb89f8}
  .qlt-i2h-drop:disabled{opacity:.6;cursor:not-allowed}
  .qlt-i2h-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
  .qlt-i2h-thumb{position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#f0ece8;border:1px solid rgba(45,32,32,.08)}
  .qlt-i2h-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .qlt-i2h-thumb-del{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(20,12,12,.7);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
  .qlt-i2h-thumb-del:hover:not(:disabled){background:#b91c1c}
  .qlt-i2h-thumb-del:disabled{opacity:.5;cursor:not-allowed}
  .qlt-i2h-thumb-idx{position:absolute;bottom:4px;left:4px;padding:1px 6px;border-radius:100px;background:rgba(20,12,12,.65);color:#fff;font-size:10px;font-weight:700}
  .qlt-i2h-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
  .qlt-i2h-count{font-size:12px;color:#6b5c5c;font-weight:500}

  /* ─── Toast ─── */
  .qlt-toast{position:fixed;right:24px;bottom:24px;display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;font-size:13.5px;font-weight:600;box-shadow:0 8px 24px rgba(20,12,12,.18);z-index:80;animation:qlt-toast-in .2s ease-out}
  .qlt-toast.is-ok{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
  .qlt-toast.is-err{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
  @keyframes qlt-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
`;
