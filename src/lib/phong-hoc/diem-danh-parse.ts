/** Parse suffix `#HV{id}` trên Daily `user_name` / `userName` — khớp `ql_thong_tin_hoc_vien.id`. */
export function parseHvIdFromDailyDisplayName(userName: string | null | undefined): number | null {
  if (!userName?.trim()) return null;
  const s = userName.trim();
  const tryMatch = (re: RegExp): number | null => {
    const m = re.exec(s);
    if (!m) return null;
    const id = Number(m[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  };
  return (
    tryMatch(/\s#HV(\d+)\s*$/i) ??
    tryMatch(/#HV(\d+)\s*$/i) ??
    tryMatch(/\[HV(\d+)\]\s*$/i)
  );
}

/** Trường Daily có thể là `user_name` hoặc `userName` (SDK). */
export function parseHvIdFromDailyParticipant(part: {
  user_name?: string | null;
  userName?: string | null;
} | null): number | null {
  if (!part) return null;
  const raw = part.user_name ?? part.userName;
  return parseHvIdFromDailyDisplayName(raw ?? undefined);
}
