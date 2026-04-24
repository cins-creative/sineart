"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Toggle reading mode cho trang detail lý thuyết.
 *
 * 3 state:
 *  - default: hiện đủ 3 cột. Button: "⇔ Xem tập trung".
 *  - focus: ẩn 2 sidebar (thêm `.is-focus` vào `.ktn-lib`), main full width.
 *    Button: "⛶ Toàn màn hình" + nút "× Thoát".
 *  - fullscreen: browser fullscreen (document.documentElement). Button
 *    chuyển thành "⛶ Thoát toàn màn hình". ESC cũng thoát được (browser handle).
 *
 * Đồng bộ 2 chiều:
 *  - User nhấn ESC trong fullscreen → `fullscreenchange` listener cập nhật
 *    state để button hiển thị đúng.
 *  - Thoát fullscreen vẫn giữ focus mode (chỉ thoát fullscreen, không auto
 *    show sidebars lại) — user tự bấm "× Thoát" để về default.
 */
export default function HeroFocusToggle() {
  const [focused, setFocused] = useState(false);
  const [isFs, setIsFs] = useState(false);

  // Gắn / gỡ class `is-focus` trên `.ktn-lib` khi state thay đổi.
  useEffect(() => {
    const el = document.querySelector<HTMLDivElement>(".ktn-lib");
    if (!el) return;
    if (focused) el.classList.add("is-focus");
    else el.classList.remove("is-focus");
    return () => el.classList.remove("is-focus");
  }, [focused]);

  // Đồng bộ state fullscreen với browser (ESC / F11).
  useEffect(() => {
    const sync = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const enterFocus = useCallback(() => setFocused(true), []);
  const exitFocus = useCallback(() => setFocused(false), []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* một số browser block fullscreen khi không phải user-initiated;
         bỏ qua lỗi để không crash UI. */
    }
  }, []);

  return (
    <div className="hero-focus-toggle" role="group" aria-label="Chế độ đọc">
      {!focused ? (
        <button
          type="button"
          className="hft-btn hft-btn-icon"
          onClick={enterFocus}
          aria-label="Bật chế độ đọc tập trung"
          title="Bật chế độ đọc tập trung"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 9V5h4" />
            <path d="M20 9V5h-4" />
            <path d="M4 15v4h4" />
            <path d="M20 15v4h-4" />
          </svg>
          <span className="sr-only">Bật chế độ đọc tập trung</span>
        </button>
      ) : (
        <>
          <button
            type="button"
            className="hft-btn hft-btn-icon is-primary"
            onClick={toggleFullscreen}
            aria-label={
              isFs ? "Thoát chế độ toàn màn hình" : "Xem toàn màn hình"
            }
            title={isFs ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {isFs ? (
                <>
                  <path d="M8 3v4H4" />
                  <path d="M16 3v4h4" />
                  <path d="M8 21v-4H4" />
                  <path d="M16 21v-4h4" />
                </>
              ) : (
                <>
                  <path d="M3 9V3h6" />
                  <path d="M21 9V3h-6" />
                  <path d="M3 15v6h6" />
                  <path d="M21 15v6h-6" />
                </>
              )}
            </svg>
            <span className="sr-only">
              {isFs ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
            </span>
          </button>
          <button
            type="button"
            className="hft-btn hft-btn-icon"
            onClick={exitFocus}
            aria-label="Thoát chế độ đọc tập trung"
            title="Thoát chế độ đọc tập trung"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 6l12 12" />
              <path d="M6 18L18 6" />
            </svg>
            <span className="sr-only">Thoát chế độ đọc tập trung</span>
          </button>
        </>
      )}
    </div>
  );
}
