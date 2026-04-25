"use client";

import { useEffect, useState } from "react";

import { isRenderableAdImageUrl } from "@/lib/admin/home-content-schema";

type Dismissal = "banner" | "pill" | "none";

const STORAGE_KEY = "sa_home_ad_dismissal";

/**
 * Banner quảng cáo nổi cho trang public (home + subpages).
 * - URL ảnh đến từ `mkt_home_content.ads`.
 * - Có nút ✕ để thu gọn thành pill; pill click lại để mở banner.
 * - Trạng thái dismissal lưu `sessionStorage` — reload tab trả về `banner`.
 */
export default function HomeAdBanner({ imageUrl }: { imageUrl: string }) {
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

  return (
    <>
      <div
        className={`sa-adbanner ${dismissal !== "banner" ? "is-hid" : ""}`}
        role="complementary"
        aria-label="Quảng cáo"
      >
        <div className="sa-adbanner-inner">
          <img className="sa-adbanner-img" src={src} alt="Quảng cáo Sine Art" />
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
