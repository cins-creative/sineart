import {
  clearDhpClassPickStorage,
  invalidateClassPickUnlessMatches,
} from "@/lib/donghocphi/class-pick-storage";

/** Khớp key trong prototype Framer — dùng chung NavBar + Phòng học */

export const CLASSROOM_SESSION_STORAGE_KEY = "sine_art_session";

/** Bắn sau khi ghi/xoá session — cùng tab không nhận `storage`; dùng để `ClassroomClient` cập nhật ngay. */
export const CLASSROOM_SESSION_CHANGED_EVENT = "sine_art_classroom_session_changed";

function emitClassroomSessionChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(CLASSROOM_SESSION_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export const CLASSROOM_DEBT_LIMIT_DAYS = -5;

export type ClassroomTeacherSessionData = {
  id: number;
  full_name: string;
  email: string | null;
  avatar: string;
  lop_hoc_id: number;
  class_name: string;
  class_full_name: string | null;
  class_avatar: string;
  url_class: string | null;
  /** `ql_lop_hoc.lich_hoc` */
  lich_hoc?: string;
  /** `ql_lop_hoc.meeting_room` — URL phòng họp chung */
  meeting_room?: string | null;
  so_hoc_vien: number;
};

export type ClassroomStudentSessionData = {
  id: number;
  full_name: string;
  email: string | null;
  nam_thi: number | null;
  lop_hoc_id: number;
  /** `ql_quan_ly_hoc_vien.id` (bản ghi ghi danh), không phải `ql_thong_tin_hoc_vien.id`. */
  qlhv_id: number;
  /** Ảnh đại diện học viên — `ql_thong_tin_hoc_vien.avatar` (URL, vd Cloudflare Images). */
  hv_avatar?: string;
  /** `ql_thong_tin_hoc_vien.sdt` */
  hv_sdt?: string | null;
  /** `ql_thong_tin_hoc_vien.facebook` */
  hv_facebook?: string | null;
  /** `ql_thong_tin_hoc_vien.sex` */
  hv_sex?: string | null;
  /** `ql_thong_tin_hoc_vien.ngay_bat_dau` (YYYY-MM-DD) — cache; không hiển thị như tiến độ bài tập. */
  hv_ngay_bat_dau?: string | null;
  /** `ql_thong_tin_hoc_vien.ngay_ket_thuc` — khác `ngay_ket_thuc` (kỳ học phí). */
  hv_ngay_ket_thuc?: string | null;
  class_name: string;
  class_full_name: string | null;
  url_class: string | null;
  class_avatar: string;
  /** `ql_lop_hoc.lich_hoc` */
  lich_hoc?: string;
  /** `ql_lop_hoc.meeting_room` — URL phòng họp chung */
  meeting_room?: string | null;
  teacher_name: string;
  days_remaining: number | null;
  ngay_ket_thuc: string | null;
  /** Cặp đầu (tương thích session cũ / chỗ chỉ cần một dòng). */
  truong_dai_hoc: string;
  nganh_dao_tao: string;
  /** Mọi dòng `ql_hv_truong_nganh` — nhiều trường / ngành. */
  truong_nganh_pairs?: { truong: string; nganh: string }[];
  status: string | null;
  tien_do_hoc: number | null;
  /** Nhãn từ `hv_he_thong_bai_tap` theo `tien_do_hoc` (ghi danh). */
  tien_do_bai_label?: string | null;
};

export type ClassroomSessionRecord =
  | { userType: "Teacher"; data: ClassroomTeacherSessionData }
  | { userType: "Student"; data: ClassroomStudentSessionData };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseClassroomSession(raw: string | null): ClassroomSessionRecord | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!isRecord(v)) return null;
    const ut = v.userType;
    const d = v.data;
    if ((ut === "Teacher" || ut === "Student") && isRecord(d)) {
      return v as ClassroomSessionRecord;
    }
  } catch {
    return null;
  }
  return null;
}

export function saveClassroomSession(record: ClassroomSessionRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLASSROOM_SESSION_STORAGE_KEY, JSON.stringify(record));
    emitClassroomSessionChanged();
    if (record.userType === "Student") {
      const em = String(record.data.email ?? "").trim().toLowerCase();
      invalidateClassPickUnlessMatches(em.includes("@") ? em : null);
    } else {
      invalidateClassPickUnlessMatches(null);
    }
    void syncPhongHocCookiesWithStorage();
  } catch {
    /* quota / private mode */
  }
}

export function clearClassroomSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CLASSROOM_SESSION_STORAGE_KEY);
    emitClassroomSessionChanged();
    clearDhpClassPickStorage();
    void fetch("/api/phong-hoc/clear-sync-cookies", {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      /* offline */
    });
  } catch {
    /* ignore */
  }
}

/**
 * Đồng bộ cookie httpOnly `sine_hv_sync` / `sine_gv_sync` với `sine_art_session` — SSR (vd. `/he-thong-bai-tap`)
 * không đọc được `localStorage`. Gọi sau khi ghi session, hoặc khi mount trang cần cookie.
 */
export async function syncPhongHocCookiesWithStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CLASSROOM_SESSION_STORAGE_KEY);
    const s = parseClassroomSession(raw);
    if (s?.userType === "Student") {
      const qlhv_id = s.data.qlhv_id;
      const lop_hoc_id = s.data.lop_hoc_id;
      if (Number.isFinite(qlhv_id) && Number.isFinite(lop_hoc_id)) {
        await fetch("/api/phong-hoc/sync-hv-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qlhv_id, lop_hoc_id }),
          credentials: "include",
        });
        return;
      }
    }
    if (s?.userType === "Teacher") {
      const hr_id = s.data.id;
      const lop_hoc_id = s.data.lop_hoc_id;
      if (Number.isFinite(hr_id) && hr_id > 0) {
        const payload: { hr_id: number; lop_hoc_id?: number } = { hr_id };
        if (Number.isFinite(lop_hoc_id) && lop_hoc_id > 0) {
          payload.lop_hoc_id = lop_hoc_id;
        }
        await fetch("/api/phong-hoc/sync-gv-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        return;
      }
    }
    await fetch("/api/phong-hoc/clear-sync-cookies", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* ignore */
  }
}

/**
 * Email trong session phòng học (`sine_art_session`) — khi học viên đã đăng nhập Nav (avatar menu),
 * overlay «Vào học» có thể bỏ bước nhập email và tra lớp luôn.
 */
export function readClassroomSessionEmailForPrefill(): string | null {
  if (typeof window === "undefined") return null;
  const parsed = parseClassroomSession(localStorage.getItem(CLASSROOM_SESSION_STORAGE_KEY));
  if (!parsed) return null;
  if (parsed.userType !== "Student" && parsed.userType !== "Teacher") return null;
  const em = String(parsed.data.email ?? "").trim().toLowerCase();
  return em.includes("@") ? em : null;
}
