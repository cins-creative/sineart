export type RaiseHandPayload = {
  type: "raise_hand";
  participantId: string;
  raised: boolean;
};

export function parseRaiseHandPayload(raw: Uint8Array): RaiseHandPayload | null {
  try {
    const msg = JSON.parse(new TextDecoder().decode(raw)) as unknown;
    if (
      typeof msg === "object" &&
      msg != null &&
      (msg as RaiseHandPayload).type === "raise_hand" &&
      typeof (msg as RaiseHandPayload).participantId === "string" &&
      typeof (msg as RaiseHandPayload).raised === "boolean"
    ) {
      return msg as RaiseHandPayload;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function encodeRaiseHandPayload(payload: RaiseHandPayload): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

/** Âm thanh ngắn (~0.4s) cho GV khi học viên giơ tay — Web Audio API. */
export function playRaiseHandChime(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(740, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
    osc.onended = () => void ctx.close();
  } catch {
    /* autoplay / unsupported */
  }
}

export function isHostIdentity(identity: string): boolean {
  return identity.startsWith("gv-");
}

export function parseParticipantAvatar(metadata: string | undefined): string | null {
  if (!metadata?.trim()) return null;
  try {
    const j = JSON.parse(metadata) as { avatarUrl?: unknown };
    const url = j.avatarUrl;
    if (typeof url === "string" && url.trim()) return url.trim();
  } catch {
    /* plain url fallback */
    if (metadata.startsWith("http")) return metadata.trim();
  }
  return null;
}

export function participantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
