"use client";

import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { cn } from "@/lib/utils";

export type MinhHoaUploadSlot = {
  id: string;
  url: string | null;
  uploading: boolean;
  error: string | null;
};

export function collectImageFilesFromDataTransfer(dt: DataTransfer): File[] {
  const byKey = new Map<string, File>();
  const add = (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    const k = `${f.name}-${f.size}-${f.lastModified}`;
    if (!byKey.has(k)) byKey.set(k, f);
  };
  if (dt.files?.length) {
    for (let i = 0; i < dt.files.length; i += 1) add(dt.files.item(i));
  }
  for (let i = 0; i < dt.items.length; i += 1) {
    const it = dt.items[i];
    if (it.kind === "file") add(it.getAsFile());
  }
  return [...byKey.values()];
}

export function slotsFromMinhHoaUrls(urls: string[] | null | undefined): MinhHoaUploadSlot[] {
  return (urls ?? []).filter(Boolean).map((url) => ({
    id: crypto.randomUUID(),
    url,
    uploading: false,
    error: null,
  }));
}

export function minhHoaUrlsFromSlots(slots: MinhHoaUploadSlot[]): string[] {
  return slots.map((s) => s.url).filter((u): u is string => Boolean(u?.trim()));
}

type Props = {
  slots: MinhHoaUploadSlot[];
  setSlots: Dispatch<SetStateAction<MinhHoaUploadSlot[]>>;
  /** className bổ sung cho vùng dashed (Tailwind). */
  regionClassName?: string;
};

export default function AdminMinhHoaDropzone({ slots, setSlots, regionClassName }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadSlots = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const id = crypto.randomUUID();
        setSlots((prev) => [...prev, { id, url: null, uploading: true, error: null }]);
        void uploadAdminCfImage(file, file.name || "image.png")
          .then((url) => {
            setSlots((prev) =>
              prev.map((s) => (s.id === id ? { ...s, url, uploading: false, error: null } : s)),
            );
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : "Lỗi tải ảnh.";
            setSlots((prev) =>
              prev.map((s) => (s.id === id ? { ...s, url: null, uploading: false, error: msg } : s)),
            );
          });
      }
    },
    [setSlots],
  );

  const removeSlot = useCallback(
    (id: string) => {
      setSlots((prev) => prev.filter((s) => s.id !== id));
    },
    [setSlots],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = collectImageFilesFromDataTransfer(e.clipboardData);
      if (files.length) {
        e.preventDefault();
        uploadSlots(files);
      }
    },
    [uploadSlots],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = collectImageFilesFromDataTransfer(e.dataTransfer);
      if (files.length) uploadSlots(files);
    },
    [uploadSlots],
  );

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Minh họa — dán hoặc kéo thả ảnh"
      onPaste={onPaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "rounded-xl border border-dashed border-[#EAEAEA] bg-[#fafafa] px-3 py-3 outline-none transition focus:border-[#f8a668] focus:ring-2 focus:ring-[#f8a668]/25",
        regionClassName,
      )}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-semibold text-[#555] hover:bg-white"
        >
          <Upload size={14} aria-hidden />
          Chọn ảnh
        </button>
        <span className="inline-flex items-center gap-1 text-[11px] text-[#aaa]">
          <ImagePlus size={14} aria-hidden />
          Nhấn vào khung rồi dán
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          const list = e.target.files;
          if (list?.length) uploadSlots([...list]);
          e.target.value = "";
        }}
      />
      {slots.length === 0 ? (
        <p className="text-[12px] text-[#aaa]">Chưa có ảnh minh họa.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
          {slots.map((s) => (
            <li
              key={s.id}
              className="relative overflow-hidden rounded-lg border border-[#EAEAEA] bg-white"
              style={{ aspectRatio: "4/3" }}
            >
              {s.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL Cloudflare động
                <img src={s.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#f5f5f5] text-[11px] text-[#888]">
                  {s.uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#ee5ca2]" aria-label="Đang tải" />
                  ) : (
                    "Lỗi"
                  )}
                </div>
              )}
              {s.error && !s.url ? (
                <div className="absolute inset-x-0 bottom-0 bg-red-50/95 px-1 py-0.5 text-[9px] leading-tight text-red-700">
                  {s.error}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => removeSlot(s.id)}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white/95 text-red-600 shadow-sm hover:bg-red-50"
                aria-label="Xóa ảnh"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
