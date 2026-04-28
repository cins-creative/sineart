"use client";

import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { cn } from "@/lib/utils";

function pickFileFromClipboard(items: DataTransferItemList): File | null {
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    if (it.kind === "file") {
      const f = it.getAsFile();
      if (f && f.type.startsWith("image/")) return f;
    }
  }
  return null;
}

async function tryReadImageFromClipboardApi(): Promise<{ blob: Blob; name: string } | null> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.read) return null;
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith("image/")) {
          const blob = await item.getType(type);
          const ext = type.split("/")[1]?.split("+")[0] ?? "png";
          return { blob, name: `paste.${ext}` };
        }
      }
    }
  } catch {
    /* quyền clipboard */
  }
  return null;
}

type Props = {
  urls: string[];
  onUrlsChange: Dispatch<SetStateAction<string[]>>;
  disabled?: boolean;
};

export function KnowledgeKbImageAttachments({
  urls,
  onUrlsChange,
  disabled = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerInsideRef = useRef(false);
  const id = useId();
  const fileInputId = `${id}-kb-files`;

  const runUpload = useCallback(
    async (blob: Blob, filename: string) => {
      setErr(null);
      setBusy(true);
      try {
        const u = await uploadAdminCfImage(blob, filename);
        onUrlsChange((prev) => [...prev, u]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Tải ảnh thất bại.");
      } finally {
        setBusy(false);
      }
    },
    [onUrlsChange],
  );

  const runUploadMany = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length) {
        setErr("Chỉ nhận file ảnh (JPG, PNG…).");
        return;
      }
      setErr(null);
      setBusy(true);
      try {
        for (const f of images) {
          const u = await uploadAdminCfImage(f, f.name || "image.jpg");
          onUrlsChange((prev) => [...prev, u]);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Tải ảnh thất bại.");
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [onUrlsChange],
  );

  const handlePasteEvent = useCallback(
    async (e: ClipboardEvent) => {
      if (disabled || busy) return;
      const dt = e.clipboardData;
      const file = dt ? pickFileFromClipboard(dt.items) : null;
      if (file) {
        e.preventDefault();
        e.stopPropagation();
        await runUpload(file, file.name || "paste.png");
        return;
      }
      const fromApi = await tryReadImageFromClipboardApi();
      if (fromApi) {
        e.preventDefault();
        e.stopPropagation();
        await runUpload(fromApi.blob, fromApi.name);
        return;
      }
      const text = dt?.getData("text/plain").trim() ?? "";
      if (/^https?:\/\//i.test(text)) {
        e.preventDefault();
        e.stopPropagation();
        onUrlsChange((prev) => (prev.includes(text) ? prev : [...prev, text]));
      }
    },
    [disabled, busy, runUpload, onUrlsChange],
  );

  useEffect(() => {
    if (disabled || busy) return;
    const onWindowPaste = (e: ClipboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const a = document.activeElement;
      const focusInWidget = !!(a && root.contains(a));
      if (!focusInWidget && !pointerInsideRef.current) return;
      if (!focusInWidget) {
        const tag = a?.tagName?.toLowerCase();
        const typingElsewhere =
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          (a instanceof HTMLElement && a.isContentEditable);
        if (typingElsewhere) return;
      }
      void handlePasteEvent(e);
    };
    window.addEventListener("paste", onWindowPaste, true);
    return () => window.removeEventListener("paste", onWindowPaste, true);
  }, [disabled, busy, handlePasteEvent]);

  const removeAt = (index: number) => {
    onUrlsChange((prev) => prev.filter((_, j) => j !== index));
  };

  return (
    <div
      ref={rootRef}
      className="space-y-2"
      onMouseEnter={() => {
        pointerInsideRef.current = true;
      }}
      onMouseLeave={() => {
        pointerInsideRef.current = false;
      }}
    >
      <p className="m-0 text-[11px] leading-snug text-black/45">
        <strong className="font-semibold text-black/55">Ảnh minh họa:</strong> chọn file từ máy (nhiều ảnh được), kéo thả vào khung, hoặc đặt chuột trong vùng dưới và{" "}
        <strong className="font-semibold text-black/55">Ctrl+V</strong> để dán ảnh từ clipboard — hoặc dán trực tiếp một URL ảnh{" "}
        <span className="font-mono text-[10px] text-black/35">(https://…)</span>.
      </p>

      <input
        ref={fileRef}
        id={fileInputId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => void runUploadMany(Array.from(e.target.files ?? []))}
        aria-label="Chọn ảnh từ máy"
      />

      <div
        tabIndex={0}
        className={cn(
          "rounded-xl border border-dashed border-black/[0.12] bg-black/[0.02] p-3 outline-none transition",
          "focus-visible:border-[#BC8AF9]/50 focus-visible:ring-2 focus-visible:ring-[#BC8AF9]/25",
          (disabled || busy) && "pointer-events-none opacity-60",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void runUploadMany(Array.from(e.dataTransfer.files ?? []));
        }}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative aspect-video overflow-hidden rounded-lg border border-black/[0.08] bg-white shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL Cloudflare động */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Xóa ảnh"
                disabled={disabled || busy}
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white/95 text-black/65 shadow-sm opacity-0 transition hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
              >
                <Trash2 size={15} strokeWidth={2} aria-hidden />
              </button>
            </div>
          ))}

          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => fileRef.current?.click()}
            className="flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/[0.14] bg-white/80 text-[11px] font-semibold text-black/45 transition hover:border-[#BC8AF9]/35 hover:bg-[#BC8AF9]/5 hover:text-black/65"
          >
            {busy ? (
              <Loader2 className="animate-spin text-[#BC8AF9]" size={22} aria-hidden />
            ) : (
              <>
                <ImagePlus size={22} strokeWidth={1.75} className="text-black/35" aria-hidden />
                <span>Thêm ảnh</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={fileInputId}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-[12px] font-semibold text-black/70 hover:bg-black/[0.03]",
            (disabled || busy) && "pointer-events-none opacity-50",
          )}
        >
          <Upload size={14} aria-hidden />
          Chọn từ máy tính
        </label>
      </div>

      {err ? <p className="m-0 text-[11px] font-semibold text-red-600">{err}</p> : null}
    </div>
  );
}
