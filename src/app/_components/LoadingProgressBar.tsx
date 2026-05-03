"use client";

/**
 * Thanh loading cố định đầu viewport (kiểu Webflow/NProgress) — phản hồi tức thì khi đổi route hoặc chờ RSC.
 */
export default function LoadingProgressBar() {
  return (
    <div
      className="pointer-events-none fixed top-0 right-0 left-0 z-[9999] h-[3px] overflow-hidden bg-[rgba(45,32,32,0.08)]"
      role="progressbar"
      aria-busy="true"
      aria-label="Đang tải"
    >
      <div className="sa-route-load-bar-inner h-full w-[44%] rounded-full bg-gradient-to-r from-[#f8a568] via-[#ffa07a] to-[#ee5ca2] shadow-[0_0_14px_rgba(248,165,104,0.45)]" />
    </div>
  );
}
