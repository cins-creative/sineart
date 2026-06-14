import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getGvHrIdForRequest } from "@/lib/phong-hoc/gv-session-cookie";
import { getHvIdFromSyncedCookie } from "@/lib/phong-hoc/hv-session-cookie";
import { phongHocJsonResponse, phongHocOptionsResponse } from "@/lib/phong-hoc/mobile-api-cors";
import { parseTeacherIds } from "@/lib/utils/parse-teacher-ids";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function OPTIONS(): NextResponse {
  return phongHocOptionsResponse();
}

type LiveKitRole = "host" | "participant";

function liveKitEnv(): { url: string; apiKey: string; apiSecret: string } | null {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

async function resolveRoleForLop(
  lopHocId: number,
  hvPk: number | null,
  gvHrId: number | null
): Promise<LiveKitRole | null> {
  const sb = createServiceRoleClient();
  if (!sb) return null;

  const { data: lop, error } = await sb
    .from("ql_lop_hoc")
    .select("teacher")
    .eq("id", lopHocId)
    .maybeSingle();
  if (error || !lop) return null;

  const teacherIds = parseTeacherIds((lop as { teacher?: unknown }).teacher);
  if (teacherIds.length === 0) return null;

  if (gvHrId != null && gvHrId > 0 && teacherIds.includes(gvHrId)) return "host";

  if (hvPk != null && hvPk > 0) {
    const { data: en, error: eEn } = await sb
      .from("ql_quan_ly_hoc_vien")
      .select("id")
      .eq("hoc_vien_id", hvPk)
      .eq("lop_hoc", lopHocId)
      .maybeSingle();
    if (!eEn && en) return "participant";
  }

  return null;
}

/**
 * GET `/api/livekit/token?roomName=...&participantName=...&lopHocId=123`
 * Chỉ cấp token khi Bearer `gvSyncToken` hoặc cookie HV/GV thuộc đúng lớp.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const env = liveKitEnv();
  if (!env) {
    return phongHocJsonResponse(
      { error: "Thiếu cấu hình LiveKit (LIVEKIT_URL / API key / secret).", code: "NO_LIVEKIT" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const roomName = url.searchParams.get("roomName")?.trim() ?? "";
  const participantName = url.searchParams.get("participantName")?.trim() ?? "";
  const lopHocId = Number(url.searchParams.get("lopHocId"));

  if (!roomName || roomName.length > 128) {
    return phongHocJsonResponse({ error: "roomName không hợp lệ.", code: "BAD_ROOM" }, { status: 400 });
  }
  if (!participantName || participantName.length > 128) {
    return phongHocJsonResponse(
      { error: "participantName không hợp lệ.", code: "BAD_NAME" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(lopHocId) || lopHocId <= 0) {
    return phongHocJsonResponse({ error: "lopHocId không hợp lệ.", code: "BAD_LOP" }, { status: 400 });
  }

  const hvPk = await getHvIdFromSyncedCookie();
  const gvHrId = await getGvHrIdForRequest(req);
  const role = await resolveRoleForLop(lopHocId, hvPk, gvHrId);

  if (!role) {
    return phongHocJsonResponse(
      {
        error: "Chưa xác thực Phòng học (Bearer/cookie HV/GV) hoặc không thuộc lớp này.",
        code: "FORBIDDEN",
      },
      { status: 403 }
    );
  }

  const identity =
    role === "host"
      ? `gv-${gvHrId}-${lopHocId}`
      : `hv-${hvPk}-${lopHocId}`;

  const at = new AccessToken(env.apiKey, env.apiSecret, {
    identity,
    name: participantName,
    ttl: "4h",
  });

  const publishSources =
    role === "host"
      ? [
          TrackSource.CAMERA,
          TrackSource.MICROPHONE,
          TrackSource.SCREEN_SHARE,
          TrackSource.SCREEN_SHARE_AUDIO,
        ]
      : [TrackSource.CAMERA, TrackSource.MICROPHONE];

  if (role === "host") {
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: true,
    });
  } else {
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: publishSources,
    });
  }

  const token = await at.toJwt();

  return phongHocJsonResponse(
    { token, serverUrl: env.url, role },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
