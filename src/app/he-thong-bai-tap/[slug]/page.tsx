import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBaiTapByHeThongSlug } from "@/lib/data/bai-tap";
import HeThongBaiTapBreadcrumb from "./HeThongBaiTapBreadcrumb";
import HvSessionFromClassroomSync from "./HvSessionFromClassroomSync";
import NavBarAsync from "./_components/NavBarAsync";
import { NavBarAsyncSkeleton } from "./_components/NavBarAsync.skeleton";
import LessonBodyAsync from "./_components/LessonBodyAsync";
import { LessonBodyAsyncSkeleton } from "./_components/LessonBodyAsync.skeleton";
import "@/app/khoa-hoc/khoa-hoc-detail.css";
import "../he-thong-bai-tap.css";

export const dynamic = "force-dynamic";

type SlugSearchParams = { mon?: string | string[] };

function pickMonId(searchParams: SlugSearchParams | undefined): number | null {
  const raw = searchParams?.mon;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<SlugSearchParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = (await searchParams) ?? undefined;
  const monId = pickMonId(sp);
  const bai = await getBaiTapByHeThongSlug(slug, { monId });
  if (!bai) {
    return {
      title: "Bài tập — Sine Art",
    };
  }
  return {
    title: `${bai.ten_bai_tap} (Bài ${bai.bai_so}) — ${bai.mon_hoc.ten_mon_hoc} — Sine Art`,
    description: `Hướng dẫn bài tập ${bai.ten_bai_tap} (${bai.mon_hoc.ten_mon_hoc}) tại Sine Art.`,
  };
}

/**
 * Streaming pattern: phần tĩnh (NavBar sync, breadcrumb, heading) render ngay từ `bai`;
 * các khối fetch nặng (courses nav, siblings + access, gallery) tách Suspense độc lập.
 *
 * - `bai` — single-row indexed select, giữ `await` ở page cha (cần cho breadcrumb + `notFound()`).
 * - `NavBarAsync` — courses + mega menu, stream trong Suspense riêng.
 * - `LessonBodyAsync` — siblings (môn) + access (tiến độ HV/GV) → gate hoặc view.
 * - `WorkGalleryAsync` (con của `HeThongBaiTapView`) — masonry tranh bài tập, Suspense riêng.
 */
export default async function HeThongBaiTapSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<SlugSearchParams>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? undefined;
  const monId = pickMonId(sp);
  const bai = await getBaiTapByHeThongSlug(slug, { monId });
  if (!bai) notFound();

  return (
    <>
      <HvSessionFromClassroomSync />
      <Suspense fallback={<NavBarAsyncSkeleton />}>
        <NavBarAsync />
      </Suspense>
      <div className="sa-root khoa-hoc-page htbt-root">
        <div className="kd-page">
          <h1 className="sr-only">
            Bài {bai.bai_so} — {bai.ten_bai_tap} — {bai.mon_hoc.ten_mon_hoc}
          </h1>
          <HeThongBaiTapBreadcrumb bai={bai} />
          <Suspense fallback={<LessonBodyAsyncSkeleton />}>
            <LessonBodyAsync bai={bai} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
