"use client";

/**
 * Lỗi segment phòng thi — thường do RSC/serialize hoặc lỗi hiếm không bắt được ở fetch.
 * Mạng di động yếu đôi khi làm fail request tới Supabase nếu chưa có fallback.
 */
export default function ThiThuRoomError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="sa-root sa-thi-thu flex min-h-[60dvh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-[family-name:var(--font-quicksand)] text-lg font-bold text-[#2d2020]">
        Không tải được phòng thi
      </p>
      <p className="mt-2 max-w-md font-[family-name:var(--font-quicksand)] text-sm font-semibold text-[rgba(45,32,32,0.6)]">
        Có thể do lỗi tạm thời hoặc kết nối không ổn định (hay gặp trên mạng di động). Hãy thử tải lại.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 rounded-full border border-[rgba(45,32,32,0.14)] bg-white px-6 py-2.5 text-sm font-bold text-[#2d2020] shadow-sm"
      >
        Thử lại
      </button>
      <a
        href="/thi-thu"
        className="mt-4 text-sm font-semibold text-[rgba(45,32,32,0.55)] underline underline-offset-2"
      >
        ← Về danh sách kỳ thi
      </a>
    </div>
  );
}
