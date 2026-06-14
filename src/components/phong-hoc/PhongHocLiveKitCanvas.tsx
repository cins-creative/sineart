"use client";

import dynamic from "next/dynamic";
import { syncPhongHocCookiesWithStorage } from "@/lib/phong-hoc/classroom-session";
import { useCallback, useEffect, useRef, useState } from "react";

const PhongHocRoom = dynamic(() => import("./LiveKitRoom"), {
  ssr: false,
  loading: () => (
    <div className="canvas-ph canvas-ph--livekit">
      <span className="ico">⏳</span>
      <p>Đang tải phòng học…</p>
    </div>
  ),
});

export type PhongHocLiveKitCanvasProps = {
  roomName: string;
  participantName: string;
  lopHocId: number;
  isHost: boolean;
  canJoin: boolean;
  localAvatarUrl?: string | null;
};

type LiveKitRole = "host" | "participant";

type TokenState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; token: string; serverUrl: string; role: LiveKitRole }
  | { status: "error"; message: string }
  | { status: "disconnected" };

type TokenCache = {
  key: string;
  token: string;
  serverUrl: string;
  role: LiveKitRole;
};

function joinKey(roomName: string, lopHocId: number, participantName: string): string {
  return `${roomName}|${lopHocId}|${participantName}`;
}

export default function PhongHocLiveKitCanvas({
  roomName,
  participantName,
  lopHocId,
  isHost,
  canJoin,
  localAvatarUrl,
}: PhongHocLiveKitCanvasProps) {
  const [tokenState, setTokenState] = useState<TokenState>({ status: "idle" });
  const [connectEnabled, setConnectEnabled] = useState(true);
  const tokenCacheRef = useRef<TokenCache | null>(null);
  const fetchGenRef = useRef(0);

  const handleConnectionLost = useCallback(() => {
    setConnectEnabled(false);
    setTokenState((prev) => (prev.status === "ready" ? { status: "disconnected" } : prev));
  }, []);

  const handleReconnect = useCallback(() => {
    setConnectEnabled(true);
    setTokenState((prev) => {
      if (prev.status === "disconnected" && tokenCacheRef.current) {
        const c = tokenCacheRef.current;
        return { status: "ready", token: c.token, serverUrl: c.serverUrl, role: c.role };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (!canJoin) {
      tokenCacheRef.current = null;
      setConnectEnabled(true);
      setTokenState({ status: "idle" });
      return;
    }

    const key = joinKey(roomName, lopHocId, participantName);
    const cached = tokenCacheRef.current;
    if (cached?.key === key) {
      setTokenState({
        status: "ready",
        token: cached.token,
        serverUrl: cached.serverUrl,
        role: cached.role,
      });
      return;
    }

    const gen = ++fetchGenRef.current;
    setTokenState({ status: "loading" });

    const qs = new URLSearchParams({
      roomName,
      participantName,
      lopHocId: String(lopHocId),
    });

    void (async () => {
      try {
        await syncPhongHocCookiesWithStorage();
        const res = await fetch(`/api/livekit/token?${qs.toString()}`, { credentials: "include" });
        const body = (await res.json().catch(() => ({}))) as {
          token?: string;
          serverUrl?: string;
          role?: LiveKitRole;
          error?: string;
        };
        if (fetchGenRef.current !== gen) return;
        if (!res.ok || !body.token || !body.serverUrl) {
          setTokenState({
            status: "error",
            message: body.error ?? "Không lấy được token phòng học.",
          });
          return;
        }
        const role: LiveKitRole = body.role === "host" ? "host" : "participant";
        tokenCacheRef.current = { key, token: body.token, serverUrl: body.serverUrl, role };
        setConnectEnabled(true);
        setTokenState({ status: "ready", token: body.token, serverUrl: body.serverUrl, role });
      } catch {
        if (fetchGenRef.current !== gen) return;
        setTokenState({ status: "error", message: "Lỗi mạng — thử lại sau." });
      }
    })();
  }, [canJoin, roomName, lopHocId, participantName]);

  const retryFetch = useCallback(() => {
    tokenCacheRef.current = null;
    setConnectEnabled(true);
    setTokenState({ status: "idle" });
    const key = joinKey(roomName, lopHocId, participantName);
    void (async () => {
      const gen = ++fetchGenRef.current;
      setTokenState({ status: "loading" });
      try {
        await syncPhongHocCookiesWithStorage();
        const qs = new URLSearchParams({
          roomName,
          participantName,
          lopHocId: String(lopHocId),
        });
        const res = await fetch(`/api/livekit/token?${qs.toString()}`, { credentials: "include" });
        const body = (await res.json().catch(() => ({}))) as {
          token?: string;
          serverUrl?: string;
          role?: LiveKitRole;
          error?: string;
        };
        if (fetchGenRef.current !== gen) return;
        if (!res.ok || !body.token || !body.serverUrl) {
          setTokenState({
            status: "error",
            message: body.error ?? "Không lấy được token phòng học.",
          });
          return;
        }
        const role: LiveKitRole = body.role === "host" ? "host" : "participant";
        tokenCacheRef.current = { key, token: body.token, serverUrl: body.serverUrl, role };
        setConnectEnabled(true);
        setTokenState({ status: "ready", token: body.token, serverUrl: body.serverUrl, role });
      } catch {
        if (fetchGenRef.current !== gen) return;
        setTokenState({ status: "error", message: "Lỗi mạng — thử lại sau." });
      }
    })();
  }, [roomName, lopHocId, participantName]);

  if (!canJoin) {
    return (
      <div className="canvas-ph">
        <span className="ico">🎨</span>
        <p>Phòng học trực tuyến</p>
        <small>
          Đăng nhập bằng email học viên hoặc giáo viên để vào phòng LiveKit. Camera và micro sẽ bật
          ngay trong trang — không cần mở tab Google Meet.
        </small>
      </div>
    );
  }

  if (tokenState.status === "loading" || tokenState.status === "idle") {
    return (
      <div className="canvas-ph canvas-ph--livekit">
        <span className="ico">⏳</span>
        <p>Đang kết nối phòng học…</p>
        <small>Vui lòng cho phép camera và micro khi trình duyệt hỏi.</small>
      </div>
    );
  }

  if (tokenState.status === "error") {
    return (
      <div className="canvas-ph canvas-ph--livekit">
        <span className="ico">⚠️</span>
        <p>Không vào được phòng học</p>
        <small>{tokenState.message}</small>
        <button type="button" className="phc-lk-retry-btn" onClick={() => void retryFetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  if (tokenState.status === "disconnected") {
    return (
      <div className="canvas-ph canvas-ph--livekit">
        <span className="ico">📡</span>
        <p>Đã ngắt kết nối phòng học</p>
        <small>Kiểm tra mạng hoặc quyền camera/micro rồi thử kết nối lại.</small>
        <button type="button" className="phc-lk-retry-btn" onClick={handleReconnect}>
          Kết nối lại
        </button>
      </div>
    );
  }

  return (
    <div className="canvas-ph canvas-ph--livekit">
      <PhongHocRoom
        serverUrl={tokenState.serverUrl}
        token={tokenState.token}
        isHost={tokenState.role === "host"}
        connect={connectEnabled}
        localAvatarUrl={localAvatarUrl}
        onConnectionLost={handleConnectionLost}
      />
    </div>
  );
}
