"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveLibraryContent } from "@/app/admin/dashboard/library/actions";

/* ── Monaco lazy-load (avoid SSR) ────────────────────────────────────────── */
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <Placeholder label="Đang tải editor…" /> }
);

/* ── Types ───────────────────────────────────────────────────────────────── */
type Layout = "split" | "editor" | "preview";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  slug: string;
  initialContent: string;
  title: string;
  /** Khi true: không save Supabase, chỉ paste → preview → copy. */
  pasteMode?: boolean;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function prettifyHtml(raw: string): string {
  if (!raw.trim()) return raw;
  return raw.replace(/></g, ">\n<").replace(/\n{3,}/g, "\n\n").trim();
}

/* ── Sub-components ──────────────────────────────────────────────────────── */
function Placeholder({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666", fontFamily: "system-ui, sans-serif", fontSize: 13, background: "#1e1e1e" }}>
      {label}
    </div>
  );
}

function ToolBtn({ children, onClick, disabled, active, accent, title, style: extraStyle }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  active?: boolean; accent?: string; title?: string; style?: React.CSSProperties;
}) {
  const bg = active ? (accent ?? "#f8a668") : accent ? accent + "22" : "#2a2a2a";
  const color = active ? "#1e1010" : (accent ?? "#ccc");
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${accent ? accent + "55" : "#444"}`, background: bg, color, fontSize: 12, fontWeight: active ? 700 : 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, lineHeight: "20px", transition: "background .15s", whiteSpace: "nowrap", fontFamily: "system-ui, sans-serif", ...extraStyle }}>
      {children}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function LibraryEditor({ slug, initialContent, title, pasteMode = false }: Props) {
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string>("");
  const [layout, setLayout] = useState<Layout>("split");
  const [previewRefresh, setPreviewRefresh] = useState(0);
  const [autoPreview, setAutoPreview] = useState(true);
  const [visualEdit, setVisualEdit] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const bodyRef = useRef<HTMLDivElement>(null);
  /* Giữ ref content mới nhất để handleSave luôn dùng giá trị hiện tại */
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  /* ── beforeunload ────────────────────────────────────────────────── */
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isDirty]);

  /* ── Save ────────────────────────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    if (saveStatus === "saving") return;
    /* Nếu đang visual edit, đọc innerHTML trước khi save */
    const html = bodyRef.current ? bodyRef.current.innerHTML : contentRef.current;
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await saveLibraryContent(slug, html);
      if (res.success) {
        setContent(html);
        setIsDirty(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveError(res.error);
        setSaveStatus("error");
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Lỗi không xác định");
      setSaveStatus("error");
    }
  }, [slug, saveStatus]);

  /* ── Ctrl/Cmd + S ────────────────────────────────────────────────── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleSave]);

  /* ── Monaco change ───────────────────────────────────────────────── */
  const handleChange = useCallback((value: string | undefined) => {
    const v = value ?? "";
    setContent(v);
    setIsDirty(v !== initialContent);
    if (saveStatus !== "idle") setSaveStatus("idle");
    if (autoPreview) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setPreviewRefresh((n) => n + 1), 700);
    }
  }, [initialContent, saveStatus, autoPreview]);

  /* ── Visual edit: inject innerHTML khi bật ───────────────────────── */
  useEffect(() => {
    if (visualEdit && bodyRef.current) {
      bodyRef.current.innerHTML = content;
      bodyRef.current.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualEdit]);

  /* ── Visual edit: sync innerHTML → content state (debounce) ──────── */
  const handleVisualInput = useCallback(() => {
    if (!bodyRef.current) return;
    const html = bodyRef.current.innerHTML;
    setContent(html);
    setIsDirty(html !== initialContent);
    if (saveStatus !== "idle") setSaveStatus("idle");
    clearTimeout(debounceRef.current);
  }, [initialContent, saveStatus]);

  /* ── Toggle visual edit ──────────────────────────────────────────── */
  const toggleVisualEdit = () => {
    if (visualEdit) {
      /* Tắt: đọc innerHTML hiện tại → sync vào Monaco */
      if (bodyRef.current) {
        const html = bodyRef.current.innerHTML;
        setContent(html);
        setIsDirty(html !== initialContent);
      }
      setVisualEdit(false);
    } else {
      /* Bật: chuyển sang Preview mode để thấy rõ */
      setLayout("preview");
      setVisualEdit(true);
    }
  };

  /* ── Actions ─────────────────────────────────────────────────────── */
  const handleReset = () => {
    if (!confirm("Reset về nội dung ban đầu?")) return;
    setContent(initialContent);
    setIsDirty(false);
    setSaveStatus("idle");
    if (visualEdit && bodyRef.current) bodyRef.current.innerHTML = initialContent;
  };

  const handleCopy = async () => {
    const html = bodyRef.current ? bodyRef.current.innerHTML : content;
    await navigator.clipboard.writeText(html);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handlePrettify = () => {
    if (visualEdit) return; // prettify chỉ ở source mode
    setContent((c) => prettifyHtml(c));
    setIsDirty(true);
  };

  /* ── Save button style ───────────────────────────────────────────── */
  const saveBtnColor = saveStatus === "saving" ? "#666" : saveStatus === "saved" ? "#6efec0" : saveStatus === "error" ? "#ee5b9f" : isDirty ? "#f8a668" : "#555";
  const saveBtnLabel = saveStatus === "saving" ? "Đang lưu…" : saveStatus === "saved" ? "✓ Đã lưu" : saveStatus === "error" ? "✗ Lỗi" : "Save ⌘S";

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── VISUAL EDIT BANNER ────────────────────────────────── */}
      {visualEdit && (
        <div style={{ padding: "6px 16px", background: "#f8a66822", borderBottom: "2px solid #f8a668", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#f8a668", fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>
            ✏ Visual Edit — click vào text để sửa trực tiếp trên preview
          </span>
          <span style={{ fontSize: 11, color: "#a08060", fontFamily: "system-ui, sans-serif" }}>
            · Ctrl+B in đậm · Ctrl+I in nghiêng · Delete xoá element đang chọn
          </span>
          <span style={{ flex: 1 }} />
          <ToolBtn onClick={toggleVisualEdit} accent="#6efec0" active>
            ✓ Xong — về Source
          </ToolBtn>
        </div>
      )}

      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#1e1e1e", borderBottom: "1px solid #333", flexShrink: 0, flexWrap: "wrap" }}>

        {/* Layout toggle — ẩn khi visual edit */}
        {!visualEdit && (
          <>
            <ToolBtn active={layout === "split"} onClick={() => setLayout("split")} accent="#f8a668">Split</ToolBtn>
            <ToolBtn active={layout === "editor"} onClick={() => setLayout("editor")} accent="#f8a668">Editor</ToolBtn>
            <ToolBtn active={layout === "preview"} onClick={() => setLayout("preview")} accent="#f8a668">Preview</ToolBtn>
            <span style={{ width: 1, height: 18, background: "#444", margin: "0 2px", flexShrink: 0 }} />
          </>
        )}

        {/* Visual Edit toggle */}
        <ToolBtn
          active={visualEdit}
          onClick={toggleVisualEdit}
          accent="#f8a668"
          title="Sửa trực tiếp trên preview — click vào text/element để chỉnh"
        >
          {visualEdit ? "✏ Visual (đang bật)" : "✏ Visual Edit"}
        </ToolBtn>

        <span style={{ width: 1, height: 18, background: "#444", margin: "0 2px", flexShrink: 0 }} />

        {/* Prettify — chỉ ở source mode */}
        {!visualEdit && (
          <ToolBtn onClick={handlePrettify} title="Format HTML">✦ Format</ToolBtn>
        )}

        {/* Copy */}
        <ToolBtn onClick={handleCopy} accent="#6ec6f5" title="Copy HTML ra clipboard">⎘ Copy</ToolBtn>

        {/* Auto-preview — chỉ ở source mode */}
        {!visualEdit && (
          <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#888", fontSize: 12, cursor: "pointer", userSelect: "none", fontFamily: "system-ui, sans-serif" }}>
            <input type="checkbox" checked={autoPreview} onChange={(e) => setAutoPreview(e.target.checked)} style={{ accentColor: "#f8a668" }} />
            Auto-preview
          </label>
        )}

        {/* Status */}
        {!pasteMode && isDirty && saveStatus === "idle" && (
          <span style={{ fontSize: 11, color: "#f8a668", fontFamily: "system-ui, sans-serif" }}>● Chưa lưu</span>
        )}
        {!pasteMode && saveStatus === "error" && (
          <span style={{ fontSize: 11, color: "#ee5b9f", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "system-ui, sans-serif" }} title={saveError}>✗ {saveError}</span>
        )}

        <span style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{content.length.toLocaleString()} ch</span>

        {!pasteMode && (
          <a href={`/kien-thuc-nen-tang/${slug}`} target="_blank" rel="noopener" style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #444", background: "#2a2a2a", color: "#ccc", fontSize: 12, textDecoration: "none", fontFamily: "system-ui, sans-serif" }}>
            Xem trang ↗
          </a>
        )}

        {!pasteMode && isDirty && (
          <ToolBtn onClick={handleReset} accent="#ee5b9f">Reset</ToolBtn>
        )}

        {!pasteMode && (
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving" || (!isDirty && saveStatus === "idle")}
            title="Lưu vào Supabase + revalidate trang public"
            style={{ padding: "5px 18px", borderRadius: 6, border: "none", background: saveBtnColor, color: "#1a1010", fontSize: 13, fontWeight: 700, cursor: saveStatus === "saving" || (!isDirty && saveStatus === "idle") ? "not-allowed" : "pointer", opacity: !isDirty && saveStatus === "idle" ? 0.45 : 1, transition: "background .2s", fontFamily: "system-ui, sans-serif" }}
          >
            {saveBtnLabel}
          </button>
        )}
      </div>

      {/* ── MAIN PANE ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT — Monaco (ẩn khi visual edit hoặc preview layout) */}
        {!visualEdit && layout !== "preview" && (
          <div style={{ flex: layout === "split" ? "0 0 50%" : "1", borderRight: layout === "split" ? "2px solid #333" : "none", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "3px 12px", background: "#252526", color: "#666", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>
              HTML Source · {title}
            </div>
            <MonacoEditor
              height="100%"
              defaultLanguage="html"
              value={content}
              onChange={handleChange}
              theme="vs-dark"
              options={{ fontSize: 13, lineHeight: 22, wordWrap: "on", minimap: { enabled: layout === "editor" }, scrollBeyondLastLine: false, formatOnPaste: false, tabSize: 2, folding: true, lineNumbers: "on", renderWhitespace: "selection", bracketPairColorization: { enabled: true }, automaticLayout: true, placeholder: pasteMode ? "Paste HTML vào đây rồi sửa..." : undefined }}
            />
          </div>
        )}

        {/* RIGHT — Preview (static) hoặc Visual edit (contenteditable) */}
        {(visualEdit || layout !== "editor") && (
          <div
            key={visualEdit ? "visual" : previewRefresh}
            style={{ flex: (!visualEdit && layout === "split") ? "0 0 50%" : "1", overflow: "auto", background: "#faf7f2", display: "flex", flexDirection: "column" }}
          >
            {/* Tab bar */}
            <div style={{ padding: "3px 12px", background: visualEdit ? "#f8a66833" : "#f3eeea", color: visualEdit ? "#f8a668" : "#aaa", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0, borderBottom: `1px solid ${visualEdit ? "#f8a66866" : "#e8e0d8"}` }}>
              {visualEdit ? "✏ VISUAL EDIT — click để sửa" : "Live Preview"}
            </div>

            <div className="ktn-lib" style={{ display: "block" }}>
              {visualEdit ? (
                /* contenteditable — React không quản lý innerHTML */
                <div
                  ref={bodyRef}
                  className="body"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  onInput={handleVisualInput}
                  style={{
                    maxWidth: 740, margin: "0 auto", padding: "2rem 1.5rem 4rem",
                    outline: "none",
                    /* Gợi ý visual: highlight element đang focus */
                  }}
                />
              ) : (
                /* dangerouslySetInnerHTML — React-controlled */
                <div
                  className="body"
                  style={{ maxWidth: 740, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}
                  /* eslint-disable-next-line react/no-danger */
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
            </div>

            {/* CSS hint khi visual edit */}
            {visualEdit && (
              <style>{`
                .ktn-lib [contenteditable] *:hover {
                  outline: 1.5px dashed rgba(248,166,104,0.5);
                  outline-offset: 2px;
                  cursor: text;
                }
                .ktn-lib [contenteditable] *:focus {
                  outline: 2px solid #f8a668;
                  outline-offset: 2px;
                }
              `}</style>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
