import { KHOA_HOC_GROUP_FILTERS } from "@/lib/khoa-hoc-course-filters";
import type { CourseGroupId } from "@/types/khoa-hoc";
import Link from "next/link";

/** Màu chấm / nền placeholder — thay ảnh sau qua CSS `.courses-block-thumb--*` hoặc `background-image` */
const GROUP_DOT: Record<CourseGroupId, string> = {
  lthi: "#7f77dd",
  digital: "#1d9e75",
  kids: "#d4537e",
  botro: "#888780",
};

/**
 * Trang chủ: 4 block theo loại khóa (lưới 2×2 / 4 cột desktop).
 * Ảnh placeholder — thay sau trong CSS.
 */
export default function CoursesSection() {
  return (
    <div className="courses-wrap" id="khoa-hoc">
      <div className="sec-label">Khoá học</div>

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
