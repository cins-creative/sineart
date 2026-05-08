"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, ImagePlus } from "lucide-react";

import { updateStaffSelfAvatar } from "@/app/admin/dashboard/ho-so-ca-nhan/actions";
import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { cn } from "@/lib/utils";

function staffInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

export default function StaffPersonalHeaderAvatar({
  isSelf,
  displayName,
  initialUrl,
}: Readonly<{
  isSelf: boolean;
  displayName: string;
  initialUrl: string | null;
}>) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl?.trim() || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(initialUrl?.trim() || "");
  }, [initialUrl]);

  const saveAvatarToDb = useCallback(
    async (nextUrl: string | null) => {
      const prev = url;
      const r = await updateStaffSelfAvatar(nextUrl);
      if (!r.ok) {
        setErr(r.error);
        setUrl(prev);
        return;
      }
      setUrl(nextUrl ?? "");
      router.refresh();
    },
    [router, url],
  );

  const onPickFile = useCallback(
    async (files: FileList | null) => {
      const f = files?.[0];
      if (!f || !f.type.startsWith("image/")) return;
      setBusy(true);
      setErr(null);
      try {
        const uploaded = await uploadAdminCfImage(f, f.name || "avatar.jpg");
        await saveAvatarToDb(uploaded);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Không tải được ảnh.");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [saveAvatarToDb],
  );

  const onRemove = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      await saveAvatarToDb(null);
    } finally {
      setBusy(false);
    }
  }, [saveAvatarToDb]);

  if (!isSelf) {
    return (
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm ring-1 ring-black/[0.04] md:h-[100px] md:w-[100px]">
        {initialUrl?.trim() ? (
          <img
            src={initialUrl.trim()}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-2xl font-bold text-white md:text-3xl"
            style={{ background: "linear-gradient(135deg, #f8a668, #ee5ca2)" }}
            aria-hidden
          >
            {staffInitial(displayName)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col gap-2">
      {/* Avatar trái, hai nút xếp dọc bên phải */}
      <div className="flex w-full min-w-0 flex-row items-start gap-3 sm:gap-4">
        <div
          className={cn(
            "relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm ring-1 ring-black/[0.04] md:h-[100px] md:w-[100px]",
            busy && "opacity-85",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-hidden
            disabled={busy}
            onChange={(e) => void onPickFile(e.target.files)}
          />
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL động CF Images
            <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-2xl font-bold text-white md:text-3xl"
              style={{ background: "linear-gradient(135deg, #f8a668, #ee5ca2)" }}
              aria-hidden
            >
              {staffInitial(displayName)}
            </div>
          )}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-8 w-8 animate-spin text-[#bc89f8]" aria-hidden />
            </div>
          ) : null}
        </div>

        {/* Luôn hiển thị; vùng chạm ≥44px; cột dọc cạnh avatar */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-2 sm:max-w-[240px]">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#f8a668]/45 bg-white px-3 py-2 text-xs font-bold text-[#b45376] shadow-sm transition",
              "active:scale-[0.98] disabled:opacity-50",
              "hover:bg-[#fff8f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bc89f8]",
            )}
          >
            {url ? (
              <Camera className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            )}
            {url ? "Đổi ảnh" : "Thêm ảnh"}
          </button>
          {url ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRemove()}
              className={cn(
                "inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-red-100 bg-red-50/90 px-3 py-2 text-xs font-bold text-red-800 transition",
                "active:scale-[0.98] disabled:opacity-50",
                "hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400",
              )}
            >
              Gỡ ảnh
            </button>
          ) : null}
        </div>
      </div>

      {err ? (
        <p className="text-[11px] font-semibold leading-snug text-red-600" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
