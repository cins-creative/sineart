"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  Plus,
  School,
  Users,
} from "lucide-react";

import type {
  AdminDhMocLichRow,
  AdminDhSchoolYearSummary,
  AdminDhTruongMatched,
} from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

import DhMocLichTuyenSinhPanel, {
  DhMocLichQuickAdd,
} from "../_shared/DhMocLichTuyenSinhPanel";

type Props = {
  truongSlug: string;
  truong: AdminDhTruongMatched | null;
  yearSummaries: AdminDhSchoolYearSummary[];
  /** Năm đang hiển thị trong khối mốc lịch (thường = năm mới nhất). */
  mocPanelYear?: number | null;
  mocPanelRows?: AdminDhMocLichRow[];
  mocYearOptions?: number[];
  missingServiceRole?: boolean;
  loadError?: string | null;
};

export default function DhSchoolHubView({
  truongSlug,
  truong,
  yearSummaries,
  mocPanelYear = null,
  mocPanelRows = [],
  mocYearOptions = [],
  missingServiceRole,
  loadError,
}: Props) {
  const router = useRouter();
  const existingYears = useMemo(
    () => new Set(yearSummaries.map((s) => s.nam)),
    [yearSummaries],
  );
  const base = `/admin/dashboard/dh-truong-nganh/${truongSlug}/tuyen-sinh`;

  function openYear(year: number): void {
    router.push(`${base}/${year}`);
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
          Không tìm thấy trường với slug <code>{truongSlug}</code>.
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-4 bg-[#F5F7F7] px-4 py-5 text-[#323232] md:-m-6 md:w-[calc(100%+3rem)] md:px-6",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/dashboard/dh-truong-nganh"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EE5CA2] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Trường đại học
          </Link>
          <h1 className="m-0 mt-1 flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#1a1a2e]">
            <GraduationCap className="h-6 w-6 text-[#EE5CA2]" aria-hidden />
            {truong.ten}
          </h1>
          {truong.score != null ? (
            <p className="m-0 mt-0.5 text-[11px] font-semibold text-black/45">
              Score (ưu tiên): {truong.score}
            </p>
          ) : null}
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

      {!missingServiceRole && truong && mocPanelYear != null ? (
        <DhMocLichTuyenSinhPanel
          showQuickAdd={false}
          truongId={truong.id}
          truongTen={truong.ten}
          namTuyenSinh={mocPanelYear}
          yearOptions={mocYearOptions}
          rows={mocPanelRows}
          hrefForYear={(y) =>
            `/admin/dashboard/dh-truong-nganh/${truongSlug}/tuyen-sinh/${y}`
          }
        />
      ) : null}

      <section className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 flex items-center gap-2 text-[15px] font-extrabold text-[#1a1a2e]">
              <CalendarDays className="h-5 w-5 text-[#F8A568]" aria-hidden />
              Tuyển sinh theo năm
            </h2>
            <p className="m-0 mt-1 text-[12px] font-medium text-black/45">
              Chọn năm để xem mốc lịch, chỉ tiêu / điểm chuẩn từng ngành và danh sách học viên Sine Art (
              <code className="rounded bg-black/[0.04] px-1">nam_thi</code>).
            </p>
          </div>
          <AddYearWidget existingYears={existingYears} onOpenYear={openYear} />
        </div>

        {yearSummaries.length === 0 ? (
          <p className="m-0 mt-4 text-[13px] font-semibold text-black/40">
            Chưa có dữ liệu năm — thêm năm ở khung bên phải hoặc nhập chỉ tiêu / mốc lịch ở trang năm.
          </p>
        ) : (
          <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {yearSummaries.map((s) => (
              <li key={s.nam}>
                <Link
                  href={`${base}/${s.nam}`}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-xl border border-black/[0.06] bg-[#fafafa] px-4 py-3 transition-colors",
                    "hover:border-[#F8A568]/45 hover:bg-white sm:flex-nowrap sm:justify-between",
                  )}
                >
                  <span className="min-w-[4rem] text-base font-extrabold tabular-nums text-[#1a1a2e]">
                    {s.nam}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-black/50 sm:justify-end">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#BB89F8]" aria-hidden />
                      {s.soMocLich} mốc lịch
                    </span>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <School className="h-3.5 w-3.5 shrink-0 text-[#EE5CA2]" aria-hidden />
                      {s.soNganhCoSoLieu} ngành có số liệu
                    </span>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <Users className="h-3.5 w-3.5 shrink-0 text-[#F8A568]" aria-hidden />
                      {s.hocVienDistinct} HV (distinct)
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-[#EE5CA2]">
                    Chi tiết
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!missingServiceRole && truong && mocPanelYear != null ? (
        <DhMocLichQuickAdd
          truongId={truong.id}
          truongTen={truong.ten}
          namTuyenSinh={mocPanelYear}
          title="Thêm mốc lịch (nhanh)"
        />
      ) : null}
    </div>
  );
}

/**
 * Widget thêm năm tuyển sinh: nhập năm → mở trang chi tiết năm đó.
 * Năm chưa có dữ liệu sẽ tự xuất hiện trong list sau khi nhập chỉ tiêu / mốc lịch.
 *
 * - Validate 2000 ≤ year ≤ 2100.
 * - Hiển thị badge "đã có dữ liệu" nếu năm đã nằm trong `existingYears`.
 * - Quick-pick: 4 năm gần đây liên tiếp trở về trước, bỏ qua năm đã có.
 */
function AddYearWidget({
  existingYears,
  onOpenYear,
}: {
  existingYears: Set<number>;
  onOpenYear: (year: number) => void;
}) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const quickPicks = useMemo(() => {
    const yNow = new Date().getFullYear();
    const candidates: number[] = [];
    for (let offset = 1; candidates.length < 4 && offset <= 20; offset += 1) {
      const y = yNow - offset;
      if (y < 2000) break;
      if (!existingYears.has(y)) candidates.push(y);
    }
    return candidates;
  }, [existingYears]);

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
    <div className="w-full max-w-[260px] shrink-0 rounded-xl border border-[#F8A568]/30 bg-gradient-to-br from-[#F8A568]/06 to-[#EE5CA2]/05 p-3 shadow-sm sm:w-auto sm:min-w-[240px]">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#EE5CA2]">
        <Plus size={11} strokeWidth={2.5} /> Thêm năm
      </div>
      <div className="flex items-center gap-1.5">
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
          placeholder="VD: 2020"
          className="min-w-0 flex-1 rounded-lg border-[1.5px] border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[13px] font-semibold tabular-nums text-[#1a1a2e] outline-none focus:border-[#EE5CA2] focus:ring-[3px] focus:ring-[#EE5CA2]/15"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!val.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Mở
          <ArrowRight size={12} strokeWidth={2.5} />
        </button>
      </div>
      {err ? (
        <p className="m-0 mt-1.5 text-[10px] font-semibold text-red-600">{err}</p>
      ) : alreadyExists ? (
        <p className="m-0 mt-1.5 text-[10px] font-semibold text-amber-700">
          Năm {trimmedNum} đã có trong danh sách bên dưới.
        </p>
      ) : null}

      {quickPicks.length > 0 ? (
        <div className="mt-2">
          <p className="m-0 mb-1 text-[9px] font-bold uppercase tracking-wide text-black/35">
            Năm cũ chưa có
          </p>
          <div className="flex flex-wrap gap-1">
            {quickPicks.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => onOpenYear(y)}
                className="rounded-full border border-[#F8A568]/35 bg-white px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#EE5CA2] transition-colors hover:border-[#EE5CA2] hover:bg-[#EE5CA2]/06"
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
