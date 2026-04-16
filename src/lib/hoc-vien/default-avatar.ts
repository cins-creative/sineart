/**
 * Khi `ql_thong_tin_hoc_vien.avatar` trống: thử Unavatar theo email.
 *
 * - `https://unavatar.io/{email}` — aggregate (Gravatar, Google, …) theo tài liệu Unavatar.
 * - `https://unavatar.io/google/{email}` — nhánh Google riêng (dự phòng).
 *
 * **Không phải** ảnh từ Google Sign-In OAuth: luồng đăng nhập học viên chỉ nhập email, không có
 * `picture` từ Google. Nếu cả hai URL đều lỗi (giới hạn upstream, adblock, v.v.), UI dùng chữ cái.
 */
export function publicAvatarUrlsForEmail(email: string | null | undefined): string[] {
  const e = email?.trim().toLowerCase();
  if (!e || !e.includes("@")) return [];
  const enc = encodeURIComponent(e);
  return [`https://unavatar.io/${enc}`, `https://unavatar.io/google/${enc}`];
}

/**
 * Chỉ URL đầu tiên — giữ cho mã cũ; ưu tiên dùng {@link publicAvatarUrlsForEmail} để thử nhiều nguồn.
 */
export function googleDefaultAvatarUrlForEmail(email: string | null | undefined): string | null {
  const xs = publicAvatarUrlsForEmail(email);
  return xs[0] ?? null;
}
