"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import {
  DANH_GIA_NGUON_OPTIONS,
  type AdminDanhGiaListRow,
  type MonHocLookupRow,
} from "@/lib/admin/binh-luan-schema";

type Props = {
  initialRows: AdminDanhGiaListRow[];
  initialMonHocs: MonHocLookupRow[];
  missingServiceRole?: boolean;
  loadError?: string;
};

type ModalMode =
  | { kind: "create" }
  | { kind: "edit"; id: number; initial: AdminDanhGiaListRow };

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

function nameInitials(name: string | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function BinhLuanView({
  initialRows,
  initialMonHocs,
  missingServiceRole,
  loadError,
}: Props) {
  const [rows, setRows] = useState<AdminDanhGiaListRow[]>(initialRows);
  const [monHocs] = useState<MonHocLookupRow[]>(initialMonHocs);
  const [query, setQuery] = useState("");
  const [fStar, setFStar] = useState<number | "">("");
  const [fNguon, setFNguon] = useState<string>("");
  const [fHien, setFHien] = useState<"all" | "on" | "off">("all");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [modal, setModal] = useState<ModalMode | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3200);
  };

  const monNameById = useMemo(() => {
    const m = new Map<number, string>();
    monHocs.forEach((t) => m.set(t.id, t.ten));
    return m;
  }, [monHocs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (fStar !== "" && r.so_sao !== fStar) return false;
      if (fNguon !== "" && (r.nguon ?? "") !== fNguon) return false;
      if (fHien === "on" && r.hien_thi !== true) return false;
      if (fHien === "off" && r.hien_thi !== false) return false;
      if (!q) return true;
      const hay = `${r.ten_nguoi ?? ""} ${r.noi_dung ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, fStar, fNguon, fHien]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  async function handleDelete(id: number) {
    if (!window.confirm("Xoá bình luận này khỏi Supabase? Hành động không hoàn tác.")) return;
    try {
      const res = await fetch("/admin/api/binh-luan-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      notify("Đã xoá bình luận.", true);
    } catch (err) {
      notify(`Lỗi xoá: ${err instanceof Error ? err.message : String(err)}`, false);
    }
  }

  async function handleToggleHienThi(row: AdminDanhGiaListRow) {
    const next = !row.hien_thi;
    try {
      const res = await fetch("/admin/api/binh-luan-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, hien_thi: next }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        row?: AdminDanhGiaListRow;
      };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, hien_thi: next } : r)));
    } catch (err) {
      notify(`Lỗi cập nhật: ${err instanceof Error ? err.message : String(err)}`, false);
    }
  }

  function handleCreated(row: AdminDanhGiaListRow) {
    setRows((prev) => [row, ...prev]);
  }
  function handleUpdated(row: AdminDanhGiaListRow) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
  }

  return (
    <div className="qbl-root">
      <style>{QBL_CSS}</style>

      <header className="qbl-header">
        <div>
          <h1 className="qbl-h1">Bình luận học viên</h1>
          <p className="qbl-sub">
            Review/testimonial hiển thị ở trang chủ. Dữ liệu lưu ở bảng <code>ql_danh_gia</code>,
            trang chủ đọc những bình luận có <strong>Hiển thị = bật</strong>. Upload ảnh đại diện
            qua Cloudflare Images ngay trong form, paste link tự động.
          </p>
        </div>
      </header>

      {missingServiceRole ? (
        <div className="qbl-warn">
          <AlertTriangle size={16} />
          <span>
            Thiếu <code>SUPABASE_SERVICE_ROLE_KEY</code> — không thể đọc/ghi bảng.
          </span>
        </div>
      ) : null}
      {loadError ? (
        <div className="qbl-warn">
          <AlertTriangle size={16} />
          <span>Lỗi tải danh sách: {loadError}</span>
        </div>
      ) : null}

      <section className="qbl-section">
        <header className="qbl-section-head">
          <div className="qbl-section-title">
            <span>Danh sách bình luận</span>
            <span className="qbl-badge">{filtered.length}</span>
          </div>
          <div className="qbl-section-tools">
            <div className="qbl-input qbl-search">
              <Search size={14} />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên / nội dung..."
              />
            </div>
            <select
              className="qbl-select"
              value={fStar}
              onChange={(e) => {
                setFStar(e.target.value === "" ? "" : Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="">Tất cả sao</option>
              {[5, 4, 3, 2, 1].map((s) => (
                <option key={s} value={s}>
                  {s} sao
                </option>
              ))}
            </select>
            <select
              className="qbl-select"
              value={fNguon}
              onChange={(e) => {
                setFNguon(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả nguồn</option>
              {DANH_GIA_NGUON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="qbl-select"
              value={fHien}
              onChange={(e) => {
                setFHien(e.target.value as "all" | "on" | "off");
                setPage(1);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="on">Đang hiển thị</option>
              <option value="off">Đang ẩn</option>
            </select>
            <button
              type="button"
              className="qbl-btn qbl-btn-primary"
              onClick={() => setModal({ kind: "create" })}
            >
              <Plus size={14} />
              <span>Thêm bình luận</span>
            </button>
          </div>
        </header>

        <div className="qbl-table-wrap">
          <table className="qbl-table">
            <thead>
              <tr>
                <th className="qbl-col-avatar">Ảnh</th>
                <th className="qbl-col-name">Người đánh giá</th>
                <th className="qbl-col-content">Nội dung</th>
                <th className="qbl-col-star">Sao</th>
                <th className="qbl-col-course">Khóa học</th>
                <th className="qbl-col-show">Hiển thị</th>
                <th className="qbl-col-date">Ngày</th>
                <th className="qbl-col-act">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="qbl-empty">
                    Chưa có bình luận nào khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.avatar_url ? (
                        <div className="qbl-row-avatar">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.avatar_url} alt={r.ten_nguoi ?? ""} />
                        </div>
                      ) : (
                        <div className="qbl-row-avatar qbl-row-avatar-empty">
                          {nameInitials(r.ten_nguoi)}
                        </div>
                      )}
                    </td>
                    <td className="qbl-cell-name">
                      <div className="qbl-cell-name-text">
                        {r.ten_nguoi || <em>(không tên)</em>}
                      </div>
                      {r.nguon ? <div className="qbl-cell-source">{r.nguon}</div> : null}
                      {r.thoi_gian_hoc ? (
                        <div className="qbl-cell-duration">{r.thoi_gian_hoc}</div>
                      ) : null}
                    </td>
                    <td className="qbl-cell-content">
                      <div className="qbl-cell-content-text">{r.noi_dung ?? "—"}</div>
                    </td>
                    <td className="qbl-cell-star">
                      <span className="qbl-stars" aria-label={`${r.so_sao ?? 0} sao`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < (r.so_sao ?? 0) ? "on" : "off"}
                          />
                        ))}
                      </span>
                    </td>
                    <td className="qbl-cell-course">
                      {r.khoa_hoc_id ? (
                        <span className="qbl-chip qbl-chip-course">
                          {monNameById.get(r.khoa_hoc_id) ?? `#${r.khoa_hoc_id}`}
                        </span>
                      ) : (
                        <span className="qbl-muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`qbl-toggle-btn ${r.hien_thi ? "is-on" : ""}`}
                        onClick={() => handleToggleHienThi(r)}
                        title={r.hien_thi ? "Đang hiển thị — click để ẩn" : "Đang ẩn — click để hiển thị"}
                      >
                        {r.hien_thi ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </td>
                    <td className="qbl-cell-date">{fmtDate(r.created_at)}</td>
                    <td>
                      <div className="qbl-row-actions">
                        <button
                          type="button"
                          className="qbl-btn qbl-btn-ghost qbl-btn-sm"
                          onClick={() => setModal({ kind: "edit", id: r.id, initial: r })}
                        >
                          <Edit3 size={13} />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          className="qbl-btn qbl-btn-danger qbl-btn-sm"
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
          <nav className="qbl-pager" aria-label="Phân trang">
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
        <BinhLuanEditorModal
          mode={modal}
          monHocs={monHocs}
          onClose={() => setModal(null)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          onToast={notify}
        />
      ) : null}

      {toast ? (
        <div className={`qbl-toast ${toast.ok ? "is-ok" : "is-err"}`}>
          {toast.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span>{toast.msg}</span>
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// BinhLuanEditorModal
// ──────────────────────────────────────────────────────────────

type EditorForm = {
  ten_nguoi: string;
  avatar_url: string;
  noi_dung: string;
  so_sao: number;
  thoi_gian_hoc: string;
  nguon: string;
  hien_thi: boolean;
  khoa_hoc: number | null;
};

function initialForm(mode: ModalMode): EditorForm {
  if (mode.kind === "create") {
    return {
      ten_nguoi: "",
      avatar_url: "",
      noi_dung: "",
      so_sao: 5,
      thoi_gian_hoc: "",
      nguon: "Tự gửi",
      hien_thi: true,
      khoa_hoc: null,
    };
  }
  const v = mode.initial;
  return {
    ten_nguoi: v.ten_nguoi ?? "",
    avatar_url: v.avatar_url ?? "",
    noi_dung: v.noi_dung ?? "",
    so_sao: v.so_sao ?? 5,
    thoi_gian_hoc: v.thoi_gian_hoc ?? "",
    nguon: v.nguon ?? "Tự gửi",
    hien_thi: v.hien_thi !== false,
    khoa_hoc: v.khoa_hoc_id,
  };
}

function BinhLuanEditorModal({
  mode,
  monHocs,
  onClose,
  onCreated,
  onUpdated,
  onToast,
}: {
  mode: ModalMode;
  monHocs: MonHocLookupRow[];
  onClose: () => void;
  onCreated: (row: AdminDanhGiaListRow) => void;
  onUpdated: (row: AdminDanhGiaListRow) => void;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [form, setForm] = useState<EditorForm>(() => initialForm(mode));
  const [saving, setSaving] = useState(false);

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

  async function handleSubmit() {
    if (!form.ten_nguoi.trim()) {
      onToast("Tên người không được để trống.", false);
      return;
    }
    if (!form.noi_dung.trim()) {
      onToast("Nội dung không được để trống.", false);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ten_nguoi: form.ten_nguoi.trim(),
        avatar_url: form.avatar_url.trim() || null,
        noi_dung: form.noi_dung.trim(),
        so_sao: form.so_sao,
        thoi_gian_hoc: form.thoi_gian_hoc.trim() || null,
        nguon: form.nguon.trim() || "Tự gửi",
        hien_thi: form.hien_thi,
        khoa_hoc: form.khoa_hoc,
      };

      const url =
        mode.kind === "create" ? "/admin/api/binh-luan-save" : "/admin/api/binh-luan-update";
      const body = mode.kind === "create" ? payload : { id: mode.id, ...payload };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        row?: AdminDanhGiaListRow;
      };
      if (!res.ok || !json.ok || !json.row) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      if (mode.kind === "create") {
        onCreated(json.row);
        onToast("Đã tạo bình luận mới.", true);
      } else {
        onUpdated(json.row);
        onToast("Đã cập nhật bình luận.", true);
      }
      onClose();
    } catch (err) {
      onToast(`Lỗi lưu: ${err instanceof Error ? err.message : String(err)}`, false);
    } finally {
      setSaving(false);
    }
  }

  const titleText =
    mode.kind === "create" ? "Thêm bình luận mới" : `Sửa bình luận #${mode.id}`;

  return (
    <div className="qbl-modal-backdrop" onClick={saving ? undefined : onClose}>
      <div
        className="qbl-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={titleText}
      >
        <header className="qbl-modal-head">
          <h3 className="qbl-modal-title">{titleText}</h3>
          <button
            type="button"
            className="qbl-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </header>

        <div className="qbl-modal-body">
          <div className="qbl-modal-grid">
            <div className="qbl-modal-col-left">
              <AdminCfImageInput
                label="Ảnh đại diện"
                value={form.avatar_url}
                onValueChange={(url) => update("avatar_url", url)}
                preview="avatar"
              />
              <p className="qbl-hint">
                Kéo-thả, dán hoặc chọn ảnh. Ảnh tự upload lên Cloudflare Images, URL paste vào cột
                <code> avatar_url</code> khi lưu.
              </p>
            </div>

            <div className="qbl-modal-col-right">
              <label className="qbl-field">
                <span className="qbl-label">Tên người *</span>
                <input
                  type="text"
                  value={form.ten_nguoi}
                  onChange={(e) => update("ten_nguoi", e.target.value)}
                  disabled={saving}
                  placeholder="VD: Nguyễn Thị Lan Phương"
                />
              </label>

              <div className="qbl-field">
                <span className="qbl-label">Số sao</span>
                <div className="qbl-star-picker">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`qbl-star-btn ${s <= form.so_sao ? "on" : ""}`}
                      onClick={() => update("so_sao", s)}
                      disabled={saving}
                      aria-label={`${s} sao`}
                    >
                      <Star size={22} />
                    </button>
                  ))}
                  <span className="qbl-star-picker-val">{form.so_sao}/5</span>
                </div>
              </div>

              <label className="qbl-field">
                <span className="qbl-label">Nội dung *</span>
                <textarea
                  value={form.noi_dung}
                  onChange={(e) => update("noi_dung", e.target.value)}
                  disabled={saving}
                  rows={6}
                  placeholder="Copy-paste nội dung bình luận từ Google Maps / Facebook, hoặc gõ thủ công..."
                />
              </label>

              <div className="qbl-field-row">
                <label className="qbl-field">
                  <span className="qbl-label">Khóa học</span>
                  <select
                    className="qbl-select qbl-select-full"
                    value={form.khoa_hoc ?? ""}
                    onChange={(e) =>
                      update("khoa_hoc", e.target.value === "" ? null : Number(e.target.value))
                    }
                    disabled={saving}
                  >
                    <option value="">— Không gán —</option>
                    {monHocs.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.ten}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="qbl-field">
                  <span className="qbl-label">Thời gian học</span>
                  <input
                    type="text"
                    value={form.thoi_gian_hoc}
                    onChange={(e) => update("thoi_gian_hoc", e.target.value)}
                    disabled={saving}
                    placeholder="VD: 3 tháng, 1 năm..."
                  />
                </label>
              </div>

              <label className="qbl-field">
                <span className="qbl-label">Nguồn</span>
                <select
                  className="qbl-select qbl-select-full"
                  value={form.nguon}
                  onChange={(e) => update("nguon", e.target.value)}
                  disabled={saving}
                >
                  {DANH_GIA_NGUON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="qbl-toggle">
                <input
                  type="checkbox"
                  checked={form.hien_thi}
                  onChange={(e) => update("hien_thi", e.target.checked)}
                  disabled={saving}
                />
                <span>Hiển thị công khai ngoài trang chủ</span>
              </label>
            </div>
          </div>
        </div>

        <footer className="qbl-modal-foot">
          <span />
          <div className="qbl-modal-actions">
            <button
              type="button"
              className="qbl-btn qbl-btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="qbl-btn qbl-btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="qbl-spin" /> : <Save size={16} />}
              <span>
                {saving ? "Đang lưu..." : mode.kind === "create" ? "Tạo mới" : "Lưu thay đổi"}
              </span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// CSS
// ──────────────────────────────────────────────────────────────

const QBL_CSS = `
  .qbl-root{display:flex;flex-direction:column;gap:20px;padding:4px 0 48px;font-family:'Be Vietnam Pro',system-ui,-apple-system,sans-serif;color:#2d2020}
  .qbl-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:4px 4px 0}
  .qbl-h1{font-size:22px;font-weight:700;margin:0 0 4px;color:#1a1a1a;letter-spacing:-.01em}
  .qbl-sub{font-size:13px;color:#6b5c5c;margin:0;max-width:720px;line-height:1.55}
  .qbl-sub code{background:#fff4ec;padding:1px 6px;border-radius:6px;font-size:12px;color:#c45127}
  .qbl-sub strong{color:#c45127}

  .qbl-warn{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;background:#fff4e8;border:1px solid #f8d4a8;color:#a54b0b;font-size:13px}
  .qbl-warn code{background:rgba(255,255,255,.6);padding:1px 6px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px}

  .qbl-section{background:#fff;border:1px solid rgba(45,32,32,.08);border-radius:14px;padding:18px 20px;box-shadow:0 6px 18px rgba(45,32,32,.04)}
  .qbl-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
  .qbl-section-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600}
  .qbl-section-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .qbl-badge{background:#fff4ec;color:#c45127;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:600}

  .qbl-input{display:flex;align-items:center;gap:8px;background:#fafafa;border:1px solid rgba(45,32,32,.1);border-radius:10px;padding:0 12px;transition:all .15s ease}
  .qbl-input:focus-within{background:#fff;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qbl-input svg{color:#9c8a8a;flex-shrink:0}
  .qbl-input input{flex:1;background:none;border:none;outline:none;padding:9px 0;font-size:14px;color:#2d2020;font-family:inherit}
  .qbl-input input::placeholder{color:#a89e9e}
  .qbl-search{width:240px;flex:0 0 240px}

  .qbl-select{padding:9px 12px;border-radius:10px;border:1px solid rgba(45,32,32,.1);background:#fafafa;font-size:13.5px;color:#2d2020;cursor:pointer;font-family:inherit;outline:none;transition:all .15s ease;max-width:200px}
  .qbl-select:focus{background:#fff;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qbl-select-full{max-width:none;width:100%}

  .qbl-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:10px;border:1px solid transparent;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .15s ease;white-space:nowrap;font-family:inherit}
  .qbl-btn:disabled{opacity:.6;cursor:not-allowed}
  .qbl-btn-primary{background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;box-shadow:0 4px 12px rgba(238,91,159,.25)}
  .qbl-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(238,91,159,.3)}
  .qbl-btn-ghost{background:#fafafa;color:#5a4a4a;border-color:rgba(45,32,32,.1)}
  .qbl-btn-ghost:hover:not(:disabled){background:#f0ece8;color:#2d2020}
  .qbl-btn-danger{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
  .qbl-btn-danger:hover:not(:disabled){background:#fee2e2}
  .qbl-btn-sm{padding:6px 10px;font-size:12px}

  .qbl-spin{animation:qbl-spin .8s linear infinite}
  @keyframes qbl-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

  .qbl-table-wrap{overflow-x:auto;margin:0 -4px}
  .qbl-table{width:100%;border-collapse:collapse;font-size:13px;min-width:1000px}
  .qbl-table thead th{text-align:left;padding:10px 12px;background:#fafafa;border-bottom:1px solid rgba(45,32,32,.08);color:#6b5c5c;font-weight:600;font-size:12px;letter-spacing:.02em;text-transform:uppercase}
  .qbl-table tbody td{padding:12px;border-bottom:1px solid rgba(45,32,32,.06);vertical-align:middle}
  .qbl-table tbody tr:hover{background:#fff9f2}
  .qbl-col-avatar{width:60px}
  .qbl-col-name{width:170px}
  .qbl-col-content{}
  .qbl-col-star{width:90px;text-align:center}
  .qbl-col-course{width:160px}
  .qbl-col-show{width:72px;text-align:center}
  .qbl-col-date{width:100px}
  .qbl-col-act{width:170px}
  .qbl-empty{text-align:center;padding:36px 12px!important;color:#9c8a8a;font-style:italic}

  .qbl-row-avatar{width:40px;height:40px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
  .qbl-row-avatar img{width:100%;height:100%;object-fit:cover;display:block}
  .qbl-row-avatar-empty{background:linear-gradient(135deg,#bb89f8,#7c47d0)}

  .qbl-cell-name{max-width:180px}
  .qbl-cell-name-text{font-weight:600;color:#2d2020;line-height:1.3}
  .qbl-cell-source{font-size:11px;color:#c45127;font-weight:600;margin-top:2px;background:#fff4ec;padding:1px 8px;border-radius:100px;display:inline-block}
  .qbl-cell-duration{font-size:11px;color:#9c8a8a;margin-top:3px}
  .qbl-cell-content{max-width:380px}
  .qbl-cell-content-text{color:#5a4a4a;line-height:1.45;font-size:12.5px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .qbl-cell-star{text-align:center}
  .qbl-stars{display:inline-flex;gap:1px}
  .qbl-stars .on{color:#f8a668;fill:#f8a668}
  .qbl-stars .off{color:#e5d7d0}
  .qbl-cell-course{font-size:12px}
  .qbl-cell-date{font-size:12px;color:#6b5c5c;white-space:nowrap}
  .qbl-muted{color:#b8adad;font-size:12px}

  .qbl-chip{display:inline-flex;align-items:center;padding:3px 8px;border-radius:100px;font-size:11px;font-weight:600;line-height:1.4}
  .qbl-chip-course{background:rgba(187,137,248,.14);color:#7c47d0}

  .qbl-toggle-btn{width:32px;height:32px;border-radius:50%;border:none;background:#f3e5e0;color:#9c8a8a;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s ease;margin:0 auto}
  .qbl-toggle-btn:hover{background:#fee2e2;color:#b91c1c}
  .qbl-toggle-btn.is-on{background:#d1fae5;color:#047857}
  .qbl-toggle-btn.is-on:hover{background:#a7f3d0}

  .qbl-row-actions{display:flex;gap:6px;flex-wrap:wrap}
  .qbl-pager{display:flex;justify-content:center;align-items:center;gap:14px;margin-top:16px;font-size:13px;color:#6b5c5c}
  .qbl-pager button{padding:6px 12px;border-radius:8px;border:1px solid rgba(45,32,32,.1);background:#fafafa;cursor:pointer;font-family:inherit;color:#5a4a4a;transition:all .15s ease}
  .qbl-pager button:hover:not(:disabled){background:#f0ece8}
  .qbl-pager button:disabled{opacity:.4;cursor:not-allowed}

  /* ─── Modal ─── */
  .qbl-modal-backdrop{position:fixed;inset:0;background:rgba(20,12,12,.45);backdrop-filter:blur(4px);z-index:60;display:flex;align-items:center;justify-content:center;padding:20px}
  .qbl-modal{background:#fff;border-radius:16px;width:100%;max-width:900px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(20,12,12,.3);overflow:hidden}
  .qbl-modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid rgba(45,32,32,.08);background:#fafafa}
  .qbl-modal-title{font-size:16px;font-weight:700;margin:0;color:#1a1a1a;letter-spacing:-.005em}
  .qbl-modal-close{width:32px;height:32px;border:none;background:transparent;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6b5c5c;transition:all .15s ease}
  .qbl-modal-close:hover:not(:disabled){background:#f0ece8;color:#2d2020}
  .qbl-modal-body{flex:1;overflow-y:auto;padding:20px 22px}
  .qbl-modal-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 22px;border-top:1px solid rgba(45,32,32,.08);background:#fafafa}
  .qbl-modal-actions{display:flex;gap:10px}

  .qbl-modal-grid{display:grid;grid-template-columns:220px 1fr;gap:24px}
  @media (max-width:760px){.qbl-modal-grid{grid-template-columns:1fr}}
  .qbl-modal-col-left,.qbl-modal-col-right{display:flex;flex-direction:column;gap:14px}

  .qbl-field{display:flex;flex-direction:column;gap:5px}
  .qbl-field input,.qbl-field textarea{padding:10px 12px;border-radius:8px;border:1px solid rgba(45,32,32,.12);background:#fff;font-size:14px;font-family:inherit;color:#2d2020;transition:all .15s ease;resize:vertical}
  .qbl-field input:focus,.qbl-field textarea:focus{outline:none;border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.12)}
  .qbl-field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media (max-width:520px){.qbl-field-row{grid-template-columns:1fr}}
  .qbl-label{font-size:12px;font-weight:600;color:#6b5c5c;letter-spacing:.02em;text-transform:uppercase}
  .qbl-hint{font-size:11.5px;color:#9c8a8a;line-height:1.4;margin:0}
  .qbl-hint code{background:#fff4ec;padding:1px 6px;border-radius:6px;font-size:11px;color:#c45127;font-family:ui-monospace,SFMono-Regular,monospace}

  .qbl-toggle{display:flex;align-items:center;gap:8px;font-size:13px;color:#5a4a4a;cursor:pointer;padding:4px 0;user-select:none}
  .qbl-toggle input{width:16px;height:16px;accent-color:#ee5b9f}

  .qbl-star-picker{display:flex;align-items:center;gap:4px;padding:6px 8px;background:#fafafa;border:1px solid rgba(45,32,32,.08);border-radius:10px;width:fit-content}
  .qbl-star-btn{display:inline-flex;align-items:center;justify-content:center;padding:2px;border:none;background:transparent;color:#e5d7d0;cursor:pointer;transition:all .15s ease}
  .qbl-star-btn:hover:not(:disabled){transform:scale(1.08)}
  .qbl-star-btn.on{color:#f8a668}
  .qbl-star-btn.on svg{fill:currentColor}
  .qbl-star-btn:disabled{opacity:.6;cursor:not-allowed}
  .qbl-star-picker-val{margin-left:10px;font-size:12.5px;font-weight:700;color:#c45127;background:#fff4ec;padding:2px 10px;border-radius:100px}

  /* ─── Toast ─── */
  .qbl-toast{position:fixed;right:24px;bottom:24px;display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;font-size:13.5px;font-weight:600;box-shadow:0 8px 24px rgba(20,12,12,.18);z-index:80;animation:qbl-toast-in .2s ease-out}
  .qbl-toast.is-ok{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
  .qbl-toast.is-err{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
  @keyframes qbl-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
`;
