import type {
  AdminQlhvBaiTapBrief,
  AdminQlhvEnrollment,
  AdminQlhvLopBrief,
  AdminQlhvStudent,
  AdminQlhvTruongNganhItem,
} from "@/lib/data/admin-quan-ly-hoc-vien";

/** Cùng shape dữ liệu feed vào `QuanLyHocVienView` — cache chỉ giữ tối đa `QUAN_LY_HOC_VIEN_CACHE_MAX_STUDENTS` học viên mới nhất. */
export type QuanLyHocVienViewBundle = {
  students: AdminQlhvStudent[];
  enrollments: AdminQlhvEnrollment[];
  lopById: Record<string, AdminQlhvLopBrief>;
  baiTapById: Record<string, AdminQlhvBaiTapBrief>;
  truongNganhByHvId: Record<string, AdminQlhvTruongNganhItem[]>;
};

const STORAGE_KEY = "sineart.admin.cache.v1.quan-ly-hoc-vien";
const CACHE_VERSION = 1;

/** Per `LOCALSTORAGE_CACHE_BRIEF.md` — tối đa học viên (mới nhất) ghi vào `localStorage`. */
export const QUAN_LY_HOC_VIEN_CACHE_MAX_STUDENTS = 30;

type StoredEnvelope = {
  v: typeof CACHE_VERSION;
  savedAt: string;
  bundle: QuanLyHocVienViewBundle;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function trimBundleForStorage(bundle: QuanLyHocVienViewBundle): QuanLyHocVienViewBundle {
  const students = bundle.students.slice(0, QUAN_LY_HOC_VIEN_CACHE_MAX_STUDENTS);
  const idSet = new Set(students.map((s) => s.id));
  const enrollments = bundle.enrollments.filter((e) => idSet.has(e.hoc_vien_id));

  const truongNganhByHvId: Record<string, AdminQlhvTruongNganhItem[]> = {};
  for (const s of students) {
    const k = String(s.id);
    const rows = bundle.truongNganhByHvId[k];
    if (rows?.length) truongNganhByHvId[k] = rows;
  }

  const tienDoIds = new Set<number>();
  for (const e of enrollments) {
    if (e.tien_do_hoc != null && e.tien_do_hoc > 0) tienDoIds.add(e.tien_do_hoc);
  }
  const baiTapById: Record<string, AdminQlhvBaiTapBrief> = {};
  for (const id of tienDoIds) {
    const key = String(id);
    const row = bundle.baiTapById[key];
    if (row) baiTapById[key] = row;
  }

  return {
    students,
    enrollments,
    lopById: { ...bundle.lopById },
    baiTapById,
    truongNganhByHvId,
  };
}

/** Đọc cache đã trim — an toàn khi parse lỗi / quota / private mode. */
export function readQuanLyHocVienCache(): QuanLyHocVienViewBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.v !== CACHE_VERSION) return null;
    if (!isRecord(parsed.bundle)) return null;
    const b = parsed.bundle as Record<string, unknown>;
    if (!Array.isArray(b.students) || !Array.isArray(b.enrollments)) return null;
    if (!isRecord(b.lopById) || !isRecord(b.baiTapById) || !isRecord(b.truongNganhByHvId)) return null;
    return parsed.bundle as QuanLyHocVienViewBundle;
  } catch {
    return null;
  }
}

export function writeQuanLyHocVienCacheFromFullBundle(bundle: QuanLyHocVienViewBundle): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = trimBundleForStorage(bundle);
    const envelope: StoredEnvelope = {
      v: CACHE_VERSION,
      savedAt: new Date().toISOString(),
      bundle: trimmed,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota / private mode — bỏ qua
  }
}
