/**
 * Phòng học — chuyển nguồn video chính.
 *
 * `true`  → Google Meet (overlay «Phòng học đang cập nhật» + CTA tham gia Meet) — bản cũ.
 * `false` → LiveKit primary, Google Meet tab phụ — bản mới.
 *
 * Đổi cờ này rồi deploy khi muốn chuyển lại LiveKit.
 */
export const PHONG_HOC_LIVEKIT_DISABLED = true;
