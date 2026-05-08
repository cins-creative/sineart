"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, CalendarRange, GraduationCap, School } from "lucide-react";

import type {
  AdminDhNganhMatched,
  AdminDhOverviewStats,
  AdminDhStudentsPagedResult,
  AdminDhTruongMatched,
} from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

import DhPagination from "../../_shared/DhPagination";
import DhStatsCards from "../../_shared/DhStatsCards";
import DhStudentsTable from "../../_shared/DhStudentsTable";

type Props = {
  truongSlug: string;
  nganhSlug: string;
  truong: AdminDhTruongMatched | null;
  nganh: AdminDhNganhMatched | null;
  availableYears: number[];
  namThiFilter: number | null;
  page: number;
  pageSize: number;
  students: AdminDhStudentsPagedResult | null;
  stats: AdminDhOverviewStats | null;
  missingServiceRole?: boolean;
  loadError?: string | null;
};

function inp(): string {
  return cn(
    "w-full rounded-[10px] border-[1.5px] border-[var(--color-border-subtle,#EAEAEA)] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]",
    "outline-none focus:border-[#F8A568] focus:ring-[3px] focus:ring-[#F8A568]/15",
  );
}

export default function DhPairDetailView({
  truongSlug,
  nganhSlug,
  truong,
  nganh,
  availableYears,
  namThiFilter,
  page,
  pageSize,
  students,
  stats,
  missingServiceRole,
  loadError,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const truongHref = `/admin/dashboard/dh-truong-nganh/${truongSlug}`;

  const buildHref = useCallback(
    (overrides: { nam?: string | null; page?: number | null }): string => {
      const params = new URLSearchParams();
      if (namThiFilter != null) params.set("nam", String(namThiFilter));
      if (page > 1) params.set("page", String(page));
      for (const [k, v] of Object.entries(overrides)) {
        if (v == null || v === "") params.delete(k);
        else params.set(k, String(v));
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [namThiFilter, page, pathname],
  );

  const onNamChange = useCallback(
    (value: string) => router.push(buildHref({ nam: value || null, page: null })),
    [buildHref, router],
  );

  if (!truong || !nganh) {
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
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại danh sách
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          Không tìm thấy ngành <code>{nganhSlug}</code> trong trường <code>{truongSlug}</code>.
        </div>
      </div>
    );
  }

  const totalRows = students?.total ?? 0;
  const pageCount = students?.pageCount ?? 1;

  return (
    <div
      className={cn(
        "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-4 bg-[#F5F7F7] px-4 py-5 font-sans text-[#323232] md:-m-6 md:w-[calc(100%+3rem)] md:px-6",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <nav className="flex items-center gap-1 text-[11px] font-bold text-black/45">
            <Link
              href="/admin/dashboard/dh-truong-nganh"
              className="hover:text-[#EE5CA2] hover:underline"
            >
              Trường &amp; ngành thi
            </Link>
            <span className="text-black/25">/</span>
            <Link href={truongHref} className="hover:text-[#EE5CA2] hover:underline">
              <School className="mr-0.5 inline h-3 w-3" />
              {truong.ten}
            </Link>
          </nav>
          <h1 className="m-0 mt-1 flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#1a1a2e]">
            <GraduationCap className="h-6 w-6 text-[#EE5CA2]" aria-hidden />
            {nganh.ten}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-col gap-1.5 sm:w-44">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-black/45">
            Năm thi
          </span>
          <div className="relative">
            <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <select
              className={cn(inp(), "appearance-none pl-10 pr-9")}
              value={namThiFilter != null ? String(namThiFilter) : ""}
              onChange={(e) => onNamChange(e.target.value)}
              disabled={availableYears.length === 0}
            >
              <option value="">— Tất cả năm —</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <DhStudentsTable
        rows={students?.rows ?? []}
        showNganhColumn={false}
        emptyText={
          totalRows === 0
            ? `Chưa có học viên nào thi ${nganh.ten} ${truong.ten}${namThiFilter != null ? ` vào năm ${namThiFilter}` : ""}.`
            : "Trang này không còn bản ghi."
        }
      />

      <DhPagination
        page={page}
        pageCount={pageCount}
        total={totalRows}
        pageSize={pageSize}
        hrefForPage={(p) => buildHref({ page: p > 1 ? p : null })}
      />
    </div>
  );
}
