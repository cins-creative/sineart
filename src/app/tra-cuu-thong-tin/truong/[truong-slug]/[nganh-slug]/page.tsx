import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import NavBar from "../../../../_components/NavBar";
import { BlogDetailStyles } from "../../../../blogs/[slug]/BlogDetailStyles";
import { JsonLd } from "@/components/seo/JsonLd";
import { cfImage } from "@/lib/cf-image";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import {
  generateStaticParamsTruongNganhSlugs,
  getNganhDiemPublicPageData,
  publicTruongPath,
} from "@/lib/db/truong";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import {
  buildDhNganhBreadcrumbJsonLd,
  buildDhNganhDatasetJsonLd,
} from "@/lib/seo/dh-truong-public-jsonld";
import { SITE_OG_DEFAULT_IMAGE, SITE_ORIGIN } from "@/lib/seo/site-jsonld";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

type Props = { params: Promise<{ "truong-slug": string; "nganh-slug": string }> };

export async function generateStaticParams() {
  return generateStaticParamsTruongNganhSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "truong-slug": truongSlug, "nganh-slug": nganhSlug } = await params;
  const data = await getNganhDiemPublicPageData(truongSlug, nganhSlug);
  if (!data) return {};

  const latest = data.diemRows[0]!;
  const namMoiNhat = latest.nam_tuyen_sinh;
  const diemMoiNhat = latest.diem_chuan;
  const titleSeg = `Điểm chuẩn ${data.ten_nganh} — ${data.ten_truong} ${namMoiNhat}`;
  const description = `Điểm chuẩn ngành ${data.ten_nganh} tại ${data.ten_truong} năm ${namMoiNhat}${
    diemMoiNhat != null ? `: ${diemMoiNhat} điểm` : ""
  }. Lịch sử điểm chuẩn nhiều năm — Sine Art.`;

  const pageUrl = `${SITE_ORIGIN}/tra-cuu-thong-tin/truong/${encodeURIComponent(data.truong_slug)}/${encodeURIComponent(data.nganh_slug)}`;

  const ogRaw =
    cfImage(data.nganh_extras.hinh_anh, "public") ??
    cfImage(data.truong_extras.hinh_anh, "public") ??
    SITE_OG_DEFAULT_IMAGE;
  const ogImage = { url: ogRaw, width: 1200, height: 630, alt: titleSeg };

  return {
    title: titleSeg,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: pageUrl },
    openGraph: {
      title: titleSeg,
      description,
      url: pageUrl,
      siteName: "Sine Art",
      locale: "vi_VN",
      type: "article",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: titleSeg,
      description,
      images: [ogRaw],
    },
  };
}

export default async function TruongNganhDiemPage({ params }: Props) {
  const { "truong-slug": truongSlug, "nganh-slug": nganhSlug } = await params;
  const data = await getNganhDiemPublicPageData(truongSlug, nganhSlug);
  if (!data) notFound();

  const [{ courses }] = await Promise.all([getKhoaHocPageData()]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  const pageUrl = `${SITE_ORIGIN}/tra-cuu-thong-tin/truong/${encodeURIComponent(data.truong_slug)}/${encodeURIComponent(data.nganh_slug)}`;
  const truongPageUrl = `${SITE_ORIGIN}${publicTruongPath(data.truong_slug)}`;

  const namMin = data.diemRows[data.diemRows.length - 1]!.nam_tuyen_sinh;
  const namMax = data.diemRows[0]!.nam_tuyen_sinh;

  const dataset = buildDhNganhDatasetJsonLd({
    tenNganh: data.ten_nganh,
    tenTruong: data.ten_truong,
    pageUrl,
    namMin,
    namMax,
  });
  const breadcrumb = buildDhNganhBreadcrumbJsonLd({
    tenTruong: data.ten_truong,
    tenNganh: data.ten_nganh,
    truongPageUrl,
    pageUrl,
  });

  const headerSrc =
    cfImage(data.nganh_extras.hinh_anh, "public") ?? cfImage(data.truong_extras.hinh_anh, "public");

  return (
    <div className="sa-root bd">
      <JsonLd schema={dataset} />
      <JsonLd schema={breadcrumb} />
      <BlogDetailStyles />
      <NavBar khoaHocGroups={khoaHocGroups} />

      <div className="bd-shell">
        <div className="bd-body">
          <main className="bd-main">
            <nav className="bd-crumb" aria-label="Breadcrumb">
              <Link href="/tra-cuu-thong-tin" className="bd-crumb-back">
                Thông tin đại học
              </Link>
              <span className="bd-crumb-sep">/</span>
              <Link href={publicTruongPath(data.truong_slug)} className="bd-crumb-back">
                {data.ten_truong}
              </Link>
              <span className="bd-crumb-sep">/</span>
              <span style={{ fontWeight: 700, color: "rgba(45,32,32,.78)" }}>{data.ten_nganh}</span>
            </nav>

            <section className="mb-8 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
              <div className="relative aspect-[21/9] min-h-[180px] w-full md:aspect-[24/9]">
                {headerSrc ? (
                  <Image
                    src={headerSrc}
                    alt={`Ngành ${data.ten_nganh} tại ${data.ten_truong}`}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 900px) 100vw, 1100px"
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-[#f8a668] to-[#ee5b9f]"
                    aria-hidden
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <h1 className="text-2xl font-bold leading-tight text-white drop-shadow md:text-3xl">
                    Điểm chuẩn {data.ten_nganh} — {data.ten_truong}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 p-6 text-sm text-[#2d2020]/85">
                {data.nganh_extras.ma_truong ? (
                  <span>
                    <strong className="text-[#2d2020]">Mã ngành:</strong> {data.nganh_extras.ma_truong}
                  </span>
                ) : null}
                {data.mon_thi.length > 0 ? (
                  <div className="w-full">
                    <strong className="text-[#2d2020]">Môn thi:</strong>{" "}
                    <span>{data.mon_thi.join(", ")}</span>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="mb-10">
              <h2 className="bd-sb-label mb-3">Lịch sử điểm chuẩn</h2>
              <div className="overflow-x-auto rounded-2xl border border-black/[0.06] bg-white shadow-sm">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-black/[0.02] text-xs uppercase tracking-wide text-[#2d2020]/60">
                    <tr>
                      <th className="px-4 py-3">Năm</th>
                      <th className="px-4 py-3">Điểm chuẩn</th>
                      <th className="px-4 py-3">Chỉ tiêu</th>
                      <th className="px-4 py-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.diemRows.map((row, i) => (
                      <tr
                        key={row.nam_tuyen_sinh}
                        className={cn(
                          "border-t border-black/[0.04]",
                          i === 0 && "bg-[#fdf2f8]/80 font-semibold",
                        )}
                      >
                        <td className="px-4 py-2 tabular-nums">{row.nam_tuyen_sinh}</td>
                        <td className="px-4 py-2 tabular-nums">
                          {row.diem_chuan != null ? row.diem_chuan : "—"}
                        </td>
                        <td className="px-4 py-2 tabular-nums">{row.chi_tieu != null ? row.chi_tieu : "—"}</td>
                        <td className="px-4 py-2 text-[#2d2020]/75">{row.ghi_chu ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {data.details ? (
              <section className="mb-10 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
                <h2 className="bd-sb-label mb-2">Chi tiết ngành</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#2d2020]/85">
                  {data.details}
                </p>
              </section>
            ) : null}

            <Link
              href={publicTruongPath(data.truong_slug)}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-5 py-2.5 text-sm font-semibold text-[#2d2020] shadow-sm transition hover:border-[#ee5b9f]/40 hover:text-[#ee5b9f]"
            >
              ← Về trang {data.ten_truong}
            </Link>
          </main>
        </div>
      </div>
    </div>
  );
}
