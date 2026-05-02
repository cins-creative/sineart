"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Ảnh chụp xuất Full HD dọc (thường dùng khi cầm điện thoại dọc chụp bài) */
const CAPTURE_W = 1080;
const CAPTURE_H = 1920;

/** iOS/Android: getUserMedia sau setState thường không được cấp quyền — dùng `<input capture>` như LuuBaiHocVien. */
function preferNativeCameraCapture(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod|Android/i.test(ua)) return true;
  if (/iPad/.test(ua)) return true;
  if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return true;
  return false;
}

/** Crop kiểu cover từ khung video → kích thước đích cố định */
function drawVideoCoverDest(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  destW: number,
  destH: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(destW / vw, destH / vh);
  const sw = destW / scale;
  const sh = destH / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, destW, destH);
}

type UploadMethod = "cam" | "file";

type Props = {
  kyId: string;
  open: boolean;
  onClose: () => void;
};

export default function ThiThuSubmitModal({ kyId, open, onClose }: Props) {
  const [method, setMethod] = useState<UploadMethod>("file");
  const [hoTen, setHoTen] = useState("");
  const [facebook, setFacebook] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);
  /** Điện thoại: `environment` = camera sau (chụp bài); `user` = camera trước */
  const [camFacing, setCamFacing] = useState<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Camera hệ thống (mobile) — `capture="environment"` */
  const cameraCaptureRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCamErr(null);
      setCamFacing("environment");
      setMethod("file");
      return;
    }
    // Trên mobile không dùng getUserMedia fullscreen — tránh gọi API ngoài gesture
    if (preferNativeCameraCapture()) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    if (method !== "cam") {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    setCamErr(null);
    void (async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: camFacing },
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: camFacing } },
            audio: false,
          });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          el.playsInline = true;
          await el.play().catch(() => {});
        }
      } catch {
        if (!cancelled) {
          setCamErr("Không bật được camera — vui lòng chọn Upload file hoặc cấp quyền trình duyệt.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, method, camFacing]);

  const uploadBlob = useCallback(async (blob: Blob, name: string) => {
    const fd = new FormData();
    fd.append("file", blob, name);
    const res = await fetch("/api/thi-thu/upload-image", { method: "POST", body: fd });
    const j = (await res.json()) as { ok?: boolean; url?: string; error?: string };
    if (!res.ok || !j.ok || !j.url) throw new Error(j.error ?? "Upload lỗi");
    return j.url;
  }, []);

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      setErr(null);
      try {
        const next: string[] = [];
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/thi-thu/upload-image", { method: "POST", body: fd });
          const j = (await res.json()) as { ok?: boolean; url?: string; error?: string };
          if (!res.ok || !j.ok || !j.url) throw new Error(j.error ?? "Upload lỗi");
          next.push(j.url);
        }
        setUrls((u) => [...u, ...next]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload lỗi");
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const selectUploadFile = useCallback(() => {
    setMethod("file");
    openFilePicker();
  }, [openFilePicker]);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setCamErr("Camera chưa sẵn sàng.");
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = CAPTURE_W;
      canvas.height = CAPTURE_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không tạo được ảnh.");
      ctx.save();
      if (camFacing === "user") {
        ctx.translate(CAPTURE_W, 0);
        ctx.scale(-1, 1);
      }
      drawVideoCoverDest(ctx, video, CAPTURE_W, CAPTURE_H);
      ctx.restore();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.93),
      );
      if (!blob) throw new Error("Không tạo được ảnh.");
      const url = await uploadBlob(blob, `thi-thu-${Date.now()}.jpg`);
      setUrls((u) => [...u, url]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Chụp ảnh lỗi");
    } finally {
      setUploading(false);
    }
  }, [camFacing, uploadBlob]);

  const submit = useCallback(async () => {
    setErr(null);
    if (!hoTen.trim() || urls.length === 0) {
      setErr("Nhập họ tên và ít nhất một ảnh bài.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/thi-thu/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ky_thi_id: kyId,
          ho_ten: hoTen.trim(),
          facebook: facebook.trim() || null,
          ghi_chu: ghiChu.trim() || null,
          anh_bai_nop_urls: urls,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Gửi thất bại");
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  }, [facebook, ghiChu, hoTen, kyId, urls]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const fullscreenCam = method === "cam" && !done && !preferNativeCameraCapture();

  return (
    <div
      className={cn(
        "fixed inset-0 z-[500] font-[family-name:var(--font-quicksand)]",
        fullscreenCam ? "bg-black" : "tti-modal-bg flex items-center justify-center p-5",
      )}
    >
      {fullscreenCam ? (
        <div role="dialog" aria-modal className="flex h-[100dvh] min-h-0 w-full flex-col bg-black text-white">
          <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
            <button
              type="button"
              className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-bold text-white"
              onClick={() => setMethod("file")}
            >
              ← Form nộp bài
            </button>
            <span className="max-w-[42%] text-center text-[11px] font-semibold leading-snug text-white/85">
              Camera toàn màn — ảnh 1080×1920
            </span>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl leading-none text-white"
              onClick={onClose}
              aria-label="Đóng"
            >
              ×
            </button>
          </header>

          <div className="relative min-h-0 flex-1 w-full bg-black">
            <video
              ref={videoRef}
              className={camErr ? "hidden" : "absolute inset-0 h-full w-full object-cover"}
              playsInline
              muted
              autoPlay
            />
            {camErr ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/90">{camErr}</div>
            ) : null}
          </div>

          <footer className="flex shrink-0 flex-col gap-2 border-t border-white/10 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
            {uploading ? (
              <p className="flex items-center justify-center gap-2 text-sm text-white/75">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Đang tải ảnh…
              </p>
            ) : null}
            <div className="tti-cam-btn-row tti-cam-btn-row--fullscreen">
              <button type="button" className="tti-cam-retake" disabled={uploading}>
                Chụp lại
              </button>
              <button
                type="button"
                className="tti-cam-shutter"
                disabled={uploading || !!camErr}
                onClick={() => void capturePhoto()}
                aria-label="Chụp ảnh"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} strokeLinecap="round" width={20} height={20}>
                  <circle cx="12" cy="12" r="8" stroke="white" />
                </svg>
              </button>
              <button
                type="button"
                className="tti-cam-retake"
                disabled={uploading || !!camErr}
                onClick={() => setCamFacing((f) => (f === "environment" ? "user" : "environment"))}
              >
                Đổi camera
              </button>
            </div>
          </footer>
        </div>
      ) : (
        <div role="dialog" aria-modal className="tti-modal max-h-[92vh] overflow-y-auto">
          <div className="tti-modal-hd">
            <span className="tti-modal-ttl">Nộp bài</span>
            <button type="button" className="tti-modal-x" onClick={onClose} aria-label="Đóng">
              ×
            </button>
          </div>

          {done ? (
            <p className="py-6 text-center text-base font-semibold text-emerald-700">Đã nộp bài thành công</p>
          ) : (
            <>
              <div className="tti-f-group">
                <label className="tti-f-lbl">Họ tên *</label>
                <input
                  className="tti-f-in"
                  placeholder="Nguyễn Thị A"
                  value={hoTen}
                  onChange={(e) => setHoTen(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="tti-f-group">
                <label className="tti-f-lbl">Facebook (không bắt buộc)</label>
                <input
                  className="tti-f-in"
                  placeholder="facebook.com/ten-cua-ban"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                />
              </div>

              <div className="tti-f-group">
                <label className="tti-f-lbl">Ảnh bài làm *</label>
                <div className="tti-upload-methods">
                  <button
                    type="button"
                    className={`tti-upload-method tti-um-cam ${method === "cam" ? "picked" : ""}`}
                    onClick={() => {
                      if (preferNativeCameraCapture()) {
                        cameraCaptureRef.current?.click();
                        return;
                      }
                      setMethod("cam");
                    }}
                  >
                    <div className="tti-upload-method-icon text-[#ee5b9f]">
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" strokeWidth={2} aria-hidden>
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                        />
                        <circle cx="12" cy="13" r="4" stroke="currentColor" />
                      </svg>
                    </div>
                    <div className="tti-upload-method-ttl">Chụp ảnh</div>
                    <div className="tti-upload-method-sub">
                      {preferNativeCameraCapture()
                        ? "Mở camera máy — chụp bài (giống Lưu bài HV)"
                        : "Toàn màn hình — chụp trực tiếp"}
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`tti-upload-method tti-um-file ${method === "file" ? "picked" : ""}`}
                    onClick={selectUploadFile}
                  >
                    <div className="tti-upload-method-icon text-[#7c6fcd]">
                      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" strokeWidth={2} aria-hidden>
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" points="17 8 12 3 7 8" />
                        <line stroke="currentColor" strokeLinecap="round" x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="tti-upload-method-ttl">Upload file</div>
                    <div className="tti-upload-method-sub">Chọn ảnh từ thư viện hoặc máy tính</div>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={cameraCaptureRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />

                {urls.length > 0 ? (
                  <p className="tti-method-hint">
                    Ảnh đã chọn hiển thị bên dưới — bấm lại ô Upload file để chọn thêm.
                  </p>
                ) : null}

                {uploading ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-[rgba(45,32,32,0.55)]">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Đang tải ảnh…
                  </p>
                ) : null}

                <div className="tti-thumb-row">
                  {urls.map((u, i) => (
                    <div key={`${u}-${i}`} className="tti-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        className="tti-thumb-x"
                        aria-label="Xóa ảnh"
                        onClick={() => setUrls((prev) => prev.filter((_, j) => j !== i))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tti-f-group">
                <label className="tti-f-lbl">Ghi chú</label>
                <textarea
                  className="tti-f-in min-h-[72px]"
                  rows={2}
                  placeholder="Ghi chú thêm nếu có..."
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                />
              </div>

              {err ? <p className="mb-2 text-sm text-red-600">{err}</p> : null}

              <button
                type="button"
                disabled={busy || uploading}
                className="tti-submit-btn"
                onClick={() => void submit()}
              >
                {busy ? "Đang gửi…" : "Gửi bài →"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
