"use client";

import PhongHocCanvasMeetOverlay from "@/components/phong-hoc/PhongHocCanvasMeetOverlay";
import PhongHocLiveKitCanvas from "@/components/phong-hoc/PhongHocLiveKitCanvas";
import PhongHocMeetTab from "@/components/phong-hoc/PhongHocMeetTab";
import { PHONG_HOC_LIVEKIT_DISABLED } from "@/lib/phong-hoc/livekit-feature-flag";
import { useState } from "react";

export type PhongHocVideoAreaProps = {
  roomName: string;
  participantName: string;
  lopHocId: number;
  isHost: boolean;
  canJoin: boolean;
  localAvatarUrl?: string | null;
  isTeacher: boolean;
  showMeetTab: boolean;
  gmeetFormOpen: boolean;
  gmeetInput: string;
  gmeetSaving: boolean;
  gmeetJustSaved: boolean;
  gmeetRowReady: boolean;
  googleMeetUrl: string | null;
  studentMeetUrl: string | null;
  onGmeetInputChange: (value: string) => void;
  onOpenGmeetForm: () => void;
  onCloseGmeetForm: () => void;
  onSaveGmeet: () => void;
  onClearGmeet: () => void;
};

type VideoTab = "livekit" | "meet";

export default function PhongHocVideoArea({
  roomName,
  participantName,
  lopHocId,
  isHost,
  canJoin,
  localAvatarUrl,
  isTeacher,
  showMeetTab,
  gmeetFormOpen,
  gmeetInput,
  gmeetSaving,
  gmeetJustSaved,
  gmeetRowReady,
  googleMeetUrl,
  studentMeetUrl,
  onGmeetInputChange,
  onOpenGmeetForm,
  onCloseGmeetForm,
  onSaveGmeet,
  onClearGmeet,
}: PhongHocVideoAreaProps) {
  const [activeTab, setActiveTab] = useState<VideoTab>("livekit");

  if (PHONG_HOC_LIVEKIT_DISABLED) {
    return (
      <>
        <div className="canvas-ph canvas-ph--livekit canvas-ph--maint-bg" aria-hidden />
        <PhongHocCanvasMeetOverlay
          isTeacher={isTeacher}
          gmeetFormOpen={gmeetFormOpen}
          gmeetInput={gmeetInput}
          gmeetSaving={gmeetSaving}
          gmeetJustSaved={gmeetJustSaved}
          gmeetRowReady={gmeetRowReady}
          googleMeetUrl={googleMeetUrl}
          studentMeetUrl={studentMeetUrl}
          onGmeetInputChange={onGmeetInputChange}
          onOpenGmeetForm={onOpenGmeetForm}
          onCloseGmeetForm={onCloseGmeetForm}
          onSaveGmeet={onSaveGmeet}
          onClearGmeet={onClearGmeet}
        />
      </>
    );
  }

  return (
    <div className="phc-video-area">
      {showMeetTab ? (
        <div className="phc-video-tabs" role="tablist" aria-label="Chọn nguồn video">
          <button
            type="button"
            role="tab"
            id="phc-tab-livekit"
            aria-selected={activeTab === "livekit"}
            aria-controls="phc-panel-livekit"
            className={[
              "phc-video-tab",
              activeTab === "livekit" && "phc-video-tab--active",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setActiveTab("livekit")}
          >
            Phòng học
          </button>
          <button
            type="button"
            role="tab"
            id="phc-tab-meet"
            aria-selected={activeTab === "meet"}
            aria-controls="phc-panel-meet"
            className={[
              "phc-video-tab",
              "phc-video-tab--secondary",
              activeTab === "meet" && "phc-video-tab--active",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setActiveTab("meet")}
          >
            Google Meet
          </button>
        </div>
      ) : null}

      <div className="phc-video-panels">
        <div
          id="phc-panel-livekit"
          role="tabpanel"
          aria-labelledby="phc-tab-livekit"
          hidden={activeTab !== "livekit"}
          className="phc-video-panel"
        >
          <PhongHocLiveKitCanvas
            roomName={roomName}
            participantName={participantName}
            lopHocId={lopHocId}
            isHost={isHost}
            canJoin={canJoin}
            localAvatarUrl={localAvatarUrl}
          />
        </div>

        {showMeetTab ? (
          <div
            id="phc-panel-meet"
            role="tabpanel"
            aria-labelledby="phc-tab-meet"
            hidden={activeTab !== "meet"}
            className="phc-video-panel"
          >
            <PhongHocMeetTab
              isTeacher={isTeacher}
              gmeetFormOpen={gmeetFormOpen}
              gmeetInput={gmeetInput}
              gmeetSaving={gmeetSaving}
              gmeetJustSaved={gmeetJustSaved}
              gmeetRowReady={gmeetRowReady}
              googleMeetUrl={googleMeetUrl}
              studentMeetUrl={studentMeetUrl}
              onGmeetInputChange={onGmeetInputChange}
              onOpenGmeetForm={onOpenGmeetForm}
              onCloseGmeetForm={onCloseGmeetForm}
              onSaveGmeet={onSaveGmeet}
              onClearGmeet={onClearGmeet}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
