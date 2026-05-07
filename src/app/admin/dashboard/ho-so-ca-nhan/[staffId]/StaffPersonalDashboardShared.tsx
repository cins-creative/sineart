import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionTitle({
  icon: Icon,
  title,
  description,
}: Readonly<{
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
}>) {
  return (
    <div className="mb-3 flex flex-wrap items-start gap-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f8a668]/12 to-[#bc89f8]/15 text-[#a8557c]">
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-bold tracking-tight text-[#1a1a1a]">{title}</h2>
        {description ? <p className="mt-0.5 max-w-xl text-xs text-black/50">{description}</p> : null}
      </div>
    </div>
  );
}

export function Field({
  icon: Icon,
  label,
  children,
  className,
}: Readonly<{
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("flex gap-2.5 rounded-xl border border-black/[0.06] bg-[#fafafa]/90 p-2.5 transition-colors hover:border-[#f8a668]/35", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f8a668]/15 to-[#ee5ca2]/12 text-[#c2417c]">
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/40">{label}</p>
        <div className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-[#1a1a1a]">{children}</div>
      </div>
    </div>
  );
}
