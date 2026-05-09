"use client";

import Link from "next/link";
import { ArrowLeft, CalendarRange, GraduationCap, School } from "lucide-react";

import type {
  AdminDhMocLichRow,
  AdminDhNganhNamMergedRow,
  AdminDhOverviewStats,
  AdminDhStudentsPagedResult,
  AdminDhTruongMatched,
} from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

import DhMocLichTuyenSinhPanel from "../../../_shared/DhMocLichTuyenSinhPanel";
import DhNganhNamMetricTable from "../../../_shared/DhNganhNamMetricTable";
import DhPagination from "../../../_shared/DhPagination";
import DhStatsCards from "../../../_shared/DhStatsCards";
import DhStudentsTable from "../../../_shared/DhStudentsTable";

type Props = {
  truongSlug: string;
  nam: number;
  truong: AdminDhTruongMatched | null;
  /** Năm có trong hệ thống — dropdown đổi năm trong panel mốc lịch. */
  yearOptions: number[];
  milestones: AdminDhMocLichRow[];
  nganhRows: AdminDhNganhNamMergedRow[];
  students: AdminDhStudentsPagedResult | null;
  stats: AdminDhOverviewStats | null;
  page: number;
  pageSize: number;
  missingServiceRole?: boolean;
  loadError?: string | null;
};

export default function DhTuyenSinhNamView({
  truongSlug,
  nam,
  truong,
  yearOptions,
  milestones,
  nganhRows,
  students,
  stats,
  page,
  pageSize,
  missingServiceRole,
  loadError,
}: Props) {
  const hubHref = `/admin/dashboard/dh-truong-nganh/${truongSlug}`;
  const pathname = `/admin/dashboard/dh-truong-nganh/${truongSlug}/tuyen-sinh/${nam}`;

  if (!truong) {
    return (
      <div
        className={cn(
          "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-4 bg-[#F5F7F7] px-4 py-5 font-sans text-[#323232] md:-m-6 md:w-[calc(100%+3rem)] md:px-6",
        )}
      >
        <Link
          href="/admin/dashboard/dh-truong-nganh"
          className="inline-flex w-fit items-center gap-1 text-[12px] font-bold text-[#EE5CA2] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Danh sách trường
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          Không tìm thấy trường.
        </div>
      </div>
    );
  }

  const totalRows = students?.total ?? 0;
  const pageCount = students?.pageCount ?? 1;

  const qsPage = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  };

  return (
    <div
      className={cn(
        "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-4 bg-[#F5F7F7] px-4 py-5 font-sans text-[#323232] md:-m-6 md:w-[calc(100%+3rem)] md:px-6",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-black/45">
            <Link href="/admin/dashboard/dh-truong-nganh" className="hover:text-[#EE5CA2] hover:underline">
              Trường ĐH
            </Link>
            <span className="text-black/25">/</span>
            <Link href={hubHref} className="inline-flex items-center gap-0.5 hover:text-[#EE5CA2] hover:underline">
              <School className="h-3 w-3" />
              {truong.ten}
            </Link>
            <span className="text-black/25">/</span>
            <span className="text-[#1a1a2e]">Tuyển sinh {nam}</span>
          </nav>
          <h1 className="m-0 mt-1 flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-[#1a1a2e]">
            <CalendarRange className="h-6 w-6 text-[#F8A568]" aria-hidden />
            {nam}
            <span className="text-black/35">·</span>
            <span className="font-extrabold">{truong.ten}</span>
          </h1>
        </div>
      </div>

      {missingServiceRole ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          Thiếu <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {loadError}
        </div>
      ) : null}

      <DhStatsCards stats={stats} />

      {!missingServiceRole ? (
        <DhMocLichTuyenSinhPanel
          truongId={truong.id}
          truongTen={truong.ten}
          namTuyenSinh={nam}
          yearOptions={yearOptions}
          rows={milestones}
          hrefForYear={(y) =>
            `/admin/dashboard/dh-truong-nganh/${truongSlug}/tuyen-sinh/${y}`
          }
        />
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="m-0 flex items-center gap-2 text-[15px] font-extrabold text-[#1a1a2e]">
          <GraduationCap className="h-5 w-5 text-[#EE5CA2]" />
          Ngành đào tạo — chỉ tiêu &amp; điểm chuẩn ({nam})
        </h2>
        <p className="m-0 text-[12px] font-medium text-black/45">
          Số liệu lưu tại <code className="rounded bg-black/[0.04] px-1">dh_truong_nganh_theo_nam</code>. Bấm tên
          ngành để mở trang chi tiết môn thi / học viên theo ngành.
        </p>
        {!missingServiceRole ? (
          <DhNganhNamMetricTable
            truongId={truong.id}
            nam={nam}
            truongSlug={truongSlug}
            rows={nganhRows}
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-[15px] font-extrabold text-[#1a1a2e]">
          Học viên Sine Art đăng ký thi (năm {nam})
        </h2>
        <DhStudentsTable
          rows={students?.rows ?? []}
          showNganhColumn
          hrefForNganh={(nganhId) => {
            const r = nganhRows.find((x) => x.nganh_id === nganhId);
            return r
              ? `/admin/dashboard/dh-truong-nganh/${truongSlug}/nganh/${r.nganh_slug}`
              : hubHref;
          }}
          emptyText={
            totalRows === 0
              ? `Chưa có học viên nào đăng ký thi trường này vào năm ${nam}.`
              : "Trang này không còn bản ghi."
          }
        />
        <DhPagination
          page={page}
          pageCount={pageCount}
          total={totalRows}
          pageSize={pageSize}
          hrefForPage={qsPage}
        />
      </section>
    </div>
  );
}
