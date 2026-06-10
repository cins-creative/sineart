"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/** NavBar desktop fixed ~72px + 16px thở — khớp khoa-hoc-detail.css */
const STICKY_TOP_PX = 88;
const DESKTOP_MQ = "(min-width: 992px)";

type PinMode = "static" | "fixed" | "bottom";

type Props = {
  children: ReactNode;
  asideClassName: string;
  asideLabel: string;
};

/**
 * Sidebar khóa học — CSS sticky hay hỏng khi ancestor có overflow-x hidden/clip.
 * Dùng fixed + placeholder khi scroll (desktop ≥992px).
 */
export default function KdStickySidebarCol({
  children,
  asideClassName,
  asideLabel,
}: Props) {
  const colRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [pinMode, setPinMode] = useState<PinMode>("static");
  const [asideHeight, setAsideHeight] = useState(0);
  const [pinStyle, setPinStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const col = colRef.current;
    const aside = asideRef.current;
    if (!col || !aside) return;

    const mq = window.matchMedia(DESKTOP_MQ);

    const measure = () => {
      if (!mq.matches) {
        setPinMode("static");
        setPinStyle({});
        setAsideHeight(0);
        col.style.minHeight = "";
        return;
      }

      const colEl = colRef.current;
      const asideEl = asideRef.current;
      if (!colEl || !asideEl) return;

      const h = asideEl.offsetHeight;
      setAsideHeight(h);

      const scrollY = window.scrollY;
      const colRect = colEl.getBoundingClientRect();

      /* Vùng pin = cột trái (title + main), không chỉ chiều cao card sidebar */
      const grid = colEl.closest<HTMLElement>(".kd-page-grid");
      const titleEl = grid?.querySelector<HTMLElement>(".kd-page-title-row");
      const mainEl = grid?.querySelector<HTMLElement>(".kd-page-main");

      let trackTop = colRect.top;
      let trackBottom = colRect.bottom;
      if (titleEl && mainEl) {
        const tRect = titleEl.getBoundingClientRect();
        const mRect = mainEl.getBoundingClientRect();
        trackTop = tRect.top;
        trackBottom = mRect.bottom;
        colEl.style.minHeight = `${Math.max(0, mRect.bottom - tRect.top)}px`;
      } else {
        colEl.style.minHeight = "";
      }

      const colTopDoc = scrollY + trackTop;
      const colBottomDoc = scrollY + trackBottom;

      const pinStart = colTopDoc - STICKY_TOP_PX;
      const pinEnd = colBottomDoc - h - STICKY_TOP_PX;

      if (scrollY <= pinStart) {
        setPinMode("static");
        setPinStyle({});
      } else if (scrollY >= pinEnd) {
        setPinMode("bottom");
        setPinStyle({
          position: "absolute",
          top: "auto",
          bottom: 0,
          left: 0,
          width: "100%",
        });
      } else {
        setPinMode("fixed");
        setPinStyle({
          position: "fixed",
          top: STICKY_TOP_PX,
          left: colRect.left,
          width: colRect.width,
        });
      }
    };

    const onScrollOrResize = () => requestAnimationFrame(measure);

    measure();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    mq.addEventListener("change", onScrollOrResize);

    const ro = new ResizeObserver(onScrollOrResize);
    ro.observe(col);
    ro.observe(aside);
    const grid = col.closest(".kd-page-grid");
    const mainEl = grid?.querySelector(".kd-page-main");
    const titleEl = grid?.querySelector(".kd-page-title-row");
    if (mainEl) ro.observe(mainEl);
    if (titleEl) ro.observe(titleEl);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      mq.removeEventListener("change", onScrollOrResize);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={colRef}
      className={`kd-sidebar-col${pinMode !== "static" ? " kd-sidebar-col--pinned" : ""}`}
    >
      {pinMode === "fixed" && asideHeight > 0 ? (
        <div
          className="kd-sidebar-spacer"
          style={{ height: asideHeight }}
          aria-hidden
        />
      ) : null}
      <aside
        ref={asideRef}
        className={`${asideClassName}${pinMode !== "static" ? " kd-sidebar--pinned" : ""}`}
        aria-label={asideLabel}
        style={pinMode !== "static" ? pinStyle : undefined}
      >
        {children}
      </aside>
    </div>
  );
}
