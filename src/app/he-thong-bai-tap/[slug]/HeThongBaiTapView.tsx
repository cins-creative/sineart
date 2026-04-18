import Link from "next/link";
import { Fragment } from "react";

import GallerySection from "@/app/_components/GallerySection";
import type { HeThongBaiTapAccess } from "@/lib/data/hoc-vien-bai-tap-access";
import type { GalleryDisplayItem } from "@/types/homepage";
import type { BaiTap } from "@/types/baiTap";
import { buildHeThongBaiTapSlug } from "@/lib/he-thong-bai-tap/slug";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import HeThongBaiTapVideoPanel from "./HeThongBaiTapVideoPanel";

function LockIconSmall() {
  return (
    <svg className="htbt-bai-lock" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" />
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
        <span className="htbt-r-mo-ta-kw">{m[2]}{m[3] ?? ""}</span>
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
      return "Quan trọng";
  }
}

export default function HeThongBaiTapView({
  bai,
  siblingsSorted,
  access,
  workGalleryItems,
}: {
  bai: BaiTap;
  siblingsSorted: BaiTap[];
  access: HeThongBaiTapAccess;
  workGalleryItems: GalleryDisplayItem[];
}) {
  const maxI = access.maxAccessibleIndex;
  const huongDan = bai.mo_ta_bai_tap?.trim() ?? "";

  return (
    <article className="htbt-shell">
      <div className="htbt-split">
        <div className="htbt-left-panel">
          <div className="htbt-video-stack">
            <HeThongBaiTapVideoPanel
              videoBaiGiang={bai.video_bai_giang}
              iframeTitle={`Video bài ${bai.bai_so} — ${bai.ten_bai_tap}`}
            />
          </div>

          <div className="htbt-left-bottom">
            <div>
              <div className="htbt-left-section-title">Thông tin bài</div>
              <div className="htbt-info-chips">
                <div className="htbt-chip">
                  <div className="htbt-chip-label">Số buổi</div>
                  <div className="htbt-chip-val">{bai.so_buoi || "—"}</div>
                </div>
                <div className="htbt-chip" style={{ flex: 1, minWidth: 120 }}>
                  <div className="htbt-chip-label">Mức độ quan trọng</div>
                  <div className="htbt-chip-val htbt-chip-val--accent">{mucDoShort(bai.muc_do_quan_trong)}</div>
                </div>
                <div className="htbt-chip">
                  <div className="htbt-chip-label">Bài số</div>
                  <div className="htbt-chip-val">{bai.bai_so}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="htbt-left-section-title">Các bài trong khoá</div>
              <nav className="htbt-bai-list" aria-label="Danh sách bài trong môn">
                {[...siblingsSorted].reverse().map((row) => {
                  const href = `/he-thong-bai-tap/${buildHeThongBaiTapSlug(row.bai_so, row.ten_bai_tap)}`;
                  const thumb = cfImageForThumbnail(row.thumbnail);
                  const active = row.id === bai.id;
                  const ascIdx = siblingsSorted.findIndex((x) => x.id === row.id);
                  const locked = ascIdx >= 0 && ascIdx > access.maxAccessibleIndex;

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
            </div>
          </div>
        </div>

        <div className="htbt-right-panel">
          <div className="htbt-right-scroll">
            <div className="htbt-r-section">
              <div className="htbt-r-title">Hướng dẫn bài tập</div>
              {huongDan ? (
                <div className="htbt-r-mo-ta">{renderMoTaHighlighted(huongDan)}</div>
              ) : (
                <p className="htbt-placeholder">
                  Chưa có hướng dẫn — nhập mô tả tại <code>mo_ta_bai_tap</code> (quản trị / Hệ thống bài
                  tập).
                </p>
              )}
            </div>

            <div className="htbt-r-section">
              <div className="htbt-r-title">Mở rộng</div>
              <p className="htbt-r-gallery-lead">
                Tranh theo bài {bai.bai_so} — <strong>{bai.ten_bai_tap}</strong>. Lọc theo
                loại: bài mẫu của trung tâm, hoặc bài tham khảo (tác phẩm học viên trước đã
                hoàn thiện cho đúng bài tập này).
              </p>
              <GallerySection
                items={workGalleryItems}
                monHocTabs={[]}
                tabMode="work_kind"
                sectionTitle="Tranh bài tập"
                showSectionTitle={false}
                sectionTitleAs="div"
                galleryWrapId="htbt-tranh-bai"
                showFooterCta={false}
                rootClassName="htbt-work-gallery"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
