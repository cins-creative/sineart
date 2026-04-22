"use client";

/**
 * Custom flipbook reader cho `/ebook/[slug]`.
 *
 * - Nhận `pages: string[]` (mảng URL ảnh Cloudflare, đã được
 *   `cfImageNormalizeAccount` normalize khi đọc DB).
 * - Giữ nguyên animation 3D lật trang từ `Flipbook.jsx` (brief yêu cầu
 *   không rewrite animation logic). Kỹ thuật: 1 panel duy nhất, swap
 *   front→back content tại midpoint rotation ±90°, scaleX(-1) để mirror
 *   content khi ở "mặt sau".
 * - Toggle 2 mode: **Flipbook** (spread 2 trang, lật) và **Grid** (2 cột,
 *   scroll đọc tuần tự).
 * - Không dùng `next/image`: Cloudflare Images được serve trực tiếp để
 *   tránh loader phức tạp và đảm bảo match với phần còn lại của
 *   `/ebook/[slug]`.
 */

import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type PageUrl = string;

const tokens = {
  paper: "#FBF7F2",
  paperShade: "#F3EDE4",
  ink: "#2D2020",
  brandStart: "#F8A568",
  brandEnd: "#EE5CA2",
};
const gradientBrand = `linear-gradient(135deg,${tokens.brandStart},${tokens.brandEnd})`;
const shadowWarm =
  "0 2px 8px rgba(45,32,32,0.06), 0 1px 2px rgba(45,32,32,0.04)";
const shadowBook =
  "0 30px 60px -15px rgba(45,32,32,0.25), 0 15px 30px -10px rgba(45,32,32,0.15)";

// ============================================================================
// PAGE CONTENT — chỉ là <img> fill panel, không overlay số trang / title
// ============================================================================
function PageContent({
  src,
  alt,
  eager,
}: {
  src: PageUrl | null | undefined;
  alt: string;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <div
        className="absolute inset-0"
        style={{ background: tokens.paper }}
        aria-hidden
      />
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        background: tokens.paper,
      }}
    />
  );
}

// ============================================================================
// PAGE PANEL — nửa trang đứng yên (underlay)
// ============================================================================
function PagePanel({
  src,
  alt,
  side,
  eager,
}: {
  src: PageUrl | null | undefined;
  alt: string;
  side: "left" | "right";
  eager?: boolean;
}) {
  return (
    <div
      className="absolute top-0 h-full overflow-hidden"
      style={{
        [side]: 0,
        width: "50%",
        background: tokens.paper,
        borderRadius: side === "left" ? "16px 0 0 16px" : "0 16px 16px 0",
      }}
    >
      <PageContent src={src} alt={alt} eager={eager} />
    </div>
  );
}

// ============================================================================
// FLIPPING PAGE — 1 panel duy nhất, swap content tại ±90°
// ============================================================================
type FlippingState = {
  direction: 1 | -1;
  targetSpread: number;
  frontSrc: PageUrl | null | undefined;
  backSrc: PageUrl | null | undefined;
  frontAlt: string;
  backAlt: string;
};

function FlippingPage({
  flipping,
  onMidpoint,
  onComplete,
}: {
  flipping: FlippingState;
  onMidpoint: () => void;
  onComplete: () => void;
}) {
  const { direction, frontSrc, backSrc, frontAlt, backAlt } = flipping;

  const rotation = useMotionValue(0);
  const [phase, setPhase] = useState<"front" | "back">("front");
  const swappedRef = useRef(false);

  useEffect(() => {
    swappedRef.current = false;
    setPhase("front");

    const endRotation = direction > 0 ? -180 : 180;

    const unsub = rotation.on("change", (val) => {
      if (!swappedRef.current && Math.abs(val) >= 90) {
        swappedRef.current = true;
        setPhase("back");
        onMidpoint();
      }
    });

    const controls = animate(rotation, endRotation, {
      duration: 0.85,
      ease: [0.4, 0, 0.25, 1],
      onComplete,
    });

    return () => {
      unsub();
      controls.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panelLeft = direction > 0 ? "50%" : "0%";
  const transformOrigin = direction > 0 ? "left center" : "right center";

  const isBack = phase === "back";
  const displaySrc = isBack ? backSrc : frontSrc;
  const displayAlt = isBack ? backAlt : frontAlt;
  const contentTransform = isBack ? "scaleX(-1)" : "none";

  const borderRadius =
    (direction > 0) === isBack ? "16px 0 0 16px" : "0 16px 16px 0";

  const shadowOpacity = useTransform(
    rotation,
    direction > 0 ? [0, -90, -170, -180] : [0, 90, 170, 180],
    [0, 0.55, 0, 0],
  );
  const dropShadowOpacity = useTransform(
    rotation,
    direction > 0 ? [0, -20, -160, -180] : [0, 20, 160, 180],
    [0, 0.25, 0.25, 0],
  );
  const filter = useTransform(
    dropShadowOpacity,
    (o) => `drop-shadow(0 16px 28px rgba(45,32,32,${o}))`,
  );

  return (
    <motion.div
      className="absolute top-0 h-full"
      style={{
        left: panelLeft,
        width: "50%",
        transformOrigin,
        rotateY: rotation,
        zIndex: 1000,
        filter,
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: tokens.paper, borderRadius }}
      >
        <div
          className="absolute inset-0"
          style={{ transform: contentTransform }}
        >
          <PageContent src={displaySrc} alt={displayAlt} eager />
        </div>

        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to ${
              isBack
                ? direction > 0
                  ? "right"
                  : "left"
                : direction > 0
                  ? "left"
                  : "right"
            }, rgba(45,32,32,0.6), transparent 70%)`,
            opacity: shadowOpacity,
            mixBlendMode: "multiply",
          }}
        />
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN
// ============================================================================
export function EbookFlipbook({
  pages,
  title,
}: {
  pages: string[];
  title: string;
}) {
  const [mode, setMode] = useState<"flipbook" | "grid">("flipbook");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);

  // Spread layout: spread 0 = [null, page1], spread k>=1 = [page(2k), page(2k+1)]
  // Trang 1 luôn đứng 1 mình ở bên phải (mô phỏng bìa sách).
  const totalSpreads = Math.max(1, Math.ceil((pages.length + 1) / 2));
  const [spread, setSpread] = useState(0);
  const [flipping, setFlipping] = useState<FlippingState | null>(null);
  const [midpointReached, setMidpointReached] = useState(false);

  // Fullscreen API: request/exit + lắng nghe fullscreenchange (Esc tự thoát).
  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void el.requestFullscreen().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === rootRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const getSpreadPages = useCallback(
    (k: number) => {
      if (k === 0) {
        return {
          left: null as PageUrl | null,
          leftNum: 0,
          right: pages[0] ?? null,
          rightNum: 1,
        };
      }
      return {
        left: pages[2 * k - 1] ?? null,
        leftNum: 2 * k,
        right: pages[2 * k] ?? null,
        rightNum: 2 * k + 1,
      };
    },
    [pages],
  );

  const currentPages = getSpreadPages(spread);

  const go = useCallback(
    (newSpread: number) => {
      if (flipping) return;
      if (newSpread < 0 || newSpread >= totalSpreads) return;
      if (newSpread === spread) return;

      const direction: 1 | -1 = newSpread > spread ? 1 : -1;
      const newPages = getSpreadPages(newSpread);

      let frontSrc: PageUrl | null,
        frontNum: number,
        backSrc: PageUrl | null,
        backNum: number;
      if (direction > 0) {
        frontSrc = currentPages.right;
        frontNum = currentPages.rightNum;
        backSrc = newPages.left;
        backNum = newPages.leftNum;
      } else {
        frontSrc = currentPages.left;
        frontNum = currentPages.leftNum;
        backSrc = newPages.right;
        backNum = newPages.rightNum;
      }

      setMidpointReached(false);
      setFlipping({
        direction,
        targetSpread: newSpread,
        frontSrc,
        backSrc,
        frontAlt: `${title} — trang ${frontNum}`,
        backAlt: `${title} — trang ${backNum}`,
      });
    },
    [flipping, spread, totalSpreads, getSpreadPages, currentPages, title],
  );

  const next = useCallback(() => go(spread + 1), [go, spread]);
  const prev = useCallback(() => go(spread - 1), [go, spread]);

  // Phím tắt ← → khi đang ở flipbook mode
  useEffect(() => {
    if (mode !== "flipbook") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
      }
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, next, prev]);

  const onMidpoint = useCallback(() => setMidpointReached(true), []);

  const onFlipComplete = useCallback(() => {
    if (!flipping) return;
    setSpread(flipping.targetSpread);
    requestAnimationFrame(() => {
      setFlipping(null);
      setMidpointReached(false);
    });
  }, [flipping]);

  // UNDERLAY LOGIC — giống Flipbook.jsx
  let underlayLeft: PageUrl | null | undefined;
  let underlayRight: PageUrl | null | undefined;
  let underlayLeftNum = 0;
  let underlayRightNum = 0;

  if (flipping) {
    const newPages = getSpreadPages(flipping.targetSpread);
    if (flipping.direction > 0) {
      underlayRight = newPages.right;
      underlayRightNum = newPages.rightNum;
      if (midpointReached) {
        underlayLeft = newPages.left;
        underlayLeftNum = newPages.leftNum;
      } else {
        underlayLeft = currentPages.left;
        underlayLeftNum = currentPages.leftNum;
      }
    } else {
      underlayLeft = newPages.left;
      underlayLeftNum = newPages.leftNum;
      if (midpointReached) {
        underlayRight = newPages.right;
        underlayRightNum = newPages.rightNum;
      } else {
        underlayRight = currentPages.right;
        underlayRightNum = currentPages.rightNum;
      }
    }
  } else {
    underlayLeft = currentPages.left;
    underlayLeftNum = currentPages.leftNum;
    underlayRight = currentPages.right;
    underlayRightNum = currentPages.rightNum;
  }

  const pageLabel = (() => {
    if (pages.length === 0) return "—";
    if (spread === 0) return `1 / ${pages.length}`;
    const l = currentPages.leftNum;
    const r = currentPages.rightNum;
    return currentPages.right
      ? `${l}–${r} / ${pages.length}`
      : `${l} / ${pages.length}`;
  })();

  if (pages.length === 0) return null;

  return (
    <section
      id="flipbook"
      ref={rootRef}
      className={`ebd-fb${isFullscreen ? " is-fullscreen" : ""}`}
      aria-label="Đọc sách"
    >
      {/* Toolbar: flipbook / grid toggle + fullscreen */}
      <div className="ebd-fb-toolbar">
        <div className="ebd-fb-modes" role="tablist" aria-label="Chế độ đọc">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "flipbook"}
            onClick={() => setMode("flipbook")}
            className={`ebd-fb-mode${mode === "flipbook" ? " is-active" : ""}`}
          >
            <BookOpen size={15} strokeWidth={2.4} />
            Flipbook
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "grid"}
            onClick={() => setMode("grid")}
            className={`ebd-fb-mode${mode === "grid" ? " is-active" : ""}`}
          >
            <LayoutGrid size={15} strokeWidth={2.4} />
            Dạng lưới
          </button>
        </div>
        <div className="ebd-fb-toolbar-right">
          <span className="ebd-fb-count">{pages.length} trang</span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="ebd-fb-fs"
            aria-label={isFullscreen ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
            title={isFullscreen ? "Thoát (Esc)" : "Toàn màn hình"}
          >
            {isFullscreen ? (
              <Minimize2 size={15} strokeWidth={2.4} />
            ) : (
              <Maximize2 size={15} strokeWidth={2.4} />
            )}
            <span className="ebd-fb-fs-label">
              {isFullscreen ? "Thoát" : "Toàn màn hình"}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "flipbook" ? (
          <motion.div
            key="flipbook"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="ebd-fb-stage-wrap"
          >
            <div className="ebd-fb-stage" style={{ perspective: "3000px" }}>
              <div
                className="ebd-fb-shadow"
                style={{ background: `${tokens.ink}33` }}
                aria-hidden
              />

              <div
                className="ebd-fb-book"
                style={{
                  aspectRatio: "3/2",
                  boxShadow: shadowBook,
                  borderRadius: "18px",
                  background: tokens.paperShade,
                  transformStyle: "preserve-3d",
                }}
              >
                <PagePanel
                  src={underlayLeft}
                  alt={`${title} — trang ${underlayLeftNum}`}
                  side="left"
                  eager={spread === 0 || spread === 1}
                />
                <PagePanel
                  src={underlayRight}
                  alt={`${title} — trang ${underlayRightNum}`}
                  side="right"
                  eager={spread === 0 || spread === 1}
                />

                {flipping && (
                  <FlippingPage
                    key={`${flipping.direction}-${flipping.targetSpread}`}
                    flipping={flipping}
                    onMidpoint={onMidpoint}
                    onComplete={onFlipComplete}
                  />
                )}
              </div>
            </div>

            <div className="ebd-fb-ctrl">
              <button
                type="button"
                onClick={prev}
                disabled={spread === 0 || !!flipping}
                className="ebd-fb-nav"
                aria-label="Trang trước"
                style={{ boxShadow: shadowWarm }}
              >
                <ChevronLeft size={20} strokeWidth={2.4} />
              </button>

              <div className="ebd-fb-meter">
                <p className="ebd-fb-label">{pageLabel}</p>
                <div className="ebd-fb-dots" role="tablist">
                  {Array.from({ length: totalSpreads }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => go(i)}
                      disabled={!!flipping}
                      className="ebd-fb-dot"
                      aria-label={`Đến spread ${i + 1}`}
                      aria-current={i === spread ? "true" : undefined}
                      style={{
                        width: i === spread ? 24 : 6,
                        background:
                          i === spread ? gradientBrand : `${tokens.ink}33`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={next}
                disabled={spread >= totalSpreads - 1 || !!flipping}
                className="ebd-fb-nav"
                aria-label="Trang sau"
                style={{ boxShadow: shadowWarm }}
              >
                <ChevronRight size={20} strokeWidth={2.4} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="ebd-fb-grid"
          >
            {pages.map((src, i) => (
              <motion.article
                key={`${src}-${i}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                whileHover={{ y: -4 }}
                className="ebd-fb-card"
                style={{ boxShadow: shadowWarm, background: tokens.paper }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${title} — trang ${i + 1}`}
                  loading={i < 4 ? "eager" : "lazy"}
                  decoding="async"
                  className="ebd-fb-card-img"
                />
              </motion.article>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
