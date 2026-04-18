"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { cn } from "@/lib/utils";

type Props = {
  /** Nhãn hiển thị (không nhắc URL) */
  label: string;
  /** Gửi kèm form server action */
  name?: string;
  /** Giá trị ban đầu (uncontrolled) */
  defaultValue?: string | null;
  /** Khi đổi (vd. mở panel sửa bản ghi khác) để đồng bộ lại */
  syncKey?: string | number;
  /** Điều khiển từ component cha (vd. state FormData) */
  value?: string;
  onValueChange?: (url: string) => void;
  className?: string;
  /**
   * `banner` — khung 16:9 (ảnh lớp).
   * `avatar` — khung vuông, bo tròn (ảnh đại diện nhân sự).
   */
  preview?: "banner" | "avatar";
  /** Ẩn khối tiêu đề + hướng dẫn dài (dùng khi cha đã có nhãn, vd. FieldRow). */
  compact?: boolean;
};

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

/** Một số trình duyệt/OS chỉ đưa ảnh qua Clipboard API, không có file trong `paste`. */
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
    /* Quyền clipboard hoặc không hỗ trợ */
  }
  return null;
}

export function AdminCfImageInput({
  label,
  name,
  defaultValue = "",
  syncKey,
  value: controlledValue,
  onValueChange,
  className,
  preview = "banner",
  compact = false,
}: Props) {
  const isControlled = controlledValue !== undefined;
  const [internal, setInternal] = useState(() => (isControlled ? controlledValue : (defaultValue ?? "").trim()));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Chuột đang trên widget — cho phép Ctrl+V khi không focus ô nhập liệu khác. */
  const pointerInsideRef = useRef(false);
  const id = useId();
  const fileInputId = `${id}-file`;

  const url = isControlled ? controlledValue : internal;

  const setUrl = useCallback(
    (next: string) => {
      if (isControlled) {
        onValueChange?.(next);
      } else {
        setInternal(next);
        onValueChange?.(next);
      }
    },
    [isControlled, onValueChange]
  );

  useEffect(() => {
    if (isControlled) return;
    setInternal((defaultValue ?? "").trim());
  }, [defaultValue, syncKey, isControlled]);

  const runUpload = useCallback(
    async (blob: Blob, filename: string) => {
      setErr(null);
      setBusy(true);
      try {
        const u = await uploadAdminCfImage(blob, filename);
        setUrl(u);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Lỗi tải ảnh.");
      } finally {
        setBusy(false);
      }
    },
    [setUrl]
  );

  const onFile = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f || !f.type.startsWith("image/")) {
      setErr("Vui lòng chọn file ảnh (JPG, PNG…).");
      return;
    }
    await runUpload(f, f.name || "image.jpg");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePasteEvent = useCallback(
    async (e: ClipboardEvent) => {
      if (busy) return;
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
        setErr("Chỉ dán ảnh (sao chép hình), không dán đường link.");
      }
    },
    [busy, runUpload]
  );

  useEffect(() => {
    if (busy) return;
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
  }, [busy, handlePasteEvent]);

  return (
    <div
      ref={rootRef}
      className={cn("space-y-2", className)}
      onMouseEnter={() => {
        pointerInsideRef.current = true;
      }}
      onMouseLeave={() => {
        pointerInsideRef.current = false;
      }}
    >
      {compact ? null : (
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">{label}</div>
          <p className="m-0 text-[11px] leading-snug text-[#888]">
            Chọn file, hoặc đặt chuột trong vùng này (hoặc tab vào khung ảnh) rồi <strong className="font-semibold text-[#666]">Ctrl+V</strong> để dán ảnh từ bộ nhớ tạm. Ảnh tải lên tự động — không dán link.
          </p>
        </div>
      )}

      {name ? <input type="hidden" name={name} value={url} readOnly aria-hidden /> : null}

      <input
        ref={fileRef}
        id={fileInputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => void onFile(e.target.files)}
        aria-labelledby={id}
      />

      <label
        htmlFor={fileInputId}
        id={id}
        tabIndex={busy ? -1 : 0}
        className={cn(
          "relative block cursor-pointer overflow-hidden border-[1.5px] border-dashed border-[#EAEAEA] bg-[#fafafa] outline-none transition",
          "focus-within:border-[#BC8AF9] focus-within:ring-[3px] focus-within:ring-[#BC8AF9]/15",
          "focus-visible:border-[#BC8AF9] focus-visible:ring-[3px] focus-visible:ring-[#BC8AF9]/15",
          busy && "pointer-events-none cursor-wait opacity-70",
          preview === "avatar"
            ? "aspect-square w-full max-w-[168px] rounded-2xl"
            : "aspect-[16/9] w-full rounded-[10px]"
        )}
      >
        <span className="sr-only">{label} — chọn hoặc dán ảnh</span>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL Cloudflare động
          <img
            src={url}
            alt=""
            className={cn(
              "h-full w-full object-cover",
              preview === "avatar" ? "rounded-2xl" : ""
            )}
          />
        ) : (
          <div
            className={cn(
              "flex w-full flex-col items-center justify-center gap-1 text-[#bbb]",
              preview === "avatar"
                ? "aspect-square max-w-[168px] rounded-2xl"
                : "aspect-[16/9]"
            )}
          >
            <ImagePlus size={preview === "avatar" ? 24 : 28} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">Chưa có ảnh</span>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75">
            <Loader2 className="animate-spin text-[#BC8AF9]" size={28} />
          </div>
        ) : null}
      </label>

      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={fileInputId}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-semibold text-[#555] hover:bg-[#fafafa]",
            busy && "pointer-events-none cursor-wait opacity-50"
          )}
        >
          <Upload size={14} />
          Chọn từ máy tính
        </label>
        {url ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setErr(null);
              setUrl("");
            }}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-red-100 bg-red-50/80 px-3 py-2 text-[12px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Gỡ ảnh
          </button>
        ) : null}
      </div>

      {err ? <p className="m-0 text-[11px] font-semibold text-red-600">{err}</p> : null}
    </div>
  );
}
