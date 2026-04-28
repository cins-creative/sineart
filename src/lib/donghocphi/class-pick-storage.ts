/** `donghocphi` — lưu lớp đã chọn theo email; key phải khớp `payment-client.tsx` cũ. */
export const DHP_CLASS_PICK_STORAGE_KEY = "sineart.dhp.classPick.v1";

export type DhpStoredClassPickV1 = {
  v: 1;
  emailNorm: string;
  classIds: number[];
  feeByClassId: Record<string, number>;
  skipRenewalByClassId?: Record<string, boolean>;
};

export function readDhpStoredPickRaw(): DhpStoredClassPickV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DHP_CLASS_PICK_STORAGE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as DhpStoredClassPickV1;
    if (j.v !== 1 || typeof j.emailNorm !== "string" || !Array.isArray(j.classIds)) return null;
    return j;
  } catch {
    return null;
  }
}

export function writeDhpClassPickToStorage(
  emailNorm: string,
  selectedClassIds: number[],
  feeByClassId: Record<number, number>,
  skipRenewalByClassId: Record<number, boolean>
): void {
  if (typeof window === "undefined") return;
  try {
    const feeStr: Record<string, number> = {};
    for (const id of selectedClassIds) {
      const v = feeByClassId[id];
      if (v != null) feeStr[String(id)] = v;
    }
    const skipStr: Record<string, boolean> = {};
    for (const id of selectedClassIds) {
      if (skipRenewalByClassId[id]) skipStr[String(id)] = true;
    }
    const payload: DhpStoredClassPickV1 = {
      v: 1,
      emailNorm,
      classIds: selectedClassIds,
      feeByClassId: feeStr,
      skipRenewalByClassId: Object.keys(skipStr).length ? skipStr : undefined,
    };
    localStorage.setItem(DHP_CLASS_PICK_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearDhpClassPickStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DHP_CLASS_PICK_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Xóa `classPick` khi đăng xuất / không còn email HV hợp lệ, hoặc khi email HV đổi
 * (đăng nhập tài khoản khác) — tránh giữ `emailNorm` + lớp của user trước.
 */
export function invalidateClassPickUnlessMatches(canonicalEmailNorm: string | null): void {
  if (!canonicalEmailNorm) {
    clearDhpClassPickStorage();
    return;
  }
  const raw = readDhpStoredPickRaw();
  if (!raw) return;
  if (raw.emailNorm.trim().toLowerCase() !== canonicalEmailNorm.trim().toLowerCase()) {
    clearDhpClassPickStorage();
  }
}
