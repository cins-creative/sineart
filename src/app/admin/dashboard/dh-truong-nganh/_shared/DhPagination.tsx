"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  /** Build href cho 1 page khác — bảo toàn các search param khác do caller tự lo. */
  hrefForPage: (page: number) => string;
};

/** Sinh dãy số trang gọn — thêm dấu `…` cho khoảng giữa khi quá nhiều trang. */
function buildPageItems(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

export default function DhPagination({ page, pageCount, total, pageSize, hrefForPage }: Props) {
  if (pageCount <= 1) {
    return (
      <p className="m-0 px-1 text-[12px] font-semibold text-black/45">
        {total.toLocaleString("vi-VN")} bản ghi
      </p>
    );
  }

  const fromIdx = (page - 1) * pageSize + 1;
  const toIdx = Math.min(page * pageSize, total);
  const items = buildPageItems(page, pageCount);

  const navBtn =
    "inline-flex h-8 min-w-[32px] items-center justify-center rounded-md border px-2 text-[12px] font-bold transition-colors";

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 px-1"
      aria-label="Phân trang"
    >
      <p className="m-0 text-[12px] font-semibold text-black/55">
        {fromIdx.toLocaleString("vi-VN")}–{toIdx.toLocaleString("vi-VN")} /{" "}
        {total.toLocaleString("vi-VN")} bản ghi
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {page > 1 ? (
          <Link
            href={hrefForPage(page - 1)}
            className={cn(navBtn, "border-[#EAEAEA] bg-white text-black/70 hover:bg-black/[0.04]")}
            aria-label="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span
            className={cn(navBtn, "cursor-not-allowed border-[#f0f0f0] bg-[#fafafa] text-black/25")}
            aria-disabled="true"
          >
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}

        {items.map((it, i) =>
          it === "…" ? (
            <span
              key={`gap-${i}`}
              className="px-1 text-[12px] font-bold text-black/35"
              aria-hidden
            >
              …
            </span>
          ) : it === page ? (
            <span
              key={it}
              className={cn(navBtn, "border-transparent bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] text-white shadow-sm")}
              aria-current="page"
            >
              {it}
            </span>
          ) : (
            <Link
              key={it}
              href={hrefForPage(it)}
              className={cn(navBtn, "border-[#EAEAEA] bg-white text-black/70 hover:bg-black/[0.04]")}
            >
              {it}
            </Link>
          ),
        )}

        {page < pageCount ? (
          <Link
            href={hrefForPage(page + 1)}
            className={cn(navBtn, "border-[#EAEAEA] bg-white text-black/70 hover:bg-black/[0.04]")}
            aria-label="Trang sau"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span
            className={cn(navBtn, "cursor-not-allowed border-[#f0f0f0] bg-[#fafafa] text-black/25")}
            aria-disabled="true"
          >
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
