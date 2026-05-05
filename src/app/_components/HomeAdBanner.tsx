"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { isRenderableAdImageUrl, sanitizeAdClickUrl } from "@/lib/admin/home-content-schema";
import { nextImageShouldUnoptimize } from "@/lib/nextImageRemote";

type Dismissal = "banner" | "pill" | "none";

const STORAGE_KEY = "sa_home_ad_dismissal";

/**
 * Banner quảng cáo nổi cho trang public (home + subpages).
 * - URL ảnh: `mkt_home_content.ads`. Link khi bấm: `ad_click_url` (tab mới).
 * - Có nút ✕ để thu gọn thành pill; pill click lại để mở banner.
 * - Trạng thái dismissal lưu `sessionStorage` — reload tab trả về `banner`.
 */
export default function HomeAdBanner({
  imageUrl,
  clickUrl = "",
}: {
  imageUrl: string;
  /** URL mở tab mới khi bấm ảnh — rỗng = không bọc thẻ link */
  clickUrl?: string;
}) {
  const [dismissal, setDismissal] = useState<Dismissal>("banner");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "pill" || stored === "none" || stored === "banner") {
        setDismissal(stored);
      }
    } catch {
      // sessionStorage không khả dụng
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, dismissal);
    } catch {
      // ignore
    }
  }, [dismissal]);

  const src = imageUrl.trim();
  if (!isRenderableAdImageUrl(src)) return null;

  const href = sanitizeAdClickUrl(clickUrl);
  const linked = href.length > 0;

  const bannerImg = (
    <Image
      className="sa-adbanner-img"
      src={src}
      alt="Quảng cáo Sine Art"
      width={360}
      height={176}
      sizes="(max-width: 720px) min(360px, calc(100vw - 24px)), 360px"
      loading="lazy"
      unoptimized={nextImageShouldUnoptimize(src)}
    />
  );

  return (
    <>
      <div
        className={`sa-adbanner ${dismissal !== "banner" ? "is-hid" : ""}`}
        role="complementary"
        aria-label="Quảng cáo"
      >
        <div className="sa-adbanner-inner">
          {linked ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="sa-adbanner-link"
              aria-label="Mở liên kết quảng cáo (tab mới)"
            >
              {bannerImg}
            </a>
          ) : (
            bannerImg
          )}
          <button
            type="button"
            className="sa-adbanner-x"
            onClick={() => setDismissal("pill")}
            aria-label="Thu gọn quảng cáo"
          >
            ✕
          </button>
        </div>
      </div>

      <div className={`sa-adbanner-pill-wrap ${dismissal === "pill" ? "is-vis" : ""}`}>
        <button
          type="button"
          className="sa-adbanner-pill"
          onClick={() => setDismissal("banner")}
        >
          🎨 Quảng cáo
        </button>
        <button
          type="button"
          className="sa-adbanner-pill-dismiss"
          onClick={() => setDismissal("none")}
          aria-label="Ẩn hẳn"
        >
          ✕
        </button>
      </div>
    </>
  );
}
