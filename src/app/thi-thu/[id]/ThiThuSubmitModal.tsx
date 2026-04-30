"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCamErr(null);
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
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
  }, [open, method]);

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
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không tạo được ảnh.");
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Không tạo được ảnh.");
      const url = await uploadBlob(blob, `thi-thu-${Date.now()}.jpg`);
      setUrls((u) => [...u, url]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Chụp ảnh lỗi");
    } finally {
      setUploading(false);
    }
  }, [uploadBlob]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-5 tti-modal-bg font-[family-name:var(--font-quicksand)]">
      <div role="dialog" aria-modal className="tti-modal max-h-[92vh] overflow-y-auto">
        <div className="tti-modal-hd">
          <span className="tti-modal-ttl">Nộp bài</span>
          <button type="button" className="tti-modal-x" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        {done ? (
          <p className="py-6 text-center text-base font-semibold text-emerald-700">
            Đã nộp bài thành công
          </p>
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
                  onClick={() => setMethod("cam")}
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
                  <div className="tti-upload-method-sub">Dùng camera thiết bị để chụp bài trực tiếp</div>
                </button>
                <button
                  type="button"
                  className={`tti-upload-method tti-um-file ${method === "file" ? "picked" : ""}`}
                  onClick={() => setMethod("file")}
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

              {method === "cam" ? (
                <>
                  <p className="tti-method-hint">
                    {camErr ?? "Nhấn nút chụp để chụp bài làm của bạn"}
                  </p>
                  <div className="tti-cam-preview">
                    <video ref={videoRef} className={camErr ? "hidden" : "absolute inset-0 h-full w-full object-cover"} playsInline muted />
                    {camErr ? (
                      <div className="tti-cam-preview-ph">{camErr}</div>
                    ) : null}
                  </div>
                  <div className="tti-cam-btn-row">
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
                    <button type="button" className="tti-cam-retake" disabled>
                      Đổi camera
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="tti-method-hint">Kéo thả hoặc chọn ảnh (jpg, png, webp)</p>
                  <label className="tti-file-drop">
                    Kéo thả hoặc click để chọn ảnh
                    <span>Chấp nhận jpg, png, webp — có thể chọn nhiều ảnh</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => void addFiles(e.target.files)}
                    />
                  </label>
                </>
              )}

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
    </div>
  );
}
