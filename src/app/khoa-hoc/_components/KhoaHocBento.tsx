"use client";

import Image from "next/image";
import { KHOA_HOC_FILTERS, type KhoaHocFilterId } from "@/lib/khoa-hoc-course-filters";
import { nextImageShouldUnoptimize } from "@/lib/nextImageRemote";
import { groupCoursesByGroup } from "@/lib/khoa-hoc-group-courses";
import type { CourseGroupId, KhoaHocCourseCard } from "@/types/khoa-hoc";
import Link from "next/link";
import type { ReactNode } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";

function sortCourses(list: KhoaHocCourseCard[]) {
  return [...list].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return a.id - b.id;
  });
}

function groupCatalogCategoryUpper(group: CourseGroupId): string {
  switch (group) {
    case "lthi":
      return "Luyện thi ĐH";
    case "digital":
      return "Digital";
    case "kids":
      return "Thiếu nhi";
    case "botro":
      return "Bổ trợ";
  }
}

function CourseThumbBadges({ course }: { course: KhoaHocCourseCard }) {
  const items: ReactNode[] = [];
  if (course.isFeatured) {
    items.push(
      <span key="feat" className="kh-thumb-badge kh-thumb-badge--feat">
        Nổi bật
      </span>,
    );
  }
  if (course.group === "kids") {
    items.push(
      <span key="kids" className="kh-thumb-badge kh-thumb-badge--kids">
        Thiếu nhi
      </span>,
    );
  }
  if (course.group === "botro" && !course.isFeatured) {
    items.push(
      <span key="sup" className="kh-thumb-badge kh-thumb-badge--support">
        Bổ trợ
      </span>,
    );
  }
  if (!items.length) return null;
  return (
    <div className="kh-thumb-badges" aria-hidden>
      {items}
    </div>
  );
}

function MetaCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function CourseThumb({
  course,
  className = "",
  thumbPriority,
}: {
  course: KhoaHocCourseCard;
  className?: string;
  thumbPriority?: boolean;
}) {
  const tone = course.group;
  const customGrad =
    course.gradientStart && course.gradientEnd
      ? `linear-gradient(135deg, ${course.gradientStart}, ${course.gradientEnd})`
      : null;

  return (
    <div className={`kh-thumb kh-thumb--${tone} ${className}`.trim()}>
      {course.thumbnail ? (
        <Image
          src={course.thumbnail}
          alt={`Khóa học ${course.tenMonHoc} tại Sine Art`}
          className="kh-thumb-img"
          fill
          sizes="(max-width: 767.98px) 46vw, 30vw"
          priority={thumbPriority}
          loading={thumbPriority ? undefined : "lazy"}
          unoptimized={nextImageShouldUnoptimize(course.thumbnail)}
        />
      ) : (
        <div
          className="kh-thumb-inner"
          style={customGrad ? { background: customGrad } : undefined}
          aria-hidden
        />
      )}
      <CourseThumbBadges course={course} />
    </div>
  );
}

type SectionTone = "brand" | "digital" | "kids" | "neutral";

/** Một khối nhóm: tiêu đề + lưới thẻ đồng nhất */
function FlatGroupSection({
  sectionId,
  title,
  sectionTone,
  courses,
  lcpThumbCourseId,
}: {
  sectionId: string;
  title: string;
  sectionTone: SectionTone;
  courses: KhoaHocCourseCard[];
  lcpThumbCourseId: number | null;
}) {
  const sorted = useMemo(() => sortCourses(courses), [courses]);
  if (!sorted.length) return null;

  return (
    <section className="kh-section kh-section--editorial" aria-labelledby={sectionId}>
      <div className="kh-sl" id={sectionId}>
        <div className="kh-sl-left">
          <span className={`kh-sl-dot kh-sl-dot--${sectionTone}`} aria-hidden />
          <span className="kh-sl-name">{title}</span>
          <span className="kh-sl-count">{sorted.length} khóa</span>
        </div>
      </div>

      <div className="kh-grid">
        {sorted.map((c) => (
          <Link
            key={c.id}
            href={`/khoa-hoc/${c.slug}`}
            className="kh-cell kh-cell--hoverable kh-grid-card"
            prefetch={false}
          >
            <div className="kh-thumb-wrap">
              <CourseThumb course={c} thumbPriority={lcpThumbCourseId === c.id} />
            </div>
            <CourseCardBody course={c} compact />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function KhoaHocBento({
  courses,
  initialFilter = "all",
}: {
  courses: KhoaHocCourseCard[];
  initialFilter?: KhoaHocFilterId;
}) {
  const [filter, setFilter] = useState<KhoaHocFilterId>(initialFilter);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const filteredCourses = useMemo(() => {
    if (filter === "all") return courses;
    return courses.filter((c) => c.group === filter);
  }, [filter, courses]);

  const grouped = useMemo(() => {
    const g = groupCoursesByGroup(filteredCourses);
    if (filter === "all") {
      return {
        lthi: [...g.lthi, ...g.botro],
        digitalKids: [...g.digital, ...g.kids],
        digital: [] as KhoaHocCourseCard[],
        kids: [] as KhoaHocCourseCard[],
        botro: [] as KhoaHocCourseCard[],
      };
    }
    return {
      lthi: g.lthi,
      digitalKids: [] as KhoaHocCourseCard[],
      digital: g.digital,
      kids: g.kids,
      botro: g.botro,
    };
  }, [filter, filteredCourses]);

  const lcpThumbCourseId = useMemo(() => {
    const pick = (list: KhoaHocCourseCard[]) => sortCourses(list)[0]?.id ?? null;
    if (grouped.lthi.length) return pick(grouped.lthi);
    if (filter === "all") {
      if (grouped.digitalKids.length) return pick(grouped.digitalKids);
      if (grouped.botro.length) return pick(grouped.botro);
      return null;
    }
    if (grouped.digital.length) return pick(grouped.digital);
    if (grouped.kids.length) return pick(grouped.kids);
    if (grouped.botro.length) return pick(grouped.botro);
    return null;
  }, [grouped, filter]);

  if (!courses.length) {
    return (
      <>
        <header className="kh-hero kh-hero--empty">
          <div className="kh-hero-inner">
            <p className="kh-hero-eyebrow">Giáo trình khoa học</p>
            <h1 className="kh-hero-title">
              Khóa học <em>mỹ thuật</em>
            </h1>
            <p className="kh-hero-lead">Danh sách từ hệ thống quản lý môn học.</p>
          </div>
        </header>
        <p className="kh-empty">Chưa có dữ liệu môn học.</p>
      </>
    );
  }

  if (!filteredCourses.length) {
    return (
      <>
        <header className="kh-hero">
          <div className="kh-hero-inner">
            <p className="kh-hero-eyebrow">Giáo trình khoa học</p>
            <h1 className="kh-hero-title">
              Khóa học <em>mỹ thuật</em>
              <span className="kh-hero-title-rest"> tại TP.HCM</span>
            </h1>
            <p className="kh-hero-lead">
              {courses.length} môn học · Online &amp; tại lớp — chọn nhóm bên dưới để lọc.
            </p>
          </div>
        </header>
        <div className="kh-filters" role="toolbar" aria-label="Lọc nhóm khóa học">
          {KHOA_HOC_FILTERS.map((x, i) => (
            <Fragment key={x.id}>
              {i === 1 ? <span className="kh-fdiv" aria-hidden /> : null}
              <button
                type="button"
                className={`kh-fp${x.className ? ` ${x.className}` : ""}${
                  filter === x.id ? " active" : ""
                }`}
                onClick={() => setFilter(x.id as KhoaHocFilterId)}
                aria-pressed={filter === x.id}
              >
                {x.label}
              </button>
            </Fragment>
          ))}
        </div>
        <p className="kh-empty">Không có khóa học trong nhóm này.</p>
      </>
    );
  }

  return (
    <>
      <header className="kh-hero">
        <div className="kh-hero-inner">
          <p className="kh-hero-eyebrow">Giáo trình khoa học</p>
          <h1 className="kh-hero-title">
            Khóa học <em>mỹ thuật</em>
            <span className="kh-hero-title-rest"> tại TP.HCM</span>
          </h1>
          <p className="kh-hero-lead">
            Hình họa, bố cục màu, trang trí màu, Digital &amp; Kids — luyện thi đại học và bổ
            trợ. Online &amp; tại lớp.
          </p>
        </div>
      </header>

      <div className="kh-filters" role="toolbar" aria-label="Lọc nhóm khóa học">
        {KHOA_HOC_FILTERS.map((x, i) => (
          <Fragment key={x.id}>
            {i === 1 ? <span className="kh-fdiv" aria-hidden /> : null}
            <button
              type="button"
              className={`kh-fp${x.className ? ` ${x.className}` : ""}${
                filter === x.id ? " active" : ""
              }`}
              onClick={() => setFilter(x.id as KhoaHocFilterId)}
              aria-pressed={filter === x.id}
            >
              {x.label}
            </button>
          </Fragment>
        ))}
      </div>

      <div className="kh-wrap kh-wrap--editorial">
        <FlatGroupSection
          sectionId="kh-sec-lthi"
          title={filter === "all" ? "Luyện thi & bổ trợ" : "Luyện thi đại học"}
          sectionTone="brand"
          courses={grouped.lthi}
          lcpThumbCourseId={lcpThumbCourseId}
        />

        {filter === "all" ? (
          <FlatGroupSection
            sectionId="kh-sec-digital-kids"
            title="Digital & Kids"
            sectionTone="digital"
            courses={grouped.digitalKids}
            lcpThumbCourseId={lcpThumbCourseId}
          />
        ) : (
          <>
            <FlatGroupSection
              sectionId="kh-sec-digital"
              title="Digital"
              sectionTone="digital"
              courses={grouped.digital}
              lcpThumbCourseId={lcpThumbCourseId}
            />
            <FlatGroupSection
              sectionId="kh-sec-kids"
              title="Kids"
              sectionTone="kids"
              courses={grouped.kids}
              lcpThumbCourseId={lcpThumbCourseId}
            />
          </>
        )}

        {grouped.botro.length > 0 ? (
          <FlatGroupSection
            sectionId="kh-sec-botro"
            title="Bổ trợ"
            sectionTone="neutral"
            courses={grouped.botro}
            lcpThumbCourseId={lcpThumbCourseId}
          />
        ) : null}
      </div>
    </>
  );
}

function CourseCardBody({
  course,
  compact = false,
}: {
  course: KhoaHocCourseCard;
  compact?: boolean;
}) {
  const n = course.soLopDangHoatDong;
  /** Thanh mint: đầy khi có lớp đang mở (catalog — không dùng % học giả) */
  const barPct = n > 0 ? 100 : 14;
  const categoryHead = course.loaiKhoaHoc?.trim() || groupCatalogCategoryUpper(course.group);

  return (
    <div
      className={`kh-cbody kh-cbody--${course.group}${
        compact ? " kh-cbody--compact" : ""
      }`}
    >
      <div className={`kh-cat-rail kh-cat-rail--${course.group}`}>
        <span className="kh-cat-dot" aria-hidden />
        <span className="kh-cat-label">{categoryHead}</span>
      </div>
      <span className="kh-ctitle">{course.tenMonHoc}</span>
      {course.tinhChat ? <p className="kh-tinh-chat">{course.tinhChat}</p> : null}
      <div className="kh-cmeta-rail">
        <MetaCalendarIcon className="kh-cmeta-ic" />
        <span className="kh-cmeta-txt">
          {course.hinhThucTag}
          <span className="kh-cmeta-dot" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <strong>{n}</strong> lớp đang mở
        </span>
      </div>
      <div
        className="kh-cprog"
        aria-label={`${n} lớp đang mở tuyển sinh cho khóa này`}
      >
        <div className="kh-cprog-track">
          <div
            className={`kh-cprog-fill${n === 0 ? " kh-cprog-fill--empty" : ""}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        <span className="kh-cprog-cap">{n}&nbsp;lớp</span>
      </div>
    </div>
  );
}
