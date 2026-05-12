import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import NavBar from "../../../_components/NavBar";
import { BlogDetailStyles } from "../../../blogs/[slug]/BlogDetailStyles";
import { JsonLd } from "@/components/seo/JsonLd";
import { cfImage } from "@/lib/cf-image";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import {
  generateStaticParamsTruongSlugs,
  getTruongPublicPageData,
  publicNganhPath,
} from "@/lib/db/truong";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import {
  buildDhTruongBreadcrumbJsonLd,
  buildDhTruongCollegeJsonLd,
  buildDhTruongDatasetJsonLd,
} from "@/lib/seo/dh-truong-public-jsonld";
import { SITE_OG_DEFAULT_IMAGE, SITE_ORIGIN } from "@/lib/seo/site-jsonld";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

type Props = { params: Promise<{ "truong-slug": string }> };

const THUMB_GRADS = [
  "linear-gradient(135deg,#fde859,#f8a668)",
  "linear-gradient(135deg,#f8a668,#ee5b9f)",
  "linear-gradient(135deg,#bb89f8,#ee5b9f)",
  "linear-gradient(135deg,#6efec0,#3bd99e)",
] as const;

const grad = (id: number) => THUMB_GRADS[id % THUMB_GRADS.length]!;

export async function generateStaticParams() {
  return generateStaticParamsTruongSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "truong-slug": truongSlug } = await params;
  const data = await getTruongPublicPageData(truongSlug);
  if (!data) return {};

  const latestYear = data.metricsByYear[0]?.year;
  const titleSeg = `${data.ten_truong} — Điểm chuẩn & Tuyển sinh${latestYear != null ? ` ${latestYear}` : ""}`;
  const description =
    data.extras.mo_ta?.trim() ||
    `Điểm chuẩn, ngành học, phương thức xét tuyển và lịch tuyển sinh ${data.ten_truong}. Cập nhật bởi Sine Art.`;

  const pageUrl = `${SITE_ORIGIN}/tra-cuu-thong-tin/truong/${encodeURIComponent(data.truong_slug)}`;
  const ogRaw =
    cfImage(data.extras.hinh_anh, "public") ?? SITE_OG_DEFAULT_IMAGE;
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

export default async function TruongTuyenSinhPage({ params }: Props) {
  const { "truong-slug": truongSlug } = await params;
  const data = await getTruongPublicPageData(truongSlug);
  if (!data) notFound();

  const [{ courses }] = await Promise.all([getKhoaHocPageData()]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  const pageUrl = `${SITE_ORIGIN}/tra-cuu-thong-tin/truong/${encodeURIComponent(data.truong_slug)}`;
  const heroSrc = cfImage(data.extras.hinh_anh, "public");
  const schemaImage = heroSrc ?? SITE_OG_DEFAULT_IMAGE;

  const college = buildDhTruongCollegeJsonLd({
    tenTruong: data.ten_truong,
    moTa: data.extras.mo_ta,
    website: data.extras.website,
    diaChi: data.extras.dia_chi,
    imageUrl: schemaImage,
    pageUrl,
  });
  const dataset = buildDhTruongDatasetJsonLd({ tenTruong: data.ten_truong, pageUrl });
  const breadcrumb = buildDhTruongBreadcrumbJsonLd({ tenTruong: data.ten_truong, pageUrl });

  return (
    <div className="sa-root bd">
      <JsonLd schema={college} />
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
              <span style={{ fontWeight: 700, color: "rgba(45,32,32,.78)" }}>{data.ten_truong}</span>
            </nav>

            <section className="relative mb-10 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
              <div className="relative aspect-[21/9] min-h-[200px] w-full md:aspect-[24/9]">
                {heroSrc ? (
                  <Image
                    src={heroSrc}
                    alt={`Ảnh ${data.ten_truong}`}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 900px) 100vw, 1100px"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: grad(data.truong_id) }}
                    aria-hidden
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                  <h1 className="text-2xl font-bold leading-tight text-white drop-shadow md:text-4xl">
                    {data.ten_truong}
                  </h1>
                  {data.score != null && (
                    <p className="mt-2 text-sm text-white/90">Ưu tiên catalog (score): {data.score}</p>
                  )}
                </div>
              </div>
              <div className="space-y-3 p-6 md:p-8">
                {data.extras.mo_ta ? (
                  <p className="text-[15px] leading-relaxed text-[#2d2020]/85">{data.extras.mo_ta}</p>
                ) : null}
                <div className="flex flex-wrap gap-4 text-sm text-[#2d2020]/80">
                  {data.extras.ma_truong ? (
                    <span>
                      <strong className="text-[#2d2020]">Mã trường:</strong> {data.extras.ma_truong}
                    </span>
                  ) : null}
                  {data.extras.dia_chi ? (
                    <span>
                      <strong className="text-[#2d2020]">Địa chỉ:</strong> {data.extras.dia_chi}
                    </span>
                  ) : null}
                  {data.extras.website ? (
                    <a
                      href={data.extras.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#ee5b9f] underline-offset-2 hover:underline"
                    >
                      Website trường
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="bd-sb-label mb-4">Ngành đào tạo</h2>
              {data.nganh.length === 0 ? (
                <p className="text-sm text-[#2d2020]/65">Chưa có ngành trong catalog.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.nganh.map((n) => (
                    <Link
                      key={n.nganh_id}
                      href={publicNganhPath(data.truong_slug, n.slug)}
                      className={cn(
                        "group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                      )}
                    >
                      <div
                        className="relative aspect-[16/10] w-full"
                        style={{ background: grad(n.nganh_id) }}
                      >
                        <div className="absolute inset-0 flex items-end p-4">
                          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#2d2020] shadow">
                            Điểm chuẩn &amp; chỉ tiêu
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="text-lg font-bold text-[#2d2020] group-hover:text-[#ee5b9f]">
                          {n.ten_nganh}
                        </div>
                        {n.mon_thi.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {n.mon_thi.slice(0, 4).map((m) => (
                              <span
                                key={m}
                                className="rounded-full bg-[#f8a668]/15 px-2 py-0.5 text-[11px] font-medium text-[#2d2020]"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-12">
              <h2 className="bd-sb-label mb-4">Điểm chuẩn &amp; chỉ tiêu theo năm</h2>
              {data.metricsByYear.length === 0 ? (
                <p className="text-sm text-[#2d2020]/65">Chưa có số liệu theo năm.</p>
              ) : (
                <div className="space-y-3">
                  {data.metricsByYear.map(({ year, rows }) => (
                    <details
                      key={year}
                      className="group overflow-hidden rounded-2xl border border-black/[0.06] bg-white open:shadow-md"
                      open={year === data.metricsByYear[0]?.year}
                    >
                      <summary className="cursor-pointer list-none px-4 py-3 font-bold text-[#2d2020] marker:hidden [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center justify-between gap-2">
                          <span>Năm {year}</span>
                          <span className="text-xs font-normal text-[#2d2020]/50">Mở / đóng</span>
                        </span>
                      </summary>
                      <div className="overflow-x-auto border-t border-black/[0.04]">
                        <table className="w-full min-w-[520px] text-left text-sm">
                          <thead className="bg-black/[0.02] text-xs uppercase tracking-wide text-[#2d2020]/60">
                            <tr>
                              <th className="px-4 py-2">Ngành</th>
                              <th className="px-4 py-2">Điểm chuẩn</th>
                              <th className="px-4 py-2">Chỉ tiêu</th>
                              <th className="px-4 py-2">Ghi chú</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={`${year}-${r.nganh_id}`} className="border-t border-black/[0.04]">
                                <td className="px-4 py-2 font-medium text-[#2d2020]">
                                  <Link
                                    href={publicNganhPath(data.truong_slug, r.nganh_slug)}
                                    className="hover:text-[#ee5b9f] hover:underline"
                                  >
                                    {r.ten_nganh}
                                  </Link>
                                </td>
                                <td className="px-4 py-2 tabular-nums">
                                  {r.diem_chuan != null ? r.diem_chuan : "—"}
                                </td>
                                <td className="px-4 py-2 tabular-nums">{r.chi_tieu != null ? r.chi_tieu : "—"}</td>
                                <td className="px-4 py-2 text-[#2d2020]/75">{r.ghi_chu ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-8">
              <h2 className="bd-sb-label mb-4">Lịch tuyển sinh</h2>
              {data.mocByYear.length === 0 ? (
                <p className="text-sm text-[#2d2020]/65">Chưa có mốc lịch.</p>
              ) : (
                <div className="space-y-6">
                  {data.mocByYear.map(({ year, rows }) => (
                    <div key={year}>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#2d2020]/55">
                        Năm {year}
                      </h3>
                      <ol className="relative space-y-4 border-l-2 border-[#f8a668]/40 pl-6">
                        {rows.map((m) => (
                          <li key={m.id} className="relative">
                            <span
                              className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#ee5b9f] shadow"
                              aria-hidden
                            />
                            <div className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm">
                              <div className="font-semibold text-[#2d2020]">
                                {m.ten_moc ?? "Mốc tuyển sinh"}
                              </div>
                              <div className="mt-1 text-sm text-[#2d2020]/80">{m.thoi_gian_mo_ta}</div>
                              {m.ghi_chu ? (
                                <p className="mt-2 text-sm text-[#2d2020]/70">{m.ghi_chu}</p>
                              ) : null}
                              {m.nguon_thong_bao ? (
                                <a
                                  href={m.nguon_thong_bao}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-block text-sm font-semibold text-[#ee5b9f] hover:underline"
                                >
                                  Nguồn thông báo
                                </a>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
