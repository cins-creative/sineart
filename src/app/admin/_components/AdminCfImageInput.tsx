"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

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

async function uploadToCf(blob: Blob, filename: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, filename);
  const res = await fetch("/admin/api/upload-cf-image", { method: "POST", body: fd, credentials: "same-origin" });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok || typeof json !== "object" || json === null || (json as { ok?: unknown }).ok !== true) {
    const err =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error?: unknown }).error)
        : "Tải ảnh thất bại.";
    throw new Error(err);
  }
  const url = (json as { url?: unknown }).url;
  if (typeof url !== "string" || !url.trim()) throw new Error("Không nhận được link ảnh.");
  return url.trim();
}

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
  const id = useId();

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

  const runUpload = async (blob: Blob, filename: string) => {
    setErr(null);
    setBusy(true);
    try {
      const u = await uploadToCf(blob, filename);
      setUrl(u);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải ảnh.");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f || !f.type.startsWith("image/")) {
      setErr("Vui lòng chọn file ảnh (JPG, PNG…).");
      return;
    }
    await runUpload(f, f.name || "image.jpg");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const file = pickFileFromClipboard(e.clipboardData.items);
    if (file) {
      e.preventDefault();
      void runUpload(file, file.name || "paste.png");
      return;
    }
    const text = e.clipboardData.getData("text/plain").trim();
    if (/^https?:\/\//i.test(text)) {
      e.preventDefault();
      setErr("Chỉ dán ảnh (sao chép hình), không dán đường link.");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {compact ? null : (
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">{label}</div>
          <p className="m-0 text-[11px] leading-snug text-[#888]">
            Nhấn vào khung ảnh hoặc «Chọn từ máy tính», hoặc nhấn vào khung rồi dán ảnh đã sao chép (Ctrl+V). Ảnh tải lên tự động — không cần dán link.
          </p>
        </div>
      )}

      {name && !isControlled ? <input type="hidden" name={name} value={url} readOnly aria-hidden /> : null}

      <div
        tabIndex={0}
        role="button"
        aria-labelledby={id}
        onPaste={onPaste}
        onClick={() => {
          if (!busy) fileRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!busy) fileRef.current?.click();
          }
        }}
        className={cn(
          "relative cursor-pointer overflow-hidden border-[1.5px] border-dashed border-[#EAEAEA] bg-[#fafafa] outline-none transition",
          "focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15",
          preview === "avatar"
            ? "aspect-square w-full max-w-[168px] rounded-2xl"
            : "aspect-[16/9] w-full rounded-[10px]"
        )}
      >
        <span id={id} className="sr-only">
          {label} — vùng dán ảnh
        </span>
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
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-semibold text-[#555] hover:bg-[#fafafa] disabled:opacity-50"
        >
          <Upload size={14} />
          Chọn từ máy tính
        </button>
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

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void onFile(e.target.files)}
      />

      {err ? <p className="m-0 text-[11px] font-semibold text-red-600">{err}</p> : null}
    </div>
  );
}
