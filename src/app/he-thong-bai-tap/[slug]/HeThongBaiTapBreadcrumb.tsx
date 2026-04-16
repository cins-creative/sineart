import Link from "next/link";
import type { BaiTap } from "@/types/baiTap";

export default function HeThongBaiTapBreadcrumb({ bai }: { bai: BaiTap }) {
  const title = `Bài ${bai.bai_so} — ${bai.ten_bai_tap}`;
  return (
    <nav className="kd-bc" aria-label="Breadcrumb">
      <Link href="/">Trang chủ</Link>
      <span className="kd-bc-sep">›</span>
      <Link href="/khoa-hoc">Khóa học</Link>
      <span className="kd-bc-sep">›</span>
      <span className="kd-bc-muted">{bai.mon_hoc.ten_mon_hoc}</span>
      <span className="kd-bc-sep">›</span>
      <span className="kd-bc-current">{title}</span>
    </nav>
  );
}
