import type { Metadata } from "next";
import { Suspense } from "react";

import NavBar from "../_components/NavBar";
import DeThiListClient from "./DeThiListClient";
import { DeThiStyles } from "./DeThiStyles";
import { fetchAllDeThi, fetchTruongLookup } from "@/lib/data/de-thi";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Tổng hợp đề thi mỹ thuật — Sine Art",
  description:
    "Thư viện đề luyện thi Bố cục màu, Trang trí màu — biên soạn bởi giáo viên Sine Art, cập nhật hàng năm. Có lời giải, OCR đề gốc, filter theo môn · năm · loại mẫu.",
  alternates: { canonical: "https://sineart.vn/tong-hop-de-thi" },
};

export default async function TongHopDeThiPage() {
  const [items, truongLookup, { courses }] = await Promise.all([
    fetchAllDeThi(),
    fetchTruongLookup(),
    getKhoaHocPageData(),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  // Distinct năm/môn/loại mẫu từ dataset thực tế — filter options.
  // Brief v3: filter Trường luôn hiển thị (kèm option "Đề luyện tập Sine Art"
  // cho `truong_ids = []` hoặc `[1]`) — không ẩn dựa trên dataset.
  const namSet = new Set<number>();
  const monSet = new Set<string>();
  const mauSet = new Set<string>();
  for (const it of items) {
    if (it.nam != null) namSet.add(it.nam);
    for (const m of it.mon) monSet.add(m);
    for (const m of it.loai_mau_hinh_hoa) mauSet.add(m);
  }

  const namOptions = Array.from(namSet).sort((a, b) => b - a);
  const monOptions = Array.from(monSet).sort();
  const mauOptions = Array.from(mauSet).sort();

  return (
    <div className="sa-root sa-dethi">
      <NavBar khoaHocGroups={khoaHocGroups} />

      {/* HERO */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <div className="shell page-hero-inner">
          <div>
            <div className="ph-eyebrow">
              <span className="dot">≡</span>
              Sine Art · {items.length > 0 ? `${items.length} đề thi` : "Đề thi luyện tập"}
            </div>
            <h1>
              Tổng hợp <em>đề thi</em>
              <br />
              mỹ thuật.
            </h1>
            <p className="lead">
              Thư viện đề luyện thi Bố cục màu, Trang trí màu — biên soạn bởi giáo viên Sine Art,
              kèm OCR đề gốc và lời giải. Dùng để luyện tập bài bản theo đúng format đề thi các
              trường đại học.
            </p>
          </div>
          <div className="ph-side">
            <div className="ph-stat">
              <div className="n">
                <em>{items.length > 0 ? `${items.length}+` : "—"}</em>
              </div>
              <div className="l">
                Đề thi đã biên soạn
                <br />
                <span>Cập nhật hàng năm</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{monOptions.length || "—"}</div>
              <div className="l">
                Môn thi
                <br />
                <span>Bố cục màu · Trang trí màu…</span>
              </div>
            </div>
            <div className="ph-stat">
              <div className="n">{namOptions.length || "—"}</div>
              <div className="l">
                Năm thi
                <br />
                <span>
                  {namOptions.length > 0
                    ? `${namOptions[namOptions.length - 1]} – ${namOptions[0]}`
                    : "Đang cập nhật"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="shell" style={{ padding: "40px 0" }}>
            <div className="sec-label">Đang tải…</div>
          </div>
        }
      >
        <DeThiListClient
          items={items}
          truongLookup={truongLookup}
          namOptions={namOptions}
          monOptions={monOptions}
          mauOptions={mauOptions}
        />
      </Suspense>

      <DeThiStyles />
    </div>
  );
}
