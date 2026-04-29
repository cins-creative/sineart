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

/** Trường Daily có thể là `user_name` / `userName` / `name` (tùy bản SDK / prebuilt). */
export function parseHvIdFromDailyParticipant(part: {
  user_name?: string | null;
  userName?: string | null;
  name?: string | null;
} | null): number | null {
  if (!part) return null;
  const raw = part.user_name ?? part.userName ?? part.name;
  return parseHvIdFromDailyDisplayName(raw ?? undefined);
}

/**
 * Duyệt nông các object lồng nhau (participant Daily đôi khi có `info`, …) để tìm chuỗi chứa `#HV{id}`.
 */
export function parseHvIdFromDailyParticipantDeep(part: unknown): number | null {
  const flat = parseHvIdFromDailyParticipant(
    part as {
      user_name?: string | null;
      userName?: string | null;
      name?: string | null;
    } | null
  );
  if (flat != null) return flat;

  const walk = (o: unknown, depth: number): number | null => {
    if (depth > 8 || o === null || o === undefined) return null;
    if (typeof o === "string") return parseHvIdFromDailyDisplayName(o);
    if (typeof o !== "object") return null;
    for (const v of Object.values(o as Record<string, unknown>)) {
      const id = walk(v, depth + 1);
      if (id != null) return id;
    }
    return null;
  };
  return walk(part, 0);
}
