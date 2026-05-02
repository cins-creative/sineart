"use client";

import { useState } from "react";

import { cfResolvedImageUrl } from "@/lib/cfImageUrl";
import type { ThiThuDeThiRow } from "@/types/thi-thu";

function ChevMini() {
  return (
    <svg viewBox="0 0 10 10" width={10} height={10} aria-hidden>
      <polyline points="3,2 7,5 3,8" fill="none" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}

export default function ThiThuExamDeAccordion({
  items,
}: {
  items: ThiThuDeThiRow[];
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-[rgba(45,32,32,0.18)] bg-white px-4 py-6 text-center text-sm text-[rgba(45,32,32,0.55)]">
        Chưa có đề thi được đăng.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {items.map((it, idx) => (
        <details key={`acc-${idx}-${it.thu_tu}`} className="tti-acc-item group">
          <summary className="tti-acc-head [&::-webkit-details-marker]:hidden">
            <span className="tti-acc-chev text-[rgba(45,32,32,0.55)] group-open:text-[#ee5b9f]">
              <ChevMini />
            </span>
            <span className="tti-acc-ttl">{it.tieu_de}</span>
          </summary>
          <div className="tti-acc-body">
            <div className="tti-acc-grid">
              {(it.anh_urls ?? []).map((url, i) => (
                <button
                  key={`${idx}-${i}`}
                  type="button"
                  className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-black/5"
                  onClick={() => setLightbox(cfResolvedImageUrl(url, "full"))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL đề từ admin; cần img tùy host + chuẩn hóa CF */}
                  <img
                    src={cfResolvedImageUrl(url, "thumb")}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          </div>
        </details>
      ))}

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setLightbox(null)}
          aria-label="Đóng"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-full object-contain" referrerPolicy="no-referrer" />
        </button>
      ) : null}
    </div>
  );
}
