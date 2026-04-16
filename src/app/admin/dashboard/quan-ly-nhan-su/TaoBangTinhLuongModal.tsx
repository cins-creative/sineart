"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  DollarSign,
  User,
  X,
} from "lucide-react";

import { createHrBangTinhLuong, createHrLichDiemDanhChoBang } from "@/app/admin/dashboard/quan-ly-nhan-su/actions";
import type { AdminBangTinhLuongListItem, AdminNhanSuRow } from "@/lib/data/admin-quan-ly-nhan-su";
import { cn } from "@/lib/utils";

import { PayrollPayslipCard } from "./PayrollPayslipCard";

const THANG_OPTIONS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function namOptions(): string[] {
  const y = new Date().getFullYear();
  const out: string[] = [];
  for (let i = y - 1; i <= y + 5; i += 1) out.push(String(i));
  return out;
}

const inp = "w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-[13px] font-medium text-[#1a1a2e] outline-none transition focus:border-[#BC8AF9]";
const lbl = "mb-1 block text-[12px] font-semibold text-[#888]";

function fmtVnd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Math.round(Number(n)).toLocaleString("vi-VN")} đ`;
}

type Props = {
  row: AdminNhanSuRow;
  onClose: () => void;
  /** Gọi sau khi tạo xong lịch điểm danh (bước 2) — truyền `hr_bang_tinh_luong.id`. */
  onSuccess: (bangTinhLuongId: number) => void;
};

export function TaoBangTinhLuongModal({ row, onClose, onSuccess }: Props) {
  const nvId = row.id;
  const [step, setStep] = useState<1 | 2>(1);
  const [thang, setThang] = useState("Tháng 1");
  const [nam, setNam] = useState(String(new Date().getFullYear()));
  const [newLuongId, setNewLuongId] = useState<number | null>(null);
  const [buoiQuyDinh, setBuoiQuyDinh] = useState("");
  const [buoiLam, setBuoiLam] = useState("");
  const [buoiNghi, setBuoiNghi] = useState("");
  const [tamUngInput, setTamUngInput] = useState("");
  const [thuongInput, setThuongInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const step1 = useCallback(async () => {
    setCreating(true);
    setError("");
    try {
      const tam =
        tamUngInput.trim() === "" ? undefined : Math.round(Number(tamUngInput));
      const thu =
        thuongInput.trim() === "" ? undefined : Math.round(Number(thuongInput));
      if (tamUngInput.trim() !== "" && !Number.isFinite(tam!)) {
        setError("Tạm ứng không hợp lệ.");
        return;
      }
      if (thuongInput.trim() !== "" && !Number.isFinite(thu!)) {
        setError("Thưởng không hợp lệ.");
        return;
      }
      const bl = await createHrBangTinhLuong({
        nhan_vien_id: nvId,
        tam_ung: tam,
        thuong: thu,
      });
      if (!bl.ok) {
        setError(bl.error);
        return;
      }
      setNewLuongId(bl.id);
      setStep(2);
    } finally {
      setCreating(false);
    }
  }, [nvId, tamUngInput, thuongInput]);

  const step2 = useCallback(async () => {
    if (!buoiLam.trim()) {
      setError("Vui lòng nhập số buổi làm việc.");
      return;
    }
    const soLam = Number(buoiLam);
    if (!Number.isFinite(soLam) || soLam < 0) {
      setError("Số buổi làm việc không hợp lệ.");
      return;
    }
    if (!newLuongId) return;
    setCreating(true);
    setError("");
    try {
      const tq = buoiQuyDinh.trim() === "" ? null : Math.round(Number(buoiQuyDinh));
      const sn = buoiNghi.trim() === "" ? null : Math.round(Number(buoiNghi));
      if (buoiQuyDinh.trim() !== "" && !Number.isFinite(tq!)) {
        setError("Tổng buổi quy định không hợp lệ.");
        return;
      }
      if (buoiNghi.trim() !== "" && !Number.isFinite(sn!)) {
        setError("Số buổi nghỉ không hợp lệ.");
        return;
      }
      const r = await createHrLichDiemDanhChoBang({
        bang_tinh_luong_id: newLuongId,
        nhan_vien_id: nvId,
        thang,
        nam,
        so_buoi_lam_viec: soLam,
        tong_buoi_lam_viec_trong_thang: tq ?? undefined,
        so_buoi_nghi_trong_thang: sn ?? undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDone(true);
      onSuccess(newLuongId);
    } finally {
      setCreating(false);
    }
  }, [buoiLam, buoiNghi, buoiQuyDinh, nam, newLuongId, nvId, onSuccess, thang]);

  /** Snapshot bảng + điểm danh vừa tạo — dùng render phiếu lương (trước khi refresh danh sách). */
  const doneBangLuong = useMemo((): AdminBangTinhLuongListItem | null => {
    if (!done || newLuongId == null) return null;
    const tam = tamUngInput.trim() === "" ? null : Math.round(Number(tamUngInput));
    const thu = thuongInput.trim() === "" ? null : Math.round(Number(thuongInput));
    const tq = buoiQuyDinh.trim() === "" ? null : Math.round(Number(buoiQuyDinh));
    const sn = buoiNghi.trim() === "" ? null : Math.round(Number(buoiNghi));
    const soLam = Math.round(Number(buoiLam));
    return {
      id: newLuongId,
      nhan_vien: nvId,
      created_at: null,
      tam_ung: tamUngInput.trim() !== "" && Number.isFinite(tam!) ? tam : null,
      thuong: thuongInput.trim() !== "" && Number.isFinite(thu!) ? thu : null,
      luong_co_ban: null,
      tro_cap: null,
      lich_diem_danh: null,
      ky_thang: thang,
      ky_nam: nam,
      so_buoi_lam_viec: Number.isFinite(soLam) ? soLam : null,
      so_buoi_nghi_trong_thang: sn != null && Number.isFinite(sn) ? sn : null,
      tong_buoi_lam_viec_trong_thang: tq != null && Number.isFinite(tq) ? tq : null,
    };
  }, [buoiLam, buoiNghi, buoiQuyDinh, done, nam, newLuongId, nvId, tamUngInput, thang, thuongInput]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className={cn(
          "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.2)] sm:max-h-[90vh] sm:rounded-2xl",
          done ? "max-w-[540px]" : "max-w-[480px]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-black/[0.06] px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="m-0 text-[17px] font-extrabold text-[#1a1a2e]">Tạo bảng tính lương</h2>
            <button
              type="button"
              aria-label="Đóng"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EAEAEA] bg-[#fafafa] text-[#666] transition hover:bg-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[#EAEAEA] bg-[#F9FAFB] px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-[#3B5BDB]">
              <User size={16} aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold text-[#323232]">{row.full_name?.trim() || "Nhân viên"}</div>
              <div className="text-[11px] font-medium text-[#AAA]">#{nvId}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-bold">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px]",
                step > 1 ? "bg-[#1A9A5C] text-white" : step === 1 ? "bg-gradient-to-br from-[#f8a668] to-[#ee5b9f] text-white" : "bg-[#f0f0f0] text-[#AAA]"
              )}
            >
              {step > 1 ? <Check size={14} /> : "1"}
            </span>
            <span className={step === 1 ? "text-[#E91E8C]" : "text-[#1A9A5C]"}>Tạo bảng lương</span>
            <div className={cn("h-px min-w-[24px] flex-1", step > 1 ? "bg-[#1A9A5C]" : "bg-[#EAEAEA]")} />
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px]",
                done ? "bg-[#1A9A5C] text-white" : step === 2 ? "bg-gradient-to-br from-[#f8a668] to-[#ee5b9f] text-white" : "bg-[#f0f0f0] text-[#AAA]"
              )}
            >
              {done ? <Check size={14} /> : "2"}
            </span>
            <span className={step === 2 && !done ? "text-[#E91E8C]" : done ? "text-[#1A9A5C]" : "text-[#AAA]"}>Điểm danh</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-[13px]">
          {error ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-[#FFF0F3] px-3 py-2 text-[12px] font-semibold text-[#C0244E]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{error}</span>
              <button type="button" className="shrink-0 text-[#C0244E]" onClick={() => setError("")} aria-label="Đóng cảnh báo">
                <X size={12} />
              </button>
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="space-y-3.5"
              >
                <div className="rounded-xl border border-[#EAEAEA] bg-[#F9FAFB] px-3 py-2.5 text-[12px]">
                  <div className="mb-1.5 font-bold text-[#888]">Thông tin lương nhân viên (tham khảo)</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <span className="text-[#AAA]">Lương CB: </span>
                      <span className="font-bold text-[#323232]">{fmtVnd(row.luong_co_ban)}</span>
                    </span>
                    {row.hinh_thuc_tinh_luong?.trim() !== "Theo buổi" ? (
                      <span>
                        <span className="text-[#AAA]">Trợ cấp: </span>
                        <span className="font-bold text-[#323232]">{fmtVnd(row.tro_cap)}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className={lbl}>Tháng *</span>
                    <select className={cn(inp, "bg-white")} value={thang} onChange={(e) => setThang(e.target.value)}>
                      {THANG_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={lbl}>Năm *</span>
                    <select className={cn(inp, "bg-white")} value={nam} onChange={(e) => setNam(e.target.value)}>
                      {namOptions().map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className={lbl}>Tạm ứng (đ)</span>
                    <input
                      type="number"
                      min={0}
                      className={cn(inp, "tabular-nums")}
                      value={tamUngInput}
                      onChange={(e) => setTamUngInput(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <span className={lbl}>Thưởng (đ)</span>
                    <input
                      type="number"
                      min={0}
                      className={cn(inp, "tabular-nums")}
                      value={thuongInput}
                      onChange={(e) => setThuongInput(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void step1()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-3 text-[13px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <DollarSign size={16} aria-hidden />
                  {creating ? "Đang tạo…" : "Tạo bảng tính lương"}
                </button>
              </motion.div>
            )}

            {step === 2 && !done && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="space-y-3.5"
              >
                <div className="rounded-xl border border-[#BAC8FF] bg-[#EEF3FF] px-3 py-2.5 text-[12px] font-medium text-[#3B5BDB]">
                  Bảng lương <strong>{thang}</strong> <strong>{nam}</strong> đã tạo (ID #{newLuongId}). Nhập số buổi để tạo lịch điểm
                  danh.
                </div>
                <div>
                  <span className={lbl}>Tổng buổi quy định {thang}/{nam}</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    className={cn(inp, "tabular-nums")}
                    value={buoiQuyDinh}
                    onChange={(e) => setBuoiQuyDinh(e.target.value)}
                    placeholder="VD: 45"
                  />
                </div>
                <div>
                  <span className={lbl}>Số buổi đi làm thực tế *</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    className={cn(inp, "tabular-nums")}
                    value={buoiLam}
                    onChange={(e) => setBuoiLam(e.target.value)}
                    placeholder="VD: 43"
                  />
                </div>
                <div>
                  <span className={lbl}>Số buổi nghỉ</span>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    className={cn(inp, "tabular-nums")}
                    value={buoiNghi}
                    onChange={(e) => setBuoiNghi(e.target.value)}
                    placeholder="Để trống nếu không có"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => {
                      setStep(1);
                      setError("");
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-[#F5F7F7] px-3 py-2.5 text-[12px] font-bold text-[#888]"
                  >
                    <ChevronLeft size={14} aria-hidden />
                    Quay lại
                  </button>
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => void step2()}
                    className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[#3B5BDB] px-3 py-2.5 text-[12px] font-bold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Calendar size={14} aria-hidden />
                    {creating ? "Đang tạo…" : "Tạo lịch điểm danh"}
                  </button>
                </div>
              </motion.div>
            )}

            {done && doneBangLuong ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                <p className="m-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold leading-snug text-emerald-900">
                  Đã tạo xong. Phiếu lương bên dưới — đóng modal để xem lại trong tab Bảng lương (dữ liệu đã đồng bộ).
                </p>
                <PayrollPayslipCard nv={row} bl={doneBangLuong} />
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-3 text-[13px] font-bold text-white transition hover:opacity-95"
                >
                  Đóng
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
