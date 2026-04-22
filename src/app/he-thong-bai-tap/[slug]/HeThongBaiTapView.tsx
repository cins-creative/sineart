import Link from "next/link";
import { Fragment, Suspense } from "react";

import type { HeThongBaiTapAccess } from "@/lib/data/hoc-vien-bai-tap-access";
import type { BaiTap } from "@/types/baiTap";
import { buildHeThongBaiTapHref } from "@/lib/he-thong-bai-tap/slug";
import { parseVideoBaiGiangEntries } from "@/lib/utils/youtube";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import HeThongBaiTapVideoPanel from "./HeThongBaiTapVideoPanel";
import HeThongBaiTapLyThuyetList from "./HeThongBaiTapLyThuyetList";
import HeThongBaiTapLoiSaiList from "./HeThongBaiTapLoiSaiList";
import WorkGalleryAsync from "./_components/WorkGalleryAsync";
import { WorkGalleryAsyncSkeleton } from "./_components/WorkGalleryAsync.skeleton";

function LockIconSmall() {
  return (
    <svg
      className="htbt-bai-lock"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Làm nổi «Mô tả», «Mục đích» đầu dòng (thường có dấu • và «:» sau đó). */
function renderMoTaHighlighted(text: string) {
  const lines = text.split(/\r?\n/);
  /** Nhóm 1: indent + bullet; 2: từ khóa; 3: «:» và khoảng trắng; 4: phần còn lại */
  const labelRe =
    /^(\s*(?:[•\-\*\u2022]\s+)?)(Mô tả|Mục đích)(\s*[:：]\s*)?(.*)$/u;

  return lines.map((line, lineIdx) => {
    const m = line.match(labelRe);
    const tailNl = lineIdx < lines.length - 1 ? "\n" : null;

    if (!m) {
      return (
        <Fragment key={lineIdx}>
          {line}
          {tailNl}
        </Fragment>
      );
    }

    return (
      <Fragment key={lineIdx}>
        {m[1]}
        <span className="htbt-r-mo-ta-kw">
          {m[2]}
          {m[3] ?? ""}
        </span>
        {m[4]}
        {tailNl}
      </Fragment>
    );
  });
}

function mucDoShort(m: BaiTap["muc_do_quan_trong"]): string {
  switch (m) {
    case "Tập luyện":
      return "Tập luyện";
    case "Tuỳ chọn":
      return "Tuỳ chọn";
    default:
      return "Bắt buộc";
  }
}

export default function HeThongBaiTapView({
  bai,
  siblingsSorted,
  access,
}: {
  bai: BaiTap;
  siblingsSorted: BaiTap[];
  access: HeThongBaiTapAccess;
}) {
  const huongDan = bai.mo_ta_bai_tap?.trim() ?? "";
  const totalBai = siblingsSorted.length;
  const lyThuyetCount = bai.video_ly_thuyet.length;
  const hasLyThuyet = lyThuyetCount > 0;
  const loiSaiCount = parseVideoBaiGiangEntries(bai.loi_sai).length;
  const hasLoiSai = loiSaiCount > 0;

  return (
    <article className="htbt-shell">
      {/* Hero header — eyebrow + title có gradient "Bài X" + meta pills */}
      <header className="htbt-header">
        <p className="htbt-header-eyebrow">
          Hệ thống bài tập ·{" "}
          <span className="htbt-header-eyebrow-strong">
            {bai.mon_hoc.ten_mon_hoc}
          </span>
        </p>
        <h2 className="htbt-header-title">
          <span className="htbt-header-bai-no">Bài {bai.bai_so}</span>
          <span className="htbt-header-title-main">{bai.ten_bai_tap}</span>
        </h2>
        <div className="htbt-header-meta">
          <span className="htbt-meta-chip">
            <strong>{bai.so_buoi || 1}</strong>&nbsp;buổi
          </span>
          <span className="htbt-meta-chip htbt-meta-chip--accent">
            {mucDoShort(bai.muc_do_quan_trong)}
          </span>
          {totalBai > 0 ? (
            <span className="htbt-meta-chip">
              Bài&nbsp;<strong>{bai.bai_so}</strong>&nbsp;/ {totalBai}
            </span>
          ) : null}
        </div>
      </header>

      {/* Video hướng dẫn — full-width hero, lớn nhất và đứng ngoài grid */}
      <section
        className="htbt-hero-video"
        aria-label={`Video hướng dẫn bài ${bai.bai_so} — ${bai.ten_bai_tap}`}
      >
        <div className="htbt-hero-video-stage">
          <HeThongBaiTapVideoPanel
            videoBaiGiang={bai.video_bai_giang}
            iframeTitle={`Video bài ${bai.bai_so} — ${bai.ten_bai_tap}`}
          />
        </div>
      </section>

      <div className="htbt-split">
        <div className="htbt-left-panel">
          {hasLyThuyet ? (
            <section
              className="htbt-lt-callout"
              aria-labelledby="htbt-lt-callout-title"
            >
              <div className="htbt-lt-callout-head">
                <span className="htbt-lt-callout-badge" aria-hidden>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                  </svg>
                  Bắt buộc xem trước
                </span>
                <span className="htbt-lt-callout-count">
                  <strong>{lyThuyetCount}</strong>
                  &nbsp;video
                </span>
              </div>
              <h3
                id="htbt-lt-callout-title"
                className="htbt-lt-callout-title"
              >
                Lý thuyết cần nắm để làm được bài này
              </h3>
              <p className="htbt-lt-callout-sub">
                Xem các video dưới đây trước khi bắt đầu bài tập để hiểu cơ sở lý
                thuyết. Bấm vào từng video để mở YouTube.
              </p>
              <HeThongBaiTapLyThuyetList videos={bai.video_ly_thuyet} />
            </section>
          ) : null}

          <div className="htbt-left-bottom">
            <div className="htbt-bai-sticky">
              <details className="htbt-bai-details">
                <summary className="htbt-bai-summary">
                  <span className="htbt-sec-label htbt-bai-summary-label">
                    Xem bài tập khác
                  </span>
                  {totalBai > 0 ? (
                    <span className="htbt-bai-summary-count">
                      {totalBai} bài
                    </span>
                  ) : null}
                  <svg
                    className="htbt-bai-summary-chev"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <h3 className="htbt-sec-label htbt-bai-nav-label">
                  Xem bài tập khác
                </h3>
                <nav
                  className="htbt-bai-list"
                  aria-label="Danh sách bài trong môn"
                >
                {[...siblingsSorted].reverse().map((row) => {
                  const href = buildHeThongBaiTapHref(
                    row.bai_so,
                    row.ten_bai_tap,
                    bai.mon_hoc.id,
                  );
                  const thumb = cfImageForThumbnail(row.thumbnail);
                  const active = row.id === bai.id;
                  const ascIdx = siblingsSorted.findIndex((x) => x.id === row.id);
                  const locked =
                    ascIdx >= 0 && ascIdx > access.maxAccessibleIndex;

                  const rowInner = (
                    <>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="htbt-bai-thumb" src={thumb} alt="" />
                      ) : (
                        <div className="htbt-bai-thumb" />
                      )}
                      <div className="htbt-bai-meta">
                        <div className="htbt-bai-num">
                          Bài {row.bai_so}
                          {active ? " — đang xem" : ""}
                          {locked ? " — khóa" : ""}
                        </div>
                        <div className="htbt-bai-name">{row.ten_bai_tap}</div>
                      </div>
                      {locked ? <LockIconSmall /> : null}
                    </>
                  );

                  if (locked) {
                    return (
                      <div
                        key={row.id}
                        className={`htbt-bai-item htbt-bai-item--locked${active ? " active" : ""}`}
                        title="Chưa mở trong lộ trình học của bạn"
                      >
                        {rowInner}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={row.id}
                      href={href}
                      className={`htbt-bai-item${active ? " active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      {rowInner}
                    </Link>
                  );
                })}
                </nav>
              </details>
            </div>
          </div>
        </div>

        <div className="htbt-right-panel">
          <div className="htbt-right-scroll">
            <section className="htbt-r-section">
              <h3 className="htbt-sec-label">Hướng dẫn bài tập</h3>
              {huongDan ? (
                <div className="htbt-r-mo-ta">
                  {renderMoTaHighlighted(huongDan)}
                </div>
              ) : (
                <p className="htbt-placeholder">
                  Chưa có hướng dẫn — nhập mô tả tại{" "}
                  <code>mo_ta_bai_tap</code> (quản trị / Hệ thống bài tập).
                </p>
              )}
            </section>

            {hasLoiSai ? (
              <section className="htbt-r-section">
                <details className="htbt-ls-details">
                  <summary className="htbt-ls-summary">
                    <span
                      className="htbt-ls-summary-icon"
                      aria-hidden
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      </svg>
                    </span>
                    <span className="htbt-ls-summary-body">
                      <span className="htbt-ls-summary-label">
                        Lỗi sai thường gặp
                      </span>
                      <span className="htbt-ls-summary-meta">
                        {loiSaiCount} video Shorts · bấm để xem
                      </span>
                    </span>
                    <svg
                      className="htbt-ls-summary-chev"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <div className="htbt-ls-body">
                    <HeThongBaiTapLoiSaiList raw={bai.loi_sai} />
                  </div>
                </details>
              </section>
            ) : null}

            <section className="htbt-r-section">
              <div className="htbt-r-sec-head">
                <h3 className="htbt-sec-label">Tranh tham khảo</h3>
                <span className="htbt-r-sec-hint">
                  Bài mẫu & học viên trước
                </span>
              </div>
              <Suspense fallback={<WorkGalleryAsyncSkeleton />}>
                <WorkGalleryAsync baiTapId={bai.id} />
              </Suspense>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}
