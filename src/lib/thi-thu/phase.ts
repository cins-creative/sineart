import { getMonConfig, type MonThiKey } from "@/lib/thi-thu-config";
import type { ThiThuPhase } from "@/types/thi-thu";

const OPEN_ROOM_MS = 15 * 60 * 1000;

export function computeExamEndMs(thoiGianBatDauMs: number, thoiLuongPhut: number): number {
  return thoiGianBatDauMs + thoiLuongPhut * 60 * 1000;
}

type PhaseInput = {
  mon_thi: MonThiKey;
  T: number;
  GL_start: number | null;
  GL_end: number | null;
  now: number;
};

/** Phase theo state machine trong brief (client dùng `now = Date.now() + serverOffset`). */
export function computePhase(input: PhaseInput): ThiThuPhase {
  const cfg = getMonConfig(input.mon_thi);
  const durMs = cfg.thoi_luong_phut * 60 * 1000;
  const endMs = input.T + durMs;
  const { now } = input;

  if (now >= endMs) return "ended";

  const coGiaiLao =
    cfg.co_giai_lao &&
    input.GL_start != null &&
    input.GL_end != null &&
    Number.isFinite(input.GL_start) &&
    Number.isFinite(input.GL_end);

  if (!coGiaiLao) {
    if (now < input.T - OPEN_ROOM_MS) return "waiting";
    if (now < input.T) return "countdown";
    return "exam_1";
  }

  const gls = input.GL_start as number;
  const gle = input.GL_end as number;

  if (now < input.T - OPEN_ROOM_MS) return "waiting";
  if (now < input.T) return "countdown";
  if (now < gls) return "exam_1";
  if (now < gle) return "break";
  return "exam_2";
}

export function computeElapsedExamMs(
  phase: ThiThuPhase,
  T: number,
  GL_start: number | null,
  GL_end: number | null,
  now: number
): number {
  if (phase === "exam_1") return Math.max(0, now - T);
  if (phase === "exam_2" && GL_start != null && GL_end != null) {
    return Math.max(0, GL_start - T + (now - GL_end));
  }
  return 0;
}

/** Trạng thái hiển thị card danh sách `/thi-thu`. */
export type ListCardStatus = "sap_dien_ra" | "dang_mo_phong" | "dang_thi" | "da_ket_thuc";

export function computeListCardStatus(
  T: number,
  thoiLuongPhut: number,
  now: number
): ListCardStatus {
  const durMs = thoiLuongPhut * 60 * 1000;
  const endMs = T + durMs;
  if (now >= endMs) return "da_ket_thuc";
  if (now < T - OPEN_ROOM_MS) return "sap_dien_ra";
  if (now < T) return "dang_mo_phong";
  return "dang_thi";
}

export function listCardStatusLabel(s: ListCardStatus): string {
  switch (s) {
    case "sap_dien_ra":
      return "Sắp diễn ra";
    case "dang_mo_phong":
      return "Đang mở phòng";
    case "dang_thi":
      return "Đang thi";
    case "da_ket_thuc":
      return "Đã kết thúc";
    default:
      return "";
  }
}
