"use client";

import { useEffect, useState } from "react";

type Dismissal = "banner" | "pill" | "none";

const STORAGE_KEY = "sa_home_ad_dismissal";

/**
 * Banner quảng cáo nổi cho trang public (home + subpages).
 * - Nội dung HTML đến từ `mkt_home_content.ads` (inject via dangerouslySetInnerHTML).
 * - Có nút ✕ để thu gọn thành pill; pill click lại để mở banner.
 * - Trạng thái dismissal lưu `sessionStorage` — reload tab trả về `banner`.
 */
export default function HomeAdBanner({ html }: { html: string }) {
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

  if (!html.trim()) return null;

  return (
    <>
      <div
        className={`sa-adbanner ${dismissal !== "banner" ? "is-hid" : ""}`}
        role="complementary"
        aria-label="Quảng cáo"
      >
        <div className="sa-adbanner-inner">
          <div className="sa-adbanner-bar" aria-hidden />
          <div
            className="sa-adbanner-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
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
