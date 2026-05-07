"use client";

import HocVienAvatarEditor, {
  AVATAR_MAX_BYTES,
} from "@/components/hoc-vien/HocVienAvatarEditor";
import LuuBaiHocVienFab from "@/app/_components/LuuBaiHocVienFab";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CalendarDays, Clock, GraduationCap, Palette, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  hocVienProfileHref,
  type HvpProfileSection,
  normalizeEmailProfileSegment,
  normalizeStudentEmail,
} from "@/lib/hoc-vien/profile-url";
import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  CLASSROOM_SESSION_CHANGED_EVENT,
  CLASSROOM_SESSION_STORAGE_KEY,
  clearClassroomSession,
  parseClassroomSession,
  saveClassroomSession,
  type ClassroomSessionRecord,
  type ClassroomStudentSessionData,
} from "@/lib/phong-hoc/classroom-session";
import { cfImageForLightbox, cfImageForThumbnail } from "@/lib/cfImageUrl";
import { postUploadChatImage } from "@/lib/chat-image-upload-client";
import { buildHeThongBaiTapHref } from "@/lib/he-thong-bai-tap/slug";
import {
  classroomGalleryEmoji,
  fetchClassroomGalleryForStudentHv,
  fetchEnrolledMonHocForStudent,
  type EnrolledMonOption,
  type StudentProfileGalleryRow,
} from "@/lib/phong-hoc/classroom-gallery";
import { lopClassNameIndicatesTaiLop } from "@/lib/data/htbt-tai-lop-class-name";
import {
  curriculumProgressIndex,
  fetchCurriculumExercisesForMonHocId,
  fetchLopCurriculumExercises,
  formatLessonLabel,
  type LopCurriculumExercise,
} from "@/lib/phong-hoc/lop-curriculum";
import { fetchAllClassSessionsForStudentHv } from "@/lib/phong-hoc/lookup-by-email";
import "../../donghocphi/donghocphi.css";
import "./profile.css";

type HvpAssignmentExerciseRow = {
  exercise: LopCurriculumExercise;
  listIndex: number;
  unlocked: boolean;
};

type HvpAssignmentsClassBlock = {
  qlhvId: number;
  lopHocId: number;
  classTitle: string;
  subjectName: string | null;
  monHocId: number | null;
  /** Chỉ số bài đang mở (cùng `curriculumProgressIndex`); -1 nếu chưa gán */
  progressIdx: number;
  capTocUnlockAll: boolean;
  /** Tên lớp có «tại lớp» hoặc «Offline» — mở toàn bộ bài giảng */
  taiLopUnlockByClassName: boolean;
  rows: HvpAssignmentExerciseRow[];
};

type HvpAssignmentsMonGroup = {
  key: string;
  monHocId: number | null;
  label: string;
  blocks: HvpAssignmentsClassBlock[];
};

function groupAssignmentBlocksByMon(blocks: HvpAssignmentsClassBlock[]): HvpAssignmentsMonGroup[] {
  const byKey = new Map<string, HvpAssignmentsClassBlock[]>();
  for (const b of blocks) {
    const monId = b.monHocId;
    const key =
      monId != null && Number.isFinite(monId) && monId > 0
        ? `mon:${monId}`
        : `subj:${(b.subjectName ?? "môn-khác").trim().toLowerCase() || "none"}:${b.lopHocId}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(b);
  }
  return [...byKey.entries()]
    .map(([key, bls]) => {
      const first = bls[0];
      return {
        key,
        monHocId: first?.monHocId ?? null,
        label: first?.subjectName?.trim() || "Môn học",
        blocks: bls,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

/** Theo cột scalar `hv_he_thong_bai_tap.mon_hoc` (tên từ `ql_mon_hoc`). */
function distinctScalarMonFilterOptions(rows: HvpAssignmentExerciseRow[]): { id: number; label: string }[] {
  const map = new Map<number, string>();
  for (const r of rows) {
    const mid = r.exercise.mon_hoc;
    if (mid == null || !Number.isFinite(mid) || mid <= 0) continue;
    const label = r.exercise.ten_mon_hoc_goc?.trim() || `Môn #${mid}`;
    if (!map.has(mid)) map.set(mid, label);
  }
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

function filterAssignmentRowsByScalarMon(
  rows: HvpAssignmentExerciseRow[],
  scalarMonId: number | null,
): HvpAssignmentExerciseRow[] {
  if (scalarMonId == null) return rows;
  return rows.filter((r) => r.exercise.mon_hoc === scalarMonId);
}

const SEX_OPTIONS = ["Nam", "Nữ", "Khác"] as const;
const LOAI_KHOA_HOC_OPTIONS = ["Luyện thi", "Digital", "Kids", "Bổ trợ"] as const;

function namThiSelectValues(): { label: string; value: string }[] {
  const y = new Date().getFullYear();
  const years: { label: string; value: string }[] = [];
  for (let i = -1; i <= 3; i += 1) {
    years.push({ label: String(y + i), value: String(y + i) });
  }
  years.push({ label: "Chưa thi", value: "" });
  return years;
}

function sexFromProfile(raw: string | null | undefined): string {
  if (!raw?.trim()) return SEX_OPTIONS[0];
  const s = raw.trim();
  return (SEX_OPTIONS as readonly string[]).includes(s) ? s : SEX_OPTIONS[0];
}

type HvProfileForm = {
  full_name: string;
  hv_sdt: string;
  hv_facebook: string;
  nam_thi: string;
  hv_sex: string;
  loai_khoa_hoc: string;
};

function emptyForm(): HvProfileForm {
  return {
    full_name: "",
    hv_sdt: "",
    hv_facebook: "",
    nam_thi: "",
    hv_sex: SEX_OPTIONS[0],
    loai_khoa_hoc: "Luyện thi",
  };
}

function formFromStudent(s: ClassroomStudentSessionData): HvProfileForm {
  return {
    full_name: s.full_name,
    hv_sdt: s.hv_sdt ?? "",
    hv_facebook: s.hv_facebook ?? "",
    nam_thi: s.nam_thi != null ? String(s.nam_thi) : "",
    hv_sex: sexFromProfile(s.hv_sex),
    loai_khoa_hoc: "Luyện thi",
  };
}

function formatDateVi(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function isoDatePart(v: string | null | undefined): string | null {
  if (!v?.trim()) return null;
  const s = v.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Ngày từ DB (date hoặc timestamptz) → hiển thị dd/mm/yyyy */
function formatDateViLoose(iso: string | null | undefined): string {
  const part = isoDatePart(iso);
  return part != null ? formatDateVi(part) : "—";
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));
}

function studyDurationViFromYmd(startYmd: string | null): string {
  if (!startYmd || !/^\d{4}-\d{2}-\d{2}$/.test(startYmd)) return "—";
  const start = new Date(`${startYmd}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const ms = today.getTime() - start.getTime();
  if (ms < 0) return "—";
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "Dưới 1 ngày";
  if (days < 60) return `${days} ngày`;
  const months = Math.floor(days / 30);
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} năm`);
  if (m > 0) parts.push(`${m} tháng`);
  if (parts.length === 0) parts.push(`${days} ngày`);
  return parts.join(", ");
}

type HvProfileMeta = {
  ngay_bat_dau: string | null;
  created_at: string | null;
};

type PaidInvoiceRow = {
  id: number;
  ma_don: string | null;
  ma_don_so: string | null;
  ngay_thanh_toan: string | null;
};

type PaidInvoiceDetailPayload = {
  don: {
    id: number;
    ma_don_so: string | null;
    ma_don: string | null;
    ngay_thanh_toan: string | null;
    giam_gia_dong: number;
    giam_gia_vnd_dong: number;
    hinh_thuc_thu: string | null;
    status: string;
  };
  lines: Array<{
    label: string;
    package_label: string;
    amount_dong: number;
    ngay_dau_ky: string | null;
    ngay_cuoi_ky: string | null;
  }>;
  total_dong: number;
};

type InvoiceDetailModal =
  | { phase: "loading"; donId: number }
  | { phase: "ok"; detail: PaidInvoiceDetailPayload }
  | { phase: "err"; message: string };

function invoiceDisplayCode(r: PaidInvoiceRow): string {
  const a = r.ma_don_so?.trim();
  if (a) return a;
  const b = r.ma_don?.trim();
  if (b) return b;
  return `Đơn #${r.id}`;
}

function invoiceTitleFromDon(don: PaidInvoiceDetailPayload["don"]): string {
  const a = don.ma_don_so?.trim();
  if (a) return a;
  const b = don.ma_don?.trim();
  if (b) return b;
  return `Đơn #${don.id}`;
}

/** Tooltip: số ngày hồ sơ / phòng học chỉ theo kỳ đã thanh toán — khác «Tổng buổi sau gia hạn» khi cộng gói chưa TT ở bước 3. */
const HVP_DAYS_REMAINING_PAID_ONLY_TITLE =
  "Theo các đơn học phí đã thanh toán (cộng dồn buổi). Ở bước thanh toán trên trang Đóng học phí, số buổi có thể cộng thêm gói bạn đang chọn nhưng chưa thanh toán.";

/** Badge «Còn N ngày» cùng token với `dhp-oc-badge` (bước chọn lớp đóng học phí). */
function daysRemainingDhpBadge(days: number | null): { className: string; label: string } {
  if (days === null) {
    return { className: "dhp-oc-badge dhp-oc-badge--full", label: "Còn lại: —" };
  }
  if (days <= 0) {
    return { className: "dhp-oc-badge dhp-oc-badge--full", label: "Hết hạn kỳ học phí" };
  }
  if (days <= 7) {
    return { className: "dhp-oc-badge dhp-oc-badge--almost", label: `Còn ${days} ngày` };
  }
  return { className: "dhp-oc-badge dhp-oc-badge--open", label: `Còn ${days} ngày` };
}

export default function HocVienProfileClient({
  profileEmail,
  section,
}: {
  profileEmail: string;
  section: HvpProfileSection;
}) {
  const [session, setSession] = useState<ClassroomSessionRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<HvProfileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  /** `null` = đang tải tab Lớp học */
  const [allClassRows, setAllClassRows] = useState<ClassroomStudentSessionData[] | null>(null);
  /** `null` = đang tải tab Bài vẽ */
  const [artworks, setArtworks] = useState<StudentProfileGalleryRow[] | null>(null);
  const [enrolledMonOptions, setEnrolledMonOptions] = useState<EnrolledMonOption[]>([]);
  const [artMonFilter, setArtMonFilter] = useState<"all" | number>("all");
  const [artLightboxHvId, setArtLightboxHvId] = useState<number | null>(null);
  const [unenrollModal, setUnenrollModal] = useState<ClassroomStudentSessionData | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);
  /** `undefined` = đang tải meta từ Supabase */
  const [hvMeta, setHvMeta] = useState<HvProfileMeta | undefined>(undefined);
  /** `null` = đang tải đơn đã thanh toán */
  const [paidInvoices, setPaidInvoices] = useState<PaidInvoiceRow[] | null>(null);
  const [paidInvoicesErr, setPaidInvoicesErr] = useState(false);
  const [invoiceDetailModal, setInvoiceDetailModal] = useState<InvoiceDetailModal | null>(null);
  /** `null` = đang tải tab Hệ thống bài tập */
  const [assignmentsBlocks, setAssignmentsBlocks] = useState<HvpAssignmentsClassBlock[] | null>(null);
  const [assignmentsMonKey, setAssignmentsMonKey] = useState<string | null>(null);
  /** Lọc theo `hv_he_thong_bai_tap.mon_hoc` trong từng khối lớp (`qlhvId`). `null` = tất cả. */
  const [assignmentsScalarMonByQlhv, setAssignmentsScalarMonByQlhv] = useState<Record<number, number | null>>(
    {},
  );
  const [assignmentsOpenExId, setAssignmentsOpenExId] = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      setSession(parseClassroomSession(localStorage.getItem(CLASSROOM_SESSION_STORAGE_KEY)));
      setReady(true);
    };

    read();
    window.addEventListener(CLASSROOM_SESSION_CHANGED_EVENT, read);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLASSROOM_SESSION_STORAGE_KEY || e.key === null) read();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CLASSROOM_SESSION_CHANGED_EVENT, read);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const pathEmail = normalizeEmailProfileSegment(profileEmail);
  const isStudent = session?.userType === "Student";
  const sessionEmail = isStudent ? normalizeStudentEmail(session.data.email) : "";
  const emailMatches = Boolean(isStudent && sessionEmail && sessionEmail === pathEmail);
  const selfStudent = emailMatches && session?.userType === "Student" ? session.data : null;

  const sessionRev = useMemo(() => {
    if (session?.userType !== "Student") return "";
    return JSON.stringify(session.data);
  }, [session]);

  useEffect(() => {
    if (!selfStudent) return;
    setForm(formFromStudent(selfStudent));
    setSaveMsg(null);
  }, [sessionRev]);

  useEffect(() => {
    if (!selfStudent || section !== "thong-tin") {
      if (!selfStudent) {
        setHvMeta(undefined);
        setPaidInvoices(null);
        setPaidInvoicesErr(false);
      }
      return;
    }
    let cancelled = false;
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setHvMeta({ ngay_bat_dau: null, created_at: null });
      setPaidInvoices([]);
      setPaidInvoicesErr(true);
      return;
    }

    setHvMeta(undefined);
    setPaidInvoices(null);
    setPaidInvoicesErr(false);

    const emailNorm = (selfStudent.email ?? "").trim().toLowerCase();
    const hvId = selfStudent.id;

    void (async () => {
      const invPromise = emailNorm
        ? fetch("/api/hoc-vien/paid-invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hoc_vien_id: hvId, email: emailNorm }),
          }).then(async (r) => {
            const json = (await r.json().catch(() => ({}))) as {
              ok?: boolean;
              invoices?: PaidInvoiceRow[];
              error?: string;
            };
            return { ok: r.ok && json.ok === true, invoices: json.invoices };
          })
        : Promise.resolve({ ok: true as const, invoices: [] as PaidInvoiceRow[] });

      const [{ data, error }, invWrap] = await Promise.all([
        sb
          .from("ql_thong_tin_hoc_vien")
          .select("loai_khoa_hoc, ngay_bat_dau, created_at")
          .eq("id", hvId)
          .maybeSingle(),
        invPromise,
      ]);

      if (cancelled) return;

      if (!error && data) {
        const d = data as {
          loai_khoa_hoc?: unknown;
          ngay_bat_dau?: unknown;
          created_at?: unknown;
        };
        const rawLoai = String(d.loai_khoa_hoc ?? "").trim();
        setForm((f) => ({
          ...f,
          loai_khoa_hoc: rawLoai || "Luyện thi",
        }));
        setHvMeta({
          ngay_bat_dau: isoDatePart(String(d.ngay_bat_dau ?? "")),
          created_at: d.created_at != null ? String(d.created_at) : null,
        });
      } else {
        setHvMeta({ ngay_bat_dau: null, created_at: null });
      }

      if (invWrap.ok && Array.isArray(invWrap.invoices)) {
        setPaidInvoices(invWrap.invoices);
        setPaidInvoicesErr(false);
      } else {
        setPaidInvoices([]);
        setPaidInvoicesErr(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [section, selfStudent?.id, selfStudent?.email]);

  useEffect(() => {
    if (section !== "lop-hoc" || !selfStudent) return;
    let cancelled = false;
    const hvSnapshot = selfStudent;
    setAllClassRows(null);
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      if (!cancelled) setAllClassRows([hvSnapshot]);
      return;
    }
    void fetchAllClassSessionsForStudentHv(sb, hvSnapshot.id, {
      preferQlhvId: hvSnapshot.qlhv_id,
    })
      .then((rows) => {
        if (cancelled) return;
        setAllClassRows(rows.length > 0 ? rows : [hvSnapshot]);
      })
      .catch(() => {
        if (!cancelled) setAllClassRows([hvSnapshot]);
      });
    return () => {
      cancelled = true;
    };
  }, [section, selfStudent?.id]);

  useEffect(() => {
    if (section !== "bai-ve" || !selfStudent) return;
    let cancelled = false;
    const hvId = selfStudent.id;
    setArtworks(null);
    setEnrolledMonOptions([]);
    setArtMonFilter("all");
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      if (!cancelled) setArtworks([]);
      return;
    }
    void Promise.all([fetchClassroomGalleryForStudentHv(sb, hvId), fetchEnrolledMonHocForStudent(sb, hvId)])
      .then(([rows, mons]) => {
        if (cancelled) return;
        setArtworks(rows);
        setEnrolledMonOptions(mons);
      })
      .catch(() => {
        if (!cancelled) {
          setArtworks([]);
          setEnrolledMonOptions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [section, selfStudent?.id]);

  useEffect(() => {
    if (section !== "he-thong-bai-tap" || !selfStudent) return;
    let cancelled = false;
    const hvId = selfStudent.id;
    setAssignmentsBlocks(null);
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      if (!cancelled) setAssignmentsBlocks([]);
      return;
    }
    void (async () => {
      const { data: mkt } = await sb
        .from("mkt_home_content")
        .select("htbt_cap_toc")
        .eq("id", 1)
        .maybeSingle();
      if (cancelled) return;
      const capToc = (mkt as { htbt_cap_toc?: unknown } | null)?.htbt_cap_toc === true;
      const classRows = await fetchAllClassSessionsForStudentHv(sb, hvId, {
        preferQlhvId: selfStudent.qlhv_id,
      });
      if (cancelled) return;
      const blocks: HvpAssignmentsClassBlock[] = [];
      for (const row of classRows) {
        try {
          const { exercises, subjectName, monHocId } = await fetchLopCurriculumExercises(
            sb,
            row.lop_hoc_id
          );
          const taiLopUnlockByClassName = lopClassNameIndicatesTaiLop(
            row.class_full_name,
            row.class_name
          );
          const progressIdx = curriculumProgressIndex(exercises, row.tien_do_hoc);
          const unlockAll = capToc || taiLopUnlockByClassName;
          const rows: HvpAssignmentExerciseRow[] = exercises.map((ex, i) => {
            const unlocked = unlockAll || (progressIdx >= 0 && i <= progressIdx);
            return {
              exercise: ex,
              listIndex: i,
              unlocked,
            };
          });
          blocks.push({
            qlhvId: row.qlhv_id,
            lopHocId: row.lop_hoc_id,
            classTitle: row.class_full_name?.trim() || row.class_name || "—",
            subjectName,
            monHocId: monHocId != null && Number.isFinite(monHocId) ? monHocId : null,
            progressIdx,
            capTocUnlockAll: capToc,
            taiLopUnlockByClassName,
            rows,
          });
        } catch {
          /* bỏ qua lớp lỗi tải chương trình */
        }
      }

      /* Khóa «Luyện thi»: mở full toàn bộ môn `ql_mon_hoc.loai_khoa_hoc = Luyện thi` chưa có từ ghi danh (vd. chưa có qlhv / lớp). */
      const { data: hvLoai } = await sb
        .from("ql_thong_tin_hoc_vien")
        .select("loai_khoa_hoc")
        .eq("id", hvId)
        .maybeSingle();
      if (cancelled) return;
      const loaiKhoa = String(
        (hvLoai as { loai_khoa_hoc?: unknown } | null)?.loai_khoa_hoc ?? ""
      ).trim();
      if (loaiKhoa === "Luyện thi") {
        const coveredMon = new Set(
          blocks
            .map((b) => b.monHocId)
            .filter((m): m is number => m != null && Number.isFinite(m) && m > 0)
        );
        const { data: monRows } = await sb
          .from("ql_mon_hoc")
          .select("id")
          .eq("loai_khoa_hoc", "Luyện thi")
          .order("thu_tu_hien_thi", { ascending: true });
        if (cancelled) return;
        for (const mr of monRows ?? []) {
          const mid = Number((mr as { id?: unknown }).id);
          if (!Number.isFinite(mid) || mid <= 0 || coveredMon.has(mid)) continue;
          try {
            const { exercises, subjectName, monHocId } = await fetchCurriculumExercisesForMonHocId(sb, mid);
            if (exercises.length === 0) continue;
            coveredMon.add(mid);
            const progressIdx = exercises.length - 1;
            const syntheticRows: HvpAssignmentExerciseRow[] = exercises.map((ex, i) => ({
              exercise: ex,
              listIndex: i,
              unlocked: true,
            }));
            const titleBase = subjectName?.trim() || "Môn";
            blocks.push({
              qlhvId: selfStudent.qlhv_id,
              lopHocId: 0,
              classTitle: `${titleBase} — Luyện thi tại lớp`,
              subjectName,
              monHocId: monHocId != null && Number.isFinite(monHocId) ? monHocId : null,
              progressIdx,
              capTocUnlockAll: capToc,
              taiLopUnlockByClassName: true,
              rows: syntheticRows,
            });
          } catch {
            /* bỏ qua môn lỗi */
          }
        }
      }

      if (!cancelled) setAssignmentsBlocks(blocks);
    })();
    return () => {
      cancelled = true;
    };
  }, [section, selfStudent?.id]);

  useEffect(() => {
    if (section !== "bai-ve") setArtLightboxHvId(null);
  }, [section]);

  /** Thanh flash (tab Lớp / Bài vẽ) và dòng trạng thái form tab Thông tin — tự tắt sau 5s. */
  useEffect(() => {
    if (saveMsg == null) return;
    const id = window.setTimeout(() => setSaveMsg(null), 5000);
    return () => window.clearTimeout(id);
  }, [saveMsg]);

  useEffect(() => {
    if (invoiceDetailModal == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInvoiceDetailModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [invoiceDetailModal]);

  const filteredArtworks = useMemo(() => {
    if (!artworks?.length) return [];
    if (artMonFilter === "all") return artworks;
    return artworks.filter((a) => a.monHocId != null && a.monHocId === artMonFilter);
  }, [artworks, artMonFilter]);

  const assignmentsMonGroups = useMemo(
    () => (assignmentsBlocks?.length ? groupAssignmentBlocksByMon(assignmentsBlocks) : []),
    [assignmentsBlocks],
  );

  const activeAssignmentsMonGroup =
    assignmentsMonGroups.find((g) => g.key === assignmentsMonKey) ?? assignmentsMonGroups[0] ?? null;

  useEffect(() => {
    if (!assignmentsMonGroups.length) {
      setAssignmentsMonKey(null);
      return;
    }
    setAssignmentsMonKey((prev) =>
      prev != null && assignmentsMonGroups.some((g) => g.key === prev)
        ? prev
        : assignmentsMonGroups[0]!.key
    );
  }, [assignmentsMonGroups]);

  useEffect(() => {
    setAssignmentsScalarMonByQlhv({});
    setAssignmentsOpenExId(null);
  }, [assignmentsMonKey]);

  useEffect(() => {
    if (section !== "he-thong-bai-tap") setAssignmentsOpenExId(null);
  }, [section]);

  const artLightboxItem = useMemo(
    () => (artworks != null && artLightboxHvId != null ? artworks.find((x) => x.hvId === artLightboxHvId) ?? null : null),
    [artworks, artLightboxHvId],
  );

  const namThiOptions = useMemo(() => namThiSelectValues(), []);

  const wrongStudentSession =
    session?.userType === "Student" && sessionEmail && sessionEmail !== pathEmail ? session : null;
  const myProfileHref = wrongStudentSession ? hocVienProfileHref(wrongStudentSession.data.email) : null;

  const saveProfile = useCallback(async () => {
    if (!selfStudent || !session || session.userType !== "Student") return;
    const name = form.full_name.trim();
    if (name.length < 2) {
      setSaveMsg({ kind: "err", text: "Vui lòng nhập họ tên hợp lệ." });
      return;
    }
    const sb = createBrowserSupabaseClient();
    if (!sb) {
      setSaveMsg({ kind: "err", text: "Chưa cấu hình kết nối dữ liệu." });
      return;
    }
    let namThi: number | null = null;
    if (form.nam_thi.trim() !== "") {
      const n = Number(form.nam_thi.trim());
      if (!Number.isFinite(n)) {
        setSaveMsg({ kind: "err", text: "Năm thi không hợp lệ." });
        return;
      }
      namThi = Math.round(n);
    }
    setSaving(true);
    setSaveMsg(null);
    const { error } = await sb
      .from("ql_thong_tin_hoc_vien")
      .update({
        full_name: name,
        sdt: form.hv_sdt.trim() || null,
        facebook: form.hv_facebook.trim() || null,
        nam_thi: namThi,
        sex: form.hv_sex.trim() || null,
        loai_khoa_hoc: form.loai_khoa_hoc.trim() || null,
      })
      .eq("id", selfStudent.id);
    setSaving(false);
    if (error) {
      setSaveMsg({ kind: "err", text: error.message || "Không lưu được. Thử lại sau." });
      return;
    }
    const nextData: ClassroomStudentSessionData = {
      ...selfStudent,
      full_name: name,
      hv_sdt: form.hv_sdt.trim() || null,
      hv_facebook: form.hv_facebook.trim() || null,
      nam_thi: namThi,
      hv_sex: form.hv_sex.trim() || null,
    };
    saveClassroomSession({ userType: "Student", data: nextData });
    setSaveMsg({ kind: "ok", text: "Đã lưu thay đổi." });
  }, [form, selfStudent, session]);

  const handleAvatarFile = useCallback(
    async (file: File) => {
      if (!selfStudent || session?.userType !== "Student") return;
      if (!file.type.startsWith("image/")) {
        setSaveMsg({ kind: "err", text: "Vui lòng chọn file ảnh (JPEG, PNG, …)." });
        return;
      }
      if (file.size > AVATAR_MAX_BYTES) {
        setSaveMsg({ kind: "err", text: "Ảnh tối đa 8 MB." });
        return;
      }
      setAvatarUploading(true);
      setSaveMsg(null);
      try {
        const j = await postUploadChatImage(file);
        if (!j.ok) {
          throw new Error(j.error);
        }
        const sb = createBrowserSupabaseClient();
        if (!sb) throw new Error("Chưa cấu hình kết nối dữ liệu.");
        const { error } = await sb
          .from("ql_thong_tin_hoc_vien")
          .update({ avatar: j.url })
          .eq("id", selfStudent.id);
        if (error) throw error;
        const nextData: ClassroomStudentSessionData = { ...selfStudent, hv_avatar: j.url };
        saveClassroomSession({ userType: "Student", data: nextData });
        setSaveMsg({ kind: "ok", text: "Đã cập nhật ảnh đại diện (Cloudflare Images)." });
      } catch (e) {
        setSaveMsg({
          kind: "err",
          text: e instanceof Error ? e.message : "Không lưu được ảnh. Thử lại sau.",
        });
      } finally {
        setAvatarUploading(false);
      }
    },
    [selfStudent, session]
  );

  const confirmUnenroll = useCallback(async () => {
    if (!unenrollModal || !selfStudent) return;
    const email = selfStudent.email?.trim().toLowerCase();
    if (!email) {
      setSaveMsg({ kind: "err", text: "Hồ sơ thiếu email — không thể xóa ghi danh trực tuyến." });
      return;
    }
    const row = unenrollModal;
    const active =
      row.days_remaining != null && Number.isFinite(row.days_remaining) && row.days_remaining > 0;
    setUnenrolling(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/hoc-vien/delete-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qlhv_id: row.qlhv_id,
          hoc_vien_id: row.id,
          email,
          acknowledge_active_enrollment: active,
        }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        code?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || !j.ok) {
        if (res.status === 409 && j.code === "NEED_ACK") {
          setSaveMsg({
            kind: "err",
            text: j.message ?? "Vui lòng xác nhận: kỳ học phí vẫn còn hạn.",
          });
        } else {
          setSaveMsg({ kind: "err", text: j.error ?? "Không xóa được ghi danh." });
        }
        return;
      }
      setUnenrollModal(null);
      setAllClassRows((prev) => (prev ?? []).filter((r) => r.qlhv_id !== row.qlhv_id));
      if (row.qlhv_id === selfStudent.qlhv_id) {
        clearClassroomSession();
        setSaveMsg({
          kind: "ok",
          text: "Đã xóa ghi danh lớp đang dùng đăng nhập. Vui lòng chọn lớp khác từ Navigation.",
        });
      } else {
        setSaveMsg({ kind: "ok", text: "Đã xóa ghi danh khỏi lớp." });
      }
    } catch {
      setSaveMsg({ kind: "err", text: "Lỗi mạng. Thử lại sau." });
    } finally {
      setUnenrolling(false);
    }
  }, [unenrollModal, selfStudent]);

  const openPaidInvoiceDetail = useCallback(
    async (donId: number) => {
      if (!selfStudent?.email?.trim()) return;
      setInvoiceDetailModal({ phase: "loading", donId });
      const emailNorm = selfStudent.email.trim().toLowerCase();
      try {
        const res = await fetch("/api/hoc-vien/paid-invoice-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hoc_vien_id: selfStudent.id,
            email: emailNorm,
            don_id: donId,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          detail?: PaidInvoiceDetailPayload;
          error?: string;
        };
        if (!res.ok || j.ok !== true || !j.detail) {
          throw new Error(
            typeof j.error === "string" && j.error.trim() ? j.error : "Không tải được chi tiết đơn.",
          );
        }
        setInvoiceDetailModal({ phase: "ok", detail: j.detail });
      } catch (e) {
        setInvoiceDetailModal({
          phase: "err",
          message: e instanceof Error ? e.message : "Lỗi mạng.",
        });
      }
    },
    [selfStudent],
  );

  if (!ready) {
    return (
      <div className="hvp-profile">
        <div className="hvp-profile-inner">
          <div className="hvp-loading">Đang tải…</div>
        </div>
      </div>
    );
  }

  if (!session || !isStudent || !selfStudent) {
    return (
      <div className="hvp-profile">
        <div className="hvp-profile-inner">
          <div className="hvp-guard">
            {wrongStudentSession ? (
              <>
                <h1>Không khớp tài khoản</h1>
                <p>Đường dẫn này là trang của học viên khác. Bạn đang đăng nhập bằng email học viên khác.</p>
                {myProfileHref ? (
                  <Link href={myProfileHref} className="hvp-home">
                    Mở trang cá nhân của bạn
                  </Link>
                ) : (
                  <p style={{ marginTop: 12, color: "var(--ink2)", fontSize: 13 }}>
                    Hồ sơ chưa có email — vui lòng liên hệ Sine Art để cập nhật.
                  </p>
                )}
              </>
            ) : (
              <>
                <h1>Không thể mở trang cá nhân</h1>
                <p>Vui lòng đăng nhập bằng email học viên từ Navigation trước khi vào trang này.</p>
                <Link href="/" className="hvp-home">
                  ← Về trang chủ
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const nameForInitials = form.full_name.trim() || selfStudent.full_name;
  const initials = nameForInitials
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");

  const displayEmail = selfStudent.email || "—";
  const dongHocPhiHref = selfStudent.email?.trim()
    ? `/donghocphi?${new URLSearchParams({ email: selfStudent.email.trim().toLowerCase() }).toString()}`
    : "/donghocphi";
  const canUnenrollOnline = Boolean(selfStudent.email?.trim());
  const unenrollActiveWarning =
    unenrollModal != null &&
    unenrollModal.days_remaining != null &&
    Number.isFinite(unenrollModal.days_remaining) &&
    unenrollModal.days_remaining > 0;

  return (
    <div className="hvp-profile">
      <div className="hvp-profile-inner">
        <section className="hvp-card" aria-label="Hồ sơ học viên">
          <div className="hvp-card-layout">
            <div className="hvp-tabs" role="tablist" aria-label="Khu vực trang cá nhân">
              <Link
                href={hocVienProfileHref(selfStudent.email, "thong-tin") ?? "#"}
                role="tab"
                aria-selected={section === "thong-tin"}
                className={section === "thong-tin" ? "active" : ""}
                prefetch
              >
                <User className="hvp-tab-icon" size={20} strokeWidth={2} aria-hidden />
                <span className="hvp-tab-label">Thông tin</span>
              </Link>
              <Link
                href={hocVienProfileHref(selfStudent.email, "lop-hoc") ?? "#"}
                role="tab"
                aria-selected={section === "lop-hoc"}
                className={section === "lop-hoc" ? "active" : ""}
                prefetch
              >
                <GraduationCap className="hvp-tab-icon" size={20} strokeWidth={2} aria-hidden />
                <span className="hvp-tab-label">Lớp học</span>
              </Link>
              <Link
                href={hocVienProfileHref(selfStudent.email, "he-thong-bai-tap") ?? "#"}
                role="tab"
                aria-selected={section === "he-thong-bai-tap"}
                className={section === "he-thong-bai-tap" ? "active" : ""}
                prefetch
              >
                <BookOpen className="hvp-tab-icon" size={20} strokeWidth={2} aria-hidden />
                <span className="hvp-tab-label">Hệ thống bài tập</span>
              </Link>
              <Link
                href={hocVienProfileHref(selfStudent.email, "bai-ve") ?? "#"}
                role="tab"
                aria-selected={section === "bai-ve"}
                className={section === "bai-ve" ? "active" : ""}
                prefetch
              >
                <Palette className="hvp-tab-icon" size={20} strokeWidth={2} aria-hidden />
                <span className="hvp-tab-label">Bài vẽ</span>
              </Link>
            </div>

            <div className="hvp-card-main">
              <AnimatePresence>
                {saveMsg != null && section !== "thong-tin" ? (
                  <motion.div
                    key={`${saveMsg.kind}\u0000${saveMsg.text}`}
                    role="status"
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={`hvp-tab-flash ${saveMsg.kind === "ok" ? "hvp-tab-flash--ok" : "hvp-tab-flash--err"}`}
                  >
                    {saveMsg.text}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="hvp-body">
            {section === "thong-tin" ? (
              <div className="hvp-panel hvp-panel--info">
                <div className="hvp-info-two-col">
                  <div className="hvp-info-col hvp-info-col--form">
                    <div className="hvp-oc-profile">
                      <div className="dhp-oc-card dhp-oc-card--selected hvp-oc-card--static hvp-oc-info-card">
                        <div className="hvp-oc-card-profile-inner hvp-oc-card-profile-inner--info">
                          <div className="hvp-oc-card-profile-main">
                        <form
                          className="hvp-info-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void saveProfile();
                          }}
                        >
                          <div className="dhp-oc-details-main hvp-oc-details-main--profile hvp-info-form-head">
                            <div className="hvp-info-head-row">
                              <div className="hvp-info-avatar-slot">
                                <HocVienAvatarEditor
                                  storedAvatar={selfStudent.hv_avatar}
                                  email={selfStudent.email ?? ""}
                                  initials={initials}
                                  uploading={avatarUploading}
                                  onPickFile={handleAvatarFile}
                                />
                              </div>
                              <div className="hvp-info-head-text">
                                <h2 className="hvp-oc-class-title">
                                  {form.full_name.trim() || selfStudent.full_name}
                                </h2>
                                <p className="dhp-oc-gv hvp-info-email-meta">
                                  <span className="hvp-sr-only">Email đăng nhập: </span>
                                  {displayEmail}
                                </p>
                                <p className="hvp-email-readonly-hint hvp-email-readonly-hint--tight">
                                  Email đăng nhập — không đổi tại đây. Liên hệ Sine Art nếu cần cập nhật.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="hvp-info-fields">
                            <div className="dhp-field-row">
                              <div className="dhp-field">
                                <label htmlFor="hvp-full_name">Họ và tên *</label>
                                <input
                                  id="hvp-full_name"
                                  name="full_name"
                                  type="text"
                                  autoComplete="name"
                                  placeholder="Nguyễn Văn A"
                                  value={form.full_name}
                                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                                  required
                                  minLength={2}
                                />
                              </div>
                              <div className="dhp-field">
                                <label htmlFor="hvp-sdt">Số điện thoại *</label>
                                <input
                                  id="hvp-sdt"
                                  name="sdt"
                                  type="tel"
                                  autoComplete="tel"
                                  placeholder="0912 345 678"
                                  value={form.hv_sdt}
                                  onChange={(e) => setForm((f) => ({ ...f, hv_sdt: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="dhp-field-row">
                              <div className="dhp-field">
                                <label htmlFor="hvp-sex">Giới tính</label>
                                <select
                                  id="hvp-sex"
                                  name="sex"
                                  value={form.hv_sex}
                                  onChange={(e) => setForm((f) => ({ ...f, hv_sex: e.target.value }))}
                                >
                                  {SEX_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="dhp-field">
                                <label htmlFor="hvp-nam_thi">Năm thi</label>
                                <select
                                  id="hvp-nam_thi"
                                  name="nam_thi"
                                  value={form.nam_thi}
                                  onChange={(e) => setForm((f) => ({ ...f, nam_thi: e.target.value }))}
                                >
                                  {namThiOptions.map((o) => (
                                    <option key={o.value || "none"} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="dhp-field-row">
                              <div className="dhp-field">
                                <label htmlFor="hvp-loai_khoa_hoc">Loại khóa học</label>
                                <select
                                  id="hvp-loai_khoa_hoc"
                                  name="loai_khoa_hoc"
                                  value={form.loai_khoa_hoc}
                                  onChange={(e) => setForm((f) => ({ ...f, loai_khoa_hoc: e.target.value }))}
                                >
                                  {LOAI_KHOA_HOC_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                  {(LOAI_KHOA_HOC_OPTIONS as readonly string[]).includes(form.loai_khoa_hoc.trim())
                                    ? null
                                    : form.loai_khoa_hoc.trim()
                                      ? (
                                          <option value={form.loai_khoa_hoc}>{form.loai_khoa_hoc}</option>
                                        )
                                      : null}
                                </select>
                              </div>
                              <div className="dhp-field">
                                <label htmlFor="hvp-fb">Facebook *</label>
                                <input
                                  id="hvp-fb"
                                  name="facebook"
                                  type="text"
                                  autoComplete="off"
                                  placeholder="Tư vấn viên sẽ liên hệ qua facebook"
                                  value={form.hv_facebook}
                                  onChange={(e) => setForm((f) => ({ ...f, hv_facebook: e.target.value }))}
                                  aria-required="true"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="hvp-info-footer">
                            <button type="submit" className="hvp-btn-save" disabled={saving}>
                              {saving ? "Đang lưu…" : "Lưu thay đổi"}
                            </button>
                            {saveMsg ? (
                              <span
                                className={`hvp-save-msg ${saveMsg.kind === "ok" ? "hvp-save-msg--ok" : "hvp-save-msg--err"}`}
                              >
                                {saveMsg.text}
                              </span>
                            ) : null}
                          </div>
                        </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hvp-info-col hvp-info-col--read">
                        {hvMeta === undefined ? (
                          <p className="hvp-profile-readonly hvp-profile-readonly--muted hvp-profile-readonly--read-col" aria-live="polite">
                            Đang tải lịch sử học phí…
                          </p>
                        ) : (
                          <>
                            <section
                              className="hvp-profile-readonly hvp-sine-time-section hvp-profile-readonly--read-col"
                              aria-labelledby="hvp-sine-time-h"
                            >
                              <div className="hvp-sine-time-head">
                                <h3 id="hvp-sine-time-h" className="hvp-sine-time-heading">
                                  Thời gian học tại Sine Art
                                </h3>
                                <p className="hvp-sine-time-sub">Mốc tham chiếu trên hệ thống Sine Art</p>
                              </div>
                              <div className="hvp-sine-time-card">
                                <div className="hvp-sine-time-grid">
                                  <div className="hvp-sine-time-tile">
                                    <CalendarDays className="hvp-sine-time-tile-icon" size={22} strokeWidth={1.75} aria-hidden />
                                    <span className="hvp-sine-time-tile-label">Ngày bắt đầu học</span>
                                    <span className="hvp-sine-time-tile-value">
                                      {hvMeta.ngay_bat_dau != null
                                        ? formatDateVi(hvMeta.ngay_bat_dau)
                                        : isoDatePart(hvMeta.created_at) != null
                                          ? formatDateVi(isoDatePart(hvMeta.created_at)!)
                                          : "—"}
                                    </span>
                                  </div>
                                  <div className="hvp-sine-time-tile hvp-sine-time-tile--accent">
                                    <Clock className="hvp-sine-time-tile-icon" size={22} strokeWidth={1.75} aria-hidden />
                                    <span className="hvp-sine-time-tile-label">Tổng thời gian đến hiện tại</span>
                                    <span className="hvp-sine-time-tile-value hvp-sine-time-tile-value--lg">
                                      {studyDurationViFromYmd(
                                        hvMeta.ngay_bat_dau ?? isoDatePart(hvMeta.created_at),
                                      )}
                                    </span>
                                  </div>
                                </div>
                                {hvMeta.ngay_bat_dau == null && isoDatePart(hvMeta.created_at) != null ? (
                                  <p className="hvp-sine-time-callout" role="note">
                                    Ước lượng theo ngày hồ sơ được tạo (chưa có ngày nhập học chính thức). Liên hệ Sine
                                    Art nếu cần cập nhật.
                                  </p>
                                ) : hvMeta.ngay_bat_dau == null && isoDatePart(hvMeta.created_at) == null ? (
                                  <p className="hvp-sine-time-callout hvp-sine-time-callout--soft" role="note">
                                    Chưa ghi nhận ngày bắt đầu học. Liên hệ Sine Art khi đã nhập học để cập nhật hồ sơ.
                                  </p>
                                ) : null}
                              </div>
                            </section>

                            <section className="hvp-profile-readonly hvp-profile-readonly--read-col" aria-labelledby="hvp-paid-invoices-h">
                              <h3 id="hvp-paid-invoices-h" className="hvp-profile-readonly-title">
                                Hóa đơn đã thanh toán
                              </h3>
                              {!selfStudent.email?.trim() ? (
                                <p className="hvp-profile-readonly-hint">
                                  Hồ sơ chưa có email — không hiển thị danh sách đơn thanh toán tại đây.
                                </p>
                              ) : paidInvoices === null ? (
                                <p className="hvp-profile-readonly-hint" aria-live="polite">
                                  Đang tải danh sách đơn…
                                </p>
                              ) : paidInvoicesErr ? (
                                <p className="hvp-profile-readonly-err" role="status">
                                  Không tải được danh sách hóa đơn. Thử tải lại trang hoặc liên hệ Sine Art.
                                </p>
                              ) : paidInvoices.length === 0 ? (
                                <p className="hvp-profile-readonly-hint">
                                  Chưa có đơn học phí trạng thái «Đã thanh toán» trên hồ sơ này.
                                </p>
                              ) : (
                                <div className="hvp-invoices-table-wrap">
                                  <table className="hvp-invoices-table">
                                    <thead>
                                      <tr>
                                        <th scope="col">#</th>
                                        <th scope="col">Mã đơn</th>
                                        <th scope="col">Ngày thanh toán</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {paidInvoices.map((inv, idx) => (
                                        <tr key={inv.id}>
                                          <td>{idx + 1}</td>
                                          <td>
                                            <button
                                              type="button"
                                              className="hvp-invoice-code-btn"
                                              title="Xem chi tiết đơn đã thanh toán"
                                              onClick={() => void openPaidInvoiceDetail(inv.id)}
                                            >
                                              {invoiceDisplayCode(inv)}
                                            </button>
                                          </td>
                                          <td>{formatDateViLoose(inv.ngay_thanh_toan)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </section>
                          </>
                        )}
                        </div>
                </div>
              </div>
            ) : null}

            {section === "lop-hoc" ? (
              <div className="hvp-panel hvp-panel--classes">
                <div className="hvp-classes-enroll-bar">
                  <Link
                    href={dongHocPhiHref}
                    className="hvp-link hvp-link--outline hvp-link--cta hvp-classes-add-class"
                  >
                    Đăng ký thêm lớp
                  </Link>
                </div>
                {allClassRows === null ? (
                  <div className="hvp-classes-loading">Đang tải danh sách lớp…</div>
                ) : allClassRows.length === 0 ? (
                  <p className="hvp-dd" style={{ margin: 0 }}>
                    Hiện không còn lớp ghi danh trên hệ thống. Liên hệ Sine Art nếu cần hỗ trợ.
                  </p>
                ) : (
                  <div className="hvp-classes-stack">
                    {allClassRows.map((row) => {
                      const rawThumb = row.class_avatar?.trim();
                      const classThumbSrc = rawThumb ? cfImageForThumbnail(rawThumb) || rawThumb : null;
                      const rowDaysBadge = daysRemainingDhpBadge(row.days_remaining ?? null);
                      const rowDays = row.days_remaining;
                      const isSessionClass = row.qlhv_id === selfStudent.qlhv_id;
                      const classTitle = row.class_full_name?.trim() || row.class_name || "—";
                      return (
                        <div className="hvp-oc-profile" key={row.qlhv_id}>
                          <div
                            className={`dhp-oc-card dhp-oc-card--selected hvp-oc-card--static hvp-oc-class-card${isSessionClass ? " hvp-oc-card--session" : ""}`}
                          >
                            <button
                              type="button"
                              className="hvp-oc-unenroll"
                              aria-label={`Xóa ghi danh ${classTitle}`}
                              disabled={!canUnenrollOnline}
                              title={
                                canUnenrollOnline
                                  ? "Xóa ghi danh khỏi lớp này"
                                  : "Cần email trên hồ sơ để xóa ghi danh trực tuyến."
                              }
                              onClick={() => setUnenrollModal(row)}
                            >
                              ×
                            </button>
                            <div className="hvp-oc-card-profile-inner">
                              <div className="dhp-oc-visual">
                                {classThumbSrc ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- Cloudflare / URL lớp
                                  <img
                                    src={classThumbSrc}
                                    alt=""
                                    className="dhp-oc-avatar-img"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="dhp-oc-portfolio-empty" aria-hidden />
                                )}
                              </div>
                              <div className="hvp-oc-card-profile-main">
                                <div className="dhp-oc-details-main hvp-oc-details-main--profile">
                                  <p
                                    className="hvp-oc-eyebrow"
                                    title={
                                      isSessionClass
                                        ? "Trùng với lớp bạn chọn sau khi nhập email ở menu «Vào học» để mở Phòng học."
                                        : undefined
                                    }
                                  >
                                    {isSessionClass ? "Lớp đang đăng nhập" : "Lớp ghi danh"}
                                  </p>
                                  <h2 className="hvp-oc-class-title">{classTitle}</h2>
                                  <div className="hvp-oc-class-meta">
                                    <p className="dhp-oc-gv">GV: {row.teacher_name?.trim() || "—"}</p>
                                    <div className="hvp-oc-kv-grid">
                                      <p className="dhp-oc-lich hvp-oc-lich--tight">
                                        <span className="hvp-oc-k">Mã lớp</span>{" "}
                                        {row.class_name?.trim() || "—"}
                                      </p>
                                      <p className="dhp-oc-lich hvp-oc-lich--tight">
                                        <span className="hvp-oc-k">Lịch học</span>{" "}
                                        {row.lich_hoc?.trim() || "—"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="dhp-oc-details-foot hvp-oc-details-foot--badges">
                                  <span className="dhp-oc-badge dhp-oc-badge--full">
                                    <span className="dhp-oc-badge-dot" aria-hidden />
                                    Kết kỳ học phí · {formatDateVi(row.ngay_ket_thuc)}
                                  </span>
                                  <span
                                    className={rowDaysBadge.className}
                                    title={HVP_DAYS_REMAINING_PAID_ONLY_TITLE}
                                  >
                                    <span className="dhp-oc-badge-dot" aria-hidden />
                                    {rowDaysBadge.label}
                                  </span>
                                </div>
                                {rowDays !== null && rowDays <= 0 ? (
                                  <p className="hvp-oc-expiry-notice" role="status">
                                    Kỳ hiện tại đã hết hoặc quá hạn — liên hệ Sine Art để gia hạn.
                                  </p>
                                ) : null}
                                <div className="hvp-oc-actions">
                                  {row.url_class?.trim() ? (
                                    <a
                                      href={row.url_class.trim()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hvp-link hvp-link--cta"
                                    >
                                      Vào phòng học
                                    </a>
                                  ) : null}
                                  <Link
                                    href={dongHocPhiHref}
                                    className="hvp-link hvp-link--outline hvp-link--cta"
                                  >
                                    Gia hạn học phí
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {section === "he-thong-bai-tap" ? (
              <div className="hvp-panel hvp-panel--assignments">
                <h3 className="hvp-btap-h">Hệ thống bài tập</h3>
                {assignmentsBlocks === null ? (
                  <div className="hvp-classes-loading">Đang tải chương trình bài tập…</div>
                ) : assignmentsBlocks.length === 0 ? (
                  <p className="hvp-dd" style={{ margin: 0 }}>
                    Chưa có dữ liệu lớp hoặc chương trình bài tập. Liên hệ Sine Art nếu cần hỗ trợ.
                  </p>
                ) : (
                  <>
                    {assignmentsMonGroups.length > 1 ? (
                      <div className="hvp-btap-mon-bar" role="tablist" aria-label="Môn học">
                        {assignmentsMonGroups.map((g) => (
                          <button
                            key={g.key}
                            type="button"
                            role="tab"
                            aria-selected={g.key === assignmentsMonKey}
                            className={cn(
                              "hvp-btap-mon-chip",
                              g.key === assignmentsMonKey && "hvp-btap-mon-chip--active",
                            )}
                            onClick={() => {
                              setAssignmentsMonKey(g.key);
                              setAssignmentsScalarMonByQlhv({});
                              setAssignmentsOpenExId(null);
                            }}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="hvp-btap-phc">
                      {activeAssignmentsMonGroup ? (
                        <div className="hvp-btap-stack">
                          {activeAssignmentsMonGroup.blocks.map((bl) => {
                            const scalarMonOpts = distinctScalarMonFilterOptions(bl.rows);
                            const scalarFilterRaw = assignmentsScalarMonByQlhv[bl.qlhvId];
                            const scalarFilterId =
                              scalarFilterRaw === undefined ? null : scalarFilterRaw;
                            const displayRows = filterAssignmentRowsByScalarMon(bl.rows, scalarFilterId);
                            const currentProgressExId =
                              bl.progressIdx >= 0 && bl.rows[bl.progressIdx]
                                ? bl.rows[bl.progressIdx].exercise.id
                                : null;

                            return (
                            <div className="hvp-btap-class" key={bl.qlhvId}>
                              <div className="hvp-btap-class-head hvp-btap-class-head--compact">
                                <h4 className="hvp-btap-class-title">{bl.classTitle}</h4>
                                {bl.capTocUnlockAll ? (
                                  <p className="hvp-btap-cap">Chế độ cấp tốc: toàn bộ bài đã mở.</p>
                                ) : bl.taiLopUnlockByClassName ? (
                                  <p className="hvp-btap-cap">Toàn bộ bài giảng đã mở.</p>
                                ) : bl.progressIdx >= 0 ? (
                                  <p className="hvp-btap-prog">
                                    Bài đang học: {bl.progressIdx + 1}/{bl.rows.length}
                                  </p>
                                ) : (
                                  <p className="hvp-btap-prog hvp-btap-prog--muted">
                                    Chưa gán tiến độ trên ghi danh — liên hệ giáo viên.
                                  </p>
                                )}
                              </div>
                              {scalarMonOpts.length > 1 ? (
                                <div
                                  className="hvp-btap-scalar-mon-bar"
                                  role="group"
                                  aria-label="Lọc theo môn ghi trên bài (hv_he_thong_bai_tap.mon_hoc)"
                                >
                                  <button
                                    type="button"
                                    className={cn(
                                      "hvp-btap-mon-chip",
                                      scalarFilterId == null && "hvp-btap-mon-chip--active",
                                    )}
                                    onClick={() =>
                                      setAssignmentsScalarMonByQlhv((p) => ({
                                        ...p,
                                        [bl.qlhvId]: null,
                                      }))
                                    }
                                  >
                                    Tất cả
                                  </button>
                                  {scalarMonOpts.map((o) => (
                                    <button
                                      key={o.id}
                                      type="button"
                                      className={cn(
                                        "hvp-btap-mon-chip",
                                        scalarFilterId === o.id && "hvp-btap-mon-chip--active",
                                      )}
                                      onClick={() =>
                                        setAssignmentsScalarMonByQlhv((p) => ({
                                          ...p,
                                          [bl.qlhvId]: o.id,
                                        }))
                                      }
                                    >
                                      {o.label}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                              {bl.rows.length === 0 ? (
                                <div className="task-curr-empty">Chưa có bài tập cho môn của lớp này.</div>
                              ) : displayRows.length === 0 ? (
                                <div className="task-curr-empty">
                                  Không có bài nào thuộc môn đã chọn — chọn &quot;Tất cả&quot; hoặc môn khác.
                                </div>
                              ) : (
                                <div className="task-curr-list-wrap">
                                  <div className="task-curr-list-heading">
                                    Danh sách bài tập
                                    {scalarFilterId != null ? (
                                      <span className="task-curr-list-heading-note">
                                        {" "}
                                        · đang lọc theo <strong>môn trên bài</strong>
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="task-curr-list" role="list">
                                    {displayRows.map(({ exercise: ex, listIndex: i, unlocked }) => {
                                      const isCurrent =
                                        currentProgressExId != null && ex.id === currentProgressExId;
                                      const expanded = assignmentsOpenExId === ex.id && unlocked;
                                      const baiSoSlug =
                                        ex.bai_so != null && Number.isFinite(ex.bai_so)
                                          ? Math.max(0, Math.floor(Number(ex.bai_so)))
                                          : i + 1;
                                      const baiTapHref = buildHeThongBaiTapHref(
                                        baiSoSlug,
                                        ex.ten_bai_tap,
                                        ex.mon_hoc ?? bl.monHocId
                                      );
                                      const thumbSrc =
                                        cfImageForThumbnail(ex.thumbnail) ?? ex.thumbnail?.trim() ?? null;
                                      return (
                                        <div
                                          key={ex.id}
                                          className={cn(
                                            "task-curr-row",
                                            !unlocked && "task-curr-row--locked",
                                            isCurrent && "task-curr-row--current",
                                          )}
                                          role="listitem"
                                        >
                                          <button
                                            type="button"
                                            className="task-curr-row-btn"
                                            disabled={!unlocked}
                                            title={
                                              unlocked
                                                ? expanded
                                                  ? "Thu gọn"
                                                  : "Mở xem tóm tắt và hướng dẫn"
                                                : "Giáo viên sẽ mở bài này khi bạn hoàn thành các bài trước"
                                            }
                                            onClick={() => {
                                              if (!unlocked) return;
                                              setAssignmentsOpenExId((id) => (id === ex.id ? null : ex.id));
                                            }}
                                          >
                                            {thumbSrc ? (
                                              <div className="task-curr-row-thumb">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={thumbSrc} alt="" />
                                              </div>
                                            ) : (
                                              <div
                                                className="task-curr-row-thumb task-curr-row-thumb--empty"
                                                aria-hidden
                                              >
                                                <span className="task-curr-row-thumb-ph">Ảnh</span>
                                              </div>
                                            )}
                                            <div className="task-curr-row-text">
                                              <div className="task-curr-row-main">
                                                <span className="task-curr-badge">
                                                  {formatLessonLabel(ex, i)}
                                                </span>
                                                <span className="task-curr-row-title">{ex.ten_bai_tap}</span>
                                              </div>
                                              <span className="task-curr-row-chevron" aria-hidden>
                                                {unlocked ? (expanded ? "▴" : "▾") : "🔒"}
                                              </span>
                                            </div>
                                          </button>
                                          {expanded && unlocked ? (
                                            <div className="task-curr-detail">
                                              <p className="task-curr-detail-txt">{ex.ten_bai_tap}</p>
                                              <Link
                                                href={baiTapHref}
                                                className="task-curr-open-btn"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                Xem hướng dẫn bài tập
                                              </Link>
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {section === "bai-ve" ? (
              <div className="hvp-panel hvp-panel--artworks">
                <h3>Bài vẽ</h3>
                <p className="hvp-artworks-intro">
                  Các bài trạng thái <strong>Hoàn thiện</strong> trên hệ thống (đồng bộ với Phòng học).
                </p>
                {artworks === null ? (
                  <div className="hvp-classes-loading">Đang tải bài vẽ…</div>
                ) : artworks.length === 0 ? (
                  <p className="hvp-dd hvp-artworks-empty">
                    Chưa có bài hoàn thiện nào được hiển thị. Khi giáo viên xác nhận bài trong lớp, tác phẩm
                    sẽ xuất hiện tại đây và trong Phòng học (tab Gallery).
                  </p>
                ) : (
                  <>
                    {enrolledMonOptions.length > 0 ? (
                      <div className="hvp-artwork-filter-bar" role="toolbar" aria-label="Lọc theo môn">
                        <button
                          type="button"
                          className={`hvp-artwork-filter-chip${artMonFilter === "all" ? " hvp-artwork-filter-chip--active" : ""}`}
                          onClick={() => setArtMonFilter("all")}
                        >
                          Tất cả
                        </button>
                        {enrolledMonOptions.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`hvp-artwork-filter-chip${artMonFilter === m.id ? " hvp-artwork-filter-chip--active" : ""}`}
                            onClick={() => setArtMonFilter(m.id)}
                          >
                            {m.ten_mon_hoc}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {filteredArtworks.length === 0 ? (
                      <p className="hvp-dd hvp-artworks-empty">
                        Không có bài nào thuộc môn đã chọn. Chọn &quot;Tất cả&quot; hoặc môn khác.
                      </p>
                    ) : (
                      <div className="hvp-artworks-grid">
                        {filteredArtworks.map((a) => {
                          const thumb =
                            a.photo?.trim() != null && a.photo.trim() !== ""
                              ? cfImageForThumbnail(a.photo.trim()) ?? a.photo.trim()
                              : null;
                          const exParts = [a.exerciseLabel, a.exerciseTitle].filter(Boolean) as string[];
                          const exLine = exParts.length > 0 ? exParts.join(" · ") : null;
                          const hoverBaiLabel =
                            exLine ?? a.exerciseTitle ?? a.tenMonHoc ?? "Bài vẽ";
                          return (
                            <div
                              key={a.hvId > 0 ? `hv-${a.hvId}` : `row-${a.hvId}`}
                              role="button"
                              tabIndex={0}
                              className="hvp-gcard"
                              onClick={() => setArtLightboxHvId(a.hvId)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setArtLightboxHvId(a.hvId);
                                }
                              }}
                            >
                              {a.mau ? <div className="hvp-gmau-tag">✦ Mẫu</div> : null}
                              <div className="hvp-gimg">
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={thumb} alt="" className="hvp-gimg-thumb" />
                                ) : (
                                  <span className="hvp-gimg-emoji" aria-hidden>
                                    {classroomGalleryEmoji(a.studentName)}
                                  </span>
                                )}
                              </div>
                              <div className="hvp-ginfo" aria-hidden>
                                <p className="hvp-goverlay-bai">{hoverBaiLabel}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      {invoiceDetailModal ? (
        <div
          className="hvp-unenroll-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInvoiceDetailModal(null);
          }}
        >
          <div
            className="hvp-inv-detail-modal"
            role="dialog"
            aria-modal
            aria-labelledby="hvp-inv-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="hvp-inv-detail-close"
              onClick={() => setInvoiceDetailModal(null)}
              aria-label="Đóng"
            >
              ×
            </button>
            <h2 id="hvp-inv-detail-title" className="hvp-inv-detail-title">
              Chi tiết thanh toán
            </h2>
            {invoiceDetailModal.phase === "loading" ? (
              <p className="hvp-inv-detail-muted">Đang tải thông tin đơn…</p>
            ) : invoiceDetailModal.phase === "err" ? (
              <>
                <p className="hvp-inv-detail-err" role="status">
                  {invoiceDetailModal.message}
                </p>
                <div className="hvp-inv-detail-foot-actions">
                  <button type="button" className="hvp-unenroll-cancel" onClick={() => setInvoiceDetailModal(null)}>
                    Đóng
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="hvp-inv-detail-headline">
                  <span className="hvp-inv-detail-ma">{invoiceTitleFromDon(invoiceDetailModal.detail.don)}</span>
                  <span className="hvp-inv-detail-badge">Đã thanh toán</span>
                </div>
                <dl className="hvp-inv-detail-meta">
                  {invoiceDetailModal.detail.don.ma_don != null &&
                  String(invoiceDetailModal.detail.don.ma_don).trim() !== "" ? (
                    <div className="hvp-inv-detail-meta-row">
                      <dt>Mã chuyển khoản (CK)</dt>
                      <dd>{String(invoiceDetailModal.detail.don.ma_don).trim()}</dd>
                    </div>
                  ) : null}
                  <div className="hvp-inv-detail-meta-row">
                    <dt>Ngày thanh toán</dt>
                    <dd>{formatDateViLoose(invoiceDetailModal.detail.don.ngay_thanh_toan)}</dd>
                  </div>
                  {invoiceDetailModal.detail.don.hinh_thuc_thu ? (
                    <div className="hvp-inv-detail-meta-row">
                      <dt>Hình thức</dt>
                      <dd>{invoiceDetailModal.detail.don.hinh_thuc_thu}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="hvp-inv-detail-lines-wrap">
                  <table className="hvp-inv-detail-lines">
                    <thead>
                      <tr>
                        <th scope="col">Nội dung</th>
                        <th scope="col">Gói</th>
                        <th scope="col">Kỳ học phí</th>
                        <th scope="col" className="hvp-inv-detail-num">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetailModal.detail.lines.map((ln, i) => (
                        <tr key={`${ln.label}\u0000${i}`}>
                          <td>{ln.label}</td>
                          <td className="hvp-inv-detail-muted-cell">{ln.package_label}</td>
                          <td className="hvp-inv-detail-muted-cell">
                            {formatDateViLoose(ln.ngay_dau_ky)} → {formatDateViLoose(ln.ngay_cuoi_ky)}
                          </td>
                          <td className="hvp-inv-detail-num">{formatVnd(ln.amount_dong)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="hvp-inv-detail-totals">
                  {invoiceDetailModal.detail.don.giam_gia_dong > 0 ||
                  invoiceDetailModal.detail.don.giam_gia_vnd_dong > 0 ? (
                    <>
                      <div className="hvp-inv-detail-total-row">
                        <span>Tạm tính</span>
                        <span className="hvp-inv-detail-num">
                          {formatVnd(
                            invoiceDetailModal.detail.lines.reduce((s, ln) => s + ln.amount_dong, 0),
                          )}
                        </span>
                      </div>
                      {invoiceDetailModal.detail.don.giam_gia_dong > 0 ? (
                        <div className="hvp-inv-detail-total-row hvp-inv-detail-total-row--discount">
                          <span>Giảm giá / ưu đãi</span>
                          <span className="hvp-inv-detail-num">
                            −{formatVnd(invoiceDetailModal.detail.don.giam_gia_dong)}
                          </span>
                        </div>
                      ) : null}
                      {invoiceDetailModal.detail.don.giam_gia_vnd_dong > 0 ? (
                        <div className="hvp-inv-detail-total-row hvp-inv-detail-total-row--discount">
                          <span>Giảm giá thêm</span>
                          <span className="hvp-inv-detail-num">
                            −{formatVnd(invoiceDetailModal.detail.don.giam_gia_vnd_dong)}
                          </span>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  <div className="hvp-inv-detail-total-row hvp-inv-detail-total-row--grand">
                    <span>Tổng đã thanh toán</span>
                    <span className="hvp-inv-detail-num">{formatVnd(invoiceDetailModal.detail.total_dong)}</span>
                  </div>
                </div>
                <div className="hvp-inv-detail-foot-actions">
                  <button type="button" className="hvp-unenroll-cancel" onClick={() => setInvoiceDetailModal(null)}>
                    Đóng
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {unenrollModal ? (
        <div
          className="hvp-unenroll-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !unenrolling) setUnenrollModal(null);
          }}
        >
          <div
            className="hvp-unenroll-modal"
            role="dialog"
            aria-modal
            aria-labelledby="hvp-unenroll-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="hvp-unenroll-title" className="hvp-unenroll-title">
              Xóa ghi danh?
            </h2>
            <p className="hvp-unenroll-class">
              {unenrollModal.class_full_name?.trim() || unenrollModal.class_name || "—"}
            </p>
            {unenrollActiveWarning ? (
              <p className="hvp-unenroll-warn">
                Bạn vẫn còn ngày trong kỳ học phí hiện tại. Xóa ghi danh sẽ gỡ lớp và các dòng học phí liên
                quan trên hệ thống — thao tác không hoàn tác.
              </p>
            ) : (
              <p className="hvp-unenroll-muted">Xóa ghi danh khỏi lớp này. Thao tác không hoàn tác.</p>
            )}
            <div className="hvp-unenroll-actions">
              <button
                type="button"
                className="hvp-unenroll-cancel"
                disabled={unenrolling}
                onClick={() => setUnenrollModal(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="hvp-unenroll-confirm"
                disabled={unenrolling}
                onClick={() => void confirmUnenroll()}
              >
                {unenrolling ? "Đang xóa…" : "Xóa ghi danh"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {artLightboxItem ? (
        <div
          className="hvp-lightbox"
          role="dialog"
          aria-modal
          aria-label="Xem ảnh bài vẽ"
          onClick={(e) => e.target === e.currentTarget && setArtLightboxHvId(null)}
        >
          <button type="button" className="hvp-lb-close" onClick={() => setArtLightboxHvId(null)} aria-label="Đóng">
            ×
          </button>
          <div className="hvp-lb-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                artLightboxItem.photo?.trim()
                  ? (cfImageForLightbox(artLightboxItem.photo.trim()) ?? artLightboxItem.photo.trim())
                  : `https://placehold.co/600x450/FFF0EC/EE5CA2?text=${encodeURIComponent(artLightboxItem.studentName)}`
              }
              alt={artLightboxItem.studentName}
            />
            <div className="hvp-lb-meta">
              <span className="hvp-lb-name">{artLightboxItem.studentName}</span>
              <span className="hvp-lb-chip">{artLightboxItem.classLabel}</span>
              {artLightboxItem.mau ? <span className="hvp-lb-mau">✦ Bài mẫu</span> : null}
              {artLightboxItem.score != null ? (
                <span className="hvp-lb-score">★ {artLightboxItem.score}</span>
              ) : null}
              {artLightboxItem.exerciseTitle ? (
                <p className="hvp-lb-ex">{artLightboxItem.exerciseTitle}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <LuuBaiHocVienFab />
    </div>
  );
}
