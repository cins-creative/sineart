"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const GAP_PX = 8;
const PANEL_MAX_W = 280;

export function KpiHelpTip({ label, description }: { label: string; description: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const panelH = panelRef.current?.offsetHeight ?? 72;
    const panelW = Math.min(PANEL_MAX_W, window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelW - 8);

    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < panelH + GAP_PX && rect.top > panelH + GAP_PX;

    setStyle({
      position: "fixed",
      left,
      width: panelW,
      top: showAbove ? rect.top - GAP_PX : rect.bottom + GAP_PX,
      transform: showAbove ? "translateY(-100%)" : undefined,
      zIndex: 9999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition, description]);

  useEffect(() => {
    if (!open) return;
    const sync = () => updatePosition();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const tooltip =
    open && mounted ? (
      <div
        ref={panelRef}
        id={panelId}
        role="tooltip"
        style={style}
        className="pointer-events-none rounded-xl border border-[#EDE8E9] bg-white px-3 py-2.5 shadow-[0_10px_32px_rgba(45,32,32,0.12)]"
      >
        <p className="text-[11px] leading-relaxed text-[#323232]">{description}</p>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={cn(
          "cursor-help text-left text-[10px] font-extrabold tracking-wide text-[#9E8A90]",
          "underline decoration-dotted decoration-[#9E8A90]/40 underline-offset-2",
          "hover:text-[#323232] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8527A]/40 focus-visible:ring-offset-1",
        )}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {tooltip ? createPortal(tooltip, document.body) : null}
    </>
  );
}
