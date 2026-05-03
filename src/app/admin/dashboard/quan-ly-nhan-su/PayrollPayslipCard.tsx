"use client";

import { forwardRef, useEffect, useMemo, useState, type ReactNode } from "react";
import { Calendar, DollarSign, Loader2, Save, User } from "lucide-react";

import { updateHrPayrollPayslipFields } from "@/app/admin/dashboard/quan-ly-nhan-su/actions";
import type { AdminBangTinhLuongListItem, AdminNhanSuRow } from "@/lib/data/admin-quan-ly-nhan-su";
import { cn } from "@/lib/utils";

function payslipFmtVnd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Math.round(Number(n));
  return `${v.toLocaleString("vi-VN")} đ`;
}

function fmtVndDigits(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return Math.round(Number(n)).toLocaleString("vi-VN");
}

function parseVndDigits(s: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = s.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "").replace(/đ/gi, "").trim();
  if (t === "") return { ok: true, value: null };
  const n = Math.round(Number(t));
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Giá trị tiền (đ) không hợp lệ." };
  return { ok: true, value: n };
}

function parseIntNonNeg(s: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = s.trim();
  if (t === "") return { ok: true, value: null };
  if (!/^\d+$/.test(t)) return { ok: false, error: "Nhập số nguyên ≥ 0." };
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Số không hợp lệ." };
  return { ok: true, value: n };
}

const inpEdit =
  "w-full rounded-xl border border-black/[0.08] bg-[#F5F7F7] px-3 py-2.5 text-[13px] font-medium text-[#1a1a2e] outline-none transition focus:border-[#BC8AF9] focus:bg-white";

function PayslipReadField({ value, multiline }: { value: string; multiline?: boolean }) {
  return (
    <div
      className={cn(
        "w-full rounded-xl bg-[#F5F7F7] px-3 py-2.5 text-[13px] font-medium text-[#1a1a2e]",
        multiline && "whitespace-pre-wrap leading-relaxed"
      )}
    >
      {value || "—"}
    </div>
  );
}

function PayslipFieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-5">
      <div className="shrink-0 sm:w-[34%]">
        <div className="text-[12px] font-semibold text-[#888]">{label}</div>
        {hint ? <p className="mt-0.5 text-[10px] font-medium leading-snug text-[#AAA]">{hint}</p> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Đã có ít nhất một lịch điểm danh gắn bảng lương (sau bước 2 tạo modal). */
export function bangHasLichDiemDanh(bl: AdminBangTinhLuongListItem): boolean {
  if (bl.so_buoi_lam_viec != null && Number.isFinite(bl.so_buoi_lam_viec)) return true;
  if (bl.ky_thang != null && String(bl.ky_thang).trim() !== "") return true;
  if (bl.ky_nam != null && String(bl.ky_nam).trim() !== "") return true;
  return false;
}

/** Cùng công thức Framer `VH_Bang_tinh_luong`: Fulltime = CB + trợ cấp + thưởng − tạm ứng; Theo buổi = CB×buổi + thưởng − tạm ứng. */
function computePayrollNetSalary(nv: AdminNhanSuRow, bl: AdminBangTinhLuongListItem): number {
  const isTheoBuoi = nv.hinh_thuc_tinh_luong?.trim() === "Theo buổi";
  const lcb = nv.luong_co_ban ?? 0;
  const tc = nv.tro_cap ?? 0;
  const tu = bl.tam_ung ?? 0;
  const th = bl.thuong ?? 0;
  const soBuoi = bl.so_buoi_lam_viec ?? 0;
  if (isTheoBuoi) return Math.round(lcb * soBuoi + th - tu);
  return Math.round(lcb + tc + th - tu);
}

type NetOverrides = {
  luong_co_ban: number | null;
  tro_cap: number | null;
  tam_ung: number | null;
  thuong: number | null;
  so_buoi_lam_viec: number | null;
};

function computePayrollNetSalaryDraft(nv: AdminNhanSuRow, bl: AdminBangTinhLuongListItem, o: NetOverrides): number {
  const isTheoBuoi = nv.hinh_thuc_tinh_luong?.trim() === "Theo buổi";
  const lcb = o.luong_co_ban ?? nv.luong_co_ban ?? 0;
  const tc = o.tro_cap ?? nv.tro_cap ?? 0;
  const tu = o.tam_ung ?? bl.tam_ung ?? 0;
  const th = o.thuong ?? bl.thuong ?? 0;
  const soBuoi = o.so_buoi_lam_viec ?? bl.so_buoi_lam_viec ?? 0;
  if (isTheoBuoi) return Math.round(lcb * soBuoi + th - tu);
  return Math.round(lcb + tc + th - tu);
}

function PayrollPayslipKpi({
  label,
  value,
  big,
  colorClass,
  bgClass,
}: {
  label: string;
  value: string;
  big?: boolean;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={cn("min-w-0 flex-1 rounded-xl border border-black/[0.06] px-3 py-2.5", bgClass)}>
      <div className="text-[9px] font-extrabold uppercase tracking-wide text-[#888]">{label}</div>
      <div className={cn("mt-0.5 font-bold tabular-nums", big ? "text-[15px]" : "text-[13px]", colorClass)}>{value}</div>
    </div>
  );
}

type PayslipDraft = {
  lcb: string;
  troCap: string;
  bhxh: string;
  thuong: string;
  tamUng: string;
  tongBuoi: string;
  soBuoiLam: string;
  soBuoiNghi: string;
  nghiToiDa: string;
};

function buildDraft(nv: AdminNhanSuRow, bl: AdminBangTinhLuongListItem, showBhxh: boolean): PayslipDraft {
  const bhxh =
    showBhxh && nv.bhxh != null && Number.isFinite(Number(nv.bhxh)) && Number(nv.bhxh) > 0
      ? fmtVndDigits(nv.bhxh)
      : "";
  return {
    lcb: fmtVndDigits(nv.luong_co_ban),
    troCap: fmtVndDigits(nv.tro_cap),
    bhxh,
    thuong: fmtVndDigits(bl.thuong),
    tamUng: fmtVndDigits(bl.tam_ung),
    tongBuoi: bl.tong_buoi_lam_viec_trong_thang != null ? String(Math.trunc(Number(bl.tong_buoi_lam_viec_trong_thang))) : "",
    soBuoiLam: bl.so_buoi_lam_viec != null ? String(Math.trunc(Number(bl.so_buoi_lam_viec))) : "",
    soBuoiNghi: bl.so_buoi_nghi_trong_thang != null ? String(Math.trunc(Number(bl.so_buoi_nghi_trong_thang))) : "",
    nghiToiDa:
      nv.so_buoi_nghi_toi_da != null && Number.isFinite(Number(nv.so_buoi_nghi_toi_da))
        ? String(Math.trunc(Number(nv.so_buoi_nghi_toi_da)))
        : "",
  };
}

export type PayrollPayslipCardProps = {
  nv: AdminNhanSuRow;
  bl: AdminBangTinhLuongListItem;
  /** Cho phép sửa số tiền / điểm danh (admin đủ quyền bundle). */
  editable?: boolean;
  onSaved?: () => void;
};

/** Phiếu lương = bản xem tính toán — tương đương khối `printRef` trong Framer. */
export const PayrollPayslipCard = forwardRef<HTMLDivElement, PayrollPayslipCardProps>(function PayrollPayslipCard(
  { nv, bl, editable = false, onSaved },
  ref
) {
  const isTheoBuoi = nv.hinh_thuc_tinh_luong?.trim() === "Theo buổi";
  const bhxhVal = nv.bhxh != null && nv.bhxh > 0 ? nv.bhxh : null;
  const showBhxh = !isTheoBuoi && bhxhVal != null;

  const payslipDataSig = useMemo(
    () =>
      [
        nv.id,
        bl.id,
        nv.luong_co_ban ?? "",
        nv.tro_cap ?? "",
        nv.bhxh ?? "",
        nv.so_buoi_nghi_toi_da ?? "",
        bl.tam_ung ?? "",
        bl.thuong ?? "",
        bl.tong_buoi_lam_viec_trong_thang ?? "",
        bl.so_buoi_lam_viec ?? "",
        bl.so_buoi_nghi_trong_thang ?? "",
      ].join("|"),
    [
      nv.id,
      bl.id,
      nv.luong_co_ban,
      nv.tro_cap,
      nv.bhxh,
      nv.so_buoi_nghi_toi_da,
      bl.tam_ung,
      bl.thuong,
      bl.tong_buoi_lam_viec_trong_thang,
      bl.so_buoi_lam_viec,
      bl.so_buoi_nghi_trong_thang,
    ]
  );

  const [draft, setDraft] = useState<PayslipDraft>(() => buildDraft(nv, bl, showBhxh));
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const baselineDraft = useMemo(() => buildDraft(nv, bl, showBhxh), [payslipDataSig, showBhxh]);

  useEffect(() => {
    setDraft(buildDraft(nv, bl, showBhxh));
    setSaveErr(null);
  }, [payslipDataSig, showBhxh, nv, bl]);

  const netOverrides: NetOverrides = useMemo(() => {
    const plcb = parseVndDigits(draft.lcb);
    const ptc = parseVndDigits(draft.troCap);
    const ptu = parseVndDigits(draft.tamUng);
    const pth = parseVndDigits(draft.thuong);
    const psb = parseIntNonNeg(draft.soBuoiLam);
    return {
      luong_co_ban: plcb.ok ? plcb.value : null,
      tro_cap: ptc.ok ? ptc.value : null,
      tam_ung: ptu.ok ? ptu.value : null,
      thuong: pth.ok ? pth.value : null,
      so_buoi_lam_viec: psb.ok ? psb.value : null,
    };
  }, [draft.lcb, draft.troCap, draft.tamUng, draft.thuong, draft.soBuoiLam]);

  const net = editable
    ? computePayrollNetSalaryDraft(nv, bl, netOverrides)
    : computePayrollNetSalary(nv, bl);

  const ky = bl.ky_thang || bl.ky_nam ? [bl.ky_thang, bl.ky_nam].filter(Boolean).join(" ") : "—";

  const isDirty =
    editable &&
    (draft.lcb !== baselineDraft.lcb ||
      draft.troCap !== baselineDraft.troCap ||
      draft.bhxh !== baselineDraft.bhxh ||
      draft.thuong !== baselineDraft.thuong ||
      draft.tamUng !== baselineDraft.tamUng ||
      draft.tongBuoi !== baselineDraft.tongBuoi ||
      draft.soBuoiLam !== baselineDraft.soBuoiLam ||
      draft.soBuoiNghi !== baselineDraft.soBuoiNghi ||
      draft.nghiToiDa !== baselineDraft.nghiToiDa);

  const tamKpi = useMemo(() => {
    if (!editable) return bl.tam_ung;
    const p = parseVndDigits(draft.tamUng);
    if (!p.ok) return bl.tam_ung;
    return p.value ?? 0;
  }, [editable, draft.tamUng, bl.tam_ung]);

  const thuongKpi = useMemo(() => {
    if (!editable) return bl.thuong;
    const p = parseVndDigits(draft.thuong);
    if (!p.ok) return bl.thuong;
    return p.value ?? 0;
  }, [editable, draft.thuong, bl.thuong]);

  const leaveRemainDisplay = useMemo(() => {
    const ceiling =
      editable && draft.nghiToiDa.trim() !== ""
        ? (() => {
            const p = parseIntNonNeg(draft.nghiToiDa);
            return p.ok ? p.value : null;
          })()
        : nv.so_buoi_nghi_toi_da != null && Number.isFinite(Number(nv.so_buoi_nghi_toi_da))
          ? Math.trunc(Number(nv.so_buoi_nghi_toi_da))
          : null;
    if (ceiling == null) return "—";

    const usedYear =
      bl.tong_so_buoi_nghi_trong_nam != null && Number.isFinite(Number(bl.tong_so_buoi_nghi_trong_nam))
        ? Math.max(0, Math.trunc(Number(bl.tong_so_buoi_nghi_trong_nam)))
        : null;
    if (usedYear == null) return "—";

    const prevMonth =
      bl.so_buoi_nghi_trong_thang != null && Number.isFinite(Number(bl.so_buoi_nghi_trong_thang))
        ? Math.max(0, Math.trunc(Number(bl.so_buoi_nghi_trong_thang)))
        : 0;

    let draftMonth = prevMonth;
    if (editable) {
      const p = parseIntNonNeg(draft.soBuoiNghi);
      if (p.ok && p.value != null) draftMonth = p.value;
    }

    const adjustedYear = usedYear - prevMonth + draftMonth;
    return String(Math.max(0, ceiling - adjustedYear));
  }, [
    editable,
    draft.nghiToiDa,
    draft.soBuoiNghi,
    nv.so_buoi_nghi_toi_da,
    bl.tong_so_buoi_nghi_trong_nam,
    bl.so_buoi_nghi_trong_thang,
  ]);

  const setField = (key: keyof PayslipDraft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleSave = async () => {
    setSaveErr(null);
    const lcb = parseVndDigits(draft.lcb);
    if (!lcb.ok) {
      setSaveErr(lcb.error);
      return;
    }
    const troCap = parseVndDigits(draft.troCap);
    if (!troCap.ok) {
      setSaveErr(troCap.error);
      return;
    }
    const tamUng = parseVndDigits(draft.tamUng);
    if (!tamUng.ok) {
      setSaveErr(tamUng.error);
      return;
    }
    const thuong = parseVndDigits(draft.thuong);
    if (!thuong.ok) {
      setSaveErr(thuong.error);
      return;
    }
    let bhxhPayload: number | null | undefined = undefined;
    if (showBhxh) {
      const bx = parseVndDigits(draft.bhxh);
      if (!bx.ok) {
        setSaveErr(bx.error);
        return;
      }
      bhxhPayload = bx.value;
    }
    const nghiMax = parseIntNonNeg(draft.nghiToiDa);
    if (!nghiMax.ok) {
      setSaveErr(nghiMax.error);
      return;
    }
    const tongBuoi = parseIntNonNeg(draft.tongBuoi);
    if (!tongBuoi.ok) {
      setSaveErr(tongBuoi.error);
      return;
    }
    const soLam = parseIntNonNeg(draft.soBuoiLam);
    if (!soLam.ok) {
      setSaveErr(soLam.error);
      return;
    }
    const soNghi = parseIntNonNeg(draft.soBuoiNghi);
    if (!soNghi.ok) {
      setSaveErr(soNghi.error);
      return;
    }

    setSaving(true);
    try {
      const r = await updateHrPayrollPayslipFields({
        nhan_vien_id: nv.id,
        bang_tinh_luong_id: bl.id,
        nhan_su: {
          luong_co_ban: lcb.value,
          tro_cap: troCap.value,
          so_buoi_nghi_toi_da: nghiMax.value,
          ...(showBhxh ? { bhxh: bhxhPayload ?? null } : {}),
        },
        bang_tinh_luong: {
          tam_ung: tamUng.value,
          thuong: thuong.value,
        },
        lich_diem_danh: {
          tong_buoi_lam_viec_trong_thang: tongBuoi.value ?? 0,
          so_buoi_lam_viec: soLam.value ?? 0,
          so_buoi_nghi_trong_thang: soNghi.value ?? 0,
        },
      });
      if (!r.ok) {
        setSaveErr(r.error);
        return;
      }
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="rounded-2xl border border-[#EAEAEA] bg-[#F5F7F7] p-3">
      <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#AAA]">Phiếu lương #{bl.id}</div>
      <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#EAEAEA] bg-white px-3 py-3">
        {nv.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nv.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full border-2 border-[#EAEAEA] object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#EAEAEA] bg-[#F5F7F7] text-[#AAA]">
            <User size={20} aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-[#323232]">{nv.full_name?.trim() || "—"}</div>
          <div className="truncate text-[11px] font-medium text-[#AAA]">
            {nv.hinh_thuc_tinh_luong?.trim() || "—"}
            {ky !== "—" ? ` · ${ky}` : ""}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold text-[#AAA]">Lương thực nhận</div>
          <div className="text-[16px] font-extrabold tabular-nums text-[#1A9A5C]">{payslipFmtVnd(net)}</div>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <PayrollPayslipKpi
          label="Lương thực nhận"
          value={payslipFmtVnd(net)}
          big
          colorClass="text-[#1A9A5C]"
          bgClass="bg-[#E8F9F0]"
        />
        <PayrollPayslipKpi label="Tạm ứng" value={payslipFmtVnd(tamKpi)} colorClass="text-[#B76E00]" bgClass="bg-[#FFF7E6]" />
        {!isTheoBuoi ? (
          <PayrollPayslipKpi label="Thưởng" value={payslipFmtVnd(thuongKpi)} colorClass="text-[#3B5BDB]" bgClass="bg-[#EEF3FF]" />
        ) : null}
      </div>
      <div className="mb-3 rounded-xl border border-[#EAEAEA] bg-white px-3 py-3">
        <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-[#888]">
          <DollarSign size={14} className="text-[#E91E8C]" aria-hidden />
          Thông tin lương
        </div>
        <div className="space-y-2.5">
          <PayslipFieldRow label="Nhân viên">
            <PayslipReadField value={nv.full_name?.trim() ?? ""} />
          </PayslipFieldRow>
          <PayslipFieldRow label="Hình thức">
            <PayslipReadField value={nv.hinh_thuc_tinh_luong?.trim() ?? ""} />
          </PayslipFieldRow>
          <PayslipFieldRow label="Tháng / Năm">
            <PayslipReadField value={ky} />
          </PayslipFieldRow>
          <PayslipFieldRow label="Lương cơ bản">
            {editable ? (
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={inpEdit + " tabular-nums"}
                value={draft.lcb}
                onChange={(e) => setField("lcb", e.target.value)}
              />
            ) : (
              <PayslipReadField value={payslipFmtVnd(nv.luong_co_ban)} />
            )}
          </PayslipFieldRow>
          {!isTheoBuoi ? (
            <PayslipFieldRow label="Trợ cấp">
              {editable ? (
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={inpEdit + " tabular-nums"}
                  value={draft.troCap}
                  onChange={(e) => setField("troCap", e.target.value)}
                />
              ) : (
                <PayslipReadField value={payslipFmtVnd(nv.tro_cap)} />
              )}
            </PayslipFieldRow>
          ) : null}
          {showBhxh ? (
            <PayslipFieldRow label="BHXH">
              {editable ? (
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={inpEdit + " tabular-nums"}
                  value={draft.bhxh}
                  onChange={(e) => setField("bhxh", e.target.value)}
                  placeholder="0"
                />
              ) : (
                <PayslipReadField value={payslipFmtVnd(bhxhVal)} />
              )}
            </PayslipFieldRow>
          ) : null}
          {!isTheoBuoi || editable ? (
            <PayslipFieldRow label="Thưởng trong tháng">
              {editable ? (
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={inpEdit + " tabular-nums"}
                  value={draft.thuong}
                  onChange={(e) => setField("thuong", e.target.value)}
                />
              ) : (
                <PayslipReadField value={payslipFmtVnd(bl.thuong)} />
              )}
            </PayslipFieldRow>
          ) : null}
          {!isTheoBuoi || editable ? (
            <PayslipFieldRow label="Tạm ứng trong tháng">
              {editable ? (
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={inpEdit + " tabular-nums"}
                  value={draft.tamUng}
                  onChange={(e) => setField("tamUng", e.target.value)}
                />
              ) : (
                <PayslipReadField value={payslipFmtVnd(bl.tam_ung)} />
              )}
            </PayslipFieldRow>
          ) : null}
          <PayslipFieldRow label="Lương thực nhận">
            <PayslipReadField value={payslipFmtVnd(net)} />
          </PayslipFieldRow>
        </div>
      </div>
      <div className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-3">
        <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-[#888]">
          <Calendar size={14} className="text-[#3B5BDB]" aria-hidden />
          Lịch điểm danh
        </div>
        <div className="space-y-2.5">
          <PayslipFieldRow label="Tổng buổi quy định">
            {editable ? (
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={inpEdit + " tabular-nums"}
                value={draft.tongBuoi}
                onChange={(e) => setField("tongBuoi", e.target.value)}
              />
            ) : (
              <PayslipReadField value={bl.tong_buoi_lam_viec_trong_thang != null ? String(bl.tong_buoi_lam_viec_trong_thang) : "—"} />
            )}
          </PayslipFieldRow>
          <PayslipFieldRow label="Số buổi đi làm thực tế">
            {editable ? (
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={inpEdit + " tabular-nums"}
                value={draft.soBuoiLam}
                onChange={(e) => setField("soBuoiLam", e.target.value)}
              />
            ) : (
              <PayslipReadField value={bl.so_buoi_lam_viec != null ? String(bl.so_buoi_lam_viec) : "—"} />
            )}
          </PayslipFieldRow>
          <PayslipFieldRow label="Số buổi nghỉ trong tháng">
            {editable ? (
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={inpEdit + " tabular-nums"}
                value={draft.soBuoiNghi}
                onChange={(e) => setField("soBuoiNghi", e.target.value)}
              />
            ) : (
              <PayslipReadField value={bl.so_buoi_nghi_trong_thang != null ? String(bl.so_buoi_nghi_trong_thang) : "—"} />
            )}
          </PayslipFieldRow>
          <PayslipFieldRow label="Nghỉ tối đa / năm">
            {editable ? (
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={inpEdit + " tabular-nums"}
                value={draft.nghiToiDa}
                onChange={(e) => setField("nghiToiDa", e.target.value)}
              />
            ) : (
              <PayslipReadField
                value={
                  nv.so_buoi_nghi_toi_da != null && Number.isFinite(Number(nv.so_buoi_nghi_toi_da))
                    ? String(Math.trunc(Number(nv.so_buoi_nghi_toi_da)))
                    : "—"
                }
              />
            )}
          </PayslipFieldRow>
          <PayslipFieldRow label="Số buổi nghỉ còn lại">
            <PayslipReadField value={leaveRemainDisplay} />
          </PayslipFieldRow>
        </div>
      </div>

      {editable ? (
        <div className="mt-3 space-y-2">
          {saveErr ? (
            <p className="m-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-900">
              {saveErr}
            </p>
          ) : null}
          <button
            type="button"
            disabled={saving || !isDirty}
            onClick={() => void handleSave()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2.5 text-[13px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Save size={18} aria-hidden />}
            {saving ? "Đang lưu…" : "Lưu thay đổi phiếu lương"}
          </button>
        </div>
      ) : null}
    </div>
  );
});
PayrollPayslipCard.displayName = "PayrollPayslipCard";
