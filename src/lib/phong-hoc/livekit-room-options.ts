import type { RoomOptions, ScreenShareCaptureOptions } from "livekit-client";
import { ScreenSharePresets } from "livekit-client";

/** Tuỳ chọn phòng LiveKit — adaptive stream + bitrate screen share cao hơn mặc định. */
export const PHC_LIVEKIT_ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
    simulcast: true,
  },
};

/** Safari 17: chỉ định `resolution` có thể làm capture mờ — giữ mặc định trình duyệt. */
function safariScreenShareCapture(): boolean {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/** GV bật chia sẻ màn hình — 1080p30, hint «detail» cho nét chữ/vẽ. */
export function phcScreenShareCaptureOptions(enabled: boolean): ScreenShareCaptureOptions | undefined {
  if (!enabled) return undefined;
  const base: ScreenShareCaptureOptions = {
    audio: true,
    selfBrowserSurface: "include",
    contentHint: "detail",
  };
  if (safariScreenShareCapture()) return base;
  return {
    ...base,
    resolution: ScreenSharePresets.h1080fps30.resolution,
  };
}
