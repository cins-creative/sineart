"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, ListChecks, Plus, Search, Users, X } from "lucide-react";

import type {
  AdminDhNganhFilterRow,
  AdminDhOverviewStats,
  AdminDhStudentsPagedResult,
  AdminDhTruongMatched,
} from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

import DhNganhFilterCards from "../_shared/DhNganhFilterCards";
import DhPagination from "../_shared/DhPagination";
import DhStudentsTable from "../_shared/DhStudentsTable";

const PAGE_SHELL =
  "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-3 bg-[#F5F7F7] px-4 py-4 text-[#2d2020] md:-m-6 md:w-[calc(100%+3rem)] md:gap-4 md:px-6 md:py-5";

type Props = {
  truongSlug: string;
  nam: number;
  truong: AdminDhTruongMatched | null;
  yearOptions: number[];
  yearHvByNam: Record<number, number>;
  nganhRows: AdminDhNganhFilterRow[];
  hvCountByNganhId: Record<number, number>;
  totalHvDistinct: number;
  selectedNganhSlug: string | null;
  students: AdminDhStudentsPagedResult | null;
  stats: AdminDhOverviewStats | null;
  page: number;
  pageSize: number;
  searchQuery: string;
  missingServiceRole?: boolean;
  loadError?: string | null;
};

export default function DhTruongDetailView({
  truongSlug,
  nam,
  truong,
  yearOptions,
  yearHvByNam,
  nganhRows,
  hvCountByNganhId,
  totalHvDistinct,
  selectedNganhSlug,
  students,
  stats,
  page,
  pageSize,
  searchQuery,
  missingServiceRole,
  loadError,
}: Props) {
  const router = useRouter();
  const basePath = `/admin/dashboard/dh-truong-nganh/${truongSlug}`;
  const [searchDraft, setSearchDraft] = useState(searchQuery);

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  const selectYears = useMemo(() => {
    const set = new Set(yearOptions);
    set.add(nam);
    for (const y of Object.keys(yearHvByNam)) set.add(Number(y));
    return [...set].sort((a, b) => b - a);
  }, [yearOptions, nam, yearHvByNam]);

  const existingYears = useMemo(() => new Set(selectYears), [selectYears]);

  function hrefForFilters(
    nextNam: number,
    nextNganhSlug: string | null,
    nextPage = 1,
    nextSearch: string | null = searchQuery,
  ): string {
    const params = new URLSearchParams();
    params.set("nam", String(nextNam));
    if (nextNganhSlug) params.set("nganh", nextNganhSlug);
    if (nextPage > 1) params.set("page", String(nextPage));
    const q = nextSearch?.trim() ?? "";
    if (q) params.set("q", q);
    return `${basePath}?${params.toString()}`;
  }

  useEffect(() => {
    const trimmed = searchDraft.trim();
    if (trimmed === searchQuery.trim()) return;
    const t = window.setTimeout(() => {
      router.push(hrefForFilters(nam, selectedNganhSlug, 1, trimmed || null));
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchDraft, searchQuery, nam, selectedNganhSlug, router]);

  function openYear(year: number): void {
    router.push(hrefForFilters(year, selectedNganhSlug));
  }

  const selectedNganh = selectedNganhSlug
    ? nganhRows.find((r) => r.nganh_slug === selectedNganhSlug) ?? null
    : null;

  if (!truong) {
    return (
      <div className={PAGE_SHELL}>
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
    <div className={PAGE_SHELL}>
      <section className="rounded-2xl border border-black/[0.06] bg-white p-3 shadow-sm md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <Link
              href="/admin/dashboard/dh-truong-nganh"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EE5CA2] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Trường đại học
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="m-0 flex min-w-0 items-center gap-2 text-lg font-extrabold tracking-tight text-[#2d2020] md:text-xl">
                <GraduationCap className="h-5 w-5 shrink-0 text-[#EE5CA2]" aria-hidden />
                <span className="truncate">{truong.ten}</span>
              </h1>
              {truong.score != null ? (
                <span className="inline-flex shrink-0 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold tabular-nums text-black/50">
                  Ưu tiên #{truong.score}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <InlineStatChip
                icon={Users}
                value={stats?.totalHocVien ?? 0}
                label="học viên"
                tone="pink"
              />
              <InlineStatChip
                icon={ListChecks}
                value={stats?.totalNguyenVong ?? 0}
                label="nguyện vọng"
                tone="orange"
              />
            </div>
          </div>

          <div className="w-full min-w-0 lg:max-w-[520px]">
            <p className="m-0 mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-black/40">
              Năm thi
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {selectYears.map((y) => {
                const active = y === nam;
                const hv = yearHvByNam[y];
                return (
                  <Link
                    key={y}
                    href={hrefForFilters(y, selectedNganhSlug)}
                    scroll={false}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums transition-all",
                      active
                        ? "border-transparent bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] text-white shadow-sm"
                        : "border-black/[0.08] bg-white text-black/55 hover:border-[#EE5CA2]/30 hover:text-[#EE5CA2]",
                    )}
                    aria-current={active ? "true" : undefined}
                  >
                    {y}
                    {hv != null ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px text-[9px] font-extrabold",
                          active ? "bg-white/20 text-white" : "bg-black/[0.05] text-black/45",
                        )}
                      >
                        {hv}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              <AddYearWidget existingYears={existingYears} onOpenYear={openYear} />
            </div>
          </div>
        </div>
      </section>

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

      {!missingServiceRole ? (
        <DhNganhFilterCards
          nam={nam}
          rows={nganhRows}
          selectedNganhSlug={selectedNganhSlug}
          hvCountByNganhId={hvCountByNganhId}
          totalHvCount={totalHvDistinct}
          hrefForNganh={(slug, p = 1) => hrefForFilters(nam, slug, p)}
        />
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="m-0 text-[14px] font-extrabold text-[#2d2020] md:text-[15px]">
              {selectedNganh ? selectedNganh.ten_nganh : "Danh sách học viên"}
            </h2>
            <p className="m-0 mt-0.5 text-[11px] font-semibold text-black/45">
              Năm {nam}
              {searchQuery.trim()
                ? ` · ${totalRows.toLocaleString("vi-VN")} kết quả`
                : selectedNganh
                  ? ` · ${totalRows.toLocaleString("vi-VN")} dòng`
                  : null}
            </p>
          </div>
          <div className="relative min-w-0 w-full sm:max-w-[280px]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35"
              aria-hidden
            />
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Tìm tên, email…"
              aria-label="Tìm học viên theo tên hoặc email"
              className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-white py-0 pl-8 pr-8 text-xs text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
            />
            {searchDraft ? (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => setSearchDraft("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/60"
              >
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <DhStudentsTable
          rows={students?.rows ?? []}
          showNganhColumn={!selectedNganh}
          hrefForNganh={(nganhId) => {
            const r = nganhRows.find((x) => x.nganh_id === nganhId);
            return r
              ? `/admin/dashboard/dh-truong-nganh/${truongSlug}/nganh/${r.nganh_slug}`
              : hrefForFilters(nam, null);
          }}
          emptyText={
            totalRows === 0
              ? searchQuery.trim()
                ? `Không có học viên nào khớp «${searchQuery.trim()}».`
                : selectedNganh
                  ? `Chưa có học viên nào đăng ký ngành «${selectedNganh.ten_nganh}» vào năm ${nam}.`
                  : `Chưa có học viên nào đăng ký thi trường này vào năm ${nam}.`
              : "Trang này không còn bản ghi."
          }
        />
        <DhPagination
          page={page}
          pageCount={pageCount}
          total={totalRows}
          pageSize={pageSize}
          hrefForPage={(p) => hrefForFilters(nam, selectedNganhSlug, p)}
        />
      </section>
    </div>
  );
}

function InlineStatChip({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  tone: "pink" | "orange";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
        tone === "pink"
          ? "border-[#EE5CA2]/15 bg-[#EE5CA2]/08 text-[#a4326c]"
          : "border-[#F8A568]/20 bg-[#F8A568]/10 text-[#c2410c]",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden />
      <span className="tabular-nums text-[#2d2020]">{value.toLocaleString("vi-VN")}</span>
      <span className="font-semibold opacity-70">{label}</span>
    </span>
  );
}

function AddYearWidget({
  existingYears,
  onOpenYear,
}: {
  existingYears: Set<number>;
  onOpenYear: (year: number) => void;
}) {
  const [open, setOpen] = useState(false);
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
    setOpen(false);
    setVal("");
  }

  const trimmedNum = Number(val.trim());
  const alreadyExists =
    val.trim() !== "" && Number.isInteger(trimmedNum) && existingYears.has(trimmedNum);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-black/[0.12] bg-white px-2.5 py-1 text-[11px] font-bold text-black/45 transition-colors hover:border-[#EE5CA2]/35 hover:text-[#EE5CA2]"
      >
        <Plus size={11} strokeWidth={2.5} aria-hidden />
        Năm khác
      </button>
    );
  }

  return (
    <div className="flex w-full min-w-[200px] flex-col gap-1 sm:w-auto">
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={2000}
          max={2100}
          step={1}
          autoFocus
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            if (err) setErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            } else if (e.key === "Escape") {
              setOpen(false);
              setVal("");
              setErr(null);
            }
          }}
          placeholder="2028"
          aria-label="Năm thi mới"
          className="w-[72px] rounded-full border-[1.5px] border-[#EAEAEA] bg-white px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#2d2020] outline-none focus:border-[#F8A568] focus:ring-[2px] focus:ring-[#F8A568]/15"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!val.trim()}
          className="rounded-full bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-2.5 py-1 text-[10px] font-extrabold text-white disabled:opacity-50"
        >
          Mở
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setVal("");
            setErr(null);
          }}
          className="rounded-full px-1.5 py-1 text-[10px] font-bold text-black/40 hover:text-black/65"
        >
          Huỷ
        </button>
      </div>
      {err ? (
        <p className="m-0 text-[10px] font-semibold text-red-600">{err}</p>
      ) : alreadyExists ? (
        <p className="m-0 text-[10px] font-semibold text-amber-700">Năm {trimmedNum} đã có.</p>
      ) : null}
    </div>
  );
}
