/** `hv_chatbox.id` đã lưu sang `hv_bai_hoc_vien` (theo lớp) — chỉ dùng client để nhớ sau F5. */

const STORAGE_PREFIX = "phc_chat_saved_hv";

function storageKey(lopHocId: number): string {
  return `${STORAGE_PREFIX}:${lopHocId}`;
}

export function readTeacherSavedChatMessageIds(lopHocId: number): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(lopHocId));
    if (!raw?.trim()) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    const out = new Set<number>();
    for (const x of arr) {
      const n = typeof x === "number" ? x : Number(x);
      if (Number.isFinite(n) && n > 0) out.add(n);
    }
    return out;
  } catch {
    return new Set();
  }
}

export function persistTeacherSavedChatMessageId(lopHocId: number, hvChatboxMessageId: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(lopHocId) || lopHocId <= 0) return;
  if (!Number.isFinite(hvChatboxMessageId) || hvChatboxMessageId <= 0) return;
  try {
    const s = readTeacherSavedChatMessageIds(lopHocId);
    s.add(hvChatboxMessageId);
    localStorage.setItem(storageKey(lopHocId), JSON.stringify([...s].sort((a, b) => a - b)));
  } catch {
    /* ignore quota / private mode */
  }
}
