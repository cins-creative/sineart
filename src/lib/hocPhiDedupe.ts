import type { HocPhiGoiRow } from "@/types/khoa-hoc";

/** Nhận diện gói cấp tốc theo `special` (không phân biệt hoa thường / dấu). */
export function isHocPhiCapTocSpecial(s: string | null | undefined): boolean {
  const raw = (s ?? "").trim();
  if (!raw) return false;
  const t = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  return t.includes("cap toc");
}

export function durationKey(g: Pick<HocPhiGoiRow, "number" | "don_vi">): string {
  return `${g.number}|${g.don_vi.trim().toLowerCase()}`;
}

export function sameDur(
  a: { number: number; don_vi: string },
  b: Pick<HocPhiGoiRow, "number" | "don_vi">
): boolean {
  return a.number === b.number && a.don_vi.trim() === b.don_vi.trim();
}

/** Cùng logic `HocPhiBlock` — gói hiển thị theo môn chính */
export function dedupeMon1Pills(rows: HocPhiGoiRow[]): HocPhiGoiRow[] {
  const byKey = new Map<string, HocPhiGoiRow>();
  for (const r of rows) {
    const key = durationKey(r);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, r);
      continue;
    }
    const aCombo = existing.combo_id != null;
    const bCombo = r.combo_id != null;
    if (aCombo !== bCombo) {
      byKey.set(key, aCombo ? existing : r);
      continue;
    }
    byKey.set(key, existing.id <= r.id ? existing : r);
  }
  return [...byKey.values()].sort(
    (a, b) => a.number - b.number || a.don_vi.localeCompare(b.don_vi, "vi")
  );
}
