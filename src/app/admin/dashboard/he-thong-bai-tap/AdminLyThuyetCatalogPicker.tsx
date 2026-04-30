"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { LY_THUYET_LIST, getByNhom, getNhomList } from "@/data/ly-thuyet";
import { cn } from "@/lib/utils";

type Props = {
  selected: string[];
  onChange: (slugs: string[]) => void;
};

/**
 * Chọn bài lý thuyết nền tảng (slug) theo cùng danh mục `/kien-thuc-nen-tang`.
 * Thứ tự lưu DB = thứ tự `so_thu_tu` trong LY_THUYET_LIST.
 */
export default function AdminLyThuyetCatalogPicker({ selected, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const nhomList = getNhomList();
  const selectedSet = new Set(selected);

  const toggle = (slug: string) => {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    const ordered = LY_THUYET_LIST.map((b) => b.slug).filter((s) => next.has(s));
    onChange(ordered);
  };

  return (
    <div className="overflow-hidden rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 bg-[#fafafa] px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#888]">
            Bài lý thuyết Thư viện
          </div>
          <div className="text-[12px] font-bold text-[#1a1a2e]">
            {selected.length > 0
              ? `Đã chọn ${selected.length} bài — bấm để ${open ? "thu gọn" : "mở rộng"}`
              : "Chưa chọn — bấm để chọn từ danh mục"}
          </div>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-[#888] transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="max-h-[min(52vh,380px)] overflow-y-auto border-t border-[#EAEAEA] px-2 py-2">
          {nhomList.map((nhom) => {
            const items = getByNhom(nhom);
            if (items.length === 0) return null;
            return (
              <div key={nhom} className="mb-3 last:mb-0">
                <p className="px-1.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#BC8AF9]">
                  {nhom}
                </p>
                <ul className="m-0 list-none p-0">
                  {items.map((it) => (
                    <li key={it.slug}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-[12px] leading-snug text-[#323232] transition hover:bg-[#BC8AF9]/10",
                          selectedSet.has(it.slug) && "bg-[#BC8AF9]/12"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#EAEAEA] text-[#BC8AF9] focus:ring-[#BC8AF9]"
                          checked={selectedSet.has(it.slug)}
                          onChange={() => toggle(it.slug)}
                        />
                        <span className="font-bold">{it.ten}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
