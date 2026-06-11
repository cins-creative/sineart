"use client";

import Link from "next/link";
import { LayoutGrid, Users } from "lucide-react";

import type { AdminDhNganhFilterRow } from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

type Props = {
  nam: number;
  rows: AdminDhNganhFilterRow[];
  selectedNganhSlug: string | null;
  hvCountByNganhId: Record<number, number>;
  totalHvCount: number;
  hrefForNganh: (nganhSlug: string | null, page?: number) => string;
};

export default function DhNganhFilterCards({
  nam,
  rows,
  selectedNganhSlug,
  hvCountByNganhId,
  totalHvCount,
  hrefForNganh,
}: Props) {
  if (!rows.length) {
    return (
      <section className="rounded-2xl border border-black/[0.06] bg-white px-4 py-8 text-center shadow-sm">
        <p className="m-0 text-[13px] font-semibold text-black/40">
          Trường chưa có cặp ngành trong{" "}
          <code className="rounded bg-black/[0.04] px-1">dh_truong_nganh</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-3 shadow-sm md:p-4">
      <p className="m-0 mb-2 text-[10px] font-extrabold uppercase tracking-wide text-black/40">
        Ngành · năm {nam}
      </p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin] md:flex-wrap md:overflow-visible">
        <NganhFilterPill
          href={hrefForNganh(null)}
          selected={selectedNganhSlug == null}
          title="Tất cả"
          count={totalHvCount}
          icon={LayoutGrid}
        />
        {rows.map((r) => (
          <NganhFilterPill
            key={r.nganh_id}
            href={hrefForNganh(r.nganh_slug)}
            selected={selectedNganhSlug === r.nganh_slug}
            title={r.ten_nganh}
            subtitle={r.mon_thi.length > 0 ? r.mon_thi.join(" · ") : undefined}
            count={hvCountByNganhId[r.nganh_id] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}

function NganhFilterPill({
  href,
  selected,
  title,
  subtitle,
  count,
  icon: Icon,
}: {
  href: string;
  selected: boolean;
  title: string;
  subtitle?: string;
  count: number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      title={subtitle ? `${title} — ${subtitle}` : title}
      className={cn(
        "group inline-flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-all",
        selected
          ? "border-transparent bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] text-white shadow-sm"
          : "border-black/[0.08] bg-[#fafafa] text-[#2d2020] hover:border-[#EE5CA2]/30 hover:bg-white hover:shadow-[var(--shadow-md)]",
      )}
      aria-current={selected ? "true" : undefined}
    >
      {Icon ? (
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-white/90" : "text-black/35")}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 truncate text-[11px] font-extrabold">{title}</span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-extrabold tabular-nums",
          selected ? "bg-white/20 text-white" : "bg-black/[0.06] text-black/50",
        )}
      >
        <Users className="h-2.5 w-2.5 opacity-70" aria-hidden />
        {count.toLocaleString("vi-VN")}
      </span>
    </Link>
  );
}
