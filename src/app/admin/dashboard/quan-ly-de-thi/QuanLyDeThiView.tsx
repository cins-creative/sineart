"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import AdminRichTextEditor from "@/app/admin/_components/AdminRichTextEditor";
import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import { buildDeThiHref } from "@/lib/data/de-thi-shared";

export type AdminDeThiRow = {
  id: number;
  created_at: string;
  ten: string | null;
  slug: string | null;
  thumbnail_url: string | null;
  nam: number | null;
  mon: string[];
};

type FullDeThi = {
  id: number;
  slug: string | null;
  ten: string | null;
  thumbnail_url: string | null;
  thumbnail_alt: string | null;
  nam: number | null;
  excerpt: string | null;
  created_at: string;
  updated_at: string | null;
  truong_ids: number[];
  loai: string[];
  mon: string[];
  loai_mau_hinh_hoa: string[];
  body_html: string | null;
  content_raw: string | null;
};

type Props = {
  initialRows: AdminDeThiRow[];
  missingServiceRole?: boolean;
  loadError?: string;
};

type ModalMode = { kind: "create" } | { kind: "edit"; id: number; initial: FullDeThi };

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

function arrayToLines(arr: string[]): string {
  return arr.filter(Boolean).join("\n");
}

function linesToStringArray(text: string): string[] {
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  if (lines.length > 0) return lines;
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

function idsToText(ids: number[]): string {
  return ids.filter((n) => Number.isFinite(n)).join(", ");
}

function textToIds(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.trunc(n));
}

type EditorFormState = {
  ten: string;
  slug: string;
  thumbnail_url: string;
  thumbnail_alt: string;
  nam: string;
  excerpt: string;
  monText: string;
  loaiText: string;
  loaiMauText: string;
  truongIdsText: string;
  body_html: string;
  content_raw: string;
};

function fullToForm(f: FullDeThi): EditorFormState {
  return {
    ten: f.ten ?? "",
    slug: f.slug ?? "",
    thumbnail_url: f.thumbnail_url ?? "",
    thumbnail_alt: f.thumbnail_alt ?? "",
    nam: f.nam != null ? String(f.nam) : "",
    excerpt: f.excerpt ?? "",
    monText: arrayToLines(f.mon ?? []),
    loaiText: arrayToLines(f.loai ?? []),
    loaiMauText: arrayToLines(f.loai_mau_hinh_hoa ?? []),
    truongIdsText: idsToText(f.truong_ids ?? []),
    body_html: f.body_html ?? "",
    content_raw: f.content_raw ?? "",
  };
}

function emptyForm(): EditorFormState {
  return {
    ten: "",
    slug: "",
    thumbnail_url: "",
    thumbnail_alt: "",
    nam: "",
    excerpt: "",
    monText: "",
    loaiText: "",
    loaiMauText: "",
    truongIdsText: "",
    body_html: "",
    content_raw: "",
  };
}

function parseNam(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export default function QuanLyDeThiView({ initialRows, missingServiceRole, loadError }: Props) {
  const [rows, setRows] = useState<AdminDeThiRow[]>(initialRows);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [loadingFull, setLoadingFull] = useState<number | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3200);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.ten ?? ""} ${r.slug ?? ""} ${r.mon.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  async function handleDelete(id: number) {
    if (!window.confirm("Xoá đề thi này khỏi Supabase? Hành động không hoàn tác.")) return;
    try {
      const res = await fetch("/admin/api/de-thi-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      notify("Đã xoá đề thi.", true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      notify(`Lỗi xoá: ${msg}`, false);
    }
  }

  function handleOpenCreate() {
    setModal({ kind: "create" });
  }

  async function handleOpenEdit(id: number) {
    setLoadingFull(id);
    try {
      const res = await fetch(`/admin/api/de-thi-get?id=${id}`, { method: "GET" });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        data?: FullDeThi;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const d = json.data;
      const normalized: FullDeThi = {
        ...d,
        truong_ids: Array.isArray(d.truong_ids)
          ? (d.truong_ids as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n))
          : [],
        mon: Array.isArray(d.mon)
          ? (d.mon as unknown[]).filter((x): x is string => typeof x === "string")
          : [],
        loai: Array.isArray(d.loai)
          ? (d.loai as unknown[]).filter((x): x is string => typeof x === "string")
          : [],
        loai_mau_hinh_hoa: Array.isArray(d.loai_mau_hinh_hoa)
          ? (d.loai_mau_hinh_hoa as unknown[]).filter((x): x is string => typeof x === "string")
          : [],
      };
      setModal({ kind: "edit", id, initial: normalized });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      notify(`Lỗi mở đề thi: ${msg}`, false);
    } finally {
      setLoadingFull(null);
    }
  }

  function handleRowUpsert(row: AdminDeThiRow) {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === row.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = row;
        return next;
      }
      return [row, ...prev];
    });
  }

  return (
    <div className="qldt-root">
      <style>{QLDT_CSS}</style>

      <header className="qldt-header">
        <h1 className="qldt-h1">Quản lý đề thi</h1>
        <p className="qldt-sub">
          Chỉnh nội dung hiển thị tại <code>/tong-hop-de-thi</code> — bảng <code>mkt_de_thi</code>.
        </p>
      </header>

      {missingServiceRole ? (
        <div className="qldt-warn">
          <AlertTriangle size={16} />
          <span>
            Thiếu <code>SUPABASE_SERVICE_ROLE_KEY</code> — không thể đọc/ghi bảng.
          </span>
        </div>
      ) : null}
      {loadError ? (
        <div className="qldt-warn">
          <AlertTriangle size={16} />
          <span>Lỗi tải danh sách: {loadError}</span>
        </div>
      ) : null}

      <section className="qldt-section">
        <header className="qldt-section-head">
          <div className="qldt-section-title">
            <span>Danh sách đề thi</span>
            <span className="qldt-badge">{filtered.length}</span>
          </div>
          <div className="qldt-section-tools">
            <div className="qldt-url-input qldt-search">
              <Search size={14} />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên, slug, môn..."
              />
            </div>
            <button type="button" className="qldt-btn qldt-btn-primary qldt-btn-sm2" onClick={handleOpenCreate}>
              <Plus size={14} />
              <span>Thêm đề mới</span>
            </button>
          </div>
        </header>

        <div className="qldt-table-wrap">
          <table className="qldt-table">
            <thead>
              <tr>
                <th className="qldt-col-thumb">Ảnh</th>
                <th className="qldt-col-title">Tên đề</th>
                <th className="qldt-col-slug">Slug</th>
                <th className="qldt-col-nam">Năm</th>
                <th className="qldt-col-mon">Môn</th>
                <th className="qldt-col-date">Ngày tạo</th>
                <th className="qldt-col-act">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="qldt-empty">
                    Chưa có đề thi nào.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.thumbnail_url ? (
                        <div className="qldt-row-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.thumbnail_url} alt="" />
                        </div>
                      ) : (
                        <div className="qldt-row-thumb qldt-row-thumb-empty">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>
                    <td className="qldt-cell-title">{r.ten || <em>(không tên)</em>}</td>
                    <td className="qldt-cell-slug">
                      <code>{r.slug || "—"}</code>
                    </td>
                    <td>{r.nam ?? "—"}</td>
                    <td className="qldt-cell-mon">{r.mon.length ? r.mon.join(", ") : "—"}</td>
                    <td className="qldt-cell-date">{fmtDate(r.created_at)}</td>
                    <td>
                      <div className="qldt-row-actions">
                        <button
                          type="button"
                          className="qldt-btn qldt-btn-ghost qldt-btn-sm"
                          onClick={() => handleOpenEdit(r.id)}
                          disabled={loadingFull === r.id}
                        >
                          {loadingFull === r.id ? (
                            <Loader2 size={13} className="qldt-spin" />
                          ) : (
                            <Edit3 size={13} />
                          )}
                          <span>Sửa</span>
                        </button>
                        <a
                          className="qldt-btn qldt-btn-ghost qldt-btn-sm"
                          href={buildDeThiHref(r.slug)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={13} />
                          <span>Xem</span>
                        </a>
                        <button
                          type="button"
                          className="qldt-btn qldt-btn-danger qldt-btn-sm"
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
          <nav className="qldt-pager" aria-label="Phân trang">
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
        <DeThiEditorModal
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={handleRowUpsert}
          onToast={notify}
        />
      ) : null}

      {toast ? (
        <div className={`qldt-toast ${toast.ok ? "is-ok" : "is-err"}`}>
          {toast.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span>{toast.msg}</span>
        </div>
      ) : null}
    </div>
  );
}

function DeThiEditorModal({
  mode,
  onClose,
  onSaved,
  onToast,
}: {
  mode: ModalMode;
  onClose: () => void;
  onSaved: (row: AdminDeThiRow) => void;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [form, setForm] = useState<EditorFormState>(() =>
    mode.kind === "create" ? emptyForm() : fullToForm(mode.initial)
  );
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
    if (!form.ten.trim()) {
      onToast("Tên đề thi không được để trống.", false);
      return;
    }
    if (mode.kind === "edit" && !form.slug.trim()) {
      onToast("Slug không được để trống khi sửa.", false);
      return;
    }
    if (uploadingAny) {
      onToast("Chờ ảnh upload xong rồi lưu.", false);
      return;
    }

    const mon = linesToStringArray(form.monText);
    const loai = linesToStringArray(form.loaiText);
    const loai_mau_hinh_hoa = linesToStringArray(form.loaiMauText);
    const truong_ids = textToIds(form.truongIdsText);
    const nam = parseNam(form.nam);

    setSaving(true);
    try {
      if (mode.kind === "create") {
        const res = await fetch("/admin/api/de-thi-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ten: form.ten.trim(),
            slug: form.slug.trim() || undefined,
            thumbnail_url: form.thumbnail_url.trim() || null,
            thumbnail_alt: form.thumbnail_alt.trim() || null,
            nam,
            excerpt: form.excerpt.trim() || null,
            mon,
            loai,
            loai_mau_hinh_hoa,
            truong_ids,
            body_html: form.body_html || null,
            content_raw: form.content_raw.trim() || null,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          row?: AdminDeThiRow;
        };
        if (!res.ok || !json.ok || !json.row) throw new Error(json.error || `HTTP ${res.status}`);
        onSaved(json.row);
        onToast("Đã tạo đề thi mới.", true);
        onClose();
      } else {
        const res = await fetch("/admin/api/de-thi-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: mode.id,
            ten: form.ten.trim(),
            slug: form.slug.trim(),
            thumbnail_url: form.thumbnail_url.trim() || null,
            thumbnail_alt: form.thumbnail_alt.trim() || null,
            nam,
            excerpt: form.excerpt.trim() || null,
            mon,
            loai,
            loai_mau_hinh_hoa,
            truong_ids,
            body_html: form.body_html || null,
            content_raw: form.content_raw.trim() || null,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          row?: AdminDeThiRow;
        };
        if (!res.ok || !json.ok || !json.row) throw new Error(json.error || `HTTP ${res.status}`);
        onSaved(json.row);
        onToast("Đã cập nhật đề thi.", true);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      onToast(`Lỗi lưu: ${msg}`, false);
    } finally {
      setSaving(false);
    }
  }

  const titleText = mode.kind === "create" ? "Thêm đề thi mới" : `Sửa đề thi #${mode.id}`;

  return (
    <div className="qldt-modal-backdrop" onClick={saving ? undefined : onClose}>
      <div className="qldt-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titleText}>
        <header className="qldt-modal-head">
          <h3 className="qldt-modal-title">{titleText}</h3>
          <button type="button" className="qldt-modal-close" onClick={onClose} disabled={saving}>
            <X size={16} />
          </button>
        </header>

        <div className="qldt-modal-body">
          <div className="qldt-modal-grid">
            <div className="qldt-modal-col-left">
              <AdminCfImageInput
                label="Ảnh thumbnail"
                value={form.thumbnail_url}
                onValueChange={(url) => update("thumbnail_url", url)}
                preview="banner"
              />

              <label className="qldt-field">
                <span className="qldt-label">Tên đề *</span>
                <input
                  type="text"
                  value={form.ten}
                  onChange={(e) => update("ten", e.target.value)}
                  disabled={saving}
                  placeholder="VD: Đề ĐH Kiến trúc TP.HCM — Bố cục màu 2024"
                />
              </label>

              <label className="qldt-field">
                <span className="qldt-label">
                  Slug URL {mode.kind === "create" ? "(tuỳ chọn — để trống sẽ tự sinh)" : "*"}
                </span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value)}
                  disabled={saving}
                  placeholder="chu-thuong-khong-dau"
                />
              </label>

              <label className="qldt-field">
                <span className="qldt-label">Thumbnail alt (SEO)</span>
                <input
                  type="text"
                  value={form.thumbnail_alt}
                  onChange={(e) => update("thumbnail_alt", e.target.value)}
                  disabled={saving}
                />
              </label>

              <label className="qldt-field">
                <span className="qldt-label">Năm</span>
                <input
                  type="number"
                  value={form.nam}
                  onChange={(e) => update("nam", e.target.value)}
                  disabled={saving}
                  placeholder="2025"
                />
              </label>

              <label className="qldt-field">
                <span className="qldt-label">Môn (mỗi dòng hoặc cách nhau bởi dấu phẩy)</span>
                <textarea
                  className="qldt-textarea-sm"
                  value={form.monText}
                  onChange={(e) => update("monText", e.target.value)}
                  disabled={saving}
                  rows={3}
                  placeholder={"Bố cục màu\nTrang trí màu"}
                />
              </label>

              <label className="qldt-field">
                <span className="qldt-label">Loại đề / meta</span>
                <textarea
                  className="qldt-textarea-sm"
                  value={form.loaiText}
                  onChange={(e) => update("loaiText", e.target.value)}
                  disabled={saving}
                  rows={2}
                  placeholder="Mỗi dòng một giá trị"
                />
              </label>

              <label className="qldt-field">
                <span className="qldt-label">Loại mẫu hình hoạ</span>
                <textarea
                  className="qldt-textarea-sm"
                  value={form.loaiMauText}
                  onChange={(e) => update("loaiMauText", e.target.value)}
                  disabled={saving}
                  rows={2}
                />
              </label>

              <label className="qldt-field">
                <span className="qldt-label">ID trường ĐH (cách nhau bởi dấu phẩy)</span>
                <input
                  type="text"
                  value={form.truongIdsText}
                  onChange={(e) => update("truongIdsText", e.target.value)}
                  disabled={saving}
                  placeholder="1, 2, 3"
                />
              </label>

              <label className="qldt-field">
                <span className="qldt-label">Đoạn trích (excerpt)</span>
                <textarea
                  className="qldt-textarea-sm"
                  value={form.excerpt}
                  onChange={(e) => update("excerpt", e.target.value)}
                  disabled={saving}
                  rows={3}
                />
              </label>

              <label className="qldt-field">
                <span className="qldt-label">content_raw (tuỳ chọn)</span>
                <textarea
                  className="qldt-textarea-sm"
                  value={form.content_raw}
                  onChange={(e) => update("content_raw", e.target.value)}
                  disabled={saving}
                  rows={3}
                  placeholder="Pipeline OCR / nguồn gốc thô nếu có"
                />
              </label>
            </div>

            <div className="qldt-modal-col-right">
              <div className="qldt-editor-block">
                <span className="qldt-label">Nội dung HTML (body)</span>
                <AdminRichTextEditor
                  value={form.body_html}
                  onChange={(html) => update("body_html", html)}
                  onUploadChange={setUploadingAny}
                  placeholder="Nội dung trang chi tiết đề thi..."
                  minHeight="360px"
                  maxHeight="560px"
                />
              </div>
            </div>
          </div>
        </div>

        <footer className="qldt-modal-foot">
          {uploadingAny ? (
            <span className="qldt-modal-upload-note">
              <Loader2 size={13} className="qldt-spin" />
              <span>Ảnh đang upload...</span>
            </span>
          ) : (
            <span />
          )}
          <div className="qldt-modal-actions">
            <button type="button" className="qldt-btn qldt-btn-ghost" onClick={onClose} disabled={saving}>
              Huỷ
            </button>
            <button
              type="button"
              className="qldt-btn qldt-btn-primary"
              onClick={handleSubmit}
              disabled={saving || uploadingAny}
            >
              {saving ? <Loader2 size={16} className="qldt-spin" /> : <Save size={16} />}
              <span>{saving ? "Đang lưu..." : mode.kind === "create" ? "Tạo đề" : "Lưu thay đổi"}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

const QLDT_CSS = `
  .qldt-root{display:flex;flex-direction:column;gap:20px;padding:4px 0 48px;font-family:'Be Vietnam Pro',system-ui,-apple-system,sans-serif;color:#2d2020}
  .qldt-header{padding:4px 4px 0}
  .qldt-h1{font-size:22px;font-weight:700;margin:0 0 4px;color:#1a1a1a;letter-spacing:-.01em}
  .qldt-sub{font-size:13px;color:#6b5c5c;margin:0;max-width:720px;line-height:1.5}
  .qldt-sub code{background:#fff4ec;padding:1px 6px;border-radius:6px;font-size:12px;color:#c45127}

  .qldt-warn{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;background:#fff4e8;border:1px solid #f8d4a8;color:#a54b0b;font-size:13px}
  .qldt-warn code{background:rgba(255,255,255,.6);padding:1px 6px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px}

  .qldt-section{background:#ffffff;border:1px solid rgba(45,32,32,.08);border-radius:14px;padding:18px 20px;box-shadow:0 6px 18px rgba(45,32,32,.04)}
  .qldt-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
  .qldt-section-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;letter-spacing:-.005em}
  .qldt-section-tools{display:flex;align-items:center;gap:8px}
  .qldt-badge{background:#fff4ec;color:#c45127;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:600}

  .qldt-url-input{flex:1;display:flex;align-items:center;gap:8px;background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:10px;padding:0 12px;transition:all .15s ease}
  .qldt-url-input:focus-within{background:#fff;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qldt-url-input svg{color:#9c8a8a;flex-shrink:0}
  .qldt-url-input input{flex:1;background:none;border:none;outline:none;padding:11px 0;font-size:14px;color:#2d2020;font-family:inherit}
  .qldt-search{max-width:280px;flex:0 1 280px}

  .qldt-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;border:1px solid transparent;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .15s ease;white-space:nowrap;font-family:inherit;text-decoration:none}
  .qldt-btn:disabled{opacity:.6;cursor:not-allowed}
  .qldt-btn-primary{background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;box-shadow:0 4px 12px rgba(238,91,159,.25)}
  .qldt-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(238,91,159,.3)}
  .qldt-btn-ghost{background:#fafafa;color:#5a4a4a;border-color:rgba(45,32,32,.1)}
  .qldt-btn-ghost:hover:not(:disabled){background:#f0ece8;color:#2d2020}
  .qldt-btn-danger{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
  .qldt-btn-danger:hover:not(:disabled){background:#fee2e2}
  .qldt-btn-sm{padding:6px 10px;font-size:12px}
  .qldt-btn-sm2{padding:8px 14px;font-size:13px}

  .qldt-spin{animation:qldt-spin .8s linear infinite}
  @keyframes qldt-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

  .qldt-table-wrap{border:1px solid rgba(45,32,32,.06);border-radius:10px;overflow-x:auto;background:#fff}
  .qldt-table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:880px}
  .qldt-table thead{background:#fafafa}
  .qldt-table th{text-align:left;padding:11px 14px;font-weight:600;color:#6b5c5c;font-size:12px;text-transform:uppercase;letter-spacing:.02em;border-bottom:1px solid rgba(45,32,32,.06)}
  .qldt-table td{padding:12px 14px;border-bottom:1px solid rgba(45,32,32,.04);vertical-align:middle}
  .qldt-table tr:last-child td{border-bottom:none}
  .qldt-table tr:hover td{background:#fffaf3}
  .qldt-col-thumb{width:72px}
  .qldt-col-slug{max-width:140px}
  .qldt-col-nam{width:72px}
  .qldt-col-date{width:150px;white-space:nowrap}
  .qldt-col-act{width:260px}
  .qldt-cell-title{font-weight:600;color:#2d2020;line-height:1.4;max-width:280px}
  .qldt-cell-slug code{font-size:11px;background:#fafafa;padding:2px 6px;border-radius:6px}
  .qldt-cell-mon{font-size:12px;color:#5a4a4a;max-width:200px}
  .qldt-cell-date{color:#9c8a8a;font-size:12px}
  .qldt-empty{text-align:center;padding:40px 20px !important;color:#9c8a8a;font-style:italic}

  .qldt-row-thumb{width:48px;height:48px;border-radius:8px;overflow:hidden;background:#fafafa;border:1px solid rgba(45,32,32,.05)}
  .qldt-row-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .qldt-row-thumb-empty{display:flex;align-items:center;justify-content:center;color:#c8bcbc}

  .qldt-row-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}

  .qldt-pager{display:flex;justify-content:center;align-items:center;gap:16px;padding-top:14px;font-size:13px;color:#6b5c5c}
  .qldt-pager button{background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px;font-family:inherit;color:#5a4a4a}
  .qldt-pager button:disabled{opacity:.4;cursor:not-allowed}
  .qldt-pager button:hover:not(:disabled){background:#fff4ec;border-color:#f8a668;color:#c45127}

  .qldt-toast{position:fixed;bottom:24px;right:24px;display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:10px;box-shadow:0 12px 32px rgba(45,32,32,.18);font-size:13.5px;font-weight:500;z-index:220}
  .qldt-toast.is-ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
  .qldt-toast.is-err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}

  .qldt-modal-backdrop{position:fixed;inset:0;background:rgba(45,32,32,.45);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px}
  .qldt-modal{background:#fff;border-radius:14px;box-shadow:0 24px 72px rgba(45,32,32,.3);width:100%;max-width:1100px;max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden}
  .qldt-modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid rgba(45,32,32,.08);background:linear-gradient(180deg,#fffaf5,#fff)}
  .qldt-modal-title{margin:0;font-size:16px;font-weight:700;color:#2d2020;letter-spacing:-.005em}
  .qldt-modal-close{background:none;border:none;cursor:pointer;padding:6px;border-radius:50%;color:#9c8a8a;display:inline-flex;transition:all .15s ease}
  .qldt-modal-close:hover:not(:disabled){background:#fff4ec;color:#c45127}
  .qldt-modal-body{overflow-y:auto;padding:20px 22px;flex:1}
  .qldt-modal-grid{display:grid;grid-template-columns:340px 1fr;gap:24px;align-items:start}
  @media (max-width:960px){.qldt-modal-grid{grid-template-columns:1fr}}
  .qldt-modal-col-left{display:flex;flex-direction:column;gap:14px}
  .qldt-modal-col-right{display:flex;flex-direction:column;gap:16px;min-width:0}
  .qldt-editor-block{display:flex;flex-direction:column;gap:6px}
  .qldt-modal-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 22px;border-top:1px solid rgba(45,32,32,.08);background:#fafafa}
  .qldt-modal-upload-note{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#c45127}
  .qldt-modal-actions{display:flex;gap:10px}

  .qldt-field{display:flex;flex-direction:column;gap:4px}
  .qldt-label{font-size:12px;font-weight:600;color:#6b5c5c;letter-spacing:.02em;text-transform:uppercase}
  .qldt-field input{padding:10px 12px;border-radius:8px;border:1px solid rgba(45,32,32,.12);background:#fff;font-size:14px;font-family:inherit;color:#2d2020;transition:all .15s ease}
  .qldt-field input:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qldt-textarea-sm{width:100%;border-radius:8px;border:1px solid rgba(45,32,32,.12);padding:10px 12px;font-size:13px;font-family:inherit;color:#2d2020;resize:vertical;min-height:52px}
  .qldt-textarea-sm:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
`;
