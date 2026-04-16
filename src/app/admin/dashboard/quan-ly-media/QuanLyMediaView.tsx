"use client";

import { Clapperboard } from "lucide-react";

import MediaTimeline from "@/app/admin/dashboard/quan-ly-media/MediaTimeline";

export default function QuanLyMediaView() {
  return (
    <div className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <Clapperboard className="text-white" size={20} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Quản lý media</div>
            <div className="text-xs text-[#AAAAAA]">
              Timeline theo ngày bắt đầu / kết thúc — đọc qua Supabase (anon), bảng{" "}
              <code className="rounded bg-black/[0.04] px-1 text-[11px]">mkt_quan_ly_media</code>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-[10px] pb-6 pt-4">
        <div className="mx-auto w-full max-w-[1600px] flex-1">
          <MediaTimeline />
        </div>
      </div>
    </div>
  );
}
