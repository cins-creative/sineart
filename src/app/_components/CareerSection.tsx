"use client";

import { CareerScrollTicker } from "@/app/_components/career/CareerScrollTicker";
import type { CareerCard } from "@/types/career";

type Props = {
  careers: CareerCard[];
};

export default function CareerSection({ careers }: Props) {
  return (
    <div className="career-wrap">
      <div className="sec-label">Ngành học</div>
      <div className="career-intro">
        <div className="career-intro-eyebrow">✦ Powered by CINS.vn</div>
        <div className="career-intro-title">Ngành đại học gắn với năng khiếu mỹ thuật</div>
        <div className="career-intro-text">
          Mỗi ngành có mã xét tuyển và mô tả riêng — xem nhanh tên ngành, mã ngành và ảnh minh họa
          từ thư viện CINS (ngành học đại học).
        </div>
        <a
          href="https://cins.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="career-cins-link"
        >
          Khám phá tại CINS.vn →
        </a>
      </div>
      <CareerScrollTicker careers={careers} />
    </div>
  );
}
