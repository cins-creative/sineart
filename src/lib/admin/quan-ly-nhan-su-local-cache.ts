import type {
  AdminBangTinhLuongListItem,
  AdminLopGiangDay,
  AdminNhanSuRow,
  AdminPhongOption,
} from "@/lib/data/admin-quan-ly-nhan-su";

/** Dữ liệu feed `QuanLyNhanSuView` — cache chỉ giữ tối đa `QUAN_LY_NHAN_SU_CACHE_MAX_STAFF` dòng nhân sự đầu danh sách (cùng thứ tự API). */
export type QuanLyNhanSuViewBundle = {
  staff: AdminNhanSuRow[];
  chiNhanhById: Record<number, string>;
  banById: Record<number, string>;
  phongBanByStaffId: Record<number, string>;
  phongIdsByStaffId: Record<number, number[]>;
  allPhongOptions: AdminPhongOption[];
  phongToBanId: Record<number, number>;
  banIdsByStaffId: Record<number, number[]>;
  bangTinhLuongByStaffId: Record<number, AdminBangTinhLuongListItem[]>;
  lopGiangByTeacherId: Record<number, AdminLopGiangDay[]>;
  usedMinimalSelect: boolean;
};

const STORAGE_KEY = "sineart.admin.cache.v1.quan-ly-nhan-su";
const CACHE_VERSION = 1;

export const QUAN_LY_NHAN_SU_CACHE_MAX_STAFF = 30;

type StoredEnvelope = {
  v: typeof CACHE_VERSION;
  savedAt: string;
  bundle: QuanLyNhanSuViewBundle;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function filterRecordByStaffIds<T>(
  map: Record<number, T>,
  idSet: Set<number>
): Record<number, T> {
  const out: Record<number, T> = {};
  for (const [k, v] of Object.entries(map)) {
    const id = Number(k);
    if (Number.isFinite(id) && id > 0 && idSet.has(id)) out[id] = v;
  }
  return out;
}

export function trimNhanSuBundleForStorage(bundle: QuanLyNhanSuViewBundle): QuanLyNhanSuViewBundle {
  const staff = bundle.staff.slice(0, QUAN_LY_NHAN_SU_CACHE_MAX_STAFF);
  const idSet = new Set(staff.map((s) => s.id).filter((id) => id > 0));

  return {
    staff,
    chiNhanhById: { ...bundle.chiNhanhById },
    banById: { ...bundle.banById },
    phongBanByStaffId: filterRecordByStaffIds(bundle.phongBanByStaffId, idSet),
    phongIdsByStaffId: filterRecordByStaffIds(bundle.phongIdsByStaffId, idSet),
    allPhongOptions: [...bundle.allPhongOptions],
    phongToBanId: { ...bundle.phongToBanId },
    banIdsByStaffId: filterRecordByStaffIds(bundle.banIdsByStaffId, idSet),
    bangTinhLuongByStaffId: filterRecordByStaffIds(bundle.bangTinhLuongByStaffId, idSet),
    lopGiangByTeacherId: filterRecordByStaffIds(bundle.lopGiangByTeacherId, idSet),
    usedMinimalSelect: bundle.usedMinimalSelect,
  };
}

export function readQuanLyNhanSuCache(): QuanLyNhanSuViewBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.v !== CACHE_VERSION) return null;
    if (!isRecord(parsed.bundle)) return null;
    const b = parsed.bundle as Record<string, unknown>;
    if (!Array.isArray(b.staff)) return null;
    if (!isRecord(b.chiNhanhById) || !isRecord(b.banById)) return null;
    return parsed.bundle as QuanLyNhanSuViewBundle;
  } catch {
    return null;
  }
}

export function writeQuanLyNhanSuCacheFromFullBundle(bundle: QuanLyNhanSuViewBundle): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = trimNhanSuBundleForStorage(bundle);
    const envelope: StoredEnvelope = {
      v: CACHE_VERSION,
      savedAt: new Date().toISOString(),
      bundle: trimmed,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota / private mode
  }
}
