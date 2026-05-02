import { getMonConfig } from "@/lib/thi-thu-config";

/**
 * Tiêu đề kỳ bắt đầu bằng prefix này → thời lượng làm bài **3 phút** (debug UI),
 * thay vì 270–360 phút theo môn. Phòng thi vẫn mở trước 15 phút như bình thường.
 */
export const DEBUG_THI_THU_TITLE_PREFIX = "[DEBUG 3m] ";

export function getDebugExamDurationPhut(ky: { tieu_de?: string | null }): number | null {
  const t = (ky.tieu_de ?? "").trim();
  return t.startsWith(DEBUG_THI_THU_TITLE_PREFIX) ? 3 : null;
}

/** Phút làm bài thực tế (debug hoặc theo config môn). */
export function resolveExamDurationPhut(ky: {
  tieu_de?: string | null;
  mon_thi?: string | null;
}): number {
  const d = getDebugExamDurationPhut(ky);
  if (d != null) return d;
  return getMonConfig(ky.mon_thi ?? "").thoi_luong_phut;
}
