/** Parse suffix `#HV{id}` trên Daily `userName` — khớp `ql_thong_tin_hoc_vien.id`. */
export function parseHvIdFromDailyDisplayName(userName: string | null | undefined): number | null {
  if (!userName?.trim()) return null;
  const m = /\s#HV(\d+)\s*$/.exec(userName.trim());
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}
