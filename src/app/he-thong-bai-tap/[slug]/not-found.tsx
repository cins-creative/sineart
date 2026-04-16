import Link from "next/link";
import NavBar from "@/app/_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import "@/app/khoa-hoc/khoa-hoc-detail.css";
import "../he-thong-bai-tap.css";

export default async function HeThongBaiTapNotFound() {
  const { courses } = await getKhoaHocPageData();
  return (
    <>
      <NavBar khoaHocGroups={buildKhoaHocNavFromCourses(courses)} />
      <div className="sa-root khoa-hoc-page htbt-root">
        <div className="kd-page">
          <nav className="kd-bc" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="kd-bc-sep">›</span>
            <Link href="/khoa-hoc">Khóa học</Link>
            <span className="kd-bc-sep">›</span>
            <span className="kd-bc-current">Bài tập</span>
          </nav>
          <div className="htbt-shell" style={{ padding: 28, textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Không tìm thấy bài tập</p>
            <p style={{ fontSize: 13, color: "rgba(45, 32, 32, 0.56)", marginBottom: 18 }}>
              URL không khớp bài trong hệ thống hoặc bài chưa được hiển thị.
            </p>
            <Link
              href="/khoa-hoc"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#185fa5",
                textDecoration: "none",
              }}
            >
              ← Về danh sách khóa học
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
