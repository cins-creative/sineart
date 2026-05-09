"use client";

import { useMemo } from "react";
import Link from "next/link";
import { GraduationCap, School } from "lucide-react";

import {
  buildDhTruongSlug,
  sortDhTruongLookupByScore,
  type AdminDhTruongLookup,
} from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

type Props = {
  truongs: AdminDhTruongLookup[];
  missingServiceRole?: boolean;
  loadError?: string | null;
};

export default function DhTruongListView({ truongs, missingServiceRole, loadError }: Props) {
  const sorted = sortDhTruongLookupByScore(truongs);

  const slugById = useMemo(() => {
    const all = sorted.map((x) => ({ id: x.id, ten: x.ten }));
    const m = new Map<number, string>();
    for (const t of sorted) {
      m.set(t.id, buildDhTruongSlug(t.id, t.ten, all));
    }
    return m;
  }, [sorted]);

  return (
    <div
      className={cn(
        "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-4 bg-[#F5F7F7] px-4 py-5 font-sans text-[#323232] md:-m-6 md:w-[calc(100%+3rem)] md:px-6",
      )}
    >
      <div className="min-w-0">
        <h1 className="m-0 flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#1a1a2e]">
          <School className="h-6 w-6 text-[#EE5CA2]" aria-hidden />
          Trường đại học
        </h1>
        <p className="m-0 mt-1 text-[13px] font-medium text-black/45">
          Chọn trường để xem lịch tuyển sinh theo năm, ngành và học viên Sine Art.
        </p>
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

      {sorted.length === 0 && !loadError ? (
        <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-10 text-center text-[13px] font-semibold text-black/40 shadow-sm">
          Chưa có trường nào trong <code className="rounded bg-black/[0.04] px-1">dh_truong_dai_hoc</code>.
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((t) => {
            const slug = slugById.get(t.id) ?? String(t.id);
            const href = `/admin/dashboard/dh-truong-nganh/${slug}`;
            return (
              <li key={t.id}>
                <Link
                  href={href}
                  className="flex min-h-[100px] flex-col rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition-colors hover:border-[#F8A568]/45 hover:shadow-md"
                >
                  <span className="flex items-start gap-2">
                    <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-[#EE5CA2]" aria-hidden />
                    <span className="text-[15px] font-extrabold leading-snug text-[#1a1a2e]">{t.ten}</span>
                  </span>
                  {t.score != null ? (
                    <span className="mt-2 text-[11px] font-bold text-black/40">Score (ưu tiên): {t.score}</span>
                  ) : (
                    <span className="mt-2 text-[11px] font-semibold text-black/30">—</span>
                  )}
                  <span className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-[#EE5CA2]">
                    Mở trường →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
