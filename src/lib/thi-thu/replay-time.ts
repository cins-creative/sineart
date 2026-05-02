import { computeExamEndMs } from "@/lib/thi-thu/phase";

/**
 * Parse `thi_gian_sua_bai` từ DB:
 * - `timestamptz` / ISO đầy đủ → dùng trực tiếp
 * - PostgreSQL `time` ("HH:mm:ss") → ghép **ngày** của `thoi_gian_bat_dau` + giờ đó
 */
export function parseThoiGianSuaBaiMs(
  thoiGianBatDauIso: string,
  raw: string | null | undefined,
): number | null {
  if (raw == null || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;

  const tryFull = new Date(s);
  if (Number.isFinite(tryFull.getTime())) {
    if (s.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(s)) {
      return tryFull.getTime();
    }
  }

  const exam = new Date(thoiGianBatDauIso);
  if (!Number.isFinite(exam.getTime())) return null;

  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = m[3] != null ? Number(m[3]) : 0;
  const d = new Date(exam);
  d.setHours(h, min, sec, 0);
  return d.getTime();
}

export function formatThoiGianSuaBaiLabel(
  thoiGianBatDauIso: string,
  raw: string | null | undefined,
): string | null {
  const ms = parseThoiGianSuaBaiMs(thoiGianBatDauIso, raw);
  if (ms == null) return null;
  return new Date(ms).toLocaleString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Sắp xếp card theo sự kiện “gần nhất sắp xảy ra” (thi hoặc buổi phát video sửa bài). */
export function computeKyListSortKey(input: {
  thoiGianBatDauIso: string;
  thoiLuongPhut: number;
  thoiGianSuaBaiRaw: string | null | undefined;
  now: number;
}): number {
  const T = new Date(input.thoiGianBatDauIso).getTime();
  const endMs = computeExamEndMs(T, input.thoiLuongPhut);
  const suaMs = parseThoiGianSuaBaiMs(input.thoiGianBatDauIso, input.thoiGianSuaBaiRaw);
  const { now } = input;

  if (now < T) return T;
  if (now < endMs) return T;
  if (suaMs != null && now < suaMs) return suaMs;
  return 1e15 - endMs;
}
