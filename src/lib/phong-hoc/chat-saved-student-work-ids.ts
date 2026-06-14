/** `hv_chatbox.id` + index ảnh đã lưu sang `hv_bai_hoc_vien` (theo lớp) — client nhớ sau F5. */

const STORAGE_PREFIX = "phc_chat_saved_hv";

function storageKey(lopHocId: number): string {
  return `${STORAGE_PREFIX}:${lopHocId}`;
}

/** Khóa lưu theo tin + vị trí ảnh trong album (`photos[]`). */
export function chatPhotoSaveKey(messageId: number, photoIndex: number): string {
  return `${messageId}:${photoIndex}`;
}

function parseStoredSaveKeys(raw: unknown): Set<string> {
  const out = new Set<string>();
  if (!Array.isArray(raw)) return out;
  for (const x of raw) {
    if (typeof x === "string" && x.includes(":")) {
      out.add(x);
      continue;
    }
    const n = typeof x === "number" ? x : Number(x);
    if (Number.isFinite(n) && n > 0) {
      out.add(chatPhotoSaveKey(n, 0));
    }
  }
  return out;
}

export function readTeacherSavedChatPhotoKeys(lopHocId: number): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(lopHocId));
    if (!raw?.trim()) return new Set();
    return parseStoredSaveKeys(JSON.parse(raw) as unknown);
  } catch {
    return new Set();
  }
}

/** @deprecated Dùng `readTeacherSavedChatPhotoKeys` — giữ cho tương thích. */
export function readTeacherSavedChatMessageIds(lopHocId: number): Set<number> {
  const keys = readTeacherSavedChatPhotoKeys(lopHocId);
  const out = new Set<number>();
  for (const k of keys) {
    const id = Number(k.split(":")[0]);
    if (Number.isFinite(id) && id > 0) out.add(id);
  }
  return out;
}

export function persistTeacherSavedChatPhoto(
  lopHocId: number,
  hvChatboxMessageId: number,
  photoIndex: number
): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(lopHocId) || lopHocId <= 0) return;
  if (!Number.isFinite(hvChatboxMessageId) || hvChatboxMessageId <= 0) return;
  if (!Number.isFinite(photoIndex) || photoIndex < 0) return;
  try {
    const s = readTeacherSavedChatPhotoKeys(lopHocId);
    s.add(chatPhotoSaveKey(hvChatboxMessageId, photoIndex));
    localStorage.setItem(storageKey(lopHocId), JSON.stringify([...s].sort()));
  } catch {
    /* ignore quota / private mode */
  }
}

/** @deprecated Dùng `persistTeacherSavedChatPhoto` — tương đương index 0. */
export function persistTeacherSavedChatMessageId(lopHocId: number, hvChatboxMessageId: number): void {
  persistTeacherSavedChatPhoto(lopHocId, hvChatboxMessageId, 0);
}
