"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapUnderline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import TiptapYoutube from "@tiptap/extension-youtube";
import { Table as TiptapTable, TableRow as TiptapTableRow, TableCell as TiptapTableCell, TableHeader as TiptapTableHeader } from "@tiptap/extension-table";
import TiptapPlaceholder from "@tiptap/extension-placeholder";
import {
  Bold,
  CirclePlay,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Link2Off,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Pilcrow,
  Quote,
  RotateCcw,
  RotateCw,
  Strikethrough,
  Table,
  Terminal,
  Underline as UnderlineIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type AdminRichTextEditorProps = {
  onChange?: (html: string) => void;
  onUploadChange?: (isPending: boolean) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=)([\w-]{11})/);
  return m?.[1] ?? null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminRichTextEditor({
  onChange,
  onUploadChange,
  placeholder = "Nhập nội dung…",
  minHeight = "160px",
  maxHeight = "480px",
}: AdminRichTextEditorProps) {
  const pendingCountRef = useRef(0);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  function incPending() {
    pendingCountRef.current++;
    setUploadingCount(pendingCountRef.current);
    onUploadChange?.(true);
  }
  function decPending() {
    pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
    setUploadingCount(pendingCountRef.current);
    if (pendingCountRef.current === 0) onUploadChange?.(false);
  }

  async function doUpload(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/admin/api/upload-cf-image", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`Lỗi máy chủ ${res.status}`);
    const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
    if (!json.ok || !json.url) throw new Error(json.error ?? "Upload thất bại");
    return json.url;
  }

  async function handleImageFile(file: File) {
    const ed = editorRef.current;
    if (!ed) return;
    const blobUrl = URL.createObjectURL(file);
    ed.chain().focus().setImage({ src: blobUrl, alt: "uploading" }).run();
    incPending();
    setUploadError(null);
    try {
      const url = await doUpload(file);
      const cur = editorRef.current;
      if (cur) {
        let found = false;
        cur.state.doc.descendants((node, pos) => {
          if (found) return false;
          if (node.type.name === "image" && node.attrs.src === blobUrl) {
            cur.view.dispatch(
              cur.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: url, alt: "" }),
            );
            found = true;
          }
        });
      }
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const cur = editorRef.current;
      if (cur) {
        let found = false;
        cur.state.doc.descendants((node, pos) => {
          if (found) return false;
          if (node.type.name === "image" && node.attrs.src === blobUrl) {
            cur.view.dispatch(cur.state.tr.delete(pos, pos + node.nodeSize));
            found = true;
          }
        });
      }
      URL.revokeObjectURL(blobUrl);
      setUploadError(err instanceof Error ? err.message : "Upload ảnh thất bại");
    } finally {
      decPending();
    }
  }

  function handleSetLink() {
    const prev = editorRef.current?.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL liên kết:", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) {
      editorRef.current?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editorRef.current?.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function handleYoutubeEmbed() {
    const raw = window.prompt("Nhúng video YouTube — dán URL:", "");
    if (!raw?.trim()) return;
    const id = extractYouTubeId(raw.trim());
    if (!id) {
      window.alert(
        "URL YouTube không hợp lệ.\nThử dạng: https://youtube.com/watch?v=XXX hoặc https://youtu.be/XXX",
      );
      return;
    }
    editorRef.current
      ?.chain()
      .focus()
      .setYoutubeVideo({ src: `https://www.youtube.com/embed/${id}` })
      .run();
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapImage.configure({ allowBase64: false, inline: false }),
      TiptapUnderline,
      TiptapLink.configure({ openOnClick: false, autolink: true }),
      TiptapYoutube.configure({ width: 640, height: 360, nocookie: false }),
      TiptapTable.configure({ resizable: true }),
      TiptapTableRow,
      TiptapTableCell,
      TiptapTableHeader,
      TiptapPlaceholder.configure({ placeholder }),
    ],
    onUpdate({ editor: e }) {
      onChange?.(e.getHTML());
    },
    editorProps: {
      handlePaste(_, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imgs = items
          .filter((i) => i.type.startsWith("image/"))
          .map((i) => i.getAsFile())
          .filter((f): f is File => f !== null);
        if (!imgs.length) return false;
        event.preventDefault();
        imgs.forEach((f) => void handleImageFile(f));
        return true;
      },
      handleDrop(_, event) {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (!files.length) return false;
        event.preventDefault();
        files.forEach((f) => void handleImageFile(f));
        return true;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const inTable = editor?.isActive("table") ?? false;

  // ── Toolbar helpers ──────────────────────────────────────────────────────
  const tb = (active?: boolean, disabled?: boolean) =>
    cn(
      "inline-flex items-center justify-center rounded-md px-1.5 py-1 text-[12px] font-medium transition-colors select-none",
      disabled
        ? "cursor-not-allowed opacity-25"
        : active
          ? "bg-[#BC8AF9]/15 text-[#4a1d96] ring-1 ring-[#BC8AF9]/35"
          : "text-[#444] hover:bg-black/[0.07] active:bg-black/10",
    );

  const sep = <div className="mx-1 h-4 w-px shrink-0 bg-[#EAEAEA]" />;

  const groupLabel = (text: string) => (
    <span className="self-center px-0.5 text-[9.5px] font-bold uppercase tracking-widest text-[#CCCCCC]">
      {text}
    </span>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-xl border border-[#EAEAEA] bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
      {/* ─── Toolbar ─── */}
      <div className="flex flex-col divide-y divide-[#EAEAEA]/70 border-b border-[#EAEAEA] bg-[#fafafa] text-[12px]">

        {/* Row 1 — Text formatting + Headings + Lists */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
          <button type="button" className={tb(editor?.isActive("bold"))} title="In đậm (Ctrl+B)"
            onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("italic"))} title="In nghiêng (Ctrl+I)"
            onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("underline"))} title="Gạch chân (Ctrl+U)"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("strike"))} title="Gạch ngang"
            onClick={() => editor?.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("code"))} title="Code inline"
            onClick={() => editor?.chain().focus().toggleCode().run()}>
            <Code className="h-3.5 w-3.5" />
          </button>

          {sep}

          <button type="button" className={tb(editor?.isActive("heading", { level: 1 }))} title="Tiêu đề 1"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("heading", { level: 2 }))} title="Tiêu đề 2"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("heading", { level: 3 }))} title="Tiêu đề 3"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("paragraph"))} title="Đoạn văn (P)"
            onClick={() => editor?.chain().focus().setParagraph().run()}>
            <Pilcrow className="h-3.5 w-3.5" />
          </button>

          {sep}

          <button type="button" className={tb(editor?.isActive("bulletList"))} title="Danh sách • (Bullet)"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("orderedList"))} title="Danh sách số"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("blockquote"))} title="Trích dẫn"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
            <Quote className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(editor?.isActive("codeBlock"))} title="Khối code"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
            <Terminal className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Row 2 — Table */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
          {groupLabel("Bảng")}
          {sep}
          <button type="button" className={tb(false)} title="Chèn bảng mới"
            onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <Table className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb(false, !inTable)} disabled={!inTable} title="+Cột trái"
            onClick={() => editor?.chain().focus().addColumnBefore().run()}>
            +←Col
          </button>
          <button type="button" className={tb(false, !inTable)} disabled={!inTable} title="+Cột phải"
            onClick={() => editor?.chain().focus().addColumnAfter().run()}>
            Col→+
          </button>
          <button type="button" className={tb(false, !inTable)} disabled={!inTable} title="Xóa cột"
            onClick={() => editor?.chain().focus().deleteColumn().run()}>
            −Col
          </button>
          {sep}
          <button type="button" className={tb(false, !inTable)} disabled={!inTable} title="+Hàng trên"
            onClick={() => editor?.chain().focus().addRowBefore().run()}>
            +↑Row
          </button>
          <button type="button" className={tb(false, !inTable)} disabled={!inTable} title="+Hàng dưới"
            onClick={() => editor?.chain().focus().addRowAfter().run()}>
            Row↓+
          </button>
          <button type="button" className={tb(false, !inTable)} disabled={!inTable} title="Xóa hàng"
            onClick={() => editor?.chain().focus().deleteRow().run()}>
            −Row
          </button>
          {sep}
          <button type="button" className={tb(false, !inTable)} disabled={!inTable} title="Gộp ô"
            onClick={() => editor?.chain().focus().mergeCells().run()}>
            Merge
          </button>
          <button type="button" className={tb(false, !inTable)} disabled={!inTable} title="Tách ô"
            onClick={() => editor?.chain().focus().splitCell().run()}>
            Split
          </button>
          <button type="button" className={tb(false, !inTable)} disabled={!inTable} title="Tiêu đề hàng"
            onClick={() => editor?.chain().focus().toggleHeaderRow().run()}>
            Header
          </button>
          {sep}
          <button
            type="button"
            disabled={!inTable}
            title="Xóa bảng"
            className={cn(tb(false, !inTable), inTable && "hover:bg-red-50 hover:text-red-600")}
            onClick={() => editor?.chain().focus().deleteTable().run()}
          >
            ×Bảng
          </button>
        </div>

        {/* Row 3 — Media + HR + Undo/Redo */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
          {groupLabel("Media")}
          {sep}
          <button type="button" className={tb(editor?.isActive("link"))} title="Đặt link"
            onClick={handleSetLink}>
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb()} title="Gỡ link"
            onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}>
            <Link2Off className="h-3.5 w-3.5" />
          </button>
          {sep}
          <button type="button" className={tb()} title="Chèn ảnh từ file"
            onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImageFile(f);
              e.target.value = "";
            }}
          />
          <button type="button"
            className={cn(tb(), "text-red-500 hover:bg-red-50")}
            title="Nhúng video YouTube"
            onClick={handleYoutubeEmbed}>
            <CirclePlay className="h-3.5 w-3.5" />
            <span className="ml-1">YouTube</span>
          </button>

          {sep}

          <button type="button" className={tb()} title="Đường kẻ ngang"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
            <Minus className="h-3.5 w-3.5" />
          </button>

          {sep}

          <button type="button" className={tb()} title="Hoàn tác (Ctrl+Z)"
            onClick={() => editor?.chain().focus().undo().run()}>
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={tb()} title="Làm lại (Ctrl+Y)"
            onClick={() => editor?.chain().focus().redo().run()}>
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          {sep}

          {uploadingCount > 0 ? (
            <span className="ml-1 flex items-center gap-1 text-[11px] font-medium text-[#BC8AF9]">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Đang tải {uploadingCount > 1 ? `${uploadingCount} ảnh` : "ảnh"}…
            </span>
          ) : (
            <span className="ml-auto text-[11px] text-[#BBBBBB]">Paste / kéo thả ảnh</span>
          )}
        </div>
      </div>

      {/* ─── Editor Area ─── */}
      <EditorContent
        editor={editor}
        style={{ minHeight, maxHeight }}
        className={cn(
          "overflow-y-auto px-3 py-2.5 text-[13px] leading-relaxed text-[#323232]",
          // ProseMirror core
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror>*+*]:mt-1.5",
          "[&_.ProseMirror_p]:my-0",
          // Placeholder (via Tiptap extension)
          "[&_.ProseMirror_p.is-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-empty:first-child::before]:float-left [&_.ProseMirror_p.is-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-empty:first-child::before]:text-[#BBBBBB] [&_.ProseMirror_p.is-empty:first-child::before]:content-[attr(data-placeholder)]",
          // Headings
          "[&_.ProseMirror_h1]:mb-1 [&_.ProseMirror_h1]:mt-3 [&_.ProseMirror_h1]:text-[22px] [&_.ProseMirror_h1]:font-bold",
          "[&_.ProseMirror_h2]:mb-0.5 [&_.ProseMirror_h2]:mt-2 [&_.ProseMirror_h2]:text-[18px] [&_.ProseMirror_h2]:font-bold",
          "[&_.ProseMirror_h3]:mb-0.5 [&_.ProseMirror_h3]:mt-1.5 [&_.ProseMirror_h3]:text-[15px] [&_.ProseMirror_h3]:font-semibold",
          // Lists
          "[&_.ProseMirror_ul]:my-0.5 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5",
          "[&_.ProseMirror_ol]:my-0.5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5",
          "[&_.ProseMirror_li]:my-0",
          // Marks
          "[&_.ProseMirror_strong]:font-bold",
          "[&_.ProseMirror_em]:italic",
          "[&_.ProseMirror_u]:underline",
          "[&_.ProseMirror_s]:line-through",
          "[&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-[#f0eee7] [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-[12px] [&_.ProseMirror_code]:text-[#d4537e]",
          // Code block
          "[&_.ProseMirror_pre]:my-2 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-[#1e1e1e] [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-[12px] [&_.ProseMirror_pre]:text-[#d4d4d4]",
          "[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_pre_code]:text-inherit",
          // Blockquote
          "[&_.ProseMirror_blockquote]:my-1 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[#BC8AF9]/50 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-[#666]",
          // Links
          "[&_.ProseMirror_a]:text-[#185fa5] [&_.ProseMirror_a]:underline [&_.ProseMirror_a:hover]:opacity-80",
          // Horizontal rule
          "[&_.ProseMirror_hr]:my-3 [&_.ProseMirror_hr]:border-none [&_.ProseMirror_hr]:border-t [&_.ProseMirror_hr]:border-[#EAEAEA]",
          // Images
          "[&_.ProseMirror_img]:my-2 [&_.ProseMirror_img]:block [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg",
          "[&_.ProseMirror_img.ProseMirror-selectednode]:outline [&_.ProseMirror_img.ProseMirror-selectednode]:outline-2 [&_.ProseMirror_img.ProseMirror-selectednode]:outline-[#BC8AF9]",
          // YouTube — wrapper div
          "[&_.ProseMirror_[data-youtube-video]]:relative [&_.ProseMirror_[data-youtube-video]]:my-3 [&_.ProseMirror_[data-youtube-video]]:w-full [&_.ProseMirror_[data-youtube-video]]:overflow-hidden [&_.ProseMirror_[data-youtube-video]]:rounded-lg [&_.ProseMirror_[data-youtube-video]]:pb-[56.25%]",
          "[&_.ProseMirror_[data-youtube-video]_iframe]:absolute [&_.ProseMirror_[data-youtube-video]_iframe]:inset-0 [&_.ProseMirror_[data-youtube-video]_iframe]:h-full [&_.ProseMirror_[data-youtube-video]_iframe]:w-full [&_.ProseMirror_[data-youtube-video]_iframe]:border-0",
          // Table
          "[&_.ProseMirror_table]:my-2 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:table-fixed [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:overflow-hidden",
          "[&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-[#d8d6ce] [&_.ProseMirror_th]:bg-[#f5f4ef] [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:text-left [&_.ProseMirror_th]:text-[12px] [&_.ProseMirror_th]:font-semibold",
          "[&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-[#d8d6ce] [&_.ProseMirror_td]:p-2 [&_.ProseMirror_td]:align-top [&_.ProseMirror_td]:text-[12px]",
          "[&_.ProseMirror_.selectedCell]:after:pointer-events-none [&_.ProseMirror_.selectedCell]:after:absolute [&_.ProseMirror_.selectedCell]:after:inset-0 [&_.ProseMirror_.selectedCell]:after:z-[2] [&_.ProseMirror_.selectedCell]:after:bg-[#378add]/20 [&_.ProseMirror_.selectedCell]:after:content-[''] [&_.ProseMirror_.selectedCell]:relative",
          "[&_.ProseMirror_.column-resize-handle]:pointer-events-none [&_.ProseMirror_.column-resize-handle]:absolute [&_.ProseMirror_.column-resize-handle]:-right-0.5 [&_.ProseMirror_.column-resize-handle]:bottom-[-2px] [&_.ProseMirror_.column-resize-handle]:top-0 [&_.ProseMirror_.column-resize-handle]:w-1 [&_.ProseMirror_.column-resize-handle]:bg-[#BC8AF9]",
        )}
      />

      {/* ─── Upload error ─── */}
      {uploadError ? (
        <div className="flex items-center gap-2 border-t border-red-100 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
          <span className="shrink-0">⚠</span>
          <span>{uploadError} — ảnh không được đính kèm, thử lại hoặc dùng ảnh khác.</span>
          <button
            type="button"
            className="ml-auto shrink-0 text-red-400 hover:text-red-600"
            onClick={() => setUploadError(null)}
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}
