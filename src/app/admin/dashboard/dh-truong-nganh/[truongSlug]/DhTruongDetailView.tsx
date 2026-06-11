"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, Plus } from "lucide-react";

import type {
  AdminDhNganhNamMergedRow,
  AdminDhOverviewStats,
  AdminDhSchoolYearSummary,
  AdminDhStudentsPagedResult,
  AdminDhTruongMatched,
} from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

import DhNganhNamMetricTable from "../_shared/DhNganhNamMetricTable";
import DhPagination from "../_shared/DhPagination";
import DhStatsCards from "../_shared/DhStatsCards";
import DhStudentsTable from "../_shared/DhStudentsTable";

type Props = {
  truongSlug: string;
  nam: number;
  truong: AdminDhTruongMatched | null;
  yearOptions: number[];
  yearSummaries: AdminDhSchoolYearSummary[];
  nganhRows: AdminDhNganhNamMergedRow[];
  students: AdminDhStudentsPagedResult | null;
  stats: AdminDhOverviewStats | null;
  page: number;
  pageSize: number;
  missingServiceRole?: boolean;
  loadError?: string | null;
};

export default function DhTruongDetailView({
  truongSlug,
  nam,
  truong,
  yearOptions,
  yearSummaries,
  nganhRows,
  students,
  stats,
  page,
  pageSize,
  missingServiceRole,
  loadError,
}: Props) {
  const router = useRouter();
  const basePath = `/admin/dashboard/dh-truong-nganh/${truongSlug}`;

  const summaryByYear = useMemo(() => {
    const m = new Map<number, AdminDhSchoolYearSummary>();
    for (const s of yearSummaries) m.set(s.nam, s);
    return m;
  }, [yearSummaries]);

  const selectYears = useMemo(() => {
    const set = new Set(yearOptions);
    set.add(nam);
    return [...set].sort((a, b) => b - a);
  }, [yearOptions, nam]);

  const existingYears = useMemo(() => new Set(yearOptions), [yearOptions]);

  function hrefForNam(nextNam: number, nextPage = 1): string {
    const params = new URLSearchParams();
    params.set("nam", String(nextNam));
    if (nextPage > 1) params.set("page", String(nextPage));
    return `${basePath}?${params.toString()}`;
  }

  function openYear(year: number): void {
    router.push(hrefForNam(year));
  }

  if (!truong) {
    return (
      <div
        className={cn(
          "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-4 bg-[#F5F7F7] px-4 py-5 text-[#323232] md:-m-6 md:w-[calc(100%+3rem)] md:px-6",
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

  return (
    <div
      className={cn(
        "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-4 bg-[#F5F7F7] px-4 py-5 text-[#323232] md:-m-6 md:w-[calc(100%+3rem)] md:px-6",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/admin/dashboard/dh-truong-nganh"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EE5CA2] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Trường đại học
          </Link>
          <h1 className="m-0 mt-1 flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-[#1a1a2e]">
            <GraduationCap className="h-6 w-6 text-[#EE5CA2]" aria-hidden />
            {truong.ten}
          </h1>
          {truong.score != null ? (
            <p className="m-0 mt-0.5 text-[11px] font-semibold text-black/45">
              Score (ưu tiên): {truong.score}
            </p>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:min-w-[280px]">
          <label className="text-[10px] font-bold uppercase tracking-wide text-black/40" htmlFor="dh-truong-nam">
            Năm tuyển sinh
          </label>
          <select
            id="dh-truong-nam"
            value={nam}
            onChange={(e) => openYear(Number(e.target.value))}
            className={cn(
              "w-full rounded-lg border-[1.5px] border-[#EAEAEA] bg-white px-2.5 py-2 text-[12px] font-semibold text-[#1a1a2e]",
              "outline-none focus:border-[#F8A568] focus:ring-[2px] focus:ring-[#F8A568]/15",
            )}
          >
            {selectYears.map((y) => {
              const sum = summaryByYear.get(y);
              const label = sum
                ? `${y} — ${sum.soMocLich} mốc · ${sum.soNganhCoSoLieu} ngành · ${sum.hocVienDistinct} HV`
                : String(y);
              return (
                <option key={y} value={y}>
                  {label}
                </option>
              );
            })}
          </select>
          <AddYearWidget existingYears={existingYears} onOpenYear={openYear} />
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

      <section className="flex flex-col gap-2">
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
              : `${basePath}?nam=${nam}`;
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
          hrefForPage={(p) => hrefForNam(nam, p)}
        />
      </section>
    </div>
  );
}

function AddYearWidget({
  existingYears,
  onOpenYear,
}: {
  existingYears: Set<number>;
  onOpenYear: (year: number) => void;
}) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function handleSubmit(): void {
    setErr(null);
    const trimmed = val.trim();
    if (!trimmed) {
      setErr("Nhập năm.");
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      setErr("Năm phải là số nguyên.");
      return;
    }
    if (n < 2000 || n > 2100) {
      setErr("Năm phải trong khoảng 2000–2100.");
      return;
    }
    onOpenYear(n);
  }

  const trimmedNum = Number(val.trim());
  const alreadyExists =
    val.trim() !== "" && Number.isInteger(trimmedNum) && existingYears.has(trimmedNum);

  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-[10px] font-bold text-black/45">Thêm năm</span>
        <input
          type="number"
          inputMode="numeric"
          min={2000}
          max={2100}
          step={1}
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            if (err) setErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="2020"
          aria-label="Năm tuyển sinh mới"
          className="min-w-0 flex-1 rounded-lg border-[1.5px] border-[#EAEAEA] bg-white px-2 py-1.5 text-[12px] font-semibold tabular-nums text-[#1a1a2e] outline-none focus:border-[#EE5CA2] focus:ring-[2px] focus:ring-[#EE5CA2]/15 sm:w-[88px] sm:flex-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!val.trim()}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-[#EE5CA2]/35 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#EE5CA2] transition-colors hover:bg-[#EE5CA2]/06 disabled:opacity-50"
        >
          <Plus size={11} strokeWidth={2.5} aria-hidden />
          Mở
        </button>
      </div>
      {err ? (
        <p className="m-0 text-[10px] font-semibold text-red-600">{err}</p>
      ) : alreadyExists ? (
        <p className="m-0 text-[10px] font-semibold text-amber-700">Năm {trimmedNum} đã có trong danh sách.</p>
      ) : null}
    </div>
  );
}
