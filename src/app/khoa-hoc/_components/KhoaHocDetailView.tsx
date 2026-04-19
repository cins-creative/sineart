"use client";

import BaiTapList from "@/components/course/BaiTapList";
import type {
  HocPhiBlockData,
  KhoaHocDetailData,
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
    .filter(Boolean);
  if (parts.length >= 3) return parts.slice(0, 6);
  return [...KD_DEFAULT_LEARN.slice(0, 4), ...parts].slice(0, 6);
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

function sbNextMonthFirstDateVi(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return d.toLocaleDateString("vi-VN");
}

function IconSbCalendar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconSbUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconSbGrad({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}

function IconSbClock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconSbScreen({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export default function KhoaHocDetailView({
  detail,
  fallbackTitle,
  studentGallery = [],
  hocPhiBlock = null,
  hocPhiMonId = null,
  /** Chỉ loại «Luyện thi» (`ql_mon_hoc.loai_khoa_hoc`) mới hiện nút / gói cấp tốc. */
  hocPhiAllowCapToc = false,
  teacherPortfolioSlides = [],
  baiTapList = [],
  ongoingClasses = [],
}: {
  detail: KhoaHocDetailData | null;
  fallbackTitle?: string;
  /** Cùng `GalleryDisplayItem` như trang chủ — map từ `hv_bai_hoc_vien` + embed */
  studentGallery?: GalleryDisplayItem[];
  /** Dữ liệu bảng học phí (brief hoc-phi-block) */
  hocPhiBlock?: HocPhiBlockData | null;
  /** `ql_mon_hoc.id` dùng cho học phí — có thể có khi `detail` null (slug khớp DB) */
  hocPhiMonId?: number | null;
  hocPhiAllowCapToc?: boolean;
  /** Toàn bộ portfolio nhân sự (không filter) */
  teacherPortfolioSlides?: TeacherPortfolioSlide[];
  /** `hv_he_thong_bai_tap` theo môn — chương trình đào tạo */
  baiTapList?: BaiTap[];
  /** Lớp đang diễn ra map từ `ql_lop_hoc` theo môn hiện tại */
  ongoingClasses?: OngoingClassCard[];
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
  /** null = dùng tab gợi ý theo môn đang xem; có giá trị = người dùng chọn pill lọc GV */
  const [teacherMonFilter, setTeacherMonFilter] = useState<string | null>(null);

  useEffect(() => {
    setHvGalIdx((i) => {
      const n = studentGallery.length;
      if (n <= 0) return 0;
      return Math.min(i, n - 1);
    });
  }, [studentGallery.length]);

  /** Tự chuyển ảnh chính mỗi 4s (vòng lặp khi có ≥ 2 ảnh). */
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

  const preferredTeacherMonTab = useMemo(() => {
    const tNorm = normalizeMonLabel(title);
    return (
      teacherMonTabs.find((mon) => normalizeMonLabel(mon) === tNorm) ??
      null
    );
  }, [teacherMonTabs, title]);

  useEffect(() => {
    setTeacherMonFilter(null);
  }, [d?.id, hocPhiMonId]);

  const effectiveTeacherMonTab = useMemo(() => {
    const userPick =
      teacherMonFilter != null && teacherMonTabs.includes(teacherMonFilter)
        ? teacherMonFilter
        : null;
    return userPick ?? preferredTeacherMonTab ?? "Tất cả";
  }, [teacherMonFilter, teacherMonTabs, preferredTeacherMonTab]);

  const visibleTeacherSlides = useMemo(() => {
    if (effectiveTeacherMonTab === "Tất cả") {
      return teacherPortfolioSlides.map((s) => ({ id: s.id, src: s.src }));
    }
    return teacherPortfolioSlides
      .filter((s) => s.monHoc === effectiveTeacherMonTab)
      .map((s) => ({ id: s.id, src: s.src }));
  }, [teacherPortfolioSlides, effectiveTeacherMonTab]);

  const khaiGiangDisplay = useMemo(() => sbNextMonthFirstDateVi(), []);

  const isOnline = d?.hinhThucTag === "Online";
  const sbMetaRows = useMemo(() => {
    if (isOnline) {
      return [
        {
          key: "kg",
          icon: IconSbCalendar,
          label: "Khai giảng",
          value: khaiGiangDisplay,
          valueAccent: true,
        },
        {
          key: "ss",
          icon: IconSbUsers,
          label: "Sỉ số lớp",
          value: "~20 người/buổi",
          valueAccent: false,
        },
        {
          key: "gv",
          icon: IconSbGrad,
          label: "Giáo viên",
          value: "1 GV/lớp",
          valueAccent: false,
        },
        {
          key: "lich",
          icon: IconSbCalendar,
          label: "Lịch học",
          value: "246 hoặc 357",
          valueAccent: false,
        },
        {
          key: "tg",
          icon: IconSbClock,
          label: "Thời gian học",
          value: "19h00 - 21h30",
          valueAccent: false,
        },
        {
          key: "tai",
          icon: IconSbScreen,
          label: "Học tại",
          value: "Google Meet",
          valueAccent: false,
        },
      ] as const;
    }
    return [
      {
        key: "kg",
        icon: IconSbCalendar,
        label: "Khai giảng",
        value: khaiGiangDisplay,
        valueAccent: true,
      },
      {
        key: "ss",
        icon: IconSbUsers,
        label: "Sỉ số lớp",
        value: "~20 người/buổi",
        valueAccent: false,
      },
      {
        key: "gv",
        icon: IconSbGrad,
        label: "Giáo viên",
        value: "1 GV/lớp",
        valueAccent: false,
      },
      {
        key: "lich",
        icon: IconSbCalendar,
        label: "Lịch học",
        value: "Theo lịch lớp & chi nhánh",
        valueAccent: false,
      },
      {
        key: "tg",
        icon: IconSbClock,
        label: "Thời gian học",
        value: "Theo từng lớp (thường 19h - 21h30)",
        valueAccent: false,
      },
      {
        key: "tai",
        icon: IconSbScreen,
        label: "Học tại",
        value: "TP.HCM — chi nhánh theo lịch đăng ký",
        valueAccent: false,
      },
    ] as const;
  }, [isOnline, khaiGiangDisplay]);

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
      <nav className="kd-bc" aria-label="Breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span className="kd-bc-sep">›</span>
        <Link href="/khoa-hoc">Khóa học</Link>
        <span className="kd-bc-sep">›</span>
        <span className="kd-bc-muted">{crumbMid}</span>
        <span className="kd-bc-sep">›</span>
        <span className="kd-bc-current">{title}</span>
      </nav>

      <div className="kd-body">
        <div className="kd-left">
          <div className="kd-eyebrow">
            <span className="kd-tag">{tag}</span>
            <span className="kd-live">
              <span className="kd-live-dot" aria-hidden />
              Còn nhận học viên
            </span>
          </div>
          <h1 className="kd-title">{title}</h1>
          <p className="kd-sub">{sub}</p>

          <section className="kd-hv-section" aria-labelledby="kd-hv-heading">
              <h2 id="kd-hv-heading" className="kd-sec">
                Bài học viên
              </h2>
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
                        <div
                          className="kd-hv-ph kd-hv-ph--main"
                          style={gradStyle}
                          aria-hidden
                        />
                      )}
                      <div className="kd-hv-overlay" aria-live="polite" aria-atomic="true">
                        {hvGalIdx + 1} / {studentGallery.length} ảnh
                      </div>
                      <div className="kd-hv-main-cap">
                        <span className="kd-hv-student">
                          {hvMainItem.studentName}
                        </span>
                        <span className="kd-hv-cat">
                          {hvMainItem.categoryLabel}
                        </span>
                      </div>
                    </div>
                    {studentGallery.length > 1 ? (
                      <div
                        className="kd-hv-thumbs"
                        role="tablist"
                        aria-label="Chọn ảnh bài học viên"
                      >
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
                              className={`kd-hv-thumb${
                                hvGalIdx === i ? " kd-hv-thumb--sel" : ""
                              }`}
                              onClick={() => setHvGalIdx(i)}
                            >
                              {thumbSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={thumbSrc}
                                  alt=""
                                  className="kd-hv-thumb-img"
                                  loading="lazy"
                                />
                              ) : (
                                <div
                                  className="kd-hv-thumb-ph"
                                  style={gradStyle}
                                  aria-hidden
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <p className="kd-hv-more">
                    <Link href="/gallery" className="kd-link-more">
                      Xem gallery toàn trang →
                    </Link>
                  </p>
                </>
              ) : (
                <p className="kd-hv-empty">
                  Chưa có tác phẩm tải được cho khóa này.{" "}
                  <Link href="/gallery" className="kd-link-more">
                    Xem gallery toàn trang →
                  </Link>
                </p>
              )}
          </section>

          <div className="kd-div" />

          <h2 className="kd-sec">Bạn sẽ học được gì?</h2>
          <ul className="kd-learn-grid">
            {bullets.map((line) => (
              <li key={line} className="kd-learn-item">
                <span className="kd-check" aria-hidden>
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>

          <div className="kd-div" aria-hidden />

          {d?.gioiThieuMonHocHtml?.trim() ? (
            <div
              className="kd-mon-html"
              dangerouslySetInnerHTML={{
                __html: d.gioiThieuMonHocHtml.trim(),
              }}
            />
          ) : (
            <div className="kd-mon-grid">
              {KD_THREE_SUBJECTS.map((m) => (
                <div key={m.name} className="kd-mon-card">
                  <div className="kd-mon-icon" aria-hidden>
                    {m.icon}
                  </div>
                  <div className="kd-mon-name">{m.name}</div>
                  <p className="kd-mon-desc">{m.desc}</p>
                </div>
              ))}
            </div>
          )}

          {introVideoEmbedSrc ? (
            <>
              <div className="kd-div" aria-hidden />
              <section
                className="kd-intro-video"
                aria-labelledby="kd-intro-video-title"
              >
                <h2 id="kd-intro-video-title" className="kd-sec">
                  Video giới thiệu môn «{title}»
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
            </>
          ) : null}
          <div className="kd-div" />

          <h2 className="kd-sec">Chương trình đào tạo môn «{title}»</h2>
          <BaiTapList
            monHocId={hocPhiMonId ?? undefined}
            initialData={baiTapList}
            enrollUrl={autoRegisterHref}
          />

          <div className="kd-div" />

          <h2 className="kd-sec">Giáo viên giảng dạy</h2>
          {teacherMonTabs.length > 1 ? (
            <div
              className="kd-teacher-filter"
              role="group"
              aria-label="Lọc portfolio giáo viên theo môn học"
            >
              <p className="kd-teacher-filter-label">Theo môn học</p>
              <div className="kd-goi-pill-row">
                {teacherMonTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`kd-goi-pill${
                      effectiveTeacherMonTab === tab
                        ? " kd-goi-pill--active"
                        : ""
                    }`}
                    onClick={() => setTeacherMonFilter(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <TeachersSection slides={visibleTeacherSlides} />

          <div className="kd-div" />

          <section className="kd-ongoing" aria-labelledby="kd-ongoing-title">
            <p className="kd-ongoing-eyebrow">LỊCH KHAI GIẢNG</p>
            <h2 id="kd-ongoing-title" className="kd-ongoing-title">
              Lớp đang diễn ra
            </h2>
            <div className="kd-ongoing-grid">
              {ongoingClasses.map((c) => {
                const meta = KD_OC_BADGE[c.status];
                const pct =
                  c.total > 0
                    ? Math.min(100, Math.round((100 * c.filled) / c.total))
                    : 0;
                const hetCho =
                  c.status === "full" || c.filled >= c.total;
                return (
                  <article
                    key={c.id}
                    className={`kd-oc-card kd-oc-card--flip${
                      c.isCapToc ? " kd-oc-card--cap-toc" : ""
                    }`}
                  >
                    <div className="kd-oc-flip-inner">
                      <div className="kd-oc-face kd-oc-face--front">
                        {c.isCapToc ? (
                          <span className="kd-oc-cap-toc">
                            <span aria-hidden>⚡</span>
                            Cấp tốc
                          </span>
                        ) : null}
                        <h3 className="kd-oc-card-title">{c.title}</h3>
                        <p className="kd-oc-gv">GV: {c.gvNames}</p>
                        <span className={meta.className}>
                          <span className="kd-oc-badge-dot" aria-hidden />
                          {meta.label}
                        </span>
                        <div className="kd-oc-sch">
                          <div className="kd-oc-sch-cell">
                            <span className="kd-oc-sch-lbl">LỊCH</span>
                            <span className="kd-oc-sch-val">{c.lich}</span>
                          </div>
                          <div className="kd-oc-sch-cell">
                            <span className="kd-oc-sch-lbl">GIỜ</span>
                            <span className="kd-oc-sch-val">{c.gio}</span>
                          </div>
                        </div>
                        <div className="kd-oc-foot">
                          <div className="kd-oc-seats">
                            {c.filled}/{c.total} chỗ
                          </div>
                          <div
                            className="kd-oc-bar-track"
                            role="progressbar"
                            aria-valuenow={c.filled}
                            aria-valuemin={0}
                            aria-valuemax={c.total}
                            aria-label={`Đã đăng ký ${c.filled} trên ${c.total} chỗ`}
                          >
                            <div
                              className={meta.barClass}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="kd-oc-face kd-oc-face--back">
                        {c.portfolioImage ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.portfolioImage}
                              alt=""
                              className="kd-oc-portfolio-img"
                              loading="lazy"
                            />
                          </>
                        ) : (
                          <div className="kd-oc-portfolio-empty" />
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="kd-div" />

          <h2 className="kd-sec">Đánh giá từ học viên</h2>
          <div className="kd-rating-bar">
            <div>
              <div className="kd-rating-num">4.8</div>
              <div className="kd-stars" aria-hidden>
                ★★★★★
              </div>
              <div className="kd-rating-count">Dựa trên đánh giá nội bộ</div>
            </div>
            <div className="kd-bars">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="kd-bar-row">
                  <span>{n}★</span>
                  <div className="kd-bar-track">
                    <div
                      className="kd-bar-fill"
                      style={{ width: `${n === 5 ? 78 : n === 4 ? 14 : 8}%` }}
                    />
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
                    <div className="kd-rv-stars" aria-hidden>
                      ★★★★★
                    </div>
                  </div>
                </div>
                <p className="kd-rv-text">{r.text}</p>
              </article>
            ))}
          </div>

          <div className="kd-div" />

          <h2 className="kd-sec">Câu hỏi thường gặp</h2>
          <div className="kd-faq-list">
            {KD_FAQ.map((item, i) => (
              <div
                key={item.q}
                className={`kd-faq${faqOpen === i ? " kd-faq--open" : ""}`}
              >
                <button
                  type="button"
                  className="kd-faq-q"
                  aria-expanded={faqOpen === i}
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                >
                  {item.q}
                  <span className="kd-faq-arr" aria-hidden>
                    +
                  </span>
                </button>
                <div className="kd-faq-a">{item.a}</div>
              </div>
            ))}
          </div>

          <div className="kd-cta">
            <div>
              <div className="kd-cta-title">Sẵn sàng bắt đầu?</div>
              <div className="kd-cta-sub">
                Để lại thông tin — tư vấn lộ trình phù hợp với bạn.
              </div>
            </div>
            <a href="tel:+842838123456" className="kd-cta-btn">
              Liên hệ tư vấn
            </a>
          </div>
        </div>

        <aside className="kd-sidebar" aria-label="Thông tin khóa học">
          {hocPhiBlock != null && hocPhiMonId != null ? (
            <HocPhiBlock
              key={hocPhiMonId}
              monHocId={hocPhiMonId}
              data={hocPhiBlock}
              allowCapTocToggle={hocPhiAllowCapToc}
            />
          ) : null}

          <div className="kd-sb-meta-card">
            {sbMetaRows.map((row) => {
              const Ico = row.icon;
              return (
                <div key={row.key} className="kd-sb-meta-row">
                  <div className="kd-sb-meta-left">
                    <Ico className="kd-sb-meta-ico" />
                    <span className="kd-sb-meta-label">{row.label}</span>
                  </div>
                  <span
                    className={
                      row.valueAccent
                        ? "kd-sb-meta-value kd-sb-meta-value--accent"
                        : "kd-sb-meta-value"
                    }
                  >
                    {row.value}
                  </span>
                </div>
              );
            })}
          </div>

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
        </aside>
      </div>

      <DongHocPhiEmailGateModal
        open={dhpEmailModalOpen}
        onClose={() => setDhpEmailModalOpen(false)}
        monHocId={hocPhiMonId ?? null}
        courseTitle={title}
      />
    </div>
  );
}
