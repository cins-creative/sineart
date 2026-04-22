"use client";

import BaiTapList from "@/components/course/BaiTapList";
import type {
  HocPhiBlockData,
  KhoaHocDetailData,
  KhoaHocReviewStats,
  OngoingClassCard,
} from "@/types/khoa-hoc";
import HocPhiBlock from "@/components/courses/HocPhiBlock";
import type { GalleryDisplayItem } from "@/types/homepage";
import type { BaiTap } from "@/types/baiTap";
import type { TeacherPortfolioSlide } from "@/types/khoa-hoc";
import { cfImageForLightbox, cfImageForThumbnail } from "@/lib/cfImageUrl";
import TeachersSection from "@/app/_components/TeachersSection";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  KD_DANH_CHO_AI,
  KD_DEFAULT_LEARN,
  KD_FAQ,
  KD_REVIEWS,
  KD_THREE_SUBJECTS,
} from "../_data/khoa-hoc-detail-static";
import DongHocPhiEmailGateModal from "./DongHocPhiEmailGateModal";
import { toEmbedUrl } from "@/lib/utils/youtube";

const GROUP_CRUMB: Record<KhoaHocDetailData["group"], string> = {
  lthi: "Luyện thi & bổ trợ",
  digital: "Digital",
  kids: "Kids",
  botro: "Bổ trợ",
};

function learnBullets(tinh: string | null): string[] {
  if (!tinh?.trim()) return [...KD_DEFAULT_LEARN];
  const parts = tinh
    .split(/[.•\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12); // loại bỏ fragment quá ngắn (vd: "Online", "Tại lớp")
  if (parts.length >= 3) return parts.slice(0, 8);
  return [...KD_DEFAULT_LEARN.slice(0, 8 - parts.length), ...parts].slice(0, 8);
}

function normalizeMonLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const KD_OC_BADGE: Record<
  OngoingClassCard["status"],
  { className: string; label: string; barClass: string }
> = {
  open: {
    className: "kd-oc-badge kd-oc-badge--open",
    label: "Còn chỗ",
    barClass: "kd-oc-bar-fill kd-oc-bar-fill--open",
  },
  almost: {
    className: "kd-oc-badge kd-oc-badge--almost",
    label: "Sắp đầy",
    barClass: "kd-oc-bar-fill kd-oc-bar-fill--almost",
  },
  full: {
    className: "kd-oc-badge kd-oc-badge--full",
    label: "Đã đầy",
    barClass: "kd-oc-bar-fill kd-oc-bar-fill--full",
  },
};

const DEFAULT_REVIEW_STATS: KhoaHocReviewStats = { avg: 0, count: 0 };

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconScreen({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><path d="M8 21h8M12 17v4" />
    </svg>
  );
}
function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
export default function KhoaHocDetailView({
  detail,
  fallbackTitle,
  studentGallery = [],
  hocPhiBlock = null,
  hocPhiMonId = null,
  hocPhiAllowCapToc = false,
  teacherPortfolioSlides = [],
  baiTapList = [],
  ongoingClasses = [],
  reviewStats = DEFAULT_REVIEW_STATS,
}: {
  detail: KhoaHocDetailData | null;
  fallbackTitle?: string;
  studentGallery?: GalleryDisplayItem[];
  hocPhiBlock?: HocPhiBlockData | null;
  hocPhiMonId?: number | null;
  hocPhiAllowCapToc?: boolean;
  teacherPortfolioSlides?: TeacherPortfolioSlide[];
  baiTapList?: BaiTap[];
  ongoingClasses?: OngoingClassCard[];
  reviewStats?: KhoaHocReviewStats;
}) {
  const d = detail;
  const title = d?.tenMonHoc ?? fallbackTitle ?? "Khóa học";
  const autoRegisterHref =
    hocPhiMonId != null
      ? `/donghocphi?monId=${hocPhiMonId}&course=${encodeURIComponent(title)}`
      : "/donghocphi";
  const sub =
    d?.tinhChat?.trim() ??
    "Chương trình đào tạo tại Sine Art — học viên được theo dõi sát sao trong từng buổi.";
  const tag = d?.hinhThucTag ?? "Khóa học";
  const group = d?.group ?? "lthi";
  const crumbMid = GROUP_CRUMB[group];

  const bullets = useMemo(() => learnBullets(d?.tinhChat ?? null), [d?.tinhChat]);

  const introVideoEmbedSrc = useMemo(
    () => toEmbedUrl(d?.videoGioiThieu ?? null),
    [d?.videoGioiThieu]
  );

  const [hvGalIdx, setHvGalIdx] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [dhpEmailModalOpen, setDhpEmailModalOpen] = useState(false);

  useEffect(() => {
    setHvGalIdx((i) => {
      const n = studentGallery.length;
      if (n <= 0) return 0;
      return Math.min(i, n - 1);
    });
  }, [studentGallery.length]);

  useEffect(() => {
    const n = studentGallery.length;
    if (n <= 1) return;
    const id = window.setInterval(() => {
      setHvGalIdx((i) => (i + 1) % n);
    }, 4000);
    return () => window.clearInterval(id);
  }, [studentGallery.length]);

  const teacherMonTabs = useMemo(() => {
    const mons = Array.from(
      new Set(
        teacherPortfolioSlides
          .map((s) => String(s.monHoc ?? "").trim())
          .filter((s) => s.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "vi"));
    return ["Tất cả", ...mons];
  }, [teacherPortfolioSlides]);

  const effectiveTeacherMonTab = useMemo(() => {
    const tNorm = normalizeMonLabel(title);
    return teacherMonTabs.find((mon) => normalizeMonLabel(mon) === tNorm) ?? "Tất cả";
  }, [teacherMonTabs, title]);

  const visibleTeacherSlides = useMemo(() => {
    if (effectiveTeacherMonTab === "Tất cả") {
      return teacherPortfolioSlides.map((s) => ({ id: s.id, src: s.src }));
    }
    return teacherPortfolioSlides
      .filter((s) => s.monHoc === effectiveTeacherMonTab)
      .map((s) => ({ id: s.id, src: s.src }));
  }, [teacherPortfolioSlides, effectiveTeacherMonTab]);

  /** Thời lượng — lấy `lich_hoc` của lớp đầu tiên (đã trim trong `OngoingClassCard.lich`). */
  const lichHocDisplay = useMemo(() => {
    const firstLich = ongoingClasses.find((c) => c.lich.trim().length > 0)?.lich;
    return firstLich?.trim() || "Theo lịch lớp";
  }, [ongoingClasses]);

  /** Sỉ số — ưu tiên `ql_mon_hoc.si_so`; null → "Theo lớp". */
  const siSoDisplay = useMemo(() => {
    const si = d?.siSo;
    return si != null && si > 0 ? `${si} HV / lớp` : "Theo lớp";
  }, [d?.siSo]);

  /** Đánh giá — từ `ql_danh_gia` (avg so_sao · count). */
  const reviewDisplay = useMemo(() => {
    if (reviewStats.count <= 0) return "Chưa có đánh giá";
    const avg = reviewStats.avg.toFixed(1);
    return `${avg} · ${reviewStats.count} đánh giá`;
  }, [reviewStats]);

  const gradStyle =
    d?.gradientStart && d?.gradientEnd
      ? {
          background: `linear-gradient(135deg, ${d.gradientStart}, ${d.gradientEnd})`,
        }
      : undefined;

  const hvMainItem =
    studentGallery.length > 0
      ? (studentGallery[hvGalIdx] ?? studentGallery[0])
      : undefined;
  const hvMainSrc =
    hvMainItem?.photo != null && String(hvMainItem.photo).trim()
      ? cfImageForLightbox(hvMainItem.photo) || hvMainItem.photo
      : null;

  return (
    <div className="kd-page">
      {/* BREADCRUMB */}
      <nav className="kd-bc" aria-label="Breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span className="kd-bc-sep">›</span>
        <Link href="/khoa-hoc">Khóa học</Link>
        <span className="kd-bc-sep">›</span>
        <span className="kd-bc-muted">{crumbMid}</span>
        <span className="kd-bc-sep">›</span>
        <span className="kd-bc-current">{title}</span>
      </nav>

      {/* PAGE GRID
         * Title được kéo ra khỏi .kd-page-main để làm grid item trực tiếp.
         * Thứ tự visual được điều khiển bởi CSS grid-row:
         *   Mobile: title (row 1) → sidebar (row 2) → main (row 3)
         *   Desktop: title col1 row1, main col1 row2, sidebar col2 row1/span 2 (sticky)
         * Xem khoa-hoc-detail.css — selector `.kd-page-grid`.
         */}
      <div className="kd-page-grid">
        {/* ── 00 TITLE (grid item trực tiếp) ── */}
        <header className="kd-page-title-row">
          <div className="kd-page-eyebrow">
            <span className="kd-page-eyebrow-dot" aria-hidden />
            <span>{tag}</span>
            <span className="kd-page-eyebrow-sep" aria-hidden>·</span>
            <span>{crumbMid}</span>
          </div>
          <h1 className="kd-page-h1">
            Khóa học {title.replace(/\s+(Online|Tại lớp|Tai lop|Offline)\s*$/i, "").trim() || title} {tag}
          </h1>
          <div className="kd-page-title-rule" aria-hidden />
        </header>

        {/* LEFT / MAIN CONTENT */}
        <div className="kd-page-main">

          {/* ── 01 STUDENT WORKS ── */}
          <section className="kd-block kd-works-top" id="works">
            <div className="kd-sec-label">Bài học viên khoá trước</div>
            <h2 className="kd-sec-title">
              Những gì bạn sẽ làm được <em>sau khoá học</em>
            </h2>
            <p className="kd-sec-sub">
              Tất cả đều là bài thật, không chỉnh sửa, chụp từ nguyên bản giấy.
            </p>

            {studentGallery.length > 0 && hvMainItem ? (
              <>
                <div className="kd-hv-gallery">
                  <div className="kd-hv-main">
                    {hvMainSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={hvGalIdx}
                        src={hvMainSrc}
                        alt=""
                        className="kd-hv-main-img"
                      />
                    ) : (
                      <div className="kd-hv-ph kd-hv-ph--main" style={gradStyle} aria-hidden />
                    )}
                    <div className="kd-hv-overlay" aria-live="polite" aria-atomic="true">
                      {hvGalIdx + 1} / {studentGallery.length} ảnh
                    </div>
                    <div className="kd-hv-main-cap">
                      <span className="kd-hv-student">{hvMainItem.studentName}</span>
                      <span className="kd-hv-cat">{hvMainItem.categoryLabel}</span>
                    </div>
                  </div>
                  {studentGallery.length > 1 && (
                    <div className="kd-hv-thumbs" role="tablist" aria-label="Chọn ảnh bài học viên">
                      {studentGallery.map((item, i) => {
                        const thumbSrc = item.photo
                          ? cfImageForThumbnail(item.photo) || item.photo
                          : null;
                        return (
                          <button
                            key={`${String(item.id)}-${i}`}
                            type="button"
                            role="tab"
                            aria-selected={hvGalIdx === i}
                            className={`kd-hv-thumb${hvGalIdx === i ? " kd-hv-thumb--sel" : ""}`}
                            onClick={() => setHvGalIdx(i)}
                          >
                            {thumbSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumbSrc} alt="" className="kd-hv-thumb-img" loading="lazy" />
                            ) : (
                              <div className="kd-hv-thumb-ph" style={gradStyle} aria-hidden />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="kd-hv-more">
                  <Link href="/gallery" className="kd-link-more">Xem gallery toàn trang →</Link>
                </p>
              </>
            ) : (
              <p className="kd-hv-empty">
                Chưa có tác phẩm tải được cho khóa này.{" "}
                <Link href="/gallery" className="kd-link-more">Xem gallery toàn trang →</Link>
              </p>
            )}
          </section>

          {/* ── 02 OVERVIEW ── */}
          <section className="kd-block" id="overview">
            <div className="kd-sec-label">Tổng quan</div>
            <h2 className="kd-sec-title">
              Khoá học dành cho bạn <em>nghĩ bằng màu</em>
            </h2>

            <div className="kd-ov-grid">
              {/* Body */}
              <div className="kd-ov-body">
                {d?.gioiThieuMonHocHtml?.trim() ? (
                  <div
                    className="kd-mon-html"
                    dangerouslySetInnerHTML={{ __html: d.gioiThieuMonHocHtml.trim() }}
                  />
                ) : (
                  <>
                    <p>
                      <span className="kd-drop">{title.charAt(0)}</span>
                      {title.slice(1)} không chỉ là "tô cho đẹp". Ở Sine Art, bạn học
                      cách <b>nhìn màu như một hoạ sĩ</b> — hiểu sắc độ, nóng lạnh,
                      tương phản, và tổ chức bố cục có chủ đích.
                    </p>
                    <p>
                      Khoá học đưa bạn từ nguyên lý cơ bản đến bài trang trí hoàn
                      chỉnh. Mỗi buổi có bài tập riêng, được chấm 1-1, và bạn sẽ hoàn
                      thành <b>6 tác phẩm</b> đủ chất lượng đưa vào portfolio.
                    </p>
                    <p>
                      Đây là nền tảng bắt buộc cho bất kỳ ai muốn theo đuổi nghề{" "}
                      <b>Hoạ sĩ công nghệ</b> — Concept Art, Illustration, Animation,
                      Game Art. Cũng là khoá được ưu tiên trong lộ trình Luyện thi ĐH
                      Mỹ thuật.
                    </p>
                  </>
                )}
              </div>

              {/* "Khoá này dành cho ai?" sidebar */}
              <aside className="kd-ov-side">
                <h4 className="kd-dca-heading">
                  <span className="kd-dca-star" aria-hidden />
                  Khoá này dành cho ai?
                </h4>
                <ul className="kd-dca-list">
                  {KD_DANH_CHO_AI.map((item) => (
                    <li key={item.bold} className="kd-dca-item">
                      <span className="kd-dca-k" aria-hidden />
                      <div>
                        <b>{item.bold}</b> {item.text}
                      </div>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </section>

          {/* ── 03 OUTCOMES ── */}
          <section className="kd-block">
            <div className="kd-sec-label" style={{ color: "#a37e00" }}>Kết quả</div>
            <h2 className="kd-sec-title" style={{ fontSize: "clamp(22px,2.4vw,28px)", marginBottom: 18 }}>
              Bạn sẽ học được gì — <em>{bullets.length} năng lực cụ thể</em>
            </h2>
            <div className="kd-out-grid">
              {bullets.map((b, i) => (
                <div key={i} className="kd-out-cell">
                  <div className="kd-out-num">{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="kd-out-title">{b.split("—")[0]?.trim() ?? b}</div>
                    {b.includes("—") && (
                      <div className="kd-out-desc">{b.split("—").slice(1).join("—").trim()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 04 CURRICULUM ── */}
          <section className="kd-block" id="curriculum">
            <div className="kd-sec-label">Giáo trình {baiTapList.length > 0 ? `${baiTapList.length} buổi` : ""}</div>
            <h2 className="kd-sec-title">
              Lộ trình <em>tuần tự, có kiểm tra</em>
            </h2>
            <p className="kd-sec-sub">
              Mỗi buổi 3 giờ, bắt đầu bằng demo giáo viên, kết thúc bằng bài tập chấm 1-1.
            </p>
            <BaiTapList
              monHocId={hocPhiMonId ?? undefined}
              initialData={baiTapList}
              enrollUrl={autoRegisterHref}
            />
          </section>

          {/* ── 05 INTRO VIDEO ── */}
          {introVideoEmbedSrc && (
            <section className="kd-block kd-intro-video" aria-labelledby="kd-intro-video-title">
              <div className="kd-sec-label">Giới thiệu</div>
              <h2 id="kd-intro-video-title" className="kd-sec-title">
                Video giới thiệu <em>«{title}»</em>
              </h2>
              <div className="kd-video-16x9">
                <iframe
                  src={introVideoEmbedSrc}
                  title={`Video giới thiệu môn «${title}»`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {/* ── 07 TEACHERS ── */}
          <section className="kd-block" id="teachers">
            <div className="kd-sec-label">Giảng viên khoá</div>
            <h2 className="kd-sec-title">
              Hoạ sĩ đang <em>hành nghề thực tế</em> dạy bạn
            </h2>
            <p className="kd-sec-sub">
              Không phải giáo viên thuần lý thuyết — tất cả đang làm việc tại các studio lớn.
            </p>
            <TeachersSection slides={visibleTeacherSlides} />
          </section>

          {/* ── 08 SCHEDULE / ONGOING CLASSES ── */}
          <section className="kd-block" id="schedule" aria-labelledby="kd-schedule-title">
            <div className="kd-sec-label">Lịch & học phí</div>
            <h2 id="kd-schedule-title" className="kd-sec-title">
              Chọn <em>khung lớp</em> phù hợp với bạn
            </h2>
            <p className="kd-sec-sub">
              Cùng giáo trình, cùng chất lượng. Giáo viên có thể khác nhau giữa các khung.
            </p>
            {ongoingClasses.length > 0 ? (
              <div className="kd-sch-grid">
                {ongoingClasses.map((c) => {
                  const meta = KD_OC_BADGE[c.status];
                  const pct = c.total > 0 ? Math.min(100, Math.round((100 * c.filled) / c.total)) : 0;
                  const hetCho = c.status === "full" || c.filled >= c.total;
                  return (
                    <div
                      key={c.id}
                      className={`kd-sch-card${c.isCapToc ? " kd-sch-card--cap-toc" : ""}${hetCho ? " kd-sch-card--full" : ""}`}
                    >
                      {c.isCapToc && (
                        <span className="kd-oc-cap-toc">
                          <span aria-hidden>⚡</span> Cấp tốc
                        </span>
                      )}
                      <div className="kd-sch-day">{c.lich}</div>
                      <div className="kd-sch-time">{c.gio}</div>
                      <div className="kd-sch-meta">GV: {c.gvNames}</div>
                      <div className="kd-oc-seats">
                        {hetCho ? "Hết chỗ" : `Còn chỗ`} · {c.filled}/{c.total}
                      </div>
                      <div className="kd-oc-bar-track" role="progressbar" aria-valuenow={c.filled} aria-valuemin={0} aria-valuemax={c.total}>
                        <div className={meta.barClass} style={{ width: `${pct}%` }} />
                      </div>
                      {hetCho ? (
                        <span className="kd-sch-btn kd-sch-btn--disabled">Đăng ký đợt sau</span>
                      ) : (
                        <a href={autoRegisterHref} className="kd-sch-btn kd-sch-btn--active">
                          Đăng ký khung này →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="kd-sch-empty">
                <p>Chưa có lịch khai giảng. Để lại thông tin để nhận thông báo sớm nhất.</p>
                <a href={autoRegisterHref} className="kd-sch-btn kd-sch-btn--active" style={{ display: "inline-block", marginTop: 12 }}>
                  Nhận thông báo khai giảng →
                </a>
              </div>
            )}
          </section>

          {/* ── 09 REVIEWS ── */}
          <section className="kd-block" id="reviews">
            <div className="kd-sec-label">Đánh giá từ học viên</div>
            <h2 className="kd-sec-title">
              Học viên nói gì — <em>không lọc</em>
            </h2>
            <p className="kd-sec-sub">Tất cả được đồng bộ trực tiếp từ Google Reviews.</p>

            <div className="kd-rating-bar">
              <div>
                <div className="kd-rating-num">4.8</div>
                <div className="kd-stars" aria-hidden>★★★★★</div>
                <div className="kd-rating-count">Dựa trên đánh giá nội bộ</div>
              </div>
              <div className="kd-bars">
                {[5, 4, 3, 2, 1].map((n) => (
                  <div key={n} className="kd-bar-row">
                    <span>{n}★</span>
                    <div className="kd-bar-track">
                      <div className="kd-bar-fill" style={{ width: `${n === 5 ? 78 : n === 4 ? 14 : 8}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="kd-review-grid">
              {KD_REVIEWS.map((r) => (
                <article key={r.name} className="kd-review">
                  <div className="kd-rv-top">
                    <div className="kd-rv-av">{r.initials}</div>
                    <div>
                      <div className="kd-rv-name">{r.name}</div>
                      <div className="kd-rv-stars" aria-hidden>★★★★★</div>
                    </div>
                  </div>
                  <p className="kd-rv-text">{r.text}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ── 10 FAQ ── */}
          <section className="kd-block" id="faq">
            <div className="kd-sec-label">Câu hỏi thường gặp</div>
            <h2 className="kd-sec-title">
              Bạn đang <em>thắc mắc điều gì?</em>
            </h2>
            <div className="kd-faq-list">
              {KD_FAQ.map((item, i) => (
                <div key={item.q} className={`kd-faq${faqOpen === i ? " kd-faq--open" : ""}`}>
                  <button
                    type="button"
                    className="kd-faq-q"
                    aria-expanded={faqOpen === i}
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  >
                    {item.q}
                    <span className="kd-faq-arr" aria-hidden>+</span>
                  </button>
                  <div className="kd-faq-a">{item.a}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 11 FINAL CTA ── */}
          <section className="kd-cta-band">
            <div className="kd-cta-band-inner">
              <div>
                <h2 className="kd-cta-band-title">
                  Sẵn sàng nghĩ <span style={{ color: "#fde859" }}>bằng màu?</span>
                </h2>
                <p className="kd-cta-band-sub">
                  Bắt đầu từ buổi học thử miễn phí, gặp giáo viên, xem studio. Nếu không hợp, bạn không trả gì cả.
                </p>
                <div className="kd-cta-band-actions">
                  <a href={autoRegisterHref} className="kd-cta-band-btn kd-cta-band-btn--primary">
                    🎨 Đặt buổi học thử
                  </a>
                  <a href="tel:+842838123456" className="kd-cta-band-btn kd-cta-band-btn--ghost">
                    Chat với tư vấn Zalo
                  </a>
                </div>
              </div>
              <div className="kd-cta-band-stats">
                <div className="kd-cta-stat"><div className="kd-cta-stat-n">347</div><div className="kd-cta-stat-l">Học viên đã hoàn thành</div></div>
                <div className="kd-cta-stat"><div className="kd-cta-stat-n">4.9/5</div><div className="kd-cta-stat-l">128 đánh giá</div></div>
              </div>
            </div>
          </section>

        </div>{/* /kd-page-main */}

        {/* ── STICKY SIDEBAR ── */}
        <aside className="kd-sidebar" aria-label="Thông tin khóa học">
          {/* Học phí block */}
          {hocPhiBlock != null && hocPhiMonId != null ? (
            <HocPhiBlock
              key={hocPhiMonId}
              monHocId={hocPhiMonId}
              data={hocPhiBlock}
              allowCapTocToggle={hocPhiAllowCapToc}
            />
          ) : null}

          {/* Stats block */}
          <div className="kd-sb-stats">
            <div className="kd-sb-stat-row">
              <div className="kd-sb-stat-ic kd-sb-stat-ic--purple"><IconClock /></div>
              <div>
                <div className="kd-sb-stat-k">Thời lượng</div>
                <div className="kd-sb-stat-v">{lichHocDisplay}</div>
              </div>
            </div>
            <div className="kd-sb-stat-row">
              <div className="kd-sb-stat-ic kd-sb-stat-ic--yellow"><IconUsers /></div>
              <div>
                <div className="kd-sb-stat-k">Sỉ số</div>
                <div className="kd-sb-stat-v">{siSoDisplay}</div>
              </div>
            </div>
            <div className="kd-sb-stat-row">
              <div className="kd-sb-stat-ic kd-sb-stat-ic--peach"><IconCalendar /></div>
              <div>
                <div className="kd-sb-stat-k">Lịch khai giảng</div>
                <div className="kd-sb-stat-v kd-sb-stat-v--accent">Hàng tuần</div>
              </div>
            </div>
            <div className="kd-sb-stat-row">
              <div className="kd-sb-stat-ic kd-sb-stat-ic--screen"><IconScreen /></div>
              <div>
                <div className="kd-sb-stat-k">Học tại</div>
                <div className="kd-sb-stat-v">Website Sine Art</div>
              </div>
            </div>
            <div className="kd-sb-stat-row">
              <div className="kd-sb-stat-ic kd-sb-stat-ic--mint"><IconStar /></div>
              <div>
                <div className="kd-sb-stat-k">Đánh giá</div>
                <div className="kd-sb-stat-v">{reviewDisplay}</div>
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="kd-sb-cta-row">
            <button
              type="button"
              className="kd-sb-btn kd-sb-btn--alt"
              onClick={() => setDhpEmailModalOpen(true)}
            >
              Đăng ký tự động
            </button>
            <a href="tel:+842838123456" className="kd-sb-btn kd-sb-btn--alt">
              Đăng ký qua tư vấn
            </a>
          </div>

          {/* Mon-html fallback (giới thiệu môn) */}
          {!d?.gioiThieuMonHocHtml && (
            <div className="kd-sb-mon-grid">
              {KD_THREE_SUBJECTS.map((m) => (
                <div key={m.name} className="kd-mon-card">
                  <div className="kd-mon-icon" aria-hidden>{m.icon}</div>
                  <div className="kd-mon-name">{m.name}</div>
                  <p className="kd-mon-desc">{m.desc}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>{/* /kd-page-grid */}

      <DongHocPhiEmailGateModal
        open={dhpEmailModalOpen}
        onClose={() => setDhpEmailModalOpen(false)}
        monHocId={hocPhiMonId ?? null}
        courseTitle={title}
      />
    </div>
  );
}
