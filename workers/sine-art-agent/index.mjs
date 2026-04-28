/**
 * Đã gộp vào `workers/sine-art-api/index.mjs` (một Worker: API + Messenger Agent).
 * Không deploy file này — chỉ để nhận biết đường dẫn cũ.
 */
export default {
  async fetch() {
    return new Response(
      "Deprecated — dùng workers/sine-art-api/index.mjs (deploy Worker sine-art-api)",
      { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  },
};
