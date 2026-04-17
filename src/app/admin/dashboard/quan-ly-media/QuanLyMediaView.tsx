"use client";

import { Clapperboard } from "lucide-react";

import MediaTimeline from "@/app/admin/dashboard/quan-ly-media/MediaTimeline";
import type {
  HrNhanSuStaffOption,
  MktMediaProjectRow,
  StaffAvatarById,
  StaffNameById,
} from "@/lib/data/admin-quan-ly-media";

type Props = {
  initialProjects: MktMediaProjectRow[];
  /** `hr_nhan_su` — hiển thị tên thay cho ID trong modal chi tiết. */
  staffNameById?: StaffNameById;
  /** `hr_nhan_su.avatar` — avatar người làm / người tạo trong modal. */
  staffAvatarById?: StaffAvatarById;
  /** Nhân sự ban Marketing / Media — chọn người làm trong modal. */
  mediaTeamStaff?: HrNhanSuStaffOption[];
  /** Nhân sự ban Media — filter timeline theo người làm. */
  mediaBanStaffFilter?: HrNhanSuStaffOption[];
  loadError?: string | null;
  /** Thiếu SUPABASE_SERVICE_ROLE_KEY trên server. */
  missingServiceRole?: boolean;
  /** Gợi ý chạy GRANT khi lỗi permission denied. */
  showGrantSqlHelp?: boolean;
};

export default function QuanLyMediaView({
  initialProjects,
  staffNameById = {},
  staffAvatarById = {},
  mediaTeamStaff = [],
  mediaBanStaffFilter = [],
  loadError,
  missingServiceRole,
  showGrantSqlHelp,
}: Props) {
  const blocked = Boolean(missingServiceRole) || Boolean(loadError);

  return (
    <div className="-m-4 flex h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] min-h-0 flex-col overflow-hidden bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <Clapperboard className="text-white" size={20} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Quản lý media</div>
            <div className="text-xs text-[#AAAAAA]">
              Timeline theo ngày bắt đầu / kết thúc — đọc server-side (service role), bảng{" "}
              <code className="rounded bg-black/[0.04] px-1 text-[11px]">mkt_quan_ly_media</code>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-[10px] pb-6 pt-4">
        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col">
          {missingServiceRole ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
              Thiếu <code className="rounded bg-amber-100/80 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được
              dữ liệu admin trên server.
            </div>
          ) : null}

          {loadError && showGrantSqlHelp ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
              <p className="font-medium">Không đọc được bảng: {loadError}</p>
              <p className="mt-2 text-xs leading-relaxed text-red-900/90">
                Trên Supabase: SQL Editor → chạy file migration{" "}
                <code className="break-all rounded bg-red-100/80 px-1">
                  supabase/migrations/20260417120000_mkt_quan_ly_media_grants.sql
                </code>{" "}
                hoặc lệnh tương đương{" "}
                <code className="break-all rounded bg-red-100/80 px-1">
                  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mkt_quan_ly_media TO service_role;
                </code>{" "}
                rồi <code className="rounded bg-red-100/80 px-1">NOTIFY pgrst, &apos;reload schema&apos;;</code>
              </p>
            </div>
          ) : null}

          {loadError && !showGrantSqlHelp ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
              Lỗi tải dữ liệu: {loadError}
            </div>
          ) : null}

          {!blocked ? (
            <MediaTimeline
              initialProjects={initialProjects}
              staffNameById={staffNameById}
              staffAvatarById={staffAvatarById}
              mediaTeamStaff={mediaTeamStaff}
              mediaBanStaffFilter={mediaBanStaffFilter}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
