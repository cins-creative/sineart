import { KHOA_HOC_GROUP_FILTERS } from "@/lib/khoa-hoc-course-filters";
import type { CourseGroupId } from "@/types/khoa-hoc";
import Link from "next/link";

const GROUP_DOT: Record<CourseGroupId, string> = {
  lthi: "#7f77dd",
  digital: "#1d9e75",
  kids: "#d4537e",
  botro: "#888780",
};

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <line
      x1="5"
      y1="12"
      x2="19"
      y2="12"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <polyline
      points="12 5 19 12 12 19"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/**
 * Trang chủ: 4 block theo loại khóa — bento 1 lớn (Luyện thi ĐH) + 3 nhỏ.
 * Mapping dữ liệu: `KHOA_HOC_GROUP_FILTERS` (không đổi), CSS v2 override visual.
 */
export default function CoursesSection() {
  return (
    <div className="courses-wrap" id="khoa-hoc">
      <div className="sec-head">
        <div className="sec-head-left">
          <div className="sec-label">Khoá học</div>
          <h2 className="sec-title">
            Lộ trình <em>bài bản</em> cho mọi người học
          </h2>
          <p className="sec-sub">
            Từ thiếu nhi đến luyện thi đại học và học nghề chuyên sâu — chúng tôi có lộ trình
            phù hợp cho bạn.
          </p>
        </div>
        <Link href="/khoa-hoc" className="sec-link">
          Tất cả khoá học
          <ArrowIcon />
        </Link>
      </div>

      <div
        className="courses-blocks"
        role="region"
        aria-label="Khoá học theo nhóm"
      >
        {KHOA_HOC_GROUP_FILTERS.map((g) => (
          <Link
            key={g.id}
            href={`/khoa-hoc?nhom=${g.id}`}
            className={`courses-block courses-block--${g.id}${
              g.id === "lthi" ? " courses-block--featured" : ""
            }${g.className ? ` ${g.className}` : ""}`}
            prefetch={false}
            aria-label={`${g.label} — xem trang Khóa học`}
          >
            <div
              className={`courses-block-thumb courses-block-thumb--${g.id}`}
              aria-hidden
            >
              {g.id === "lthi" ? (
                <span className="courses-block-badge">Nổi bật</span>
              ) : null}
            </div>
            <div className="courses-block-cap">
              <span
                className="courses-block-dot"
                style={{ background: GROUP_DOT[g.id] }}
                aria-hidden
              />
              <span className="courses-block-title">{g.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
