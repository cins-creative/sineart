"use client";

import { KHOA_HOC_FILTERS, type KhoaHocFilterId } from "@/lib/khoa-hoc-course-filters";
import { groupCoursesByGroup } from "@/lib/khoa-hoc-group-courses";
import type { CourseGroupId, KhoaHocCourseCard } from "@/types/khoa-hoc";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useState,
} from "react";

function tagClassByHinhThuc(tag: KhoaHocCourseCard["hinhThucTag"]): string {
  return tag === "Online" ? "kh-ctag--online" : "kh-ctag--offline";
}

function badgeClass(tone: CourseGroupId): string {
  switch (tone) {
    case "lthi":
      return "kh-badge--lthi";
    case "digital":
      return "kh-badge--digital";
    case "kids":
      return "kh-badge--kids";
    default:
      return "kh-badge--botro";
  }
}

function sortCourses(list: KhoaHocCourseCard[]) {
  return [...list].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return a.id - b.id;
  });
}

function CourseThumb({
  course,
  badge,
  className = "",
  hintOverlay,
}: {
  course: KhoaHocCourseCard;
  badge?: string;
  className?: string;
  /** Lớp “Xem chi tiết” — nằm trong khối ảnh, dưới badge */
  hintOverlay?: ReactNode;
}) {
  const tone = course.group;
  const customGrad =
    course.gradientStart && course.gradientEnd
      ? `linear-gradient(135deg, ${course.gradientStart}, ${course.gradientEnd})`
      : null;

  return (
    <div className={`kh-thumb kh-thumb--${tone} ${className}`.trim()}>
      {course.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL từ ql_mon_hoc.thumbnail
        <img src={course.thumbnail} alt="" className="kh-thumb-img" />
      ) : (
        <div
          className="kh-thumb-inner"
          style={customGrad ? { background: customGrad } : undefined}
          aria-hidden
        />
      )}
      {hintOverlay}
      {badge ? <span className={`kh-badge ${badgeClass(tone)}`}>{badge}</span> : null}
    </div>
  );
}

/** Một khối nhóm: tiêu đề + lưới thẻ đồng nhất */
function FlatGroupSection({
  sectionId,
  title,
  dotColor,
  courses,
}: {
  sectionId: string;
  title: string;
  dotColor: string;
  courses: KhoaHocCourseCard[];
}) {
  const sorted = useMemo(() => sortCourses(courses), [courses]);
  if (!sorted.length) return null;

  return (
    <section className="kh-section kh-section--editorial" aria-labelledby={sectionId}>
      <div className="kh-sl" id={sectionId}>
        <div className="kh-sl-left">
          <span className="kh-sl-dot" style={{ background: dotColor }} />
          <span className="kh-sl-name">{title}</span>
          <span className="kh-sl-count">{sorted.length} khóa</span>
        </div>
      </div>

      <div className="kh-grid">
        {sorted.map((c) => (
          <CourseCardLink
            key={c.id}
            href={`/khoa-hoc/${c.slug}`}
            className={`kh-grid-card kh-grid-card--p${Math.abs(c.id) % 8}`}
          >
            <CourseThumb course={c} badge={c.loaiKhoaHoc ?? undefined} />
            <CourseCardBody course={c} compact />
          </CourseCardLink>
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
  /** Từ `?nhom=` — trang chủ / liên kết ngoài */
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

  /**
   * Tất cả: gom Bổ trợ → Luyện thi; gom Digital + Kids → một khối.
   * Lọc theo nhóm: giữ tách Digital / Kids như filter.
   */
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

  if (!courses.length) {
    return (
      <>
        <header className="kh-head">
          <div>
            <h1 className="kh-title">Khóa học</h1>
            <p className="kh-sub">Danh sách từ hệ thống quản lý môn học</p>
          </div>
        </header>
        <p className="kh-empty">Chưa có dữ liệu môn học.</p>
      </>
    );
  }

  if (!filteredCourses.length) {
    return (
      <>
        <header className="kh-head">
          <div>
            <h1 className="kh-title">Khóa học</h1>
            <p className="kh-sub">
              {courses.length} môn học · Online &amp; Offline tại TP.HCM
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
      <header className="kh-head">
        <div>
          <h1 className="kh-title">Khóa học</h1>
          <p className="kh-sub">
            {courses.length} môn học · Online &amp; Offline tại TP.HCM
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
          title={
            filter === "all" ? "Luyện thi & bổ trợ" : "Luyện thi đại học"
          }
          dotColor="#7f77dd"
          courses={grouped.lthi}
        />

        {filter === "all" ? (
          <FlatGroupSection
            sectionId="kh-sec-digital-kids"
            title="Digital & Kids"
            dotColor="#1d9e75"
            courses={grouped.digitalKids}
          />
        ) : (
          <>
            <FlatGroupSection
              sectionId="kh-sec-digital"
              title="Digital"
              dotColor="#1d9e75"
              courses={grouped.digital}
            />
            <FlatGroupSection
              sectionId="kh-sec-kids"
              title="Kids"
              dotColor="#d4537e"
              courses={grouped.kids}
            />
          </>
        )}

        {grouped.botro.length > 0 ? (
          <FlatGroupSection
            sectionId="kh-sec-botro"
            title="Bổ trợ"
            dotColor="#888780"
            courses={grouped.botro}
          />
        ) : null}
      </div>
    </>
  );
}

function CourseCardLink({
  href,
  className = "",
  children,
  hintOnThumb = true,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  /** Chỉ phủ overlay lên khối ảnh (child đầu = CourseThumb) */
  hintOnThumb?: boolean;
}) {
  if (hintOnThumb) {
    const parts = Children.toArray(children);
    if (parts.length >= 2) {
      const first = parts[0];
      const hint = <span className="kh-cell-hint">Xem chi tiết</span>;
      const thumbWithHint = isValidElement(first)
        ? cloneElement(first as ReactElement<{ hintOverlay?: ReactNode }>, {
            hintOverlay: hint,
          })
        : first;
      return (
        <Link
          href={href}
          className={`kh-cell kh-cell--hoverable ${className}`.trim()}
          prefetch={false}
        >
          <div className="kh-thumb-wrap">{thumbWithHint}</div>
          {parts.slice(1)}
        </Link>
      );
    }
  }

  return (
    <Link
      href={href}
      className={`kh-cell kh-cell--hoverable ${className}`.trim()}
      prefetch={false}
    >
      <span className="kh-cell-hint">Xem chi tiết</span>
      {children}
    </Link>
  );
}

function CourseCardBody({
  course,
  compact = false,
}: {
  course: KhoaHocCourseCard;
  compact?: boolean;
}) {
  const tag = course.hinhThucTag;
  return (
    <div
      className={`kh-cbody kh-cbody--${course.group}${
        compact ? " kh-cbody--compact" : ""
      }`}
    >
      <span className={`kh-ctag ${tagClassByHinhThuc(course.hinhThucTag)}`}>{tag}</span>
      <span className="kh-ctitle">{course.tenMonHoc}</span>
      {course.tinhChat ? (
        <p className="kh-tinh-chat">{course.tinhChat}</p>
      ) : null}
      <p className="kh-metrics" aria-label="Số lớp đang hoạt động">
        <strong>{course.soLopDangHoatDong}</strong> lớp đang hoạt động
      </p>
    </div>
  );
}
