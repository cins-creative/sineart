"use client";

import "@livekit/components-styles";
import {
  encodeRaiseHandPayload,
  parseRaiseHandPayload,
  playRaiseHandChime,
  type RaiseHandPayload,
} from "@/components/phong-hoc/meet/raise-hand";
import {
  RoomAudioRenderer,
  VideoTrack,
  useIsSpeaking,
  useLocalParticipant,
  useRoomContext,
  useSpeakingParticipants,
  useMediaDeviceSelect,
  useTrackToggle,
  useTrackVolume,
  useTracks,
  LiveKitRoom,
} from "@livekit/components-react";
import { isTrackReference, type TrackReference } from "@livekit/components-core";
import { ParticipantEvent, RoomEvent, Track, type LocalAudioTrack, type LocalVideoTrack } from "livekit-client";
import {
  ChevronUp,
  Hand,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

export type PhongHocRoomProps = {
  serverUrl: string;
  token: string;
  isHost: boolean;
  connect: boolean;
  localAvatarUrl?: string | null;
  onConnectionLost?: () => void;
};

type RaiseHandContextValue = {
  raisedHands: Record<string, boolean>;
  localRaised: boolean;
  toggleRaiseHand: () => void;
  lowerHand: (participantId: string) => void;
};

const RaiseHandContext = createContext<RaiseHandContextValue | null>(null);

function useRaiseHandContext(): RaiseHandContextValue {
  const ctx = useContext(RaiseHandContext);
  if (!ctx) throw new Error("RaiseHandContext missing");
  return ctx;
}

function trackRefKey(ref: TrackReference): string {
  return `${ref.participant.identity}-${ref.source}`;
}

function cn(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

function RaiseHandProvider({
  isHost,
  children,
}: {
  isHost: boolean;
  children: ReactNode;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [localRaised, setLocalRaised] = useState(false);
  const prevRaisedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onData = (payload: Uint8Array) => {
      const msg = parseRaiseHandPayload(payload);
      if (!msg) return;

      const wasRaised = prevRaisedRef.current[msg.participantId] ?? false;
      setRaisedHands((prev) => {
        const next = { ...prev, [msg.participantId]: msg.raised };
        prevRaisedRef.current = next;
        return next;
      });

      if (msg.participantId === localParticipant.identity) {
        setLocalRaised(msg.raised);
      }

      if (isHost && msg.raised && !wasRaised) {
        playRaiseHandChime();
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, isHost, localParticipant.identity]);

  const publishRaiseHand = useCallback(
    (payload: RaiseHandPayload) => {
      void localParticipant.publishData(encodeRaiseHandPayload(payload), { reliable: true });
    },
    [localParticipant]
  );

  const toggleRaiseHand = useCallback(() => {
    if (isHost) return;
    const raised = !localRaised;
    setLocalRaised(raised);
    setRaisedHands((prev) => {
      const next = { ...prev, [localParticipant.identity]: raised };
      prevRaisedRef.current = next;
      return next;
    });
    publishRaiseHand({
      type: "raise_hand",
      participantId: localParticipant.identity,
      raised,
    });
  }, [isHost, localRaised, localParticipant.identity, publishRaiseHand]);

  const lowerHand = useCallback(
    (participantId: string) => {
      setRaisedHands((prev) => {
        const next = { ...prev, [participantId]: false };
        prevRaisedRef.current = next;
        return next;
      });
      if (participantId === localParticipant.identity) {
        setLocalRaised(false);
      }
      publishRaiseHand({ type: "raise_hand", participantId, raised: false });
    },
    [localParticipant.identity, publishRaiseHand]
  );

  const value = useMemo(
    () => ({ raisedHands, localRaised, toggleRaiseHand, lowerHand }),
    [raisedHands, localRaised, toggleRaiseHand, lowerHand]
  );

  return <RaiseHandContext.Provider value={value}>{children}</RaiseHandContext.Provider>;
}

function MeetVideoTile({
  trackRef,
  variant = "main",
  showShareBadge = false,
}: {
  trackRef: TrackReference;
  variant?: "main" | "strip";
  showShareBadge?: boolean;
}) {
  const { raisedHands } = useRaiseHandContext();
  const participant = trackRef.participant;
  const isSpeaking = useIsSpeaking(participant);
  const isRaised = raisedHands[participant.identity] ?? false;

  return (
    <div
      className={cn(
        "phc-lk-tile",
        variant === "strip" && "phc-lk-tile--strip",
        variant === "main" && "phc-lk-tile--main",
        isSpeaking && "phc-lk-tile--speaking"
      )}
    >
      {isTrackReference(trackRef) ? (
        <VideoTrack trackRef={trackRef} className="phc-lk-tile-video" />
      ) : (
        <div className="phc-lk-tile-placeholder" aria-hidden />
      )}
      {showShareBadge ? (
        <div className="phc-lk-share-badge">Đang chia sẻ màn hình</div>
      ) : null}
      {isRaised ? <div className="phc-lk-raise-float" aria-label="Đang giơ tay">✋</div> : null}
    </div>
  );
}

function MeetConferenceLayout() {
  const screenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  );
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );
  const speakingParticipants = useSpeakingParticipants();

  const screenRef = useMemo(
    () => screenTracks.find((t): t is TrackReference => isTrackReference(t)) ?? null,
    [screenTracks]
  );
  const cameraRefs = useMemo(
    () => cameraTracks.filter((t): t is TrackReference => isTrackReference(t)),
    [cameraTracks]
  );

  const hasScreenShare = screenRef != null;

  const mainCameraRef = useMemo(() => {
    if (cameraRefs.length === 0) return null;
    const speakingIds = new Set(speakingParticipants.map((p) => p.identity));
    return (
      cameraRefs.find((t) => speakingIds.has(t.participant.identity)) ??
      cameraRefs[0] ??
      null
    );
  }, [cameraRefs, speakingParticipants]);

  const mainTrack = hasScreenShare ? screenRef : mainCameraRef;

  const stripTracks = useMemo(() => {
    if (hasScreenShare) return cameraRefs;
    if (!mainCameraRef) return [];
    const mainKey = trackRefKey(mainCameraRef);
    return cameraRefs.filter((t) => trackRefKey(t) !== mainKey);
  }, [hasScreenShare, cameraRefs, mainCameraRef]);

  return (
    <div className={cn("phc-lk-layout", hasScreenShare && "phc-lk-layout--share")}>
      <div className="phc-lk-main">
        {mainTrack ? (
          <MeetVideoTile
            trackRef={mainTrack}
            variant="main"
            showShareBadge={hasScreenShare}
          />
        ) : (
          <div className="phc-lk-main-empty">
            <span className="ico">📹</span>
            <p>Chưa có video</p>
          </div>
        )}
      </div>
      {stripTracks.length > 0 ? (
        <div className="phc-lk-filmstrip" role="list" aria-label="Video nhỏ">
          {stripTracks.map((t) => (
            <MeetVideoTile key={trackRefKey(t)} trackRef={t} variant="strip" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ScreenShareButton() {
  const { localParticipant } = useLocalParticipant();
  const [shareEnabled, setShareEnabled] = useState(() => localParticipant.isScreenShareEnabled);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setShareEnabled(localParticipant.isScreenShareEnabled);
    localParticipant.on(ParticipantEvent.LocalTrackPublished, sync);
    localParticipant.on(ParticipantEvent.LocalTrackUnpublished, sync);
    return () => {
      localParticipant.off(ParticipantEvent.LocalTrackPublished, sync);
      localParticipant.off(ParticipantEvent.LocalTrackUnpublished, sync);
    };
  }, [localParticipant]);

  const handleShareClick = useCallback(() => {
    if (shareBusy) return;
    setShareErr(null);
    setShareBusy(true);
    const next = !shareEnabled;
    void localParticipant
      .setScreenShareEnabled(next, { audio: true, selfBrowserSurface: "include" })
      .then(() => {
        setShareEnabled(localParticipant.isScreenShareEnabled);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error && err.message.toLowerCase().includes("permission")
            ? "Trình duyệt đã chặn chia sẻ màn hình — hãy cho phép trong hộp thoại."
            : "Không bật được chia sẻ màn hình. Thử lại hoặc dùng Chrome/Edge.";
        setShareErr(msg);
      })
      .finally(() => {
        setShareBusy(false);
      });
  }, [localParticipant, shareBusy, shareEnabled]);

  return (
    <div className="phc-lk-share-wrap">
      <button
        type="button"
        className={cn(
          "phc-lk-tool-btn",
          "phc-lk-tool-btn--share",
          shareEnabled && "phc-lk-tool-btn--active",
          shareBusy && "phc-lk-tool-btn--busy"
        )}
        onClick={handleShareClick}
        disabled={shareBusy}
        aria-label={shareEnabled ? "Dừng chia sẻ" : "Chia sẻ màn hình"}
        title={shareEnabled ? "Dừng chia sẻ" : "Chia sẻ màn hình"}
      >
        {shareEnabled ? (
          <MonitorOff size={20} strokeWidth={2} />
        ) : (
          <Monitor size={20} strokeWidth={2} />
        )}
        <span className="phc-lk-tool-label">
          {shareBusy ? "Đang bật…" : shareEnabled ? "Dừng chia sẻ" : "Chia sẻ màn hình"}
        </span>
      </button>
      {shareErr ? (
        <p className="phc-lk-share-err" role="alert">
          {shareErr}
        </p>
      ) : null}
    </div>
  );
}

function useLocalMediaTrack(source: Track.Source.Microphone | Track.Source.Camera) {
  const { localParticipant } = useLocalParticipant();
  const [track, setTrack] = useState<LocalAudioTrack | LocalVideoTrack | undefined>(() => {
    const pub = localParticipant.getTrackPublication(source);
    return pub?.track as LocalAudioTrack | LocalVideoTrack | undefined;
  });

  useEffect(() => {
    const sync = () => {
      const pub = localParticipant.getTrackPublication(source);
      setTrack(pub?.track as LocalAudioTrack | LocalVideoTrack | undefined);
    };
    sync();
    localParticipant.on(ParticipantEvent.LocalTrackPublished, sync);
    localParticipant.on(ParticipantEvent.LocalTrackUnpublished, sync);
    return () => {
      localParticipant.off(ParticipantEvent.LocalTrackPublished, sync);
      localParticipant.off(ParticipantEvent.LocalTrackUnpublished, sync);
    };
  }, [localParticipant, source]);

  return track;
}

function deviceLabel(device: MediaDeviceInfo, index: number, fallback: string): string {
  const label = device.label?.trim();
  if (label) return label;
  return `${fallback} ${index + 1}`;
}

function MediaDevicePicker({
  kind,
  track,
  menuLabel,
  emptyLabel,
  deviceFallback,
  open,
  onClose,
  containerRef,
}: {
  kind: MediaDeviceKind;
  track?: LocalAudioTrack | LocalVideoTrack;
  menuLabel: string;
  emptyLabel: string;
  deviceFallback: string;
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind,
    track,
    requestPermissions: track != null,
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose, containerRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="phc-lk-device-menu" role="listbox" aria-label={menuLabel}>
      <p className="phc-lk-device-menu-title">{menuLabel}</p>
      {devices.length === 0 ? (
        <p className="phc-lk-device-menu-empty">{emptyLabel}</p>
      ) : (
        devices.map((device, index) => {
          const selected = device.deviceId === activeDeviceId;
          return (
            <button
              key={device.deviceId || `device-${index}`}
              type="button"
              role="option"
              aria-selected={selected}
              className={cn("phc-lk-device-menu-item", selected && "phc-lk-device-menu-item--active")}
              onClick={() => {
                void setActiveMediaDevice(device.deviceId).finally(onClose);
              }}
            >
              <span className="phc-lk-device-menu-item-label">
                {deviceLabel(device, index, deviceFallback)}
              </span>
              {selected ? <span className="phc-lk-device-menu-check" aria-hidden>✓</span> : null}
            </button>
          );
        })
      )}
    </div>
  );
}

function MicToolControl() {
  const splitRef = useRef<HTMLDivElement>(null);
  const { toggle: toggleMic, enabled: micEnabled } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const micTrack = useLocalMediaTrack(Track.Source.Microphone) as LocalAudioTrack | undefined;
  const micVolume = useTrackVolume(micTrack);
  const [pickerOpen, setPickerOpen] = useState(false);
  const micLevel = micEnabled ? Math.min(1, micVolume * 2.8) : 0;
  const isReceivingAudio = micEnabled && micLevel > 0.04;

  const closePicker = useCallback(() => setPickerOpen(false), []);

  return (
    <div ref={splitRef} className="phc-lk-tool-split">
      <button
        type="button"
        className={cn(
          "phc-lk-tool-btn",
          "phc-lk-tool-btn--mic",
          !micEnabled && "phc-lk-tool-btn--off",
          isReceivingAudio && "phc-lk-tool-btn--mic-live"
        )}
        style={{ "--phc-mic-level": micLevel } as CSSProperties}
        onClick={() => void toggleMic()}
        aria-label={micEnabled ? "Tắt micro" : "Bật micro"}
        title={micEnabled ? "Tắt micro" : "Bật micro"}
      >
        <span className="phc-lk-mic-btn-inner" aria-hidden>
          {micEnabled ? (
            <>
              <span className="phc-lk-mic-level-ring" />
              <Mic size={20} strokeWidth={2} className="phc-lk-mic-icon" />
            </>
          ) : (
            <MicOff size={20} strokeWidth={2} />
          )}
        </span>
      </button>
      <button
        type="button"
        className={cn("phc-lk-tool-btn", "phc-lk-tool-btn--picker", pickerOpen && "phc-lk-tool-btn--picker-open")}
        onClick={() => setPickerOpen((open) => !open)}
        aria-expanded={pickerOpen}
        aria-haspopup="listbox"
        aria-label="Chọn micro"
        title="Chọn micro"
      >
        <ChevronUp size={16} strokeWidth={2.4} />
      </button>
      <MediaDevicePicker
        kind="audioinput"
        track={micTrack}
        menuLabel="Chọn micro"
        emptyLabel="Chưa phát hiện micro — bật quyền micro trước."
        deviceFallback="Micro"
        open={pickerOpen}
        onClose={closePicker}
        containerRef={splitRef}
      />
    </div>
  );
}

function CameraToolControl() {
  const splitRef = useRef<HTMLDivElement>(null);
  const { toggle: toggleCamera, enabled: cameraEnabled } = useTrackToggle({
    source: Track.Source.Camera,
  });
  const cameraTrack = useLocalMediaTrack(Track.Source.Camera) as LocalVideoTrack | undefined;
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  return (
    <div ref={splitRef} className="phc-lk-tool-split">
      <button
        type="button"
        className={cn("phc-lk-tool-btn", !cameraEnabled && "phc-lk-tool-btn--off")}
        onClick={() => void toggleCamera()}
        aria-label={cameraEnabled ? "Tắt camera" : "Bật camera"}
        title={cameraEnabled ? "Tắt camera" : "Bật camera"}
      >
        {cameraEnabled ? <Video size={20} strokeWidth={2} /> : <VideoOff size={20} strokeWidth={2} />}
      </button>
      <button
        type="button"
        className={cn("phc-lk-tool-btn", "phc-lk-tool-btn--picker", pickerOpen && "phc-lk-tool-btn--picker-open")}
        onClick={() => setPickerOpen((open) => !open)}
        aria-expanded={pickerOpen}
        aria-haspopup="listbox"
        aria-label="Chọn camera"
        title="Chọn camera"
      >
        <ChevronUp size={16} strokeWidth={2.4} />
      </button>
      <MediaDevicePicker
        kind="videoinput"
        track={cameraTrack}
        menuLabel="Chọn camera"
        emptyLabel="Chưa phát hiện camera — bật quyền camera trước."
        deviceFallback="Camera"
        open={pickerOpen}
        onClose={closePicker}
        containerRef={splitRef}
      />
    </div>
  );
}

function MeetToolbar({ isHost, onLeave }: { isHost: boolean; onLeave: () => void }) {
  const { localRaised, toggleRaiseHand } = useRaiseHandContext();

  return (
    <div className="phc-lk-toolbar-wrap">
      <MicToolControl />
      <CameraToolControl />

      {isHost ? <ScreenShareButton /> : null}

      {!isHost ? (
        <button
          type="button"
          className={cn("phc-lk-tool-btn", localRaised && "phc-lk-tool-btn--raise-active")}
          onClick={toggleRaiseHand}
          aria-pressed={localRaised}
          aria-label={localRaised ? "Hạ tay" : "Giơ tay"}
          title={localRaised ? "Hạ tay" : "Giơ tay"}
        >
          <Hand size={20} strokeWidth={2} />
        </button>
      ) : null}

      <button type="button" className="phc-lk-leave-btn" onClick={onLeave} aria-label="Rời phòng">
        <PhoneOff size={18} strokeWidth={2.2} aria-hidden />
        Rời phòng
      </button>
    </div>
  );
}

function LocalMetadataSync({ localAvatarUrl }: { localAvatarUrl?: string | null }) {
  const { localParticipant } = useLocalParticipant();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    const url = localAvatarUrl?.trim() ?? "";
    if (!url || syncedRef.current === url) return;
    syncedRef.current = url;
    void localParticipant.setMetadata(JSON.stringify({ avatarUrl: url }));
  }, [localParticipant, localAvatarUrl]);

  return null;
}

function RoomInner({
  isHost,
  localAvatarUrl,
  onAfterLeave,
}: {
  isHost: boolean;
  localAvatarUrl?: string | null;
  onAfterLeave: () => void;
}) {
  const room = useRoomContext();
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideControlsTimer = useCallback(() => {
    if (hideControlsTimerRef.current != null) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  }, []);

  const armHideControlsTimer = useCallback(() => {
    clearHideControlsTimer();
    hideControlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      hideControlsTimerRef.current = null;
    }, 4500);
  }, [clearHideControlsTimer]);

  useEffect(() => () => clearHideControlsTimer(), [clearHideControlsTimer]);

  const showControls = useCallback(() => {
    clearHideControlsTimer();
    setControlsVisible(true);
  }, [clearHideControlsTimer]);

  const hideControls = useCallback(() => {
    clearHideControlsTimer();
    setControlsVisible(false);
  }, [clearHideControlsTimer]);

  const onStageMouseEnter = useCallback(() => {
    showControls();
  }, [showControls]);

  const onStageMouseLeave = useCallback(() => {
    hideControls();
  }, [hideControls]);

  const onStagePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "touch") return;
      showControls();
      armHideControlsTimer();
    },
    [showControls, armHideControlsTimer]
  );

  const controlsShown = controlsVisible;

  const handleLeave = useCallback(() => {
    void room.disconnect(true).finally(onAfterLeave);
  }, [room, onAfterLeave]);

  return (
    <RaiseHandProvider isHost={isHost}>
      <LocalMetadataSync localAvatarUrl={localAvatarUrl} />
      <div className="phc-lk-inner">
        <div
          className={cn("phc-lk-stage", controlsShown && "phc-lk-stage--controls-visible")}
          onMouseEnter={onStageMouseEnter}
          onMouseLeave={onStageMouseLeave}
          onPointerDown={onStagePointerDown}
        >
          <MeetConferenceLayout />
          <div
            className={cn(
              "phc-lk-toolbar-overlay",
              controlsShown && "phc-lk-toolbar-overlay--visible"
            )}
            onMouseEnter={showControls}
          >
            <MeetToolbar isHost={isHost} onLeave={handleLeave} />
          </div>
        </div>
        <RoomAudioRenderer />
      </div>
    </RaiseHandProvider>
  );
}

export default function PhongHocRoom({
  serverUrl,
  token,
  isHost,
  connect,
  localAvatarUrl,
  onConnectionLost,
}: PhongHocRoomProps) {
  const router = useRouter();

  const handleAfterLeave = useCallback(() => {
    router.push("/phong-hoc");
  }, [router]);

  const handleDisconnected = useCallback(() => {
    onConnectionLost?.();
  }, [onConnectionLost]);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={connect}
      video
      audio
      onDisconnected={handleDisconnected}
      className="phc-lk-room"
      data-lk-theme="default"
    >
      <RoomInner
        isHost={isHost}
        localAvatarUrl={localAvatarUrl}
        onAfterLeave={handleAfterLeave}
      />
    </LiveKitRoom>
  );
}
