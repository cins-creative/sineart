"use client";

/**
 * Import PDF → tách từng trang thành ảnh JPEG → upload CF Images.
 *
 * Flow 3 phase:
 *   1. `idle`    — drop zone / nhận file
 *   2. `running` — render + upload từng trang (3 worker song song)
 *   3. `picker`  — sau khi xong, hiển thị grid tất cả trang để user chọn:
 *                    • **Bìa** (1 ảnh, single-select, default trang 1)
 *                    • **Ảnh demo** (1..8, default 4 trang đầu)
 *                  Nhấn "Áp dụng" → trả kết quả về form cha.
 *
 * Dùng `pdfjs-dist` load runtime (lazy) để giữ admin bundle mỏng khi chưa mở modal.
 */

import {
  AlertTriangle,
  ArrowRightLeft,
  BookImage,
  Check,
  FileUp,
  Image as ImageIcon,
  Loader2,
  Square,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";

type PdfJsModule = typeof import("pdfjs-dist");
type PdfDocumentProxy = Awaited<ReturnType<PdfJsModule["getDocument"]> extends { promise: infer P } ? P : never>;
type PdfPageProxy = Awaited<ReturnType<PdfDocumentProxy["getPage"]>>;

let pdfJsPromise: Promise<PdfJsModule> | null = null;

/**
 * Dùng bản **legacy** của pdfjs-dist 4.x vì:
 *   - pdfjs-dist 5.x generic/legacy đều đụng lỗi "Object.defineProperty called on non-object"
 *     khi chạy trong Next.js 14/Webpack 5 (core-js polyfill probe thoát khỏi try/catch sau
 *     khi bị bundler re-transform).
 *   - 4.x legacy build đã test pass và được nhiều dự án Next.js dùng ổn định.
 *
 * Worker file ở `public/pdf.worker.min.mjs` phải là bản 4.x legacy cùng version (đã copy).
 */
function loadPdfJs(): Promise<PdfJsModule> {
  if (pdfJsPromise) return pdfJsPromise;
  pdfJsPromise = (async () => {
    const mod = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfJsModule;
    mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return mod;
  })();
  return pdfJsPromise;
}

export type ImportResult = {
  /** URL từng trang theo đúng thứ tự 1..N (đi vào `img_src_link`) */
  urls: string[];
  /** Tổng số trang trong PDF */
  pageCount: number;
  /** URL user chọn làm bìa (`thumbnail`) — có thể null nếu user bỏ chọn */
  thumbnailUrl: string | null;
  /** URL user chọn làm demo (0..8) — đi vào `image_demo` */
  demoUrls: string[];
};

type Props = {
  slugHint?: string;
  onBusyChange?: (busy: boolean) => void;
  onPhaseChange?: (phase: Phase) => void;
  onComplete: (result: ImportResult) => void;
};

type PageStatus = "pending" | "rendering" | "uploading" | "done" | "error";

type PageEntry = {
  pageNumber: number;
  status: PageStatus;
  url?: string;
  error?: string;
};

type Phase = "idle" | "running" | "picker";

const RENDER_SCALE = 2;
const JPEG_QUALITY = 0.85;
const CONCURRENCY = 3;
const MAX_DEMO = 8;
const DEFAULT_DEMO_COUNT = 4;

function sanitizeFilenameBase(slug: string | undefined): string {
  const s = (slug ?? "").trim().toLowerCase();
  if (s) return s.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 60) || "ebook";
  return `ebook-${Date.now()}`;
}

async function renderPageToBlob(page: PdfPageProxy, scale: number): Promise<Blob> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas không khả dụng.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  } as Parameters<PdfPageProxy["render"]>[0]).promise;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
  });
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("Không tạo được blob ảnh.");
  return blob;
}

export default function EbookPdfImporter({ slugHint, onBusyChange, onPhaseChange, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successUrls, setSuccessUrls] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(0);

  // Picker state
  const [pickMode, setPickMode] = useState<"cover" | "demo">("cover");
  const [coverIdx, setCoverIdx] = useState<number | null>(null);
  const [demoIdxs, setDemoIdxs] = useState<number[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const running = phase === "running";

  useEffect(() => {
    onBusyChange?.(running);
  }, [running, onBusyChange]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const doneCount = pages.filter((p) => p.status === "done").length;
  const errorCount = pages.filter((p) => p.status === "error").length;
  const total = pages.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const handleChooseFile = useCallback((f: File) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setGlobalError("Chỉ chấp nhận file PDF.");
      return;
    }
    setGlobalError(null);
    setPages([]);
    setSuccessUrls([]);
    setPageCount(0);
    setCoverIdx(null);
    setDemoIdxs([]);
    setPhase("idle");
    setFile(f);
  }, []);

  function handleReset() {
    abortRef.current?.abort();
    setFile(null);
    setPages([]);
    setSuccessUrls([]);
    setPageCount(0);
    setCoverIdx(null);
    setDemoIdxs([]);
    setGlobalError(null);
    setPhase("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  async function handleStart() {
    if (!file || running) return;
    setGlobalError(null);
    setSuccessUrls([]);

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("running");

    let pdf: PdfDocumentProxy | null = null;
    try {
      const pdfjs = await loadPdfJs();
      const buf = await file.arrayBuffer();
      if (controller.signal.aborted) throw new Error("Đã huỷ.");

      pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      if (controller.signal.aborted) throw new Error("Đã huỷ.");

      const total = pdf.numPages;
      setPageCount(total);
      const initialEntries: PageEntry[] = Array.from({ length: total }, (_, i) => ({
        pageNumber: i + 1,
        status: "pending",
      }));
      setPages(initialEntries);

      const base = sanitizeFilenameBase(slugHint);
      const urls: string[] = new Array(total).fill("");

      let nextIdx = 0;
      const patchPage = (pageNumber: number, patch: Partial<PageEntry>) => {
        setPages((prev) => prev.map((p) => (p.pageNumber === pageNumber ? { ...p, ...patch } : p)));
      };

      async function workerLoop() {
        while (!controller.signal.aborted) {
          const myIdx = nextIdx;
          nextIdx += 1;
          if (myIdx >= total) return;
          const pageNumber = myIdx + 1;

          patchPage(pageNumber, { status: "rendering" });
          let blob: Blob;
          try {
            if (!pdf) throw new Error("PDF null.");
            const page = await pdf.getPage(pageNumber);
            blob = await renderPageToBlob(page, RENDER_SCALE);
            page.cleanup();
          } catch (err) {
            if (controller.signal.aborted) return;
            const msg = err instanceof Error ? err.message : "Lỗi render.";
            patchPage(pageNumber, { status: "error", error: msg });
            continue;
          }
          if (controller.signal.aborted) return;

          patchPage(pageNumber, { status: "uploading" });
          try {
            const paddedIdx = String(pageNumber).padStart(3, "0");
            const url = await uploadAdminCfImage(blob, `${base}-page-${paddedIdx}.jpg`);
            urls[myIdx] = url;
            patchPage(pageNumber, { status: "done", url });
          } catch (err) {
            if (controller.signal.aborted) return;
            const msg = err instanceof Error ? err.message : "Lỗi upload.";
            patchPage(pageNumber, { status: "error", error: msg });
          }
        }
      }

      const workers: Promise<void>[] = [];
      for (let i = 0; i < CONCURRENCY; i += 1) workers.push(workerLoop());
      await Promise.all(workers);

      const successful = urls.filter((u) => u && u.length > 0);
      setSuccessUrls(urls); // giữ mảng gốc (có entry rỗng nếu trang lỗi) để map theo index

      if (controller.signal.aborted) {
        setGlobalError("Đã huỷ giữa chừng. Các trang đã upload vẫn được giữ lại — bạn có thể chọn bìa & demo.");
      }

      if (successful.length === 0) {
        setGlobalError("Không upload được trang nào — vui lòng kiểm tra kết nối & thử lại.");
        setPhase("idle");
        return;
      }

      // Default selections
      const firstDoneIdx = urls.findIndex((u) => !!u);
      setCoverIdx(firstDoneIdx >= 0 ? firstDoneIdx : null);
      const defaultDemos: number[] = [];
      for (let i = 0; i < urls.length && defaultDemos.length < DEFAULT_DEMO_COUNT; i += 1) {
        if (urls[i]) defaultDemos.push(i);
      }
      setDemoIdxs(defaultDemos);
      setPickMode("cover");
      setPhase("picker");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
      setGlobalError(msg);
      setPhase("idle");
    } finally {
      if (pdf) {
        try {
          await pdf.destroy();
        } catch {
          /* noop */
        }
      }
      abortRef.current = null;
    }
  }

  function togglePageInPicker(idx: number) {
    const url = successUrls[idx];
    if (!url) return;
    if (pickMode === "cover") {
      setCoverIdx((prev) => (prev === idx ? null : idx));
    } else {
      setDemoIdxs((prev) => {
        if (prev.includes(idx)) {
          return prev.filter((i) => i !== idx);
        }
        if (prev.length >= MAX_DEMO) {
          return prev; // đủ rồi, giữ nguyên
        }
        return [...prev, idx].sort((a, b) => a - b);
      });
    }
  }

  function handleApply() {
    const allUrls = successUrls.filter((u) => !!u);
    const thumbnailUrl = coverIdx != null ? (successUrls[coverIdx] ?? null) : null;
    const demoUrls = demoIdxs
      .map((i) => successUrls[i])
      .filter((u): u is string => typeof u === "string" && u.length > 0);
    onComplete({
      urls: allUrls,
      pageCount,
      thumbnailUrl,
      demoUrls,
    });
    // Về lại idle để modal trả về layout 2 cột như cũ.
    handleReset();
  }

  const demoCount = demoIdxs.length;
  const demoFull = demoCount >= MAX_DEMO;

  const pickerPages = useMemo(() => {
    return pages.map((p) => ({
      ...p,
      idx: p.pageNumber - 1,
      url: successUrls[p.pageNumber - 1] ?? "",
    }));
  }, [pages, successUrls]);

  return (
    <div className="qlepi-root">
      <style>{QLEPI_CSS}</style>

      {/* ───── PHASE: idle (chưa chọn file) ───── */}
      {phase === "idle" && !file ? (
        <label
          className={`qlepi-drop ${dragOver ? "is-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleChooseFile(f);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleChooseFile(f);
            }}
            hidden
          />
          <FileUp size={28} aria-hidden />
          <div>
            <div className="qlepi-drop-title">Chọn file PDF hoặc kéo thả vào đây</div>
            <div className="qlepi-drop-sub">
              Sau khi tách xong, bạn sẽ chọn <b>bìa</b> và <b>ảnh demo</b> trực tiếp từ các trang
              PDF.
            </div>
          </div>
        </label>
      ) : null}

      {/* ───── PHASE: idle (đã chọn file) + running ───── */}
      {(phase === "running" || (phase === "idle" && file)) && file ? (
        <div className="qlepi-card">
          <div className="qlepi-card-head">
            <div className="qlepi-file">
              <FileUp size={16} />
              <div className="qlepi-file-meta">
                <div className="qlepi-file-name">{file.name}</div>
                <div className="qlepi-file-sub">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                  {total > 0 ? <> · {total} trang</> : null}
                </div>
              </div>
            </div>
            <div className="qlepi-card-actions">
              {phase === "idle" ? (
                <button type="button" className="qlepi-btn qlepi-btn-primary" onClick={handleStart}>
                  <Upload size={14} />
                  <span>Bắt đầu</span>
                </button>
              ) : null}
              {running ? (
                <button type="button" className="qlepi-btn qlepi-btn-danger" onClick={handleStop}>
                  <Square size={14} />
                  <span>Huỷ</span>
                </button>
              ) : null}
              {!running ? (
                <button type="button" className="qlepi-btn qlepi-btn-ghost" onClick={handleReset}>
                  <X size={14} />
                  <span>Bỏ</span>
                </button>
              ) : null}
            </div>
          </div>

          {total > 0 ? (
            <>
              <div className="qlepi-progress">
                <div className="qlepi-progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="qlepi-stats">
                <span>
                  <b>{doneCount}</b> / {total} thành công
                </span>
                {errorCount > 0 ? (
                  <span className="qlepi-stats-err">
                    <AlertTriangle size={12} /> {errorCount} lỗi
                  </span>
                ) : null}
                {running ? (
                  <span className="qlepi-stats-run">
                    <Loader2 size={12} className="qlepi-spin" /> đang xử lý…
                  </span>
                ) : null}
              </div>
            </>
          ) : null}

          {globalError ? (
            <div className="qlepi-err">
              <AlertTriangle size={14} />
              <span>{globalError}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ───── PHASE: picker (chọn bìa + demo) ───── */}
      {phase === "picker" ? (
        <div className="qlepi-picker">
          <div className="qlepi-picker-head">
            <div className="qlepi-picker-title">
              <Check size={15} className="qlepi-picker-ok" />
              <span>
                Đã tách <b>{successUrls.filter((u) => !!u).length}</b> / {pageCount} trang.{" "}
                Chọn bìa & ảnh demo bên dưới.
              </span>
            </div>
            <button type="button" className="qlepi-btn qlepi-btn-ghost qlepi-btn-xs" onClick={handleReset}>
              <ArrowRightLeft size={13} />
              <span>Thay PDF khác</span>
            </button>
          </div>

          <div className="qlepi-picker-toolbar">
            <div className="qlepi-mode-group" role="radiogroup" aria-label="Chế độ chọn">
              <button
                type="button"
                role="radio"
                aria-checked={pickMode === "cover"}
                className={`qlepi-mode-btn ${pickMode === "cover" ? "is-on" : ""}`}
                onClick={() => setPickMode("cover")}
              >
                <BookImage size={14} />
                <span>Bìa</span>
                <span className="qlepi-mode-badge">{coverIdx != null ? "1" : "0"}</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={pickMode === "demo"}
                className={`qlepi-mode-btn ${pickMode === "demo" ? "is-on" : ""}`}
                onClick={() => setPickMode("demo")}
              >
                <ImageIcon size={14} />
                <span>Ảnh demo</span>
                <span className={`qlepi-mode-badge ${demoFull ? "is-full" : ""}`}>
                  {demoCount} / {MAX_DEMO}
                </span>
              </button>
            </div>
            <div className="qlepi-picker-hint">
              {pickMode === "cover" ? (
                <>Bấm 1 trang để đặt làm bìa. Bấm lại cùng trang để bỏ chọn.</>
              ) : (
                <>
                  Bấm để thêm / bỏ khỏi danh sách demo. Tối đa {MAX_DEMO} ảnh
                  {demoFull ? " (đã đủ)" : ""}.
                </>
              )}
            </div>
          </div>

          <div className="qlepi-thumbs" role="list">
            {pickerPages.map((p) => {
              const isCover = coverIdx === p.idx;
              const demoOrder = demoIdxs.indexOf(p.idx); // -1 nếu không chọn
              const isDemo = demoOrder >= 0;
              const isError = p.status === "error";
              const isEmpty = !p.url;
              const disabled = isError || isEmpty;
              const selectedInCurrentMode = pickMode === "cover" ? isCover : isDemo;
              const blockAdd = pickMode === "demo" && !isDemo && demoFull;

              return (
                <button
                  key={p.pageNumber}
                  type="button"
                  role="listitem"
                  disabled={disabled || blockAdd}
                  className={`qlepi-thumb ${selectedInCurrentMode ? "is-picked" : ""} ${
                    isCover ? "is-cover" : ""
                  } ${isDemo ? "is-demo" : ""} ${disabled ? "is-disabled" : ""}`}
                  onClick={() => togglePageInPicker(p.idx)}
                  title={
                    disabled
                      ? `Trang ${p.pageNumber} — ${p.error ?? "chưa upload"}`
                      : `Trang ${p.pageNumber}`
                  }
                >
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt={`Trang ${p.pageNumber}`} loading="lazy" decoding="async" />
                  ) : (
                    <div className="qlepi-thumb-empty">
                      {isError ? <AlertTriangle size={12} /> : <Loader2 size={12} className="qlepi-spin" />}
                    </div>
                  )}
                  <span className="qlepi-thumb-num">{p.pageNumber}</span>
                  {isCover ? <span className="qlepi-thumb-flag qlepi-thumb-flag-cover">BÌA</span> : null}
                  {isDemo && !isCover ? (
                    <span className="qlepi-thumb-flag qlepi-thumb-flag-demo">D{demoOrder + 1}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {globalError ? (
            <div className="qlepi-err">
              <AlertTriangle size={14} />
              <span>{globalError}</span>
            </div>
          ) : null}

          <div className="qlepi-picker-foot">
            <div className="qlepi-picker-summary">
              {coverIdx != null ? (
                <>
                  Bìa: <b>trang {coverIdx + 1}</b>
                </>
              ) : (
                <span className="qlepi-muted">Chưa chọn bìa</span>
              )}
              {" · "}
              {demoCount > 0 ? (
                <>
                  Demo: <b>{demoIdxs.map((i) => i + 1).join(", ")}</b>
                </>
              ) : (
                <span className="qlepi-muted">Chưa chọn demo</span>
              )}
            </div>
            <div className="qlepi-picker-actions">
              <button type="button" className="qlepi-btn qlepi-btn-primary" onClick={handleApply}>
                <Check size={14} />
                <span>Áp dụng vào form</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const QLEPI_CSS = `
  .qlepi-root{display:flex;flex-direction:column;gap:10px}

  .qlepi-drop{display:flex;align-items:center;gap:14px;padding:18px 20px;border:1.5px dashed rgba(45,32,32,.15);border-radius:12px;background:#fafafa;cursor:pointer;transition:all .15s ease;color:#6b5c5c}
  .qlepi-drop:hover,.qlepi-drop.is-over{border-color:#f8a668;background:#fff8f0;color:#2d2020}
  .qlepi-drop>svg{color:#ee5b9f;flex-shrink:0}
  .qlepi-drop-title{font-size:14px;font-weight:600;color:#2d2020;line-height:1.35}
  .qlepi-drop-sub{font-size:12.5px;color:#6b5c5c;margin-top:2px;line-height:1.45}

  .qlepi-card{border:1px solid rgba(45,32,32,.08);border-radius:12px;background:#fff;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
  .qlepi-card-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
  .qlepi-file{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
  .qlepi-file>svg{color:#ee5b9f;flex-shrink:0}
  .qlepi-file-meta{min-width:0}
  .qlepi-file-name{font-size:13.5px;font-weight:600;color:#2d2020;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:420px}
  .qlepi-file-sub{font-size:11.5px;color:#9c8a8a}
  .qlepi-card-actions{display:flex;gap:6px;flex-wrap:wrap}

  .qlepi-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:1px solid transparent;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s ease}
  .qlepi-btn:disabled{opacity:.6;cursor:not-allowed}
  .qlepi-btn-xs{padding:5px 10px;font-size:11.5px}
  .qlepi-btn-primary{background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;box-shadow:0 2px 8px rgba(238,91,159,.2)}
  .qlepi-btn-primary:hover:not(:disabled){transform:translateY(-1px)}
  .qlepi-btn-ghost{background:#fafafa;color:#5a4a4a;border-color:rgba(45,32,32,.1)}
  .qlepi-btn-ghost:hover:not(:disabled){background:#f0ece8}
  .qlepi-btn-danger{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
  .qlepi-btn-danger:hover:not(:disabled){background:#fee2e2}

  .qlepi-progress{height:6px;border-radius:100px;background:rgba(45,32,32,.08);overflow:hidden}
  .qlepi-progress-bar{height:100%;background:linear-gradient(90deg,#f8a668,#ee5b9f);border-radius:100px;transition:width .2s ease}
  .qlepi-stats{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:12px;color:#6b5c5c}
  .qlepi-stats b{color:#2d2020}
  .qlepi-stats-err{color:#b91c1c;display:inline-flex;align-items:center;gap:4px}
  .qlepi-stats-run{color:#c45127;display:inline-flex;align-items:center;gap:4px}
  .qlepi-stats-ok{color:#059669;display:inline-flex;align-items:center;gap:4px}
  .qlepi-spin{animation:qlepi-spin .8s linear infinite}
  @keyframes qlepi-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

  .qlepi-err{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:12.5px}

  /* ── Picker ───────────────────────────────────────────── */
  .qlepi-picker{display:flex;flex-direction:column;gap:12px;border:1px solid rgba(45,32,32,.08);border-radius:12px;background:linear-gradient(180deg,#fffaf5,#fff);padding:14px 16px}
  .qlepi-picker-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  .qlepi-picker-title{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#2d2020}
  .qlepi-picker-title b{color:#2d2020}
  .qlepi-picker-ok{color:#059669}

  .qlepi-picker-toolbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .qlepi-mode-group{display:inline-flex;background:#fafafa;border:1px solid rgba(45,32,32,.08);border-radius:10px;padding:3px;gap:2px}
  .qlepi-mode-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:transparent;border:none;color:#6b5c5c;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s ease}
  .qlepi-mode-btn:hover{color:#2d2020}
  .qlepi-mode-btn.is-on{background:#fff;color:#2d2020;box-shadow:0 1px 4px rgba(45,32,32,.08);border:1px solid rgba(45,32,32,.06)}
  .qlepi-mode-badge{display:inline-flex;align-items:center;justify-content:center;min-width:24px;padding:1px 7px;border-radius:100px;background:rgba(45,32,32,.08);color:#6b5c5c;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums}
  .qlepi-mode-btn.is-on .qlepi-mode-badge{background:linear-gradient(135deg,rgba(248,166,104,.25),rgba(238,91,159,.22));color:#b31e62}
  .qlepi-mode-badge.is-full{background:rgba(238,91,159,.15);color:#b31e62}
  .qlepi-picker-hint{font-size:11.5px;color:#9c8a8a;flex:1;min-width:180px}

  .qlepi-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;max-height:min(640px,calc(100vh - 340px));overflow-y:auto;padding:10px;background:#fafafa;border:1px solid rgba(45,32,32,.06);border-radius:10px}
  .qlepi-thumb{position:relative;aspect-ratio:3/4;border-radius:8px;overflow:hidden;border:2px solid transparent;background:#fff;cursor:pointer;padding:0;transition:all .15s ease;box-shadow:0 1px 3px rgba(45,32,32,.08)}
  .qlepi-thumb:hover:not(:disabled):not(.is-disabled){transform:translateY(-2px);box-shadow:0 4px 12px rgba(45,32,32,.12);border-color:rgba(248,166,104,.5)}
  .qlepi-thumb.is-disabled{opacity:.35;cursor:not-allowed}
  .qlepi-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .qlepi-thumb-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#c8bcbc;background:#f5f2ef}
  .qlepi-thumb-num{position:absolute;top:4px;left:4px;background:rgba(255,255,255,.85);backdrop-filter:blur(4px);color:#2d2020;font-size:10px;font-weight:700;padding:2px 5px;border-radius:4px;font-variant-numeric:tabular-nums;pointer-events:none}
  .qlepi-thumb-flag{position:absolute;bottom:4px;right:4px;color:#fff;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:100px;letter-spacing:.03em;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,.25)}
  .qlepi-thumb-flag-cover{background:linear-gradient(135deg,#f8a668,#ee5b9f)}
  .qlepi-thumb-flag-demo{background:#5a4a4a}

  .qlepi-thumb.is-cover{border-color:#ee5b9f;box-shadow:0 0 0 3px rgba(238,91,159,.15),0 4px 14px rgba(238,91,159,.28)}
  .qlepi-thumb.is-demo:not(.is-cover){border-color:#bb89f8;box-shadow:0 0 0 3px rgba(187,137,248,.15)}
  .qlepi-thumb.is-cover.is-demo{border-color:#ee5b9f}

  .qlepi-picker-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding-top:8px;border-top:1px dashed rgba(45,32,32,.08)}
  .qlepi-picker-summary{font-size:12.5px;color:#6b5c5c}
  .qlepi-picker-summary b{color:#2d2020}
  .qlepi-muted{color:#9c8a8a;font-style:italic}
  .qlepi-picker-actions{display:flex;gap:8px}
`;
