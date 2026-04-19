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

/**
 * Nhóm `mon1Gois` theo `post_title` (đã dedup từng nhóm).
 * Nhóm có `post_title` rỗng/null đứng đầu; các nhóm còn lại theo thứ tự xuất hiện.
 */
export function groupMon1ByPostTitle(
  rows: HocPhiGoiRow[],
): Array<{ postTitle: string; pills: HocPhiGoiRow[] }> {
  const order: string[] = [];
  const map = new Map<string, HocPhiGoiRow[]>();
  for (const r of rows) {
    const key = (r.post_title ?? "").trim();
    if (!map.has(key)) {
      order.push(key);
      map.set(key, []);
    }
    map.get(key)!.push(r);
  }
  // Nhóm rỗng lên đầu, rồi theo thứ tự gặp lần đầu
  const sorted = [...order].sort((a, b) => {
    if (!a && b) return -1;
    if (a && !b) return 1;
    return 0;
  });
  return sorted.map((postTitle) => ({
    postTitle,
    pills: dedupeMon1Pills(map.get(postTitle)!),
  }));
}
