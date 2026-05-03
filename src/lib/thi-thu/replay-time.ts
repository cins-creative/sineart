import { computeExamEndMs, SUBMIT_GRACE_MS } from "@/lib/thi-thu/phase";

/**
 * Chuyển mốc thời gian ISO (UTC) → chuỗi `HH:mm:ss` theo **Asia/Ho_Chi_Minh**
 * để ghi cột PostgreSQL kiểu `time` (không nhận full ISO).
 */
export function isoInstantToPgTimeHoChiMinh(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (!Number.isFinite(d.getTime())) return "00:00:00";
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  const s = parts.find((p) => p.type === "second")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
}

/**
 * Chuẩn hóa input từ API (ISO hoặc `HH:mm[:ss]`) → giá trị ghi cột `time`.
 */
export function parseThoiGianSuaBaiInputForPgTimeColumn(bodyValue: unknown): string | null {
  if (bodyValue == null || bodyValue === "") return null;
  if (typeof bodyValue !== "string") return null;
  const s = bodyValue.trim();
  if (!s) return null;

  const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (timeOnly && !s.includes("T") && !/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const hh = timeOnly[1].padStart(2, "0");
    const mm = timeOnly[2].padStart(2, "0");
    const ss = (timeOnly[3] ?? "00").padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return isoInstantToPgTimeHoChiMinh(d.toISOString());
}

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
  const graceEndMs = endMs + SUBMIT_GRACE_MS;
  const suaMs = parseThoiGianSuaBaiMs(input.thoiGianBatDauIso, input.thoiGianSuaBaiRaw);
  const { now } = input;

  if (now < T) return T;
  if (now < endMs) return T;
  if (now < graceEndMs) return graceEndMs;
  if (suaMs != null && now < suaMs) return suaMs;
  return 1e15 - endMs;
}
