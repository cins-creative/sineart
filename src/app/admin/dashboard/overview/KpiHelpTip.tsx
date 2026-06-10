"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";

export function KpiHelpTip({ label, description }: { label: string; description: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div
      className="relative inline-block max-w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={cn(
          "cursor-help text-left text-[10px] font-extrabold tracking-wide text-[#9E8A90]",
          "underline decoration-dotted decoration-[#9E8A90]/40 underline-offset-2",
          "hover:text-[#323232] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8527A]/40 focus-visible:ring-offset-1",
        )}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>

      {open ? (
        <div
          id={panelId}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-0 top-[calc(100%+6px)] z-[100] w-[min(calc(100vw-2rem),280px)]",
            "rounded-xl border border-[#EDE8E9] bg-white px-3 py-2.5 shadow-[0_10px_32px_rgba(45,32,32,0.12)]",
          )}
        >
          <p className="text-[11px] leading-relaxed text-[#323232]">{description}</p>
        </div>
      ) : null}
    </div>
  );
}
