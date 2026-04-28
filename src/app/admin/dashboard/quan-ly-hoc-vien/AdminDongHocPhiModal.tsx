"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  DollarSign,
  Loader2,
  Plus,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";

import type { AdminCreateHpDonLine, AdminDhpComboOption, AdminDhpGoiOption } from "@/app/admin/dashboard/quan-ly-hoc-vien/actions";
import {
  buoiConLaiTrongKy,
  computeNgayCuoiKyFromRenewal,
} from "@/lib/donghocphi/ngay-cuoi-ky-renewal";
import {
  adminConfirmHpDonTienMat,
  adminCreateHpDonThu,
  adminPollHpDonThu,
  adminSyncHpChiTietDaThanhToan,
  listHpComboMonForDhp,
  listHpGoiHocPhiForDhp,
  listHrNhanSuOptions,
} from "@/app/admin/dashboard/quan-ly-hoc-vien/actions";
import { deleteHpDonThu } from "@/app/admin/dashboard/quan-ly-hoa-don/actions";
import { firstApplicableComboDiscountDong } from "@/lib/donghocphi/combo-discount";
import type { AdminQlhvEnrollment, AdminQlhvStudent } from "@/lib/data/admin-quan-ly-hoc-vien";
import { buildVietQrImageUrl, resolveQrPaymentAmounts } from "@/lib/payment/vietqr";
import { cn } from "@/lib/utils";

const HINH_THUC_UI = ["Tiền mặt", "Chuyển khoản", "Thẻ"] as const;

function isChuyenKhoanUi(h: string): boolean {
  return h === "Chuyển khoản" || h === "Thẻ";
}

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n))) + " ₫";
}

function fmtDateVi(iso: string): string {
  if (!iso) return "—";
  const p = iso.slice(0, 10).split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(start: string, days: number): string {
  const [yy, mm, dd] = start.slice(0, 10).split("-").map(Number);
  const t = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
  t.setDate(t.getDate() + Math.max(0, days));
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type LineState = {
  key: string;
  qlhvId: string;
  goiId: string;
  ngayDau: string;
  ngayCuoi: string;
};

function mkLine(defaultQlhv: string): LineState {
  const t0 = todayIso();
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    qlhvId: defaultQlhv,
    goiId: "",
    ngayDau: t0,
    ngayCuoi: addDaysIso(t0, 30),
  };
}

function recomputeKyDatesForLine(
  kh: { ngay_cuoi_ky: string | null } | undefined,
  goi: AdminDhpGoiOption | undefined
): { ngayDau: string; ngayCuoi: string } {
  const ngayDau = todayIso();
  if (!goi) return { ngayDau, ngayCuoi: addDaysIso(ngayDau, 30) };
  const themBuoi =
    goi.so_buoi != null && Number.isFinite(goi.so_buoi) ? Math.max(0, Math.round(Number(goi.so_buoi))) : 0;
  const computed = computeNgayCuoiKyFromRenewal(kh?.ngay_cuoi_ky ?? null, themBuoi);
  return { ngayDau, ngayCuoi: computed ?? addDaysIso(ngayDau, 30) };
}

function lopDisplayName(kh: AdminQlhvEnrollment): string {
  const l = kh.lop;
  if (!l) return kh.lop_hoc != null ? `Lớp #${kh.lop_hoc}` : "—";
  const name = String(l.class_name ?? "").trim() || String(l.class_full_name ?? "").trim() || `Lớp #${l.id}`;
  return l.special ? `⚡ ${name}` : name;
}

type Props = {
  open: boolean;
  onClose: (didRefresh?: boolean) => void;
  student: AdminQlhvStudent;
  enrollments: AdminQlhvEnrollment[];
  defaultNguoiTaoId: number;
  /** Phòng Tư vấn / admin — ô «Giảm giá thêm» (VNĐ), không hiện với nhân sự khác. */
  showExtraVndDiscount?: boolean;
};

export default function AdminDongHocPhiModal({
  open,
  onClose,
  student,
  enrollments,
  defaultNguoiTaoId,
  showExtraVndDiscount = false,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [staff, setStaff] = useState<{ id: number; full_name: string }[]>([]);
  const [gois, setGois] = useState<AdminDhpGoiOption[]>([]);
  const [combos, setCombos] = useState<AdminDhpComboOption[]>([]);
  const [canonicalMap, setCanonicalMap] = useState<Record<number, number>>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [sessionStep, setSessionStep] = useState<"s1" | "s2">("s1");
  const [nguoiTaoId, setNguoiTaoId] = useState(String(defaultNguoiTaoId));
  const [hinhThuc, setHinhThuc] = useState<string>("Chuyển khoản");
  const [khuyenMai, setKhuyenMai] = useState(0);
  /** Chỉ dùng khi `showExtraVndDiscount` — gửi server đã cắt theo tối đa sau KM & combo. */
  const [giamGiaVnd, setGiamGiaVnd] = useState(0);
  const defaultQl =
    enrollments.length === 1 && enrollments[0] != null ? String(enrollments[0].id) : "";
  const [lines, setLines] = useState<LineState[]>(() => [mkLine(defaultQl)]);

  const [createdDonId, setCreatedDonId] = useState<number | null>(null);
  const [maDon, setMaDon] = useState("");
  const [maDonSo, setMaDonSo] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [trangThai, setTrangThai] = useState("Chờ thanh toán");
  const [ngayTT, setNgayTT] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingTm, setSavingTm] = useState(false);
  const [deletingDon, setDeletingDon] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const syncedChiRef = useRef(false);

  const reset = useCallback(() => {
    setSessionStep("s1");
    setNguoiTaoId(String(defaultNguoiTaoId));
    setHinhThuc("Chuyển khoản");
    setKhuyenMai(0);
    setGiamGiaVnd(0);
    setLines([mkLine(defaultQl)]);
    setCreatedDonId(null);
    setMaDon("");
    setMaDonSo("");
    setInvoiceTotal(0);
    setTrangThai("Chờ thanh toán");
    setNgayTT("");
    setErr(null);
    syncedChiRef.current = false;
  }, [defaultNguoiTaoId, defaultQl]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      reset();
      setLoadErr(null);
    });
    startTransition(() => {
      void (async () => {
        const [a, b, c] = await Promise.all([listHrNhanSuOptions(), listHpGoiHocPhiForDhp(), listHpComboMonForDhp()]);
        if (!a.ok) {
          setLoadErr(a.error);
          return;
        }
        if (!b.ok) {
          setLoadErr(b.error);
          return;
        }
        setStaff(a.rows);
        setGois(b.rows);
        setCanonicalMap(b.canonicalMap);
        if (c.ok) setCombos(c.rows);
        const allowedIds = new Set(a.rows.map((r) => r.id));
        if (!allowedIds.has(defaultNguoiTaoId)) {
          const first = a.rows[0];
          setNguoiTaoId(first != null ? String(first.id) : "");
        }
      })();
    });
  }, [open, reset, defaultNguoiTaoId]);

  const goiById = useMemo(() => {
    const m = new Map<number, AdminDhpGoiOption>();
    for (const g of gois) m.set(g.id, g);
    return m;
  }, [gois]);

  const subtotalPreview = useMemo(() => {
    let s = 0;
    for (const ln of lines) {
      const gid = Number(ln.goiId);
      if (!Number.isFinite(gid) || gid <= 0) continue;
      const g = goiById.get(gid);
      if (g) s += g.hoc_phi_dong;
    }
    return s;
  }, [lines, goiById]);

  const giaGocTotal = useMemo(() => {
    let s = 0;
    for (const ln of lines) {
      const gid = Number(ln.goiId);
      if (!Number.isFinite(gid) || gid <= 0) continue;
      const g = goiById.get(gid);
      if (g) s += g.gia_goc;
    }
    return s;
  }, [lines, goiById]);

  const chieuKhauDong = useMemo(
    () => Math.max(0, Math.round(giaGocTotal - subtotalPreview)),
    [giaGocTotal, subtotalPreview]
  );

  const khuyenMaiDong = useMemo(
    () => Math.round(subtotalPreview * (Math.min(100, Math.max(0, Math.round(khuyenMai))) / 100)),
    [subtotalPreview, khuyenMai]
  );

  const comboDiscountDong = useMemo(() => {
    const payingLines = lines
      .map((ln) => Number(ln.goiId))
      .filter((id) => Number.isFinite(id) && id > 0)
      .map((goiId) => ({ goiId }));
    if (!payingLines.length || !combos.length) return 0;
    // Normalize combo.goi_ids: admin có thể chọn ID bất kỳ trong nhóm dedup,
    // cần map về canonical ID (nhỏ nhất trong nhóm) để khớp với ID picker chọn.
    const normalizedCombos = combos.map((c) => ({
      ...c,
      goi_ids: c.goi_ids.map((id) => canonicalMap[id] ?? id),
    }));
    return firstApplicableComboDiscountDong(payingLines, normalizedCombos);
  }, [lines, combos, canonicalMap]);

  const matchedCombo = useMemo(() => {
    if (comboDiscountDong <= 0) return null;
    const selectedGoiIds = new Set(
      lines.map((ln) => Number(ln.goiId)).filter((id) => Number.isFinite(id) && id > 0)
    );
    return (
      combos
        .filter((c) => {
          if (!c.dang_hoat_dong || c.goi_ids.length === 0) return false;
          const normalizedIds = c.goi_ids.map((id) => canonicalMap[id] ?? id);
          return normalizedIds.every((id) => selectedGoiIds.has(id));
        })
        .sort((a, b) => b.gia_giam - a.gia_giam)[0] ?? null
    );
  }, [comboDiscountDong, lines, combos, canonicalMap]);

  const afterKmCombo = useMemo(
    () => Math.max(0, Math.round(subtotalPreview - khuyenMaiDong - comboDiscountDong)),
    [subtotalPreview, khuyenMaiDong, comboDiscountDong],
  );

  const giamGiaVndApplied = useMemo(() => {
    if (!showExtraVndDiscount) return 0;
    const raw = Math.max(0, Math.round(Number(giamGiaVnd) || 0));
    return Math.min(raw, afterKmCombo);
  }, [showExtraVndDiscount, giamGiaVnd, afterKmCombo]);

  const tongPreview = useMemo(() => {
    return Math.max(0, afterKmCombo - giamGiaVndApplied);
  }, [afterKmCombo, giamGiaVndApplied]);

  /** Khi bật «QR thử micro» (mặc định `next dev`), số trên QR là 2k–2,3k ₫ — khác tổng đơn; xem `vietqr.ts`. */
  const qrPaymentResolved = useMemo(() => {
    if (!maDonSo.trim() || invoiceTotal <= 0) return null;
    return resolveQrPaymentAmounts(maDonSo, invoiceTotal);
  }, [maDonSo, invoiceTotal]);

  const qrUrl = useMemo(() => {
    if (sessionStep !== "s2" || !isChuyenKhoanUi(hinhThuc)) return "";
    if (!qrPaymentResolved || createdDonId == null) return "";
    return buildVietQrImageUrl(maDonSo, qrPaymentResolved.qrAmountDong, createdDonId);
  }, [sessionStep, hinhThuc, maDonSo, invoiceTotal, createdDonId, qrPaymentResolved]);

  useEffect(() => {
    if (!open || sessionStep !== "s2" || createdDonId == null) return;
    if (!isChuyenKhoanUi(hinhThuc) || trangThai === "Đã thanh toán") return;
    const id = createdDonId;
    const t = window.setInterval(() => {
      void (async () => {
        const r = await adminPollHpDonThu(id);
        if (!r.ok) return;
        if (r.status && r.status !== trangThai) {
          setTrangThai(r.status);
          if (r.ma_don) setMaDon(r.ma_don);
          if (r.ma_don_so) setMaDonSo(r.ma_don_so);
          if (r.ngay_thanh_toan) setNgayTT(r.ngay_thanh_toan);
          if (r.status === "Đã thanh toán" && !syncedChiRef.current) {
            syncedChiRef.current = true;
            await adminSyncHpChiTietDaThanhToan(id);
          }
        }
      })();
    }, 3000);
    return () => window.clearInterval(t);
  }, [open, sessionStep, createdDonId, hinhThuc, trangThai]);

  const updateLine = (key: string, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, mkLine(defaultQl)]);
  };

  const handleTaoDon = async () => {
    setSaving(true);
    setErr(null);
    const ntao = Number(nguoiTaoId);
    if (!Number.isFinite(ntao) || ntao <= 0) {
      setErr("Chọn người tạo đơn.");
      setSaving(false);
      return;
    }
    if (enrollments.length > 0 && lines.some((l) => !l.qlhvId.trim())) {
      setErr("Chọn lớp / khoá cho từng dòng.");
      setSaving(false);
      return;
    }
    if (lines.some((l) => !l.goiId.trim())) {
      setErr("Chọn gói học phí cho từng dòng.");
      setSaving(false);
      return;
    }
    const payloadLines: AdminCreateHpDonLine[] = lines.map((l) => ({
      qlhvId: Number(l.qlhvId),
      goiId: Number(l.goiId),
      ngayDauKy: l.ngayDau,
      ngayCuoiKy: l.ngayCuoi,
    }));
    const res = await adminCreateHpDonThu({
      hocVienId: student.id,
      nguoiTaoId: ntao,
      hinhThucThu: hinhThuc,
      khuyenMaiPercent: khuyenMai,
      giamGiaVnd: showExtraVndDiscount ? giamGiaVndApplied : 0,
      lines: payloadLines,
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setCreatedDonId(res.donId);
    setMaDon(res.maDon);
    setMaDonSo(res.maDonSo);
    setInvoiceTotal(res.invoiceTotalDong);
    setSessionStep("s2");
  };

  const handleQuayLaiSua = async () => {
    if (trangThai === "Đã thanh toán" || deletingDon) return;
    setErr(null);
    if (createdDonId != null) {
      setDeletingDon(true);
      const r = await deleteHpDonThu(createdDonId);
      setDeletingDon(false);
      if (!r.ok) {
        setErr(r.error || "Không xoá được đơn tạm để quay lại.");
        return;
      }
    }
    setCreatedDonId(null);
    setMaDon("");
    setMaDonSo("");
    setInvoiceTotal(0);
    setTrangThai("Chờ thanh toán");
    setNgayTT("");
    syncedChiRef.current = false;
    setSessionStep("s1");
  };

  const handleConfirmTm = async () => {
    if (createdDonId == null) return;
    setSavingTm(true);
    setErr(null);
    const r = await adminConfirmHpDonTienMat(createdDonId);
    setSavingTm(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setTrangThai("Đã thanh toán");
    setNgayTT(todayIso());
  };

  const handleClose = (refresh?: boolean) => {
    reset();
    onClose(refresh);
  };

  const inp = "w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#F8A568] focus:ring-[3px] focus:ring-[#F8A568]/15";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="dhp-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="flex max-h-[92vh] w-full max-w-[540px] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.32)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#F5F7F7] px-5 py-4">
              <div>
                <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#F8A568]">Thu học phí</p>
                <h2 className="m-0 mt-0.5 text-[17px] font-extrabold tracking-tight text-[#1a1a2e]">
                  {sessionStep === "s1" ? "Tạo đơn thu học phí" : "Bill thanh toán"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {(["s1", "s2"] as const).map((s, i) => (
                    <span key={s} className="flex items-center gap-1">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white",
                          sessionStep === s ? "bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]" : "bg-[#F5F7F7] text-[#9ca3af]",
                          sessionStep === "s2" && s === "s1" && "bg-emerald-100 text-emerald-600"
                        )}
                      >
                        {sessionStep === "s2" && s === "s1" ? "✓" : i + 1}
                      </span>
                      {i === 0 ? <span className="h-0.5 w-4 rounded-full bg-[#EAEAEA]" /> : null}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] bg-[#F5F7F7] text-[#888] hover:bg-white"
                  aria-label="Đóng"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loadErr ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">{loadErr}</p>
              ) : null}

              {sessionStep === "s1" ? (
                <div className="flex flex-col gap-3">
                  <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#F8A568]">Thông tin đơn</p>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Học viên</label>
                    <div className={cn(inp, "cursor-default bg-[#fafafa] text-black/70")}>{student.full_name}</div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Người tạo đơn *</label>
                    <div className="relative">
                      <select
                        className={cn(inp, "appearance-none pr-9")}
                        value={nguoiTaoId}
                        onChange={(e) => setNguoiTaoId(e.target.value)}
                        disabled={isPending}
                      >
                        <option value="">— Chọn —</option>
                        {staff.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.full_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
                    </div>
                  </div>

                  {enrollments.length === 0 ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
                      Học viên chưa có lớp — thêm khoá học trước khi tạo đơn thu học phí.
                    </p>
                  ) : null}

                  <p className="m-0 mt-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#ED5C9D]">Các gói học phí</p>
                  {lines.map((ln, idx) => {
                    const selectedKh = enrollments.find((e) => String(e.id) === ln.qlhvId);
                    const monId = selectedKh?.lop?.mon_hoc ?? null;
                    const goiFiltered =
                      monId != null && monId > 0 ? gois.filter((g) => g.mon_hoc === monId) : gois;
                    const list = goiFiltered.length > 0 ? goiFiltered : gois;
                    return (
                      <div key={ln.key} className="rounded-[14px] border-[1.5px] border-[#EAEAEA] bg-[#fafafa] p-3.5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#F8A568]">
                            Gói đăng ký {idx + 1}
                          </span>
                          {lines.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeLine(ln.key)}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600"
                              aria-label="Xóa dòng"
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : null}
                        </div>
                        <div className="mb-2">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Lớp / khoá *</label>
                          <div className="relative">
                            <select
                              className={cn(inp, "appearance-none pr-9")}
                              value={ln.qlhvId}
                              onChange={(e) => {
                                const v = e.target.value;
                                const kh = enrollments.find((k) => String(k.id) === v);
                                const m = kh?.lop?.mon_hoc ?? null;
                                const curGoi = Number(ln.goiId);
                                const keep =
                                  curGoi > 0 &&
                                  m != null &&
                                  gois.find((g) => g.id === curGoi)?.mon_hoc === m;
                                if (keep && kh) {
                                  const goi = gois.find((g) => g.id === curGoi);
                                  const dates = recomputeKyDatesForLine(kh, goi);
                                  updateLine(ln.key, { qlhvId: v, ...dates });
                                } else {
                                  const t0 = todayIso();
                                  updateLine(ln.key, {
                                    qlhvId: v,
                                    goiId: "",
                                    ngayDau: t0,
                                    ngayCuoi: addDaysIso(t0, 30),
                                  });
                                }
                              }}
                            >
                              <option value="">— Chọn lớp —</option>
                              {enrollments.map((e) => (
                                <option key={e.id} value={String(e.id)}>
                                  {lopDisplayName(e)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
                          </div>
                        </div>
                        <div className="mb-2">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Gói học phí *</label>
                          <div className="relative">
                            <select
                              className={cn(inp, "appearance-none pr-9")}
                              value={ln.goiId}
                              onChange={(e) => {
                                const gid = e.target.value;
                                if (!gid.trim()) {
                                  updateLine(ln.key, { goiId: "" });
                                  return;
                                }
                                const kh = enrollments.find((k) => String(k.id) === ln.qlhvId);
                                const goi = gois.find((g) => String(g.id) === gid);
                                const dates = kh ? recomputeKyDatesForLine(kh, goi) : recomputeKyDatesForLine(undefined, goi);
                                updateLine(ln.key, { goiId: gid, ...dates });
                              }}
                            >
                              <option value="">— Chọn gói —</option>
                              {list.map((g) => (
                                <option key={g.id} value={String(g.id)}>
                                  {g.special ? "⚡ " : ""}{g.ten_goi_hoc_phi} — {fmtVnd(g.hoc_phi_dong)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Ngày đầu kỳ</label>
                            <input
                              type="date"
                              className={inp}
                              value={ln.ngayDau.slice(0, 10)}
                              onChange={(e) => updateLine(ln.key, { ngayDau: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Ngày cuối kỳ *</label>
                            <input
                              type="date"
                              className={inp}
                              value={ln.ngayCuoi.slice(0, 10)}
                              onChange={(e) => updateLine(ln.key, { ngayCuoi: e.target.value })}
                            />
                          </div>
                        </div>
                        {selectedKh && ln.goiId ? (
                          <p className="m-0 text-[10px] leading-snug text-[#999]">
                            {(() => {
                              const g = goiById.get(Number(ln.goiId));
                              const buoi = g?.so_buoi != null ? Math.max(0, Math.round(g.so_buoi)) : 0;
                              const con = buoiConLaiTrongKy(selectedKh.ngay_cuoi_ky);
                              if (buoi <= 0) {
                                return "Gói chưa có số buổi — đang gợi ý +30 ngày từ ngày đầu kỳ.";
                              }
                              return `Còn ${con} ngày học trong kỳ · +${buoi} buổi gói → ngày cuối = hết hạn kỳ + ${buoi} ngày (hoặc từ hôm nay nếu kỳ đã qua).`;
                            })()}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addLine}
                    disabled={enrollments.length === 0}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#EAEAEA] py-2.5 text-[12px] font-semibold text-black/45 hover:bg-black/[0.02] disabled:opacity-40"
                  >
                    <Plus size={14} /> Thêm gói học phí
                  </button>

                  {matchedCombo ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <span className="text-base">🎉</span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[11px] font-bold text-emerald-700">
                          Đạt combo: {matchedCombo.ten_combo}
                        </p>
                        <p className="m-0 text-[11px] text-emerald-600">
                          Giảm thêm{" "}
                          <strong className="tabular-nums text-base font-black text-emerald-700">{fmtVnd(comboDiscountDong)}</strong>
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {subtotalPreview > 0 ? (
                    <>
                      <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#3b82f6]">Tổng đơn</p>
                      <div
                        className={cn(
                          "grid gap-3",
                          showExtraVndDiscount ? "grid-cols-2" : "grid-cols-1",
                        )}
                      >
                        <div className="min-w-0">
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
                            Khuyến mãi (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className={inp}
                            value={khuyenMai || ""}
                            onChange={(e) => setKhuyenMai(Number(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        {showExtraVndDiscount ? (
                          <div className="min-w-0">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
                              Giảm giá thêm (VNĐ)
                            </label>
                            <input
                              type="number"
                              min={0}
                              className={inp}
                              value={giamGiaVnd || ""}
                              onChange={(e) => setGiamGiaVnd(Number(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                        ) : null}
                      </div>
                      {showExtraVndDiscount ? (
                        <p className="m-0 text-[10px] leading-snug text-black/40">
                          Trừ sau khuyến mãi % và combo. Tối đa còn lại:{" "}
                          <strong className="text-black/55">{fmtVnd(afterKmCombo)}</strong>
                          {giamGiaVndApplied > 0 && Math.round(Number(giamGiaVnd) || 0) > afterKmCombo ? (
                            <span className="text-amber-700"> · đang áp {fmtVnd(giamGiaVndApplied)}</span>
                          ) : null}
                        </p>
                      ) : null}
                      <div className="space-y-1.5 rounded-xl border border-[#3b82f622] bg-gradient-to-r from-blue-500/6 to-indigo-500/5 px-3.5 py-2.5">
                        {chieuKhauDong > 0 || khuyenMaiDong > 0 || comboDiscountDong > 0 || giamGiaVndApplied > 0 ? (
                          <>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-black/45">Giá gốc</span>
                              <span className="tabular-nums text-black/60">{fmtVnd(giaGocTotal)}</span>
                            </div>
                            {chieuKhauDong > 0 ? (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-black/45">Chiết khấu gói</span>
                                <span className="tabular-nums text-black/50">−{fmtVnd(chieuKhauDong)}</span>
                              </div>
                            ) : null}
                            {khuyenMaiDong > 0 ? (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-black/45">Khuyến mãi ({khuyenMai}%)</span>
                                <span className="tabular-nums text-black/50">−{fmtVnd(khuyenMaiDong)}</span>
                              </div>
                            ) : null}
                            {comboDiscountDong > 0 ? (
                              <div className="flex items-center justify-between text-[11px] border-t border-[#3b82f615] pt-1.5">
                                <span className="text-emerald-600 font-medium">Combo giảm thêm</span>
                                <span className="tabular-nums font-semibold text-emerald-600">−{fmtVnd(comboDiscountDong)}</span>
                              </div>
                            ) : null}
                            {giamGiaVndApplied > 0 ? (
                              <div className="flex items-center justify-between text-[11px] border-t border-[#3b82f615] pt-1.5">
                                <span className="text-black/45">Giảm giá thêm (VNĐ)</span>
                                <span className="tabular-nums text-black/50">−{fmtVnd(giamGiaVndApplied)}</span>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                        <div
                          className={`flex items-center justify-between ${chieuKhauDong > 0 || khuyenMaiDong > 0 || comboDiscountDong > 0 || giamGiaVndApplied > 0 ? "border-t border-[#3b82f620] pt-1.5" : ""}`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#3b82f6]">Tổng học phí cần đóng</span>
                          <span className="text-lg font-black text-[#1a1a2e]">{fmtVnd(tongPreview)}</span>
                        </div>
                      </div>
                    </>
                  ) : null}

                  <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-600">Hình thức thu</p>
                  <div className="flex gap-2">
                    {HINH_THUC_UI.map((h) => {
                      const icons: Record<string, React.ReactNode> = {
                        "Tiền mặt": <DollarSign size={15} />,
                        "Chuyển khoản": <Smartphone size={15} />,
                        Thẻ: <CreditCard size={15} />,
                      };
                      const active = hinhThuc === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHinhThuc(h)}
                          className={cn(
                            "flex flex-1 flex-col items-center gap-1 rounded-[11px] border-[1.5px] py-2.5 text-[10px] font-semibold transition",
                            active
                              ? "border-[#F8A568] bg-[#FFF7F0] text-[#F8A568]"
                              : "border-[#EAEAEA] bg-white text-[#888]"
                          )}
                        >
                          <span className={active ? "text-[#F8A568]" : "text-[#9ca3af]"}>{icons[h]}</span>
                          {h}
                        </button>
                      );
                    })}
                  </div>

                  {err ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{err}</p> : null}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
                    <div className="mb-3 flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#F8A568] to-[#EE5CA2] text-lg">
                        🎨
                      </div>
                      <div>
                        <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#F8A568]">Sine Art</p>
                        <p className="m-0 text-[15px] font-extrabold text-[#1a1a2e]">Thông tin thanh toán</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#F8F9FA] px-3.5 py-2.5 text-[12px]">
                      <div className="flex justify-between border-b border-[#f0f0f0] py-1.5">
                        <span className="text-[10px] font-bold uppercase text-[#BBB]">Học viên</span>
                        <span className="max-w-[60%] text-right font-bold text-[#1a1a2e]">{student.full_name}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#f0f0f0] py-1.5">
                        <span className="text-[10px] font-bold uppercase text-[#BBB]">Mã đơn</span>
                        <span className="text-right font-bold text-[#1a1a2e]">{maDon || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-[10px] font-bold uppercase text-[#BBB]">Hình thức</span>
                        <span className="text-right font-bold text-[#1a1a2e]">{hinhThuc}</span>
                      </div>
                    </div>
                    {lines.map((ln, i) => {
                      const kh = enrollments.find((e) => String(e.id) === ln.qlhvId);
                      const g = goiById.get(Number(ln.goiId));
                      return (
                        <div key={ln.key} className="mt-2 rounded-xl bg-[#F8F9FA] px-3.5 py-2.5">
                          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#F8A568]">Gói {i + 1}</p>
                          <div className="flex justify-between border-b border-[#f0f0f0] py-1 text-[12px]">
                            <span className="text-[10px] font-bold uppercase text-[#BBB]">Lớp</span>
                            <span className="max-w-[58%] text-right font-bold">{kh ? lopDisplayName(kh) : "—"}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#f0f0f0] py-1 text-[12px]">
                            <span className="text-[10px] font-bold uppercase text-[#BBB]">Gói</span>
                            <span className="max-w-[58%] text-right font-bold">{g?.ten_goi_hoc_phi ?? "—"}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#f0f0f0] py-1 text-[12px]">
                            <span className="text-[10px] font-bold uppercase text-[#BBB]">Kỳ</span>
                            <span className="text-right font-semibold text-black/70">
                              {fmtDateVi(ln.ngayDau)} → {fmtDateVi(ln.ngayCuoi)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 text-[12px]">
                            <span className="text-[10px] font-bold uppercase text-[#BBB]">Học phí</span>
                            <span className="font-extrabold text-[#3b82f6]">{g ? fmtVnd(g.hoc_phi_dong) : "—"}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-2 rounded-xl bg-[#F8F9FA] px-3.5 py-2.5">
                      {khuyenMai > 0 ? (
                        <div className="flex justify-between border-b border-[#f0f0f0] py-1 text-[12px]">
                          <span className="text-[10px] font-bold uppercase text-[#BBB]">Khuyến mãi</span>
                          <span className="font-bold text-emerald-600">{khuyenMai}%</span>
                        </div>
                      ) : null}
                      {giamGiaVndApplied > 0 ? (
                        <div className="flex justify-between border-b border-[#f0f0f0] py-1 text-[12px]">
                          <span className="text-[10px] font-bold uppercase text-[#BBB]">Giảm giá thêm</span>
                          <span className="font-bold text-emerald-600">−{fmtVnd(giamGiaVndApplied)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between py-1 text-[12px]">
                        <span className="text-[10px] font-bold uppercase text-[#BBB]">Tổng học phí</span>
                        <span className="text-base font-black text-[#3b82f6]">{fmtVnd(invoiceTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {isChuyenKhoanUi(hinhThuc) && qrUrl && qrPaymentResolved ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl bg-[#F8F9FA] px-4 py-4">
                      <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#888]">QR chuyển khoản · TPBank</p>
                      {/* eslint-disable-next-line @next/next/no-img-element -- VietQR URL */}
                      <img src={qrUrl} alt="Mã QR thanh toán" className="h-40 w-40 rounded-[10px] bg-white object-contain" />
                      <p className="m-0 text-center text-base font-black text-[#1a1a2e]">
                        {fmtVnd(qrPaymentResolved.qrAmountDong)}
                      </p>
                      {qrPaymentResolved.isTestMicro ? (
                        <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-[11px] leading-snug text-amber-950">
                          <strong className="font-bold">Đang bật QR thử (micro):</strong> số trên mã QR cố định trong khoảng{" "}
                          <span className="whitespace-nowrap font-semibold">2.000–2.300 ₫</span> theo mã SA để test chuyển khoản
                          khi chạy local —{" "}
                          <span className="whitespace-nowrap font-semibold">không phải</span> tổng học phí trên đơn (
                          <span className="font-semibold tabular-nums">{fmtVnd(invoiceTotal)}</span>
                          ). Production mặc định tắt. Để QR khớp tổng đơn trên dev: đặt{" "}
                          <code className="rounded bg-amber-100/90 px-1 py-0.5 text-[10px]">
                            NEXT_PUBLIC_DHP_TEST_MICRO_QR=0
                          </code>{" "}
                          rồi chạy lại server.
                        </div>
                      ) : null}
                      <p className="m-0 text-center text-[11px] text-[#888]">
                        Nội dung CK: <strong className="text-[#1a1a2e]">{maDonSo || maDon}</strong>
                      </p>
                    </div>
                  ) : null}

                  {trangThai === "Đã thanh toán" ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                      <div>
                        <p className="m-0 text-[12px] font-bold text-emerald-700">Đã thanh toán</p>
                        {ngayTT ? <p className="m-0 mt-0.5 text-[11px] text-black/45">Ngày: {fmtDateVi(ngayTT)}</p> : null}
                      </div>
                    </div>
                  ) : isChuyenKhoanUi(hinhThuc) ? (
                    <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2.5">
                      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#F8A568]" />
                      <div>
                        <p className="m-0 text-[12px] font-bold text-[#ea580c]">Chờ thanh toán tự động</p>
                        <p className="m-0 mt-0.5 text-[11px] text-black/45">Tự cập nhật khi nhận CK · kiểm tra mỗi 3 giây</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#F8A568]" />
                      <p className="m-0 text-[12px] font-semibold text-[#ea580c]">Chờ xác nhận thu — bấm «Xác nhận thu» bên dưới</p>
                    </div>
                  )}

                  {err ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{err}</p> : null}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#F5F7F7] px-5 py-3">
              {sessionStep === "s1" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-semibold text-black/55"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={saving || enrollments.length === 0}
                    onClick={() => void handleTaoDon()}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2 text-[13px] font-bold text-white shadow-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Tạo đơn
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={deletingDon || trangThai === "Đã thanh toán"}
                      onClick={() => void handleQuayLaiSua()}
                      title={
                        trangThai === "Đã thanh toán"
                          ? "Đơn đã thanh toán — không thể sửa"
                          : "Xoá đơn tạm và quay lại bước sửa thông tin"
                      }
                      className="inline-flex items-center gap-1 rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-semibold text-black/55 disabled:opacity-50"
                    >
                      {deletingDon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                      Quay lại sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        setSessionStep("s1");
                      }}
                      className="rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-semibold text-black/55"
                    >
                      + Tạo đơn mới
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {hinhThuc === "Tiền mặt" && trangThai !== "Đã thanh toán" ? (
                      <button
                        type="button"
                        disabled={savingTm}
                        onClick={() => void handleConfirmTm()}
                        className="inline-flex items-center gap-1 rounded-[10px] bg-gradient-to-r from-emerald-400 to-emerald-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                      >
                        {savingTm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Xác nhận thu
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleClose(true)}
                      className="rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-4 py-2 text-[13px] font-bold text-white"
                    >
                      Đóng
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
