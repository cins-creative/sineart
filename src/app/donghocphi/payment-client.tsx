"use client";

import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import {
  buildVietQrImageUrl,
  getTpBankQrRecipient,
  pseudoDonIdFromSeed,
  resolveQrPaymentAmounts,
} from "@/lib/payment/vietqr";
import { firstApplicableComboDiscountDong } from "@/lib/donghocphi/combo-discount";
import type {
  DhpDhCatalog,
  DhpInitialNguyenVongRow,
} from "@/lib/donghocphi/dh-catalog";
import HocVienAvatarEditor, {
  AVATAR_MAX_BYTES,
} from "@/components/hoc-vien/HocVienAvatarEditor";
import {
  dbRowToStep1Fields,
  isValidStudentEmail,
  profileCompleteForSkipStep1,
  STUDENT_EMAIL_REQUIREMENT_VI,
  type QlHocVienStep1Fields,
} from "@/lib/donghocphi/profile-step1";
import { hocVienProfileHref } from "@/lib/hoc-vien/profile-url";
import type { HocPhiComboRow, HocPhiGoiRow } from "@/types/khoa-hoc";
import {
  fetchKyByKhoaHocVienIds,
  firstQlhvPerLopFromQlRows,
  qlEnrollmentKyByLopFromHpMap,
} from "@/lib/data/hp-thu-hp-chi-tiet-ky";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/** Khớp PAYMENT_FLOW_BRIEF / cột `hp_don_thu_hoc_phi.status` */
const HP_CHO_THANH_TOAN = "Chờ thanh toán";
const HP_DA_THANH_TOAN = "Đã thanh toán";

const POLL_INTERVAL_MS = 3000;

/** Lưu lớp đã chọn theo email — reload không bị ghi đè bởi danh sách ghi danh đầy đủ từ server. */
const DHP_CLASS_PICK_STORAGE_KEY = "sineart.dhp.classPick.v1";

type DhpStoredClassPickV1 = {
  v: 1;
  emailNorm: string;
  classIds: number[];
  feeByClassId: Record<string, number>;
  skipRenewalByClassId?: Record<string, boolean>;
};

function readDhpStoredPickRaw(): DhpStoredClassPickV1 | null {
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

function materializeStoredClassPick(
  stored: DhpStoredClassPickV1,
  lopHoc: PaymentClassItem[],
  goiHocPhi: PaymentFeeItem[]
): {
  classIds: number[];
  feeByClassId: Record<number, number>;
  skipRenewalByClassId: Record<number, boolean>;
} {
  const validLop = new Set(lopHoc.map((c) => c.id));
  const classIds = stored.classIds.filter((id) => Number.isFinite(id) && validLop.has(id));

  const feesByMon: Record<number, PaymentFeeItem[]> = {};
  for (const fee of goiHocPhi) {
    feesByMon[fee.monHocId] = feesByMon[fee.monHocId]
      ? [...feesByMon[fee.monHocId], fee]
      : [fee];
  }
  const feeByClassId: Record<number, number> = {};
  for (const id of classIds) {
    const cls = lopHoc.find((c) => c.id === id);
    if (!cls) continue;
    const list = feesByMon[cls.monHocId] ?? [];
    const saved = stored.feeByClassId[String(id)];
    if (saved != null && list.some((f) => f.id === saved)) {
      feeByClassId[id] = saved;
    } else if (list[0]) {
      feeByClassId[id] = list[0].id;
    }
  }
  const skipRenewalByClassId: Record<number, boolean> = {};
  if (stored.skipRenewalByClassId) {
    for (const [k, v] of Object.entries(stored.skipRenewalByClassId)) {
      const id = Number(k);
      if (Number.isFinite(id) && classIds.includes(id) && v) {
        skipRenewalByClassId[id] = true;
      }
    }
  }
  return { classIds, feeByClassId, skipRenewalByClassId };
}

function writeDhpClassPickToStorage(
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

function clearDhpClassPickStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DHP_CLASS_PICK_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Tránh `[]` literal trong default param — gây deps useMemo đổi mỗi render */
const NO_ENROLLED_CLASS_IDS: number[] = [];

export type { QlHocVienStep1Fields } from "@/lib/donghocphi/profile-step1";

export type DongHocPhiServerOrder = {
  donId: number;
  maDon: string;
  maDonSo: string;
  invoiceTotalDong: number;
  hocVienId: number;
};

export type PaymentMonItem = { id: number; tenMonHoc: string };
export type PaymentClassItem = {
  id: number;
  monHocId: number;
  tenLop: string;
  lichHoc: string;
  gvNames: string;
  /** `ql_lop_hoc.avatar` — ảnh đại diện lớp. */
  avatar: string | null;
  filled: number;
  total: number;
  isFull: boolean;
};
type DhpNvRowState = { truongId: number | ""; nganhId: number | "" };

export type PaymentFeeItem = {
  id: number;
  monHocId: number;
  tenGoi: string;
  numberValue: number;
  donVi: string;
  giaGoc: number;
  discount: number;
  giaThucDong: number;
  soMon: number;
  /** `hp_goi_hoc_phi_new.so_buoi` — buổi cộng thêm khi chọn gói. */
  soBuoi: number | null;
  /** `hp_combo_mon.id` khi gói thuộc combo — dùng với `hp_combo_mon.gia_giam`. */
  comboId: number | null;
};

const SEX_OPTIONS = ["Nam", "Nữ", "Khác"] as const;

/** Giá trị lưu `ql_thong_tin_hoc_vien.loai_khoa_hoc` */
const LOAI_KHOA_HOC_DEFAULT = "Luyện thi";

const LOAI_KHOA_HOC_OPTIONS = ["Luyện thi", "Digital", "Kids", "Bổ trợ"] as const;

function namThiSelectValues(): { label: string; value: string }[] {
  const y = new Date().getFullYear();
  const years: { label: string; value: string }[] = [];
  for (let i = -1; i <= 3; i += 1) {
    const yy = y + i;
    years.push({ label: String(yy), value: String(yy) });
  }
  years.push({ label: "Chưa thi", value: "" });
  return years;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));
}

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addCalendarDays(base: Date, days: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + days);
  return x;
}

function formatViDate(d: Date): string {
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** `ngay_thanh_toan` từ Postgres `date` — chuỗi YYYY-MM-DD hoặc null */
function formatNgayThanhToanDb(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "—";
  const s = String(raw).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const d = Number(iso[3]);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return formatViDate(new Date(y, m, d));
    }
  }
  const t = Date.parse(s);
  if (Number.isFinite(t)) return formatViDate(new Date(t));
  return s;
}

/** Kỳ học phí theo `lop_hoc` — nguồn `hp_thu_hp_chi_tiet` (resolve theo ghi danh `ql_quan_ly_hoc_vien.id`). */
export type QlEnrollmentKy = { ngayDauKy: string | null; ngayCuoiKy: string | null };

function parseLocalDateFromIso(iso: string | null | undefined): Date | null {
  if (iso == null || String(iso).trim() === "") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo, d);
}

/** Số ngày lịch từ a → b (b có thể trước a → âm). */
function diffCalendarDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

/**
 * Buổi ≈ ngày lịch (khớp `addDaysIso` trên server).
 * - Còn lại: từ hôm nay đến `ngay_cuoi_ky` (bao gồm cả hai mốc).
 * - Ngày hết hạn sau gói: từ `ngay_cuoi_ky` nếu kỳ còn hiệu lực; nếu `ngay_cuoi_ky` đã qua thì tính lại từ hôm nay.
 */
function computeRenewalBlock(
  ky: QlEnrollmentKy | undefined,
  themBuoi: number,
  today0: Date
): {
  buoiConLai: number;
  /** Chỉ ngày hết hạn hiện tại (hoặc thông báo ngắn khi thiếu dữ liệu). */
  hienTaiHetHanMain: string;
  /** Dòng phụ: «Bạn còn … ngày học» hoặc nhắc kỳ đã hết / tính từ hôm nay. */
  hienTaiHetHanSub: string | null;
  newEndDate: Date | null;
  tongBuoi: number;
  extendFootnote: string;
} {
  const dau = parseLocalDateFromIso(ky?.ngayDauKy ?? null);
  const cuoi = parseLocalDateFromIso(ky?.ngayCuoiKy ?? null);

  let buoiConLai = 0;
  let hienTaiHetHanMain: string;
  let hienTaiHetHanSub: string | null = null;

  if (cuoi) {
    const diff = diffCalendarDays(today0, cuoi);
    buoiConLai = diff < 0 ? 0 : diff + 1;
    hienTaiHetHanMain = formatViDate(cuoi);
    if (cuoi < today0) {
      hienTaiHetHanSub = "Kỳ đã hết. Gia hạn trên đơn này tính từ hôm nay.";
    } else {
      hienTaiHetHanSub =
        buoiConLai > 0
          ? `Bạn còn ${buoiConLai} ngày học.`
          : "Bạn còn 0 ngày học trong kỳ hiện tại.";
    }
  } else if (dau) {
    hienTaiHetHanMain = "Chưa có ngày hết hạn kỳ";
    hienTaiHetHanSub = `Kỳ bắt đầu ${formatViDate(dau)}`;
  } else {
    hienTaiHetHanMain = "Chưa có kỳ trên hệ thống";
    hienTaiHetHanSub = "Nếu gia hạn, ngày mới tính từ hôm nay.";
  }

  let newEndDate: Date | null = null;
  let extendFootnote =
    "Ngày hết hạn khóa học sau thanh toán = hôm nay + số buổi gói (ngày lịch, cùng quy ước với đơn).";
  if (themBuoi > 0) {
    if (cuoi && cuoi >= today0) {
      newEndDate = addCalendarDays(cuoi, themBuoi);
      extendFootnote =
        "Ngày hết hạn khóa học = ngày hết hạn hiện tại + số buổi gói (ngày lịch). Đơn có thể neo theo ngày thanh toán — xem hồ sơ sau khi đồng bộ.";
    } else {
      newEndDate = addCalendarDays(today0, themBuoi);
      extendFootnote =
        cuoi != null && cuoi < today0
          ? "Ngày cuối kỳ cũ đã qua — gia hạn tính từ hôm nay + số buổi gói (ngày lịch)."
          : "Ngày hết hạn khóa học = hôm nay + số buổi gói (ngày lịch).";
    }
  }

  const tongBuoi = buoiConLai + themBuoi;
  return {
    buoiConLai,
    hienTaiHetHanMain,
    hienTaiHetHanSub,
    newEndDate,
    tongBuoi,
    extendFootnote,
  };
}

function classSeatBadge(cls: PaymentClassItem): { className: string; label: string } {
  if (cls.isFull) {
    return { className: "dhp-oc-badge dhp-oc-badge--full", label: "Đã đầy" };
  }
  if (cls.total > 0 && cls.filled / cls.total >= 0.8) {
    return { className: "dhp-oc-badge dhp-oc-badge--almost", label: "Sắp đầy" };
  }
  return { className: "dhp-oc-badge dhp-oc-badge--open", label: "Còn chỗ" };
}

/**
 * Chỉ dùng `feeByClassId` nếu gói đó thuộc đúng môn của lớp — tránh gửi id cũ (vd. 1)
 * sau khi đổi lớp/môn hoặc đồng bộ catalog, gây lỗi «Không tìm thấy gói học phí» trên API.
 */
function pickFeeIdForClass(
  cls: PaymentClassItem,
  feesByMon: Record<number, PaymentFeeItem[]>,
  feeByClassId: Record<number, number>
): number | undefined {
  const fees = feesByMon[cls.monHocId] ?? [];
  if (!fees.length) return undefined;
  const pref = feeByClassId[cls.id];
  if (pref != null && fees.some((f) => f.id === pref)) return pref;
  return fees[0]?.id;
}

async function loadQlEnrollmentKyFromHp(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>,
  qlRows: unknown[],
  lopCatalog: PaymentClassItem[]
): Promise<{
  lopIdsOrdered: number[];
  kyByLop: Record<number, QlEnrollmentKy>;
  qlhvIdByLop: Record<number, number>;
}> {
  const knownLop = new Set(lopCatalog.map((c) => c.id));
  const { lopIdsOrdered, qlhvIdByLop } = firstQlhvPerLopFromQlRows(qlRows, knownLop);
  const ids = Object.values(qlhvIdByLop).filter((n) => Number.isFinite(n) && n > 0);
  const kyMap = await fetchKyByKhoaHocVienIds(supabase, ids);
  const kyByLop = qlEnrollmentKyByLopFromHpMap(qlhvIdByLop, kyMap) as Record<number, QlEnrollmentKy>;
  return { lopIdsOrdered, kyByLop, qlhvIdByLop };
}

/** Lớp đang ghi danh (`ql_quan_ly_hoc_vien.lop_hoc`) → chọn sẵn + gói mặc định theo môn */
function buildEnrollmentSelection(
  enrolledLopIds: readonly number[] | undefined,
  lopHoc: PaymentClassItem[],
  goiHocPhi: PaymentFeeItem[]
): { selectedClassIds: number[]; feeByClassId: Record<number, number> } {
  const feesByMon: Record<number, PaymentFeeItem[]> = {};
  for (const fee of goiHocPhi) {
    feesByMon[fee.monHocId] = feesByMon[fee.monHocId]
      ? [...feesByMon[fee.monHocId], fee]
      : [fee];
  }
  const valid =
    enrolledLopIds?.filter((id) => lopHoc.some((c) => c.id === id)) ?? [];
  const feeByClassId: Record<number, number> = {};
  for (const id of valid) {
    const cls = lopHoc.find((c) => c.id === id);
    if (!cls) continue;
    const f = feesByMon[cls.monHocId]?.[0];
    if (f) feeByClassId[id] = f.id;
  }
  return { selectedClassIds: valid, feeByClassId };
}

function initialActiveMonIdForEnrollment(
  enrolledClassIds: number[],
  lopHoc: PaymentClassItem[],
  preselectedMonId: number | null,
  guessedMon: number | null,
  monHoc: PaymentMonItem[]
): number | null {
  if (enrolledClassIds.length > 0) {
    const cls = lopHoc.find((c) => c.id === enrolledClassIds[0]);
    if (cls) return cls.monHocId;
  }
  return preselectedMonId ?? guessedMon ?? monHoc[0]?.id ?? null;
}

/** Dự kiến buổi / ngày sau gia hạn — cùng logic «Ngày hết hạn khóa học» ở bước 3. */
function renewalPreviewAfterPay(
  cls: PaymentClassItem,
  monPayLabel: string,
  skipRenew: boolean,
  fee: PaymentFeeItem | undefined,
  ky: QlEnrollmentKy | undefined
): {
  courseLabel: string;
  sessionsCell: string;
  expiryCell: string;
  rowNote: string | null;
} {
  const courseLabel = `${monPayLabel} · ${cls.tenLop}`;
  if (skipRenew) {
    return {
      courseLabel,
      sessionsCell: "—",
      expiryCell: "—",
      rowNote: "Không gia hạn trên đơn này — hạn khóa không đổi theo lần thanh toán này.",
    };
  }
  if (!fee) {
    return {
      courseLabel,
      sessionsCell: "—",
      expiryCell: "—",
      rowNote: null,
    };
  }
  const themBuoi =
    fee.soBuoi != null && Number.isFinite(fee.soBuoi)
      ? Math.max(0, Math.round(fee.soBuoi))
      : 0;
  const today0 = startOfTodayLocal();
  const block = computeRenewalBlock(ky, themBuoi, today0);
  const sessionsCell = `${block.tongBuoi} buổi`;
  if (themBuoi <= 0) {
    return {
      courseLabel,
      sessionsCell,
      expiryCell: "—",
      rowNote:
        "Gói không cộng buổi theo lịch (so_buoi = 0) — không ước lượng ngày mới từ số buổi.",
    };
  }
  return {
    courseLabel,
    sessionsCell,
    expiryCell: block.newEndDate ? formatViDate(block.newEndDate) : "—",
    rowNote: block.extendFootnote,
  };
}

type Step = 1 | 2 | 3;

type ReceiptMailUi =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "sent" }
  | { phase: "skipped"; reason?: string }
  | { phase: "failed"; detail?: string };

function receiptSkipUserMessage(reason: string | undefined): string {
  switch (reason) {
    case "no_resend_key":
      return "Chưa cấu hình RESEND_API_KEY trên server — chưa gửi email biên nhận.";
    case "bad_email":
      return "Hồ sơ chưa có email hợp lệ — không gửi được biên nhận.";
    case "chi_read":
    case "no_line_items":
      return "Thiếu dữ liệu chi tiết đơn — không gửi email biên nhận.";
    case "don_read":
    case "no_student":
    case "hv_read":
      return "Không đọc được thông tin học viên/đơn để gửi email.";
    case "sync_not_paid_yet":
      return "Server chưa ghi nhận trạng thái «Đã thanh toán» — thử tải lại trang sau vài giây hoặc liên hệ Sine Art.";
    default:
      return "Không gửi được biên nhận qua email.";
  }
}

function PaymentReceiptMailLine({
  ui,
  variant = "modal",
}: {
  ui: ReceiptMailUi;
  variant?: "modal" | "inline";
}) {
  if (ui.phase === "idle") return null;
  const cls =
    variant === "inline"
      ? "dhp-receipt-mail dhp-receipt-mail--inline"
      : "dhp-receipt-mail";
  if (ui.phase === "sending") {
    return (
      <p className={`${cls} dhp-receipt-mail--pending`} role="status">
        Đang gửi biên nhận tới email…
      </p>
    );
  }
  if (ui.phase === "sent") {
    return (
      <p className={`${cls} dhp-receipt-mail--ok`} role="status">
        Đã gửi biên nhận thanh toán tới email của bạn.
      </p>
    );
  }
  if (ui.phase === "skipped") {
    return (
      <p className={`${cls} dhp-receipt-mail--skip`} role="status">
        {receiptSkipUserMessage(ui.reason)}
      </p>
    );
  }
  return (
    <p className={`${cls} dhp-receipt-mail--err`} role="status">
      <span className="dhp-receipt-mail-err-title">Gửi email biên nhận không thành công.</span>
      {ui.detail ? (
        <span className="dhp-receipt-mail-err-detail">{ui.detail}</span>
      ) : null}
      <span className="dhp-receipt-mail-err-foot">
        Bạn vẫn có thể lưu biên nhận từ trang này.
      </span>
    </p>
  );
}

function Stepper({ step, paymentComplete }: { step: Step; paymentComplete?: boolean }) {
  const s1 = step === 1 ? "active" : step > 1 ? "done" : "idle";
  const s2 = step === 2 ? "active" : step > 2 ? "done" : "idle";
  const s3 = paymentComplete ? "done" : step === 3 ? "active" : "idle";

  return (
    <div className="dhp-stepper" aria-label="Tiến trình đăng ký">
      <div className={`dhp-step dhp-step--${s1}`}>
        <div className="dhp-step-num">{step > 1 ? "✓" : "1"}</div>
        <span className="dhp-step-lbl">{step > 1 ? "Tài khoản" : "Tạo tài khoản"}</span>
      </div>
      <div className="dhp-step-line" aria-hidden />
      <div className={`dhp-step dhp-step--${s2}`}>
        <div className="dhp-step-num">{step > 2 ? "✓" : "2"}</div>
        <span className="dhp-step-lbl">{step > 2 ? "Lớp học" : "Chọn lớp"}</span>
      </div>
      <div className="dhp-step-line" aria-hidden />
      <div className={`dhp-step dhp-step--${s3}`}>
        <div className="dhp-step-num">{paymentComplete ? "✓" : "3"}</div>
        <span className="dhp-step-lbl">{paymentComplete ? "Hoàn tất" : "Thanh toán"}</span>
      </div>
    </div>
  );
}

function sexFromProfile(raw: string | null | undefined): string {
  if (!raw?.trim()) return SEX_OPTIONS[0];
  const s = raw.trim();
  return (SEX_OPTIONS as readonly string[]).includes(s) ? s : SEX_OPTIONS[0];
}

function applyStep1FieldsToState(p: QlHocVienStep1Fields): {
  fullName: string;
  phone: string;
  email: string;
  sex: string;
  namThi: string;
  loaiKhoaHoc: string;
  facebook: string;
  avatarUrl: string | null;
} {
  return {
    fullName: p.full_name,
    phone: p.sdt,
    email: p.email,
    sex: sexFromProfile(p.sex),
    namThi:
      p.nam_thi != null && Number.isFinite(p.nam_thi) ? String(p.nam_thi) : "",
    loaiKhoaHoc: p.loai_khoa_hoc?.trim() || LOAI_KHOA_HOC_DEFAULT,
    facebook: p.facebook?.trim() ?? "",
    avatarUrl: p.avatar?.trim() || null,
  };
}

export default function DongHocPhiClient({
  monHoc,
  lopHoc,
  goiHocPhi,
  hocPhiCombos = [],
  hocPhiGois = [],
  preselectedMonId,
  initialCourseName,
  initialEmail,
  existingHocVien,
  initialEnrolledClassIds,
  initialQlKyByLopId = {},
  initialQlhvIdByLopId = {},
  dhCatalog = null,
  initialNguyenVong = null,
  initialHocVienId = null,
  initialAvatarUrl = null,
}: {
  monHoc: PaymentMonItem[];
  lopHoc: PaymentClassItem[];
  goiHocPhi: PaymentFeeItem[];
  /** `hp_combo_mon` gộp theo môn — khớp `HocPhiBlock` */
  hocPhiCombos?: HocPhiComboRow[];
  /** Toàn bộ dòng gói (kèm combo) để biết combo cần những môn nào */
  hocPhiGois?: HocPhiGoiRow[];
  preselectedMonId: number | null;
  initialCourseName: string | null;
  initialEmail?: string | null;
  /** Hồ sơ đã có (tra email trên server) — vào thẳng bước chọn lớp */
  existingHocVien?: QlHocVienStep1Fields | null;
  /** `lop_hoc` từ `ql_quan_ly_hoc_vien` — chọn sẵn ở bước 2 */
  initialEnrolledClassIds?: number[];
  /** Kỳ học phí theo `lop_hoc` (từ `hp_thu_hp_chi_tiet`, bootstrap server). */
  initialQlKyByLopId?: Record<number, QlEnrollmentKy>;
  /** `ql_quan_ly_hoc_vien.id` mới nhất theo `lop_hoc` (cùng bản ghi với kỳ ở trên). */
  initialQlhvIdByLopId?: Record<number, number>;
  /** Trường / ngành từ `dh_*` + junction — null nếu lỗi tải catalog. */
  dhCatalog?: DhpDhCatalog | null;
  /** `ql_hv_truong_nganh` khi mở trang kèm email. */
  initialNguyenVong?: DhpInitialNguyenVongRow[] | null;
  /** Có khi mở trang kèm email đã tồn tại trong `ql_thong_tin_hoc_vien` — dùng cập nhật avatar trước khi tạo đơn. */
  initialHocVienId?: number | null;
  /** Ảnh đại diện từ DB khi tra email (kể cả hồ sơ chưa đủ để bỏ qua bước 1). */
  initialAvatarUrl?: string | null;
}) {
  const guessedMon = useMemo(() => {
    if (!initialCourseName) return null;
    const key = initialCourseName.toLowerCase();
    return monHoc.find((m) => key.includes(m.tenMonHoc.toLowerCase()))?.id ?? null;
  }, [initialCourseName, monHoc]);

  const skipStep1Boot = useMemo(() => {
    if (!existingHocVien || !profileCompleteForSkipStep1(existingHocVien)) return null;
    return applyStep1FieldsToState(existingHocVien);
  }, [existingHocVien]);

  const enrollmentBootstrap = useMemo(
    () =>
      buildEnrollmentSelection(
        initialEnrolledClassIds ?? NO_ENROLLED_CLASS_IDS,
        lopHoc,
        goiHocPhi
      ),
    [initialEnrolledClassIds, lopHoc, goiHocPhi]
  );

  const [step, setStep] = useState<Step>(() => (skipStep1Boot ? 2 : 1));
  const [fullName, setFullName] = useState(() => skipStep1Boot?.fullName ?? "");
  const [phone, setPhone] = useState(() => skipStep1Boot?.phone ?? "");
  const [email, setEmail] = useState(() => skipStep1Boot?.email ?? initialEmail ?? "");
  const [sex, setSex] = useState<string>(() => skipStep1Boot?.sex ?? SEX_OPTIONS[0]);
  const [namThi, setNamThi] = useState<string>(
    () => skipStep1Boot?.namThi ?? String(new Date().getFullYear())
  );
  const [loaiKhoaHoc, setLoaiKhoaHoc] = useState<string>(
    () => skipStep1Boot?.loaiKhoaHoc ?? LOAI_KHOA_HOC_DEFAULT
  );
  const [facebook, setFacebook] = useState(() => skipStep1Boot?.facebook ?? "");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    skipStep1Boot?.avatarUrl ?? initialAvatarUrl ?? null
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const avatarInitials = useMemo(() => {
    const n = fullName.trim();
    if (!n) return "";
    return n
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase() ?? "")
      .join("");
  }, [fullName]);

  const handleAvatarFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setAvatarError("Vui lòng chọn file ảnh (JPEG, PNG, …).");
        return;
      }
      if (file.size > AVATAR_MAX_BYTES) {
        setAvatarError("Ảnh tối đa 8 MB.");
        return;
      }
      setAvatarUploading(true);
      setAvatarError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/phong-hoc/upload-chat-image", { method: "POST", body: fd });
        const j = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (!res.ok || !j.ok || !j.url) {
          throw new Error(j.error ?? "Upload ảnh thất bại.");
        }
        const url = j.url.trim();
        if (initialHocVienId != null && initialHocVienId > 0) {
          const sb = createBrowserSupabaseClient();
          if (!sb) throw new Error("Chưa cấu hình kết nối dữ liệu.");
          const { error } = await sb
            .from("ql_thong_tin_hoc_vien")
            .update({ avatar: url })
            .eq("id", initialHocVienId);
          if (error) throw error;
        }
        setAvatarUrl(url);
      } catch (e) {
        setAvatarError(e instanceof Error ? e.message : "Không lưu được ảnh. Thử lại sau.");
      } finally {
        setAvatarUploading(false);
      }
    },
    [initialHocVienId]
  );

  const [nguyenVongRows, setNguyenVongRows] = useState<DhpNvRowState[]>(() => {
    if (initialNguyenVong && initialNguyenVong.length > 0) {
      return initialNguyenVong.map((r) => ({
        truongId: r.truongId,
        nganhId: r.nganhId,
      }));
    }
    return [{ truongId: "", nganhId: "" }];
  });

  const truongPickOptions = useMemo(() => {
    if (!dhCatalog) return [];
    const withNganh = new Set(Object.keys(dhCatalog.nganhByTruongId));
    return dhCatalog.truong.filter((t) => withNganh.has(String(t.id)));
  }, [dhCatalog]);

  const [step1LookupLoading, setStep1LookupLoading] = useState(false);
  const [step1LookupError, setStep1LookupError] = useState<string | null>(null);

  const [activeMonId, setActiveMonId] = useState<number | null>(() =>
    initialActiveMonIdForEnrollment(
      enrollmentBootstrap.selectedClassIds,
      lopHoc,
      preselectedMonId,
      guessedMon,
      monHoc
    )
  );
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>(
    () => [...enrollmentBootstrap.selectedClassIds]
  );
  /** `lop_hoc` đã ghi danh trên DB (`ql_quan_ly_hoc_vien`); kỳ học đọc từ `hp_thu_hp_chi_tiet`. */
  const [enrolledLopIds, setEnrolledLopIds] = useState<number[]>(() =>
    buildEnrollmentSelection(
      initialEnrolledClassIds ?? NO_ENROLLED_CLASS_IDS,
      lopHoc,
      goiHocPhi
    ).selectedClassIds
  );
  const [feeByClassId, setFeeByClassId] = useState<Record<number, number>>(() => ({
    ...enrollmentBootstrap.feeByClassId,
  }));
  /** Lớp chọn «Không gia hạn» — không đưa vào đơn / không thu kỳ này */
  const [skipRenewalByClassId, setSkipRenewalByClassId] = useState<Record<number, boolean>>({});

  const [qlKyByLopId, setQlKyByLopId] = useState<Record<number, QlEnrollmentKy>>(() => ({
    ...initialQlKyByLopId,
  }));
  const [qlhvIdByLopId, setQlhvIdByLopId] = useState<Record<number, number>>(() => ({
    ...initialQlhvIdByLopId,
  }));

  const refreshEnrolledFromQl = useCallback(
    async (hvId: number) => {
      if (!Number.isFinite(hvId) || hvId <= 0) return;
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;
      const { data: qlRows, error } = await supabase
        .from("ql_quan_ly_hoc_vien")
        .select("id, lop_hoc")
        .eq("hoc_vien_id", hvId)
        .order("id", { ascending: false });
      if (error) {
        setEnrolledLopIds([]);
        return;
      }
      if (!qlRows.length) {
        setEnrolledLopIds([]);
        setQlhvIdByLopId({});
        setQlKyByLopId({});
        return;
      }
      const { lopIdsOrdered, kyByLop, qlhvIdByLop } = await loadQlEnrollmentKyFromHp(supabase, qlRows, lopHoc);
      setEnrolledLopIds(lopIdsOrdered);
      setQlKyByLopId((prev) => ({ ...prev, ...kyByLop }));
      setQlhvIdByLopId((prev) => ({ ...prev, ...qlhvIdByLop }));
    },
    [lopHoc]
  );

  const initialEnrolledKey = useMemo(
    () => (initialEnrolledClassIds ?? []).slice().sort((a, b) => a - b).join(","),
    [initialEnrolledClassIds]
  );

  useEffect(() => {
    setEnrolledLopIds(
      buildEnrollmentSelection(
        initialEnrolledClassIds ?? NO_ENROLLED_CLASS_IDS,
        lopHoc,
        goiHocPhi
      ).selectedClassIds
    );
  }, [initialEnrolledKey, initialEnrolledClassIds, lopHoc, goiHocPhi]);

  const [serverOrder, setServerOrder] = useState<DongHocPhiServerOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paidSnapshot, setPaidSnapshot] = useState<{
    maDon: string;
    maDonSo: string;
    ngayThanhToan: string | null;
  } | null>(null);
  /** Popup biên nhận lớn sau khi CK thành công */
  const [paySuccessModalOpen, setPaySuccessModalOpen] = useState(false);
  const [resolvedHocVienId, setResolvedHocVienId] = useState<number | null>(() =>
    initialHocVienId != null && initialHocVienId > 0 ? initialHocVienId : null
  );
  type DhpRemoveEnrollModal = {
    lopId: number;
    qlhvId: number;
    hocVienId: number;
    daysRemaining: number;
    message: string;
  };
  const [removeEnrollModal, setRemoveEnrollModal] = useState<DhpRemoveEnrollModal | null>(null);
  const [removeEnrollSubmitting, setRemoveEnrollSubmitting] = useState(false);
  const [removingClassId, setRemovingClassId] = useState<number | null>(null);
  const [classRemoveError, setClassRemoveError] = useState<string | null>(null);
  const [pollWaitingPayment, setPollWaitingPayment] = useState(false);
  const [receiptMailUi, setReceiptMailUi] = useState<ReceiptMailUi>({ phase: "idle" });

  const syncChiTietAttemptedRef = useRef<number | null>(null);
  /** true nếu đã áp dụng bản lưu localStorage (kể cả `classIds: []`) — tránh effect bước 2 fetch lại full lớp. */
  const pickRestoredFromLsRef = useRef(false);
  const pickHydratedForEmailRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const em = email.trim().toLowerCase();
    if (!isValidStudentEmail(em)) {
      pickHydratedForEmailRef.current = null;
      return;
    }
    if (!lopHoc.length) return;
    if (pickHydratedForEmailRef.current === em) return;

    pickHydratedForEmailRef.current = em;
    pickRestoredFromLsRef.current = false;

    const rawStored = readDhpStoredPickRaw();
    if (!rawStored || rawStored.emailNorm.trim().toLowerCase() !== em) return;

    const m = materializeStoredClassPick(rawStored, lopHoc, goiHocPhi);
    pickRestoredFromLsRef.current = true;
    setSelectedClassIds(m.classIds);
    setFeeByClassId(m.feeByClassId);
    setSkipRenewalByClassId(m.skipRenewalByClassId);
  }, [email, lopHoc, goiHocPhi]);

  useEffect(() => {
    const em = email.trim().toLowerCase();
    if (!isValidStudentEmail(em) || paymentComplete) return;
    writeDhpClassPickToStorage(em, selectedClassIds, feeByClassId, skipRenewalByClassId);
  }, [email, selectedClassIds, feeByClassId, skipRenewalByClassId, paymentComplete]);

  useEffect(() => {
    if (!paymentComplete) return;
    clearDhpClassPickStorage();
  }, [paymentComplete]);

  useEffect(() => {
    setReceiptMailUi({ phase: "idle" });
  }, [serverOrder?.donId]);

  useEffect(() => {
    if (initialHocVienId != null && initialHocVienId > 0) {
      setResolvedHocVienId((prev) => prev ?? initialHocVienId);
    }
  }, [initialHocVienId]);

  useEffect(() => {
    if (!paymentComplete) return;
    const hid = serverOrder?.hocVienId ?? initialHocVienId;
    if (hid != null && Number.isFinite(hid) && hid > 0) {
      void refreshEnrolledFromQl(hid);
    }
  }, [paymentComplete, serverOrder?.hocVienId, initialHocVienId, refreshEnrolledFromQl]);

  const classesForTab = useMemo(
    () => lopHoc.filter((c) => c.monHocId === activeMonId),
    [lopHoc, activeMonId]
  );

  const selectedClasses = useMemo(
    () => lopHoc.filter((c) => selectedClassIds.includes(c.id)),
    [lopHoc, selectedClassIds]
  );

  /**
   * Strip phía trên grid: **mọi** lớp đang tick (`selectedClassIds`) — khớp 1–1 với thẻ lớp. Bấm ×: lớp đã có trong
   * `enrolledLopIds` → gọi API xóa `ql_quan_ly_hoc_vien` (+ học phí liên quan); lớp chỉ chọn trên trang → bỏ khỏi
   * đơn (local). `enrolledLopIds` + `qlhvIdByLopId` phục vụ nhánh xóa DB và kỳ học.
   */
  const selectedClassesStrip = useMemo(() => {
    const selected = new Set(selectedClassIds);
    const items = lopHoc.filter((c) => selected.has(c.id));
    return [...items].sort((a, b) => {
      const ma = monHoc.find((m) => m.id === a.monHocId)?.tenMonHoc ?? "";
      const mb = monHoc.find((m) => m.id === b.monHocId)?.tenMonHoc ?? "";
      const cmp = ma.localeCompare(mb, "vi");
      if (cmp !== 0) return cmp;
      return a.tenLop.localeCompare(b.tenLop, "vi");
    });
  }, [lopHoc, selectedClassIds, monHoc]);

  const availableFeeByMon = useMemo(() => {
    const map: Record<number, PaymentFeeItem[]> = {};
    for (const fee of goiHocPhi) {
      map[fee.monHocId] = map[fee.monHocId] ? [...map[fee.monHocId], fee] : [fee];
    }
    return map;
  }, [goiHocPhi]);

  const subtotalGoiDong = useMemo(() => {
    return selectedClasses.reduce((sum, cls) => {
      if (skipRenewalByClassId[cls.id]) return sum;
      const feeId = pickFeeIdForClass(cls, availableFeeByMon, feeByClassId);
      const selectedFee =
        feeId != null ? goiHocPhi.find((f) => f.id === feeId) : undefined;
      return sum + (selectedFee?.giaThucDong ?? 0);
    }, 0);
  }, [selectedClasses, skipRenewalByClassId, availableFeeByMon, feeByClassId, goiHocPhi]);

  const payingComboLines = useMemo(() => {
    const out: {
      monHocId: number;
      number: number;
      donVi: string;
      comboId: number | null;
    }[] = [];
    for (const cls of selectedClasses) {
      if (skipRenewalByClassId[cls.id]) continue;
      const feeId = pickFeeIdForClass(cls, availableFeeByMon, feeByClassId);
      if (feeId == null) continue;
      const fee = goiHocPhi.find((f) => f.id === feeId);
      if (!fee) continue;
      out.push({
        monHocId: cls.monHocId,
        number: fee.numberValue,
        donVi: fee.donVi,
        comboId: fee.comboId ?? null,
      });
    }
    return out;
  }, [selectedClasses, skipRenewalByClassId, availableFeeByMon, feeByClassId, goiHocPhi]);

  const comboDiscountDong = useMemo(
    () =>
      firstApplicableComboDiscountDong(payingComboLines, hocPhiCombos, hocPhiGois),
    [payingComboLines, hocPhiCombos, hocPhiGois]
  );

  const total = useMemo(
    () => Math.max(0, Math.round(subtotalGoiDong) - Math.round(comboDiscountDong)),
    [subtotalGoiDong, comboDiscountDong]
  );

  const summaryLineDiscountDong = useMemo(() => {
    return selectedClasses.reduce((acc, cls) => {
      if (skipRenewalByClassId[cls.id]) return acc;
      const feeId = pickFeeIdForClass(cls, availableFeeByMon, feeByClassId);
      if (feeId == null) return acc;
      const fee = goiHocPhi.find((f) => f.id === feeId);
      if (!fee) return acc;
      const goc = Math.max(0, Math.round(fee.giaGoc));
      const thuc = Math.max(0, Math.round(fee.giaThucDong));
      return acc + Math.max(0, goc - thuc);
    }, 0);
  }, [selectedClasses, skipRenewalByClassId, availableFeeByMon, feeByClassId, goiHocPhi]);

  /** Chiết khấu % gói + `gia_giam` combo (`hp_combo_mon`) khi đủ điều kiện — khớp `HocPhiBlock`. */
  const summaryDiscountTotalDong = useMemo(
    () => summaryLineDiscountDong + Math.max(0, Math.round(comboDiscountDong)),
    [summaryLineDiscountDong, comboDiscountDong]
  );

  /** Mã tạm (preview) — sau khi tạo đơn dùng `serverOrder.maDonSo` từ DB. */
  const transferCode = useMemo(() => {
    const seed = `${email}|${phone}|${selectedClassIds.join(",")}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) % 1000000;
    }
    const code = String(Math.abs(hash)).padStart(6, "0");
    return `SA${code}`;
  }, [email, phone, selectedClassIds]);

  const linesKey = useMemo(
    () =>
      [...selectedClassIds]
        .sort((a, b) => a - b)
        .map((id) => {
          if (skipRenewalByClassId[id]) return `${id}:skip`;
          const c = lopHoc.find((x) => x.id === id);
          const fid = c
            ? pickFeeIdForClass(c, availableFeeByMon, feeByClassId)
            : undefined;
          return `${id}:${fid ?? ""}`;
        })
        .join("|"),
    [selectedClassIds, skipRenewalByClassId, lopHoc, availableFeeByMon, feeByClassId]
  );

  useEffect(() => {
    setServerOrder(null);
    setOrderError(null);
    setPaymentComplete(false);
    setPaidSnapshot(null);
    setPollWaitingPayment(false);
    syncChiTietAttemptedRef.current = null;
    setSkipRenewalByClassId((prev) => {
      const next: Record<number, boolean> = {};
      for (const id of selectedClassIds) {
        if (prev[id]) next[id] = true;
      }
      return next;
    });
  }, [linesKey, selectedClassIds]);

  useEffect(() => {
    if (!paymentComplete) setPaySuccessModalOpen(false);
  }, [paymentComplete]);

  useEffect(() => {
    if (paymentComplete && paidSnapshot) setPaySuccessModalOpen(true);
  }, [paymentComplete, paidSnapshot]);

  useEffect(() => {
    if (!paySuccessModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaySuccessModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paySuccessModalOpen]);

  useEffect(() => {
    if (!paySuccessModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [paySuccessModalOpen]);

  useEffect(() => {
    if (!removeEnrollModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !removeEnrollSubmitting) {
        setClassRemoveError(null);
        setRemoveEnrollModal(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeEnrollModal, removeEnrollSubmitting]);

  useEffect(() => {
    if (!removeEnrollModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [removeEnrollModal]);

  /** Bước 2: đồng bộ `enrolledLopIds` từ `ql_quan_ly_hoc_vien` và kỳ từ `hp_thu_hp_chi_tiet`; chỉ bootstrap `selectedClassIds` khi chưa chọn (và không vừa restore từ localStorage). */
  useEffect(() => {
    if (step !== 2 || !isValidStudentEmail(email)) return;

    let cancelled = false;
    const em = email.trim().toLowerCase();

    void (async () => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase || cancelled) return;

      const { data: hv, error: hvErr } = await supabase
        .from("ql_thong_tin_hoc_vien")
        .select("id")
        .eq("email", em)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || hvErr || hv == null) return;
      const hvId = Number((hv as { id: unknown }).id);
      if (!Number.isFinite(hvId) || hvId <= 0) return;
      if (!cancelled) {
        setResolvedHocVienId(hvId);
      }

      const { data: qlRows, error: qlErr } = await supabase
        .from("ql_quan_ly_hoc_vien")
        .select("id, lop_hoc")
        .eq("hoc_vien_id", hvId)
        .order("id", { ascending: false });

      if (cancelled) return;
      if (qlErr) {
        if (!cancelled) setEnrolledLopIds([]);
        return;
      }
      if (!qlRows.length) {
        if (!cancelled) {
          setEnrolledLopIds([]);
          setQlhvIdByLopId({});
          setQlKyByLopId({});
        }
        return;
      }

      const { lopIdsOrdered, kyByLop: kyMerge, qlhvIdByLop: hvMerge } = await loadQlEnrollmentKyFromHp(
        supabase,
        qlRows,
        lopHoc
      );
      const { selectedClassIds: validIds, feeByClassId: fees } = buildEnrollmentSelection(
        lopIdsOrdered,
        lopHoc,
        goiHocPhi
      );

      if (cancelled) return;

      setEnrolledLopIds(lopIdsOrdered);
      setQlKyByLopId((prev) => ({ ...prev, ...kyMerge }));
      setQlhvIdByLopId((prev) => ({ ...prev, ...hvMerge }));

      if (validIds.length === 0) return;

      const skipPickBootstrap = pickRestoredFromLsRef.current;
      setSelectedClassIds((prev) => {
        if (prev.length > 0 || skipPickBootstrap) return prev;
        return validIds;
      });
      setFeeByClassId((prev) => {
        if (Object.keys(prev).length > 0 || skipPickBootstrap) return prev;
        return { ...fees };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [step, email, lopHoc, goiHocPhi]);

  /** Bước 3: làm mới ghi danh + kỳ từ `ql_quan_ly_hoc_vien` + `hp_thu_hp_chi_tiet` (kể cả khi không qua URL có email). */
  useEffect(() => {
    if (step !== 3 || !isValidStudentEmail(email)) return;

    let cancelled = false;
    const em = email.trim().toLowerCase();

    void (async () => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase || cancelled) return;

      const { data: hv, error: hvErr } = await supabase
        .from("ql_thong_tin_hoc_vien")
        .select("id")
        .eq("email", em)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || hvErr || hv == null) return;
      const hvId = Number((hv as { id: unknown }).id);
      if (!Number.isFinite(hvId) || hvId <= 0) return;
      if (!cancelled) setResolvedHocVienId(hvId);

      const { data: qlRows, error: qlErr } = await supabase
        .from("ql_quan_ly_hoc_vien")
        .select("id, lop_hoc")
        .eq("hoc_vien_id", hvId)
        .order("id", { ascending: false });

      if (cancelled || qlErr || !qlRows?.length) return;

      const { lopIdsOrdered, kyByLop: kyMerge, qlhvIdByLop: hvMerge } = await loadQlEnrollmentKyFromHp(
        supabase,
        qlRows,
        lopHoc
      );
      if (Object.keys(kyMerge).length === 0 && lopIdsOrdered.length === 0) return;
      setQlKyByLopId((prev) => ({ ...prev, ...kyMerge }));
      setQlhvIdByLopId((prev) => ({ ...prev, ...hvMerge }));
      if (lopIdsOrdered.length > 0) setEnrolledLopIds(lopIdsOrdered);
    })();

    return () => {
      cancelled = true;
    };
  }, [step, email, lopHoc]);

  /** Poll trạng thái đơn (brief §6): 3s khi CK + chờ thanh toán. */
  useEffect(() => {
    if (step !== 3 || !serverOrder || paymentComplete) {
      setPollWaitingPayment(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setPollWaitingPayment(false);
      return;
    }
    const client = supabase;
    const order = serverOrder;

    let cancelled = false;
    const pollTimer = { id: null as ReturnType<typeof setInterval> | null };

    async function tick(): Promise<void> {
      const { data, error } = await client
        .from("hp_don_thu_hoc_phi")
        .select("status, ngay_thanh_toan, ma_don, ma_don_so")
        .eq("id", order.donId)
        .maybeSingle();

      if (cancelled) return;
      if (error) return;

      const row = data as {
        status?: string | null;
        ngay_thanh_toan?: string | null;
        ma_don?: string | null;
        ma_don_so?: string | null;
      } | null;

      const st = String(row?.status ?? "").trim();
      if (st === HP_DA_THANH_TOAN) {
        if (pollTimer.id != null) clearInterval(pollTimer.id);
        pollTimer.id = null;
        setPollWaitingPayment(false);
        setPaidSnapshot({
          maDon: String(row?.ma_don ?? order.maDon ?? "").trim(),
          maDonSo: String(row?.ma_don_so ?? order.maDonSo ?? "").trim(),
          ngayThanhToan:
            row?.ngay_thanh_toan != null ? String(row.ngay_thanh_toan) : null,
        });
        setPaymentComplete(true);

        if (syncChiTietAttemptedRef.current !== order.donId) {
          syncChiTietAttemptedRef.current = order.donId;
          setReceiptMailUi({ phase: "sending" });
          void (async () => {
            const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
            type SyncJson = {
              ok?: boolean;
              code?: string;
              error?: string;
              receiptEmail?: {
                sent?: boolean;
                reason?: string;
                error?: string;
                hint?: string;
              };
            };
            try {
              let res!: Response;
              let data: SyncJson = {};
              for (let attempt = 0; attempt < 4; attempt++) {
                res = await fetch("/api/donghocphi/sync-chi-tiet", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ donId: order.donId }),
                });
                data = (await res.json().catch(() => ({}))) as SyncJson;
                if (res.status === 409 && data.code === "NOT_PAID" && attempt < 3) {
                  await sleep(2500);
                  continue;
                }
                break;
              }

              if (res.status === 409 && data.code === "NOT_PAID") {
                setReceiptMailUi({ phase: "skipped", reason: "sync_not_paid_yet" });
                return;
              }

              if (!res.ok || data.ok !== true || !data.receiptEmail) {
                const srv = String(data.error ?? "").trim().slice(0, 200);
                setReceiptMailUi({
                  phase: "failed",
                  detail: srv || `Đồng bộ đơn thất bại (HTTP ${res.status}).`,
                });
                return;
              }

              const re = data.receiptEmail;
              if (re.sent) {
                setReceiptMailUi({ phase: "sent" });
                return;
              }
              if (re.error === "resend_failed") {
                setReceiptMailUi({
                  phase: "failed",
                  detail: "Lỗi không xác định khi gửi mail — xem log server.",
                });
                return;
              }
              if (re.reason === "resend_api" || re.reason === "resend_network") {
                setReceiptMailUi({
                  phase: "failed",
                  detail: re.hint?.trim()
                    ? re.hint.trim().slice(0, 240)
                    : "Resend từ chối hoặc lỗi mạng — kiểm tra API key, RESEND_FROM và domain verify.",
                });
                return;
              }
              setReceiptMailUi({ phase: "skipped", reason: re.reason });
            } catch {
              setReceiptMailUi({
                phase: "failed",
                detail: "Không kết nối được tới server.",
              });
            }
          })();
        }
        return;
      }

      if (st === HP_CHO_THANH_TOAN || st === "") {
        setPollWaitingPayment(true);
      }
    }

    setPollWaitingPayment(true);
    void tick();
    pollTimer.id = setInterval(() => void tick(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollTimer.id != null) clearInterval(pollTimer.id);
    };
  }, [step, serverOrder, paymentComplete]);

  const qrContentCode = serverOrder?.maDonSo ?? transferCode;
  const pseudoQrDonId = useMemo(
    () => pseudoDonIdFromSeed(transferCode),
    [transferCode]
  );
  const qrDonIdForBank = serverOrder?.donId ?? pseudoQrDonId;
  const invoiceForQr = serverOrder?.invoiceTotalDong ?? total;

  const qrPayment = useMemo(
    () => resolveQrPaymentAmounts(qrContentCode, invoiceForQr),
    [qrContentCode, invoiceForQr]
  );

  const qrRecipient = useMemo(
    () => getTpBankQrRecipient(qrDonIdForBank),
    [qrDonIdForBank]
  );

  const vietQrImageUrl = useMemo(() => {
    if (!serverOrder) return "";
    if (invoiceForQr <= 0 || !qrContentCode.trim()) return "";
    if (qrPayment.qrAmountDong <= 0) return "";
    return buildVietQrImageUrl(
      qrContentCode,
      qrPayment.qrAmountDong,
      qrDonIdForBank
    );
  }, [serverOrder, invoiceForQr, qrContentCode, qrPayment.qrAmountDong, qrDonIdForBank]);

  const displayInvoiceTotal = serverOrder?.invoiceTotalDong ?? total;

  const canCreateOrder = useMemo(() => {
    const paying = selectedClasses.filter((c) => !skipRenewalByClassId[c.id]);
    if (paying.length === 0 || total <= 0) return false;
    for (const c of paying) {
      if (pickFeeIdForClass(c, availableFeeByMon, feeByClassId) == null) {
        return false;
      }
    }
    return true;
  }, [selectedClasses, skipRenewalByClassId, total, availableFeeByMon, feeByClassId]);

  const canGoStep2 =
    fullName.trim().length > 1 &&
    phone.trim().length > 7 &&
    isValidStudentEmail(email) &&
    facebook.trim().length > 0;

  const canGoStep3 = selectedClassIds.length > 0;

  function clearFeeForClass(id: number): void {
    setFeeByClassId((feePrev) => {
      const clone = { ...feePrev };
      delete clone[id];
      return clone;
    });
  }

  function removeFromPickLocal(lopId: number): void {
    setSelectedClassIds((prev) => prev.filter((v) => v !== lopId));
    clearFeeForClass(lopId);
    setSkipRenewalByClassId((sp) => {
      const next = { ...sp };
      delete next[lopId];
      return next;
    });
  }

  function finalizeRemoveClassAfterDbDelete(lopId: number): void {
    removeFromPickLocal(lopId);
    setEnrolledLopIds((prev) => prev.filter((x) => x !== lopId));
    setQlKyByLopId((prev) => {
      const next = { ...prev };
      delete next[lopId];
      return next;
    });
    setQlhvIdByLopId((prev) => {
      const next = { ...prev };
      delete next[lopId];
      return next;
    });
  }

  async function confirmRemoveEnrolledFromModal(): Promise<void> {
    const m = removeEnrollModal;
    if (!m) return;
    const em = email.trim().toLowerCase();
    setRemoveEnrollSubmitting(true);
    setClassRemoveError(null);
    try {
      const res = await fetch("/api/hoc-vien/delete-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qlhv_id: m.qlhvId,
          hoc_vien_id: m.hocVienId,
          email: em,
          acknowledge_active_enrollment: true,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        error?: string;
        message?: string;
      };
      if (res.ok && j.ok) {
        setRemoveEnrollModal(null);
        finalizeRemoveClassAfterDbDelete(m.lopId);
        return;
      }
      setClassRemoveError(
        j.error ?? j.message ?? (res.status === 409 ? "Vẫn cần xác nhận trước khi xóa." : "Không xóa được ghi danh.")
      );
    } catch {
      setClassRemoveError("Lỗi mạng. Thử lại sau.");
    } finally {
      setRemoveEnrollSubmitting(false);
    }
  }

  async function requestRemoveClassFromStrip(lopId: number): Promise<void> {
    setClassRemoveError(null);
    const isEnrolled = enrolledLopIds.includes(lopId);
    if (!isEnrolled) {
      removeFromPickLocal(lopId);
      return;
    }
    const qlhvId = qlhvIdByLopId[lopId];
    const em = email.trim().toLowerCase();
    const hvId = serverOrder?.hocVienId ?? resolvedHocVienId ?? initialHocVienId ?? null;
    if (!isValidStudentEmail(em)) {
      setClassRemoveError("Email chưa hợp lệ — không thể xóa ghi danh trực tuyến.");
      return;
    }
    if (qlhvId == null || !Number.isFinite(qlhvId) || qlhvId <= 0) {
      setClassRemoveError(
        "Chưa đồng bộ mã ghi danh cho lớp này. Tải lại trang hoặc quay lại bước 2 sau vài giây."
      );
      return;
    }
    if (hvId == null || !Number.isFinite(hvId) || hvId <= 0) {
      setClassRemoveError("Chưa xác định được học viên — không thể xóa ghi danh.");
      return;
    }

    setRemovingClassId(lopId);
    try {
      const res = await fetch("/api/hoc-vien/delete-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qlhv_id: qlhvId,
          hoc_vien_id: hvId,
          email: em,
          acknowledge_active_enrollment: false,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        error?: string;
        message?: string;
        days_remaining?: unknown;
      };
      if (res.ok && j.ok) {
        finalizeRemoveClassAfterDbDelete(lopId);
        return;
      }
      if (res.status === 409 && j.code === "NEED_ACK") {
        const dr = Number(j.days_remaining);
        setRemoveEnrollModal({
          lopId,
          qlhvId,
          hocVienId: hvId,
          daysRemaining: Number.isFinite(dr) ? dr : 0,
          message: typeof j.message === "string" ? j.message : "",
        });
        return;
      }
      setClassRemoveError(j.error ?? j.message ?? "Không xóa được ghi danh.");
    } catch {
      setClassRemoveError("Lỗi mạng. Thử lại sau.");
    } finally {
      setRemovingClassId(null);
    }
  }

  function toggleClass(id: number, monId: number): void {
    const row = lopHoc.find((c) => c.id === id);
    if (row?.isFull) return;

    setSelectedClassIds((prev) => {
      if (prev.includes(id)) {
        if (enrolledLopIds.includes(id)) {
          void requestRemoveClassFromStrip(id);
          return prev;
        }
        const next = prev.filter((v) => v !== id);
        clearFeeForClass(id);
        setSkipRenewalByClassId((sp) => {
          const n = { ...sp };
          delete n[id];
          return n;
        });
        return next;
      }
      const defaultFee = availableFeeByMon[monId]?.[0];
      if (defaultFee) {
        setFeeByClassId((feePrev) => ({ ...feePrev, [id]: defaultFee.id }));
      }
      return [...prev, id];
    });
  }

  async function handleGoToStep2(): Promise<void> {
    setStep1LookupError(null);
    if (canGoStep2) {
      setStep(2);
      return;
    }
    if (!isValidStudentEmail(email)) return;

    setStep1LookupLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        throw new Error("Không kết nối được hệ thống (thiếu cấu hình Supabase).");
      }
      const em = email.trim().toLowerCase();
      const { data, error } = await supabase
        .from("ql_thong_tin_hoc_vien")
        .select("full_name, sdt, email, sex, nam_thi, loai_khoa_hoc, facebook, avatar")
        .eq("email", em)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      const mapped = data ? dbRowToStep1Fields(data) : null;
      if (!mapped || !profileCompleteForSkipStep1(mapped)) {
        throw new Error(
          "Chưa có hồ sơ đủ thông tin với email này — vui lòng điền đầy đủ các trường bên dưới."
        );
      }
      const s = applyStep1FieldsToState(mapped);
      setFullName(s.fullName);
      setPhone(s.phone);
      setEmail(s.email);
      setSex(s.sex);
      setNamThi(s.namThi || "");
      setLoaiKhoaHoc(s.loaiKhoaHoc);
      setFacebook(s.facebook);
      setAvatarUrl(s.avatarUrl);

      if (dhCatalog && s.loaiKhoaHoc === "Luyện thi") {
        const { data: hvIdRow, error: hvIdErr } = await supabase
          .from("ql_thong_tin_hoc_vien")
          .select("id")
          .eq("email", em)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!hvIdErr && hvIdRow?.id != null) {
          const hvId = Number((hvIdRow as { id: unknown }).id);
          if (Number.isFinite(hvId) && hvId > 0) {
            const { data: nvRows, error: nvErr } = await supabase
              .from("ql_hv_truong_nganh")
              .select("truong_dai_hoc, nganh_dao_tao")
              .eq("hoc_vien", hvId)
              .order("id", { ascending: true });
            if (!nvErr && nvRows?.length) {
              const mapped: DhpNvRowState[] = [];
              for (const raw of nvRows) {
                const row = raw as { truong_dai_hoc?: unknown; nganh_dao_tao?: unknown };
                const t = Number(row.truong_dai_hoc);
                const n = Number(row.nganh_dao_tao);
                if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(n) || n <= 0) continue;
                mapped.push({ truongId: t, nganhId: n });
              }
              if (mapped.length) {
                setNguyenVongRows(mapped);
              } else {
                setNguyenVongRows([{ truongId: "", nganhId: "" }]);
              }
            } else {
              setNguyenVongRows([{ truongId: "", nganhId: "" }]);
            }
          }
        }
      }

      setStep(2);
    } catch (e) {
      setStep1LookupError(e instanceof Error ? e.message : "Không tra cứu được hồ sơ.");
    } finally {
      setStep1LookupLoading(false);
    }
  }

  async function handleCreateOrder(): Promise<void> {
    if (!canCreateOrder || serverOrder) return;
    setOrderLoading(true);
    setOrderError(null);
    try {
      const lines = selectedClasses
        .filter((c) => !skipRenewalByClassId[c.id])
        .map((c) => {
          const feeId = pickFeeIdForClass(c, availableFeeByMon, feeByClassId);
          if (feeId == null) throw new Error("Thiếu gói học phí cho một lớp.");
          return { lopId: c.id, goiId: feeId };
        });
      const namRaw = namThi.trim();
      const namThiNum =
        namRaw === "" ? null : Number(namRaw);
      const nvPayload = nguyenVongRows
        .filter(
          (r) =>
            r.truongId !== "" &&
            r.nganhId !== "" &&
            Number.isFinite(r.truongId) &&
            Number.isFinite(r.nganhId)
        )
        .map((r) => ({
          truong_dai_hoc: r.truongId as number,
          nganh_dao_tao: r.nganhId as number,
        }));

      const studentBody: Record<string, unknown> = {
        full_name: fullName.trim(),
        sdt: phone.trim(),
        email: email.trim(),
        sex: sex || null,
        nam_thi: namThiNum != null && Number.isFinite(namThiNum) ? namThiNum : null,
        loai_khoa_hoc: loaiKhoaHoc.trim() || null,
        facebook: facebook.trim() || null,
      };
      const av = avatarUrl?.trim();
      if (av) {
        studentBody.avatar = av;
      }
      if (dhCatalog && loaiKhoaHoc.trim() === "Luyện thi") {
        studentBody.nguyen_vong = nvPayload;
      }

      const res = await fetch("/api/donghocphi/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student: studentBody,
          lines,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        donId?: number;
        maDon?: string;
        maDonSo?: string;
        invoiceTotalDong?: number;
        hocVienId?: number;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Lỗi ${res.status}`);
      }
      if (
        data.donId == null ||
        data.maDonSo == null ||
        data.invoiceTotalDong == null ||
        data.hocVienId == null
      ) {
        throw new Error("Phản hồi server thiếu trường bắt buộc.");
      }
      setServerOrder({
        donId: data.donId,
        maDon: String(data.maDon ?? ""),
        maDonSo: String(data.maDonSo),
        invoiceTotalDong: data.invoiceTotalDong,
        hocVienId: data.hocVienId,
      });
      setResolvedHocVienId(data.hocVienId);
      void refreshEnrolledFromQl(data.hocVienId);
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Không tạo được đơn.");
    } finally {
      setOrderLoading(false);
    }
  }

  const namThiOptions = useMemo(() => namThiSelectValues(), []);

  const successProfileHref = hocVienProfileHref(email);

  return (
    <main className="dhp-page">
      <section className="dhp-wrap">
        <header className="dhp-head">
          <div>
            <p className="dhp-kicker">Đóng học phí tự động</p>
            <h1 className="dhp-title">Trang thanh toán</h1>
            <p className="dhp-sub">
              Điền thông tin theo hồ sơ học viên, chọn lớp và gói học phí — dữ liệu bước 1 tương ứng bảng{" "}
              <code className="dhp-code">ql_thong_tin_hoc_vien</code>.
            </p>
          </div>
        </header>

        {step === 1 || step === 2 ? (
          <div className="dhp-actions dhp-actions--step-bar">
            {step === 1 ? (
              <button
                type="button"
                className="dhp-btn"
                disabled={!isValidStudentEmail(email) || step1LookupLoading}
                onClick={() => void handleGoToStep2()}
              >
                {step1LookupLoading
                  ? "Đang kiểm tra hồ sơ…"
                  : canGoStep2
                    ? "Tiếp theo"
                    : "Tiếp theo — Tra hồ sơ & chọn lớp"}
              </button>
            ) : (
              <>
                <button type="button" className="dhp-btn dhp-btn-ghost" onClick={() => setStep(1)}>
                  Quay lại
                </button>
                <button type="button" className="dhp-btn" disabled={!canGoStep3} onClick={() => setStep(3)}>
                  Xác nhận — Tiếp tục thanh toán
                </button>
              </>
            )}
          </div>
        ) : null}

        <Stepper step={step} paymentComplete={paymentComplete} />

        {step === 1 ? (
          <div className="dhp-flow">
            <section className="dhp-s1-card">
              <div className="dhp-sec-label">Thông tin học viên</div>

              <div className="dhp-s1-avatar-row">
                <HocVienAvatarEditor
                  storedAvatar={avatarUrl ?? undefined}
                  email={email.trim()}
                  initials={avatarInitials}
                  uploading={avatarUploading}
                  onPickFile={handleAvatarFile}
                />
                <div className="dhp-s1-avatar-text">
                  <p className="dhp-s1-avatar-title">Ảnh đại diện</p>
                  <p className="dhp-s1-avatar-sub">
                    Tùy chọn — giống trang cá nhân học viên. Ảnh lưu khi tạo đơn hoặc ngay nếu đã có mã học viên.
                  </p>
                  {avatarError ? (
                    <p className="dhp-step1-lookup-err" role="alert">{avatarError}</p>
                  ) : null}
                </div>
              </div>

              <div className="dhp-field-row">
                <div className="dhp-field">
                  <label htmlFor="dhp-full_name">Họ và tên *</label>
                  <input
                    id="dhp-full_name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="dhp-field">
                  <label htmlFor="dhp-sdt">Số điện thoại *</label>
                  <input
                    id="dhp-sdt"
                    name="sdt"
                    type="tel"
                    autoComplete="tel"
                    placeholder="0912 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="dhp-field dhp-field--full">
                <label htmlFor="dhp-email">Email</label>
                <input
                  id="dhp-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vd. tenban@gmail.com — Hotmail/Outlook, Yahoo, iCloud…"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="dhp-s1-avatar-sub" role="note">
                  {STUDENT_EMAIL_REQUIREMENT_VI}
                </p>
              </div>

              <div className="dhp-field-row">
                <div className="dhp-field">
                  <label htmlFor="dhp-sex">Giới tính</label>
                  <select
                    id="dhp-sex"
                    name="sex"
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                  >
                    {SEX_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dhp-field">
                  <label htmlFor="dhp-nam_thi">Năm thi</label>
                  <select
                    id="dhp-nam_thi"
                    name="nam_thi"
                    value={namThi}
                    onChange={(e) => setNamThi(e.target.value)}
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
                  <label htmlFor="dhp-loai_khoa_hoc">Loại khóa học</label>
                  <select
                    id="dhp-loai_khoa_hoc"
                    name="loai_khoa_hoc"
                    value={loaiKhoaHoc}
                    onChange={(e) => setLoaiKhoaHoc(e.target.value)}
                  >
                    {LOAI_KHOA_HOC_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dhp-field">
                  <label htmlFor="dhp-facebook">Facebook *</label>
                  <input
                    id="dhp-facebook"
                    name="facebook"
                    type="text"
                    autoComplete="off"
                    placeholder="Tư vấn viên sẽ liên hệ qua facebook"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    aria-required="true"
                  />
                </div>
              </div>

              {dhCatalog && loaiKhoaHoc === "Luyện thi" ? (
                <div className="dhp-nv-block">
                  <div className="dhp-sec-label dhp-nv-sec">Muốn thi vào trường &amp; ngành</div>
                  <p className="dhp-nv-hint">
                    Tùy chọn — có thể bỏ trống. Có thể thêm nhiều dòng; mỗi dòng là một cặp trường và ngành (theo
                    danh mục đã liên kết). Dữ liệu được ghi vào hệ thống khi bạn tạo đơn thanh toán ở bước 3 — không
                    cần nút Lưu riêng.
                  </p>
                  <div className="dhp-nv-rows">
                    {nguyenVongRows.map((row, idx) => {
                      const nganhOpts =
                        row.truongId === ""
                          ? []
                          : dhCatalog.nganhByTruongId[String(row.truongId)] ?? [];
                      return (
                        <div key={idx} className="dhp-nv-row">
                          <div className="dhp-field dhp-field--nv">
                            <label htmlFor={`dhp-nv-truong-${idx}`}>Trường</label>
                            <select
                              id={`dhp-nv-truong-${idx}`}
                              value={row.truongId === "" ? "" : String(row.truongId)}
                              onChange={(e) => {
                                const v = e.target.value;
                                setNguyenVongRows((prev) => {
                                  const next = [...prev];
                                  next[idx] =
                                    v === ""
                                      ? { truongId: "", nganhId: "" }
                                      : { truongId: Number(v), nganhId: "" };
                                  return next;
                                });
                              }}
                            >
                              <option value="">— Chọn trường —</option>
                              {truongPickOptions.map((t) => (
                                <option key={t.id} value={String(t.id)}>
                                  {t.ten}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="dhp-field dhp-field--nv">
                            <label htmlFor={`dhp-nv-nganh-${idx}`}>Ngành</label>
                            <select
                              id={`dhp-nv-nganh-${idx}`}
                              value={row.nganhId === "" ? "" : String(row.nganhId)}
                              disabled={row.truongId === ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setNguyenVongRows((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    nganhId: v === "" ? "" : Number(v),
                                  };
                                  return next;
                                });
                              }}
                            >
                              <option value="">
                                {row.truongId === "" ? "Chọn trường trước" : "— Chọn ngành —"}
                              </option>
                              {nganhOpts.map((n) => (
                                <option key={n.id} value={String(n.id)}>
                                  {n.ten}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            className="dhp-btn dhp-btn-nv-rm"
                            aria-label={`Xóa dòng nguyện vọng ${idx + 1}`}
                            onClick={() => {
                              setNguyenVongRows((prev) => {
                                if (prev.length <= 1) {
                                  return [{ truongId: "", nganhId: "" }];
                                }
                                return prev.filter((_, j) => j !== idx);
                              });
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="dhp-btn dhp-btn-ghost dhp-btn-nv-add"
                    onClick={() => {
                      setNguyenVongRows((prev) => [...prev, { truongId: "", nganhId: "" }]);
                    }}
                  >
                    + Thêm trường / ngành
                  </button>
                </div>
              ) : null}
            </section>

            <p className="dhp-step1-email-hint">
              Đã có hồ sơ học viên? Nhập đúng email — dùng nút «Tiếp theo» trên thanh phía trên để tra cứu
              và vào bước chọn lớp (cần hồ sơ đủ: họ tên, SĐT, Facebook trong hệ thống).
            </p>
            {step1LookupError ? (
              <p className="dhp-step1-lookup-err" role="alert">
                {step1LookupError}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <section className="dhp-card">
            <p className="dhp-step2-enroll-hint">
              Thanh «Lớp đã chọn» liệt kê đúng các lớp bạn tick ở các tab bên dưới. Lớp đã ghi danh trong{" "}
              <code className="dhp-code">ql_quan_ly_hoc_vien</code>: bỏ chọn thẻ hoặc bấm × sẽ xóa ghi danh trên hệ
              thống (có nhắc nhở nếu kỳ học phí còn ngày). Lớp chỉ mới chọn trên trang này thì chỉ bỏ khỏi đơn.
            </p>
            {classRemoveError ? (
              <p className="dhp-step1-lookup-err" role="alert">
                {classRemoveError}
              </p>
            ) : null}
            <div className="dhp-sel-strip" role="region" aria-labelledby="dhp-sel-strip-title">
              <div className="dhp-sel-strip-head">
                <span id="dhp-sel-strip-title" className="dhp-sel-strip-title">
                  Lớp đã chọn
                </span>
                <span className="dhp-sel-strip-count" aria-live="polite">
                  ({selectedClassesStrip.length})
                </span>
              </div>
              <div className="dhp-sel-tags">
                {selectedClassesStrip.length === 0 ? (
                  <p className="dhp-sel-empty">
                    Chưa chọn lớp nào — tick một hoặc nhiều thẻ lớp theo môn ở các tab bên dưới; danh sách tag sẽ
                    khớp với lựa chọn của bạn.
                  </p>
                ) : (
                  selectedClassesStrip.map((cls) => {
                    const monLabel =
                      monHoc.find((m) => m.id === cls.monHocId)?.tenMonHoc?.trim() ||
                      `Môn ${cls.monHocId}`;
                    return (
                      <span key={cls.id} className="dhp-sel-tag">
                        <span className="dhp-sel-tag-main">
                          <span className="dhp-sel-tag-mon">{monLabel}</span>
                          <span className="dhp-sel-tag-sep" aria-hidden>
                            ·
                          </span>
                          <span className="dhp-sel-tag-lop">{cls.tenLop}</span>
                        </span>
                        <button
                          type="button"
                          className="dhp-sel-tag-rm"
                          aria-label={`Bỏ lớp ${monLabel} — ${cls.tenLop}`}
                          disabled={removingClassId === cls.id}
                          onClick={() => void requestRemoveClassFromStrip(cls.id)}
                        >
                          {removingClassId === cls.id ? "…" : "×"}
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            <div className="dhp-tabs">
              {monHoc.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={m.id === activeMonId ? "dhp-tab on" : "dhp-tab"}
                  onClick={() => setActiveMonId(m.id)}
                >
                  {m.tenMonHoc}
                </button>
              ))}
            </div>

            <div className="dhp-oc-grid">
              {classesForTab.map((cls) => {
                const checked = selectedClassIds.includes(cls.id);
                const thumbSrc = cls.avatar
                  ? cfImageForThumbnail(cls.avatar) || cls.avatar
                  : null;
                const badge = classSeatBadge(cls);
                return (
                  <div
                    key={cls.id}
                    role={cls.isFull ? undefined : "button"}
                    tabIndex={cls.isFull ? -1 : 0}
                    className={[
                      "dhp-oc-card",
                      !cls.isFull ? "dhp-oc-card--pickable" : "",
                      cls.isFull ? "dhp-oc-card--disabled" : "",
                      checked && !cls.isFull ? "dhp-oc-card--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      if (!cls.isFull) toggleClass(cls.id, cls.monHocId);
                    }}
                    onKeyDown={(e) => {
                      if (cls.isFull) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleClass(cls.id, cls.monHocId);
                      }
                    }}
                    aria-pressed={cls.isFull ? undefined : checked}
                    aria-disabled={cls.isFull ? true : undefined}
                  >
                    <div className="dhp-oc-muted-block">
                      <div className="dhp-oc-visual">
                        {thumbSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbSrc}
                            alt=""
                            className="dhp-oc-avatar-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="dhp-oc-portfolio-empty" aria-hidden />
                        )}
                      </div>
                      <div className="dhp-oc-details-main">
                        <p className="dhp-oc-gv">GV: {cls.gvNames}</p>
                        <h3 className="dhp-oc-card-title">{cls.tenLop}</h3>
                        <p className="dhp-oc-lich">{cls.lichHoc}</p>
                      </div>
                    </div>
                    <div className="dhp-oc-details-foot">
                      <span className={badge.className}>
                        <span className="dhp-oc-badge-dot" aria-hidden />
                        {badge.label} · {cls.filled}/{cls.total} chỗ
                      </span>
                    </div>
                  </div>
                );
              })}
              {!classesForTab.length ? <p className="dhp-empty">Chưa có lớp cho môn này.</p> : null}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="dhp-s3-wrap" aria-label="Thanh toán học phí">
            <div className="dhp-s3-main">
              <div className="dhp-s3-left">
                <div className="dhp-s3-list">
                  {selectedClasses.map((cls, idx) => {
                    const fees = availableFeeByMon[cls.monHocId] ?? [];
                    const skipRenew = Boolean(skipRenewalByClassId[cls.id]);
                    const selectedFeeId = skipRenew
                      ? undefined
                      : pickFeeIdForClass(cls, availableFeeByMon, feeByClassId);
                    const fee =
                      selectedFeeId != null
                        ? goiHocPhi.find((f) => f.id === selectedFeeId)
                        : undefined;
                    const monPayLabel =
                      monHoc.find((m) => m.id === cls.monHocId)?.tenMonHoc?.trim() || "Môn";
                    const themBuoi =
                      fee != null && fee.soBuoi != null && Number.isFinite(fee.soBuoi)
                        ? Math.max(0, Math.round(fee.soBuoi))
                        : 0;
                    const hasSoBuoiOnRow = fee != null && fee.soBuoi != null;
                    const today0 = startOfTodayLocal();
                    const renewBlock = computeRenewalBlock(
                      qlKyByLopId[cls.id],
                      themBuoi,
                      today0
                    );
                    const {
                      buoiConLai: buoiConLaiRow,
                      hienTaiHetHanMain,
                      hienTaiHetHanSub,
                      newEndDate,
                      tongBuoi,
                      extendFootnote,
                    } = renewBlock;
                    return (
                      <div key={cls.id} className="dhp-khoa-block">
                        <div className="dhp-kh">
                          <div className="dhp-knum">{idx + 1}</div>
                          <div className="dhp-ktitle">
                            {monPayLabel} · {cls.tenLop}
                          </div>
                        </div>
                        <div className="dhp-kb">
                          <p className="dhp-kb-lich">{cls.lichHoc}</p>
                          <div className="dhp-kb-fl">Gói thời hạn</div>
                          {fees.length > 0 ? (
                            <>
                              <div className="dhp-gg">
                              {fees.map((feeOpt) => {
                                const on =
                                  !skipRenew &&
                                  selectedFeeId != null &&
                                  selectedFeeId === feeOpt.id;
                                return (
                                  <button
                                    key={feeOpt.id}
                                    type="button"
                                    className={on ? "dhp-gb dhp-gb--on" : "dhp-gb"}
                                    onClick={() => {
                                      setSkipRenewalByClassId((prev) => {
                                        const n = { ...prev };
                                        delete n[cls.id];
                                        return n;
                                      });
                                      setFeeByClassId((prev) => ({
                                        ...prev,
                                        [cls.id]: feeOpt.id,
                                      }));
                                    }}
                                  >
                                    <div className="dhp-gt">
                                      {feeOpt.numberValue} {feeOpt.donVi}
                                    </div>
                                    <div className="dhp-gd">học phí</div>
                                    <div className="dhp-gp">
                                      {feeOpt.giaGoc > feeOpt.giaThucDong ? (
                                        <span className="dhp-gp-orig">{formatVnd(feeOpt.giaGoc)}</span>
                                      ) : null}
                                      <span className="dhp-gp-main">{formatVnd(feeOpt.giaThucDong)}</span>
                                      {feeOpt.discount > 0 ? (
                                        <span className="dhp-gp-disc">−{Math.round(feeOpt.discount)}%</span>
                                      ) : null}
                                    </div>
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                className={
                                  skipRenew
                                    ? "dhp-gb dhp-gb--on dhp-gb--skip"
                                    : "dhp-gb dhp-gb--skip"
                                }
                                onClick={() => {
                                  clearFeeForClass(cls.id);
                                  setSkipRenewalByClassId((prev) => ({
                                    ...prev,
                                    [cls.id]: true,
                                  }));
                                }}
                              >
                                <div className="dhp-gt">Không</div>
                                <div className="dhp-gd">gia hạn</div>
                                <div className="dhp-gp dhp-gp--muted">0 ₫</div>
                              </button>
                            </div>
                            </>
                          ) : (
                            <p className="dhp-kb-empty">
                              Chưa có gói học phí cấu hình cho môn này — vui lòng liên hệ tư vấn.
                            </p>
                          )}
                          {fees.length > 0 && skipRenew ? (
                            <p className="dhp-kb-skip-msg" role="status">
                              Đã chọn không gia hạn khóa này — không thu học phí trên đơn lần này. Liên hệ
                              Sine Art nếu cần điều chỉnh hồ sơ ghi danh.
                            </p>
                          ) : null}
                          {fees.length > 0 && fee && !skipRenew ? (
                            <div className="dhp-date-box">
                              <div className="dhp-date-row dhp-date-row--stack">
                                <span className="dhp-date-k">Hết hạn hiện tại</span>
                                <div className="dhp-date-v-stack">
                                  <span className="dhp-date-v">{hienTaiHetHanMain}</span>
                                  {hienTaiHetHanSub ? (
                                    <span className="dhp-date-v-sub">{hienTaiHetHanSub}</span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="dhp-date-row">
                                <span className="dhp-date-k">Gia hạn thêm</span>
                                <span className="dhp-pill-buoi">+{themBuoi} buổi</span>
                              </div>
                              <div className="dhp-date-divider" aria-hidden />
                              <div className="dhp-date-total">
                                <div className="dhp-date-row dhp-date-row--total">
                                  <span className="dhp-date-k dhp-date-k--total">
                                    Tổng buổi sau gia hạn
                                  </span>
                                  <div className="dhp-date-total-val">
                                    <span className="dhp-tn">{tongBuoi}</span>
                                    <span className="dhp-tn-unit">buổi</span>
                                    <span className="dhp-tn-hint">
                                      (đã thanh toán: {buoiConLaiRow}
                                      {themBuoi > 0 ? ` + gói đang chọn: ${themBuoi}` : ""})
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {newEndDate ? (
                                <div className="dhp-date-row">
                                  <span className="dhp-date-k">Ngày hết hạn khóa học</span>
                                  <span className="dhp-date-new">
                                    {formatViDate(newEndDate)}
                                  </span>
                                </div>
                              ) : null}
                              {!hasSoBuoiOnRow ? (
                                <p className="dhp-date-note">
                                  Gói chưa có <code className="dhp-code">so_buoi</code> trên hệ
                                  thống — đang tính 0 buổi cộng thêm.
                                </p>
                              ) : null}
                              <p className="dhp-date-note">{extendFootnote}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="dhp-s3-nav dhp-s3-nav--single">
                  <button
                    type="button"
                    className="dhp-s3-btn-back dhp-s3-btn-back--full"
                    onClick={() => setStep(2)}
                  >
                    ← Đổi lớp
                  </button>
                </div>
              </div>

              <aside className="dhp-s3-right">
                <div className="dhp-s3-card">
                  <div className="dhp-s3-fl">Học viên</div>
                  <div className="dhp-hv-row">
                    <div className="dhp-av" aria-hidden>
                      {(fullName.trim().charAt(0) || "?").toUpperCase()}
                    </div>
                    <div>
                      <div className="dhp-hv-n">{fullName.trim() || "—"}</div>
                      <div className="dhp-hv-s">
                        {phone.trim() || "—"}
                        {loaiKhoaHoc ? ` · ${loaiKhoaHoc}` : ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dhp-s3-card">
                  <div className="dhp-s3-sec-label">Tóm tắt đơn</div>
                  <div className="dhp-sum-box">
                    {selectedClasses.map((cls) => {
                      const skipRenew = Boolean(skipRenewalByClassId[cls.id]);
                      const selectedFeeId = skipRenew
                        ? undefined
                        : pickFeeIdForClass(cls, availableFeeByMon, feeByClassId);
                      const fee =
                        selectedFeeId != null
                          ? goiHocPhi.find((f) => f.id === selectedFeeId)
                          : undefined;
                      const themBuoiSum =
                        fee != null && fee.soBuoi != null && Number.isFinite(fee.soBuoi)
                          ? Math.max(0, Math.round(fee.soBuoi))
                          : 0;
                      const sumBlock = computeRenewalBlock(
                        qlKyByLopId[cls.id],
                        themBuoiSum,
                        startOfTodayLocal()
                      );
                      return (
                        <div key={cls.id} className="dhp-sum-block">
                          <div className="dhp-sr">
                            <span className="dhp-sk">{cls.tenLop}</span>
                            <span className="dhp-sv">
                              {skipRenew
                                ? "Không gia hạn"
                                : fee
                                  ? `${fee.numberValue} ${fee.donVi}`
                                  : "—"}
                            </span>
                          </div>
                          {!skipRenew && fee && fee.giaGoc > fee.giaThucDong ? (
                            <div className="dhp-sr">
                              <span className="dhp-sk dhp-sk--muted">Giá niêm yết</span>
                              <span className="dhp-sv dhp-sv--strike">{formatVnd(fee.giaGoc)}</span>
                            </div>
                          ) : null}
                          {!skipRenew && fee && fee.discount > 0 ? (
                            <div className="dhp-sr">
                              <span className="dhp-sk dhp-sk--muted">Chiết khấu gói</span>
                              <span className="dhp-sv dhp-sv--disc">−{Math.round(fee.discount)}%</span>
                            </div>
                          ) : null}
                          <div className="dhp-sr">
                            <span className="dhp-sk dhp-sk--muted">Thành tiền</span>
                            <span className="dhp-sv dhp-sv--money">
                              {skipRenew ? "—" : fee ? formatVnd(fee.giaThucDong) : "—"}
                            </span>
                          </div>
                          <div className="dhp-sr">
                            <span className="dhp-sk dhp-sk--muted">Buổi sau gia hạn</span>
                            <span className="dhp-sv dhp-sv--sessions">
                              {skipRenew ? "—" : fee ? `${sumBlock.tongBuoi} buổi` : "—"}
                            </span>
                          </div>
                          <div className="dhp-sdiv" />
                        </div>
                      );
                    })}
                    {summaryDiscountTotalDong > 0 ? (
                      <div className="dhp-st-row dhp-st-row--save" role="status">
                        <span className="dhp-st-label dhp-st-label--save">Tổng đã giảm giá</span>
                        <span
                          className="dhp-st-val dhp-st-val--save"
                          aria-label={`Tổng đã giảm giá ${formatVnd(summaryDiscountTotalDong)}`}
                        >
                          {formatVnd(summaryDiscountTotalDong)}
                        </span>
                      </div>
                    ) : null}
                    <div className="dhp-st-row">
                      <span className="dhp-st-label">Tổng</span>
                      <span className="dhp-st-val">{formatVnd(displayInvoiceTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="dhp-qr-card">
                  <div className="dhp-qr-k">
                    {paymentComplete
                      ? "Đã thanh toán"
                      : "QR chuyển khoản · TPBank (VietQR)"}
                  </div>
                  {paymentComplete && paidSnapshot && !paySuccessModalOpen ? (
                    <button
                      type="button"
                      className="dhp-btn-reopen-receipt"
                      onClick={() => setPaySuccessModalOpen(true)}
                    >
                      Xem lại biên nhận và gia hạn
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="dhp-s3-btn-create"
                    disabled={
                      !canCreateOrder ||
                      orderLoading ||
                      serverOrder != null ||
                      paymentComplete
                    }
                    onClick={() => void handleCreateOrder()}
                  >
                    {paymentComplete
                      ? "Thanh toán đã hoàn tất"
                      : orderLoading
                        ? "Đang tạo mã…"
                        : serverOrder
                          ? "Đã có mã — đổi lớp/gói để tạo mã mới"
                          : "Tạo mã thanh toán"}
                  </button>
                  {orderError ? (
                    <p className="dhp-qr-err" role="alert">
                      {orderError}
                    </p>
                  ) : null}
                  {serverOrder ? (
                    <p className="dhp-qr-ok" role="status">
                      Đơn <strong>#{serverOrder.donId}</strong>
                      {serverOrder.maDon ? ` · ${serverOrder.maDon}` : ""} · HV id{" "}
                      {serverOrder.hocVienId}
                    </p>
                  ) : (
                    <p className="dhp-qr-pre">
                      Bấm nút trên để hệ thống lưu hồ sơ, ghi danh lớp và tạo mã chuyển
                      khoản — QR chỉ đúng khi đã có mã đơn trên hệ thống.
                    </p>
                  )}
                  {qrPayment.isTestMicro && serverOrder && invoiceForQr > 0 && !paymentComplete ? (
                    <p className="dhp-qr-test-banner" role="status">
                      <strong>Test CK:</strong> VietQR chỉ{" "}
                      {formatVnd(qrPayment.qrAmountDong)} (2.000–2.300 ₫). Tổng đơn
                      thật {formatVnd(invoiceForQr)} — coi như giảm{" "}
                      {formatVnd(qrPayment.impliedTestDiscountDong)} khi quét thử.
                    </p>
                  ) : null}
                  <div
                    className={
                      paymentComplete
                        ? "dhp-qbox dhp-qbox--paid"
                        : vietQrImageUrl
                          ? "dhp-qbox dhp-qbox--qr"
                          : "dhp-qbox"
                    }
                  >
                    {paymentComplete ? (
                      <span className="dhp-qbox-paid-msg" role="status">
                        <span className="dhp-qbox-paid-check" aria-hidden>
                          ✓
                        </span>
                        Giao dịch đã được xác nhận
                      </span>
                    ) : vietQrImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- VietQR CDN, kích thước cố định
                      <img
                        src={vietQrImageUrl}
                        alt={`QR chuyển khoản ${formatVnd(qrPayment.qrAmountDong)} — ${qrContentCode}`}
                        className="dhp-vietqr-img"
                        width={180}
                        height={180}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="dhp-qbox-ph">
                        {canCreateOrder
                          ? "Chưa có mã — bấm «Tạo mã thanh toán»"
                          : "Chọn đủ lớp và gói học phí"}
                      </span>
                    )}
                  </div>
                  <div className="dhp-qa">
                    {serverOrder ? formatVnd(qrPayment.qrAmountDong) : "—"}
                  </div>
                  <p className="dhp-qs">
                    Nội dung CK:{" "}
                    <strong className="dhp-qc-strong">
                      {serverOrder ? qrContentCode : "—"}
                    </strong>
                  </p>
                  <p className="dhp-qstk">
                    STK: {qrRecipient.stk} · {qrRecipient.accountName}
                  </p>
                  {!paymentComplete ? (
                    <p className="dhp-qr-hint">
                      Cần <code className="dhp-code">SUPABASE_SERVICE_ROLE_KEY</code> trên
                      server (đơn tự động — <code className="dhp-code">nguoi_tao</code> null).
                      QR thử 2.000–2.300 ₫: bật sẵn khi <code className="dhp-code">next dev</code>;
                      với <code className="dhp-code">next start</code> / Vercel production đặt{" "}
                      <code className="dhp-code">NEXT_PUBLIC_DHP_TEST_MICRO_QR=1</code>. SePay khớp{" "}
                      <strong>mã SA trong nội dung CK</strong>, không bắt buộc trùng số tiền với tổng đơn. Tắt micro
                      QR: <code className="dhp-code">0</code> hoặc <code className="dhp-code">false</code>.
                    </p>
                  ) : null}
                  {paymentComplete ? (
                    <>
                      <div className="dhp-sp dhp-sp--paid" role="status">
                        <span className="dhp-sp-dot dhp-sp-dot--paid" aria-hidden />
                        Đã thanh toán
                      </div>
                      <PaymentReceiptMailLine ui={receiptMailUi} variant="inline" />
                    </>
                  ) : pollWaitingPayment && serverOrder ? (
                    <div className="dhp-sp dhp-sp--poll" role="status">
                      <span className="dhp-sp-dot dhp-sp-dot--pulse" aria-hidden />
                      Đang chờ xác nhận thanh toán…
                    </div>
                  ) : (
                    <div className="dhp-sp">
                      <span className="dhp-sp-dot" aria-hidden />
                      Chờ tạo mã / chờ thanh toán
                    </div>
                  )}
                </div>
              </aside>
            </div>

            {paymentComplete && paidSnapshot && paySuccessModalOpen ? (
              <div
                className="dhp-pay-modal-root"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dhp-pay-modal-title"
              >
                <button
                  type="button"
                  className="dhp-pay-modal-backdrop"
                  aria-label="Đóng biên nhận"
                  onClick={() => setPaySuccessModalOpen(false)}
                />
                <div className="dhp-pay-modal-panel">
                  <div className="dhp-pay-modal-inner">
                    <div className="dhp-pay-confirm-head dhp-pay-modal-head">
                      <span className="dhp-pay-confirm-icon" aria-hidden>
                        ✓
                      </span>
                      <div>
                        <h2 id="dhp-pay-modal-title" className="dhp-pay-confirm-title">
                          Thanh toán thành công
                        </h2>
                        <p className="dhp-pay-confirm-lead">
                          Hệ thống đã ghi nhận khoản chuyển khoản cho đơn của bạn.
                        </p>
                      </div>
                    </div>
                    <PaymentReceiptMailLine ui={receiptMailUi} variant="modal" />

                    <div className="dhp-pay-confirm-table-wrap dhp-pay-modal-table-wrap">
                      <table className="dhp-pay-confirm-table dhp-pay-modal-table">
                        <tbody>
                          <tr>
                            <th scope="row">Họ và tên</th>
                            <td>{fullName.trim() || "—"}</td>
                          </tr>
                          <tr>
                            <th scope="row">Số điện thoại</th>
                            <td>{phone.trim() || "—"}</td>
                          </tr>
                          <tr>
                            <th scope="row">Email</th>
                            <td>{email.trim() || "—"}</td>
                          </tr>
                          <tr>
                            <th scope="row">Mã đơn (nội dung CK)</th>
                            <td>
                              <strong className="dhp-pay-confirm-strong">
                                {paidSnapshot.maDonSo || serverOrder?.maDonSo || "—"}
                              </strong>
                            </td>
                          </tr>
                          {paidSnapshot.maDon ? (
                            <tr>
                              <th scope="row">Mã đơn hệ thống</th>
                              <td>{paidSnapshot.maDon}</td>
                            </tr>
                          ) : null}
                          <tr>
                            <th scope="row">Mã đơn (#id)</th>
                            <td>#{serverOrder?.donId ?? "—"}</td>
                          </tr>
                          <tr>
                            <th scope="row">Ngày thanh toán</th>
                            <td>{formatNgayThanhToanDb(paidSnapshot.ngayThanhToan)}</td>
                          </tr>
                          <tr>
                            <th scope="row">Số tiền</th>
                            <td>{formatVnd(displayInvoiceTotal)}</td>
                          </tr>
                          <tr>
                            <th scope="row">Khóa đăng ký</th>
                            <td>
                              <ul className="dhp-pay-confirm-lines">
                                {selectedClasses.map((cls) => {
                                  const skipRenew = Boolean(skipRenewalByClassId[cls.id]);
                                  const selectedFeeId = skipRenew
                                    ? undefined
                                    : pickFeeIdForClass(cls, availableFeeByMon, feeByClassId);
                                  const fee =
                                    selectedFeeId != null
                                      ? goiHocPhi.find((f) => f.id === selectedFeeId)
                                      : undefined;
                                  const monPayLabel =
                                    monHoc.find((m) => m.id === cls.monHocId)?.tenMonHoc?.trim() ||
                                    "Môn";
                                  return (
                                    <li key={cls.id}>
                                      <span className="dhp-pay-confirm-line-main">
                                        {monPayLabel} · {cls.tenLop}
                                      </span>
                                      {skipRenew ? (
                                        <span className="dhp-pay-confirm-line-sub dhp-pay-confirm-line-sub--skip">
                                          Không gia hạn — không tính vào đơn thanh toán này
                                        </span>
                                      ) : fee ? (
                                        <span className="dhp-pay-confirm-line-sub">
                                          {fee.numberValue} {fee.donVi} · {formatVnd(fee.giaThucDong)}
                                        </span>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h3 className="dhp-pay-modal-renew-title">Gia hạn khóa học (dự kiến)</h3>
                    <p className="dhp-pay-modal-renew-lead">
                      Buổi và ngày hết hạn mới được ước tính theo gói đã chọn; hồ sơ học viên sẽ được
                      cập nhật sau khi đồng bộ.
                    </p>
                    <div className="dhp-pay-confirm-table-wrap dhp-pay-modal-table-wrap">
                      <table className="dhp-pay-confirm-table dhp-pay-modal-table dhp-pay-modal-renew-table">
                        <thead>
                          <tr>
                            <th scope="col">Khóa học</th>
                            <th scope="col">Buổi sau gia hạn</th>
                            <th scope="col">Ngày hết hạn mới (dự kiến)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedClasses.map((cls) => {
                            const skipRenew = Boolean(skipRenewalByClassId[cls.id]);
                            const selectedFeeId = skipRenew
                              ? undefined
                              : pickFeeIdForClass(cls, availableFeeByMon, feeByClassId);
                            const fee =
                              selectedFeeId != null
                                ? goiHocPhi.find((f) => f.id === selectedFeeId)
                                : undefined;
                            const monPayLabel =
                              monHoc.find((m) => m.id === cls.monHocId)?.tenMonHoc?.trim() ||
                              "Môn";
                            const renew = renewalPreviewAfterPay(
                              cls,
                              monPayLabel,
                              skipRenew,
                              fee,
                              qlKyByLopId[cls.id]
                            );
                            return (
                              <tr key={cls.id}>
                                <td>{renew.courseLabel}</td>
                                <td>{renew.sessionsCell}</td>
                                <td>
                                  <span className="dhp-pay-modal-expiry">{renew.expiryCell}</span>
                                  {renew.rowNote ? (
                                    <span className="dhp-pay-modal-row-note">{renew.rowNote}</span>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="dhp-pay-confirm-disclaimer dhp-pay-modal-disclaimer">
                      <p className="dhp-pay-modal-disclaimer-p">
                        Liên hệ Sine Art để hỗ trợ cập nhật thông tin nếu cần.
                      </p>
                      <p className="dhp-pay-modal-disclaimer-p">
                        Nếu sai thông tin bạn vui lòng liên hệ Sine Art để cập nhật.
                      </p>
                    </div>

                    <div className="dhp-pay-confirm-actions dhp-pay-modal-actions">
                      <button
                        type="button"
                        className="dhp-btn-modal-close"
                        onClick={() => setPaySuccessModalOpen(false)}
                      >
                        Đóng
                      </button>
                      {successProfileHref ? (
                        <Link href={successProfileHref} className="dhp-btn-profile">
                          Về trang cá nhân
                        </Link>
                      ) : null}
                      <Link href="/phong-hoc" className="dhp-btn-vaohoc">
                        Vào học
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

      </section>

      {removeEnrollModal ? (
        <div
          className="dhp-pay-modal-root"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dhp-remove-enroll-title"
        >
          <button
            type="button"
            className="dhp-pay-modal-backdrop"
            aria-label="Đóng"
            disabled={removeEnrollSubmitting}
            onClick={() => {
              if (!removeEnrollSubmitting) {
                setClassRemoveError(null);
                setRemoveEnrollModal(null);
              }
            }}
          />
          <div className="dhp-pay-modal-panel">
            <div className="dhp-pay-modal-inner">
              <div className="dhp-pay-confirm-head dhp-pay-modal-head">
                <div>
                  <h2 id="dhp-remove-enroll-title" className="dhp-pay-confirm-title">
                    Nhắc nhở trước khi huỷ ghi danh
                  </h2>
                  <p className="dhp-pay-confirm-lead">
                    Lớp này vẫn còn ngày trong kỳ học phí hiện tại. Xác nhận sẽ xóa ghi danh và các dòng học phí liên
                    quan trên hệ thống — không hoàn tác.
                  </p>
                </div>
              </div>
              <div className="dhp-pay-confirm-table-wrap dhp-pay-modal-table-wrap">
                <table className="dhp-pay-confirm-table dhp-pay-modal-table">
                  <thead>
                    <tr>
                      <th scope="col">Môn</th>
                      <th scope="col">Lớp</th>
                      <th scope="col">Kỳ học (DB)</th>
                      <th scope="col">Nhắc nhở</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const m = removeEnrollModal;
                      const cls = lopHoc.find((c) => c.id === m.lopId);
                      const monLabel =
                        cls != null
                          ? monHoc.find((x) => x.id === cls.monHocId)?.tenMonHoc?.trim() || `Môn ${cls.monHocId}`
                          : "—";
                      const ky = qlKyByLopId[m.lopId];
                      const kyCell =
                        ky?.ngayDauKy || ky?.ngayCuoiKy
                          ? `${formatNgayThanhToanDb(ky.ngayDauKy)} → ${formatNgayThanhToanDb(ky.ngayCuoiKy)}`
                          : "—";
                      const warn =
                        m.message.trim() ||
                        (m.daysRemaining > 0
                          ? `Còn khoảng ${m.daysRemaining} ngày trong kỳ học phí hiện tại.`
                          : "—");
                      return (
                        <tr key={m.lopId}>
                          <td>{monLabel}</td>
                          <td>{cls?.tenLop?.trim() || "—"}</td>
                          <td>{kyCell}</td>
                          <td>{warn}</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
              {classRemoveError ? (
                <p className="dhp-step1-lookup-err dhp-remove-enroll-modal-err" role="alert">
                  {classRemoveError}
                </p>
              ) : null}
              <div className="dhp-pay-confirm-actions dhp-pay-modal-actions">
                <button
                  type="button"
                  className="dhp-btn-modal-close"
                  disabled={removeEnrollSubmitting}
                  onClick={() => {
                    setClassRemoveError(null);
                    setRemoveEnrollModal(null);
                  }}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="dhp-btn-profile"
                  disabled={removeEnrollSubmitting}
                  onClick={() => void confirmRemoveEnrolledFromModal()}
                >
                  {removeEnrollSubmitting ? "Đang xóa…" : "Xác nhận xóa ghi danh"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
