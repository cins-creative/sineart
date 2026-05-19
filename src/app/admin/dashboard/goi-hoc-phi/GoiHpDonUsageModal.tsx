"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, Receipt, Trash2, X } from "lucide-react";

import {
  deleteGoiHpChiTietLine,
  deleteGoiHpDonFromUsage,
  fetchGoiHpDonUsage,
  type GoiHpDonUsageRow,
} from "@/app/admin/dashboard/goi-hoc-phi/actions";

type Props = {
  goiId: number;
  goiLabel: string;
  canDelete: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

function donTitle(row: GoiHpDonUsageRow): string {
  return row.ma_don?.trim() || row.ma_don_so?.trim() || `Đơn #${row.donId}`;
}

export default function GoiHpDonUsageModal({ goiId, goiLabel, canDelete, onClose, onChanged }: Props) {
  const [rows, setRows] = useState<GoiHpDonUsageRow[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingChiId, setPendingChiId] = useState<number | null>(null);
  const [pendingDonId, setPendingDonId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    const res = await fetchGoiHpDonUsage(goiId);
    if (res.ok) {
      setRows(res.rows);
      setTruncated(res.truncated);
    } else {
      setRows([]);
      setTruncated(false);
      setLoadError(res.error);
    }
    setLoading(false);
  }, [goiId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDeleteChi(row: GoiHpDonUsageRow) {
    if (
      !window.confirm(
        `Gỡ dòng chi tiết #${row.chiId} khỏi đơn «${donTitle(row)}»?\nĐơn vẫn còn nếu có dòng khác; chỉ xóa dòng gắn gói này.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setPendingChiId(row.chiId);
    try {
      const res = await deleteGoiHpChiTietLine(row.chiId);
      if (res.ok) {
        onChanged?.();
        await load();
      } else {
        setActionError(res.error);
      }
    } finally {
      setPendingChiId(null);
    }
  }

  async function handleDeleteDon(row: GoiHpDonUsageRow) {
    if (
      !window.confirm(
        `Xóa vĩnh viễn đơn «${donTitle(row)}» (#${row.donId}) và mọi dòng chi tiết?\nHành động không hoàn tác.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setPendingDonId(row.donId);
    try {
      const res = await deleteGoiHpDonFromUsage(row.donId);
      if (res.ok) {
        onChanged?.();
        await load();
      } else {
        setActionError(res.error);
      }
    } finally {
      setPendingDonId(null);
    }
  }

  const busy = pendingChiId !== null || pendingDonId !== null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm md:p-6"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goi-hp-usage-title"
        className="flex max-h-[min(88vh,720px)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#EAEAEA] bg-[#FFFBF8] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#7a5bb0]">
              <Receipt size={18} strokeWidth={2.2} aria-hidden />
              <span className="text-[11px] font-bold uppercase tracking-wide">Đơn gán gói HP</span>
            </div>
            <h2 id="goi-hp-usage-title" className="m-0 mt-1 text-base font-bold text-[#1a1a2e]">
              Gói #{goiId}
            </h2>
            <p className="m-0 mt-1 line-clamp-2 text-sm text-black/65">{goiLabel}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EAEAEA] bg-white text-black/55 hover:bg-white disabled:opacity-45"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="m-0 text-sm leading-relaxed text-black/70">
            Các đơn / dòng chi tiết đang trỏ tới gói này. Gỡ dòng hoặc xóa đơn trước khi xóa gói học phí.
          </p>
          <p className="mt-2 text-xs text-black/50">
            <Link
              href="/admin/dashboard/quan-ly-hoa-don"
              className="inline-flex items-center gap-1 font-semibold text-[#7a5bb0] hover:underline"
            >
              Quản lý hóa đơn
              <ExternalLink size={12} aria-hidden />
            </Link>
          </p>

          {actionError ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {actionError}
            </p>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-black/50">
              <Loader2 size={18} className="animate-spin" aria-hidden />
              Đang tải…
            </div>
          ) : loadError ? (
            <p className="py-12 text-center text-sm text-red-700">{loadError}</p>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-black/50">
              Không có đơn nào đang gán gói này — có thể xóa gói an toàn.
            </p>
          ) : (
            <>
              {truncated ? (
                <p className="mt-3 text-xs font-medium text-amber-800">
                  Hiển thị tối đa 500 dòng gần nhất. Dùng Quản lý hóa đơn nếu cần tra cứu thêm.
                </p>
              ) : null}
              <div className="mt-3 overflow-x-auto rounded-xl border border-[#EAEAEA]">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-black/50">
                      <th className="px-3 py-2.5">Mã đơn</th>
                      <th className="px-3 py-2.5">Học viên</th>
                      <th className="px-3 py-2.5">Lớp</th>
                      <th className="px-3 py-2.5">Kỳ HP</th>
                      <th className="px-3 py-2.5">Trạng thái</th>
                      {canDelete ? <th className="w-[11rem] px-2 py-2.5 text-center">Thao tác</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const chiBusy = pendingChiId === row.chiId;
                      const donBusy = pendingDonId === row.donId;
                      return (
                        <tr key={row.chiId} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FFFBF8]/60">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-[#1a1a2e]">{donTitle(row)}</div>
                            <div className="text-[11px] text-black/45">
                              Đơn #{row.donId} · dòng #{row.chiId}
                            </div>
                          </td>
                          <td className="max-w-[10rem] truncate px-3 py-2.5" title={row.studentName}>
                            {row.studentName}
                          </td>
                          <td className="max-w-[9rem] truncate px-3 py-2.5 text-xs text-black/70" title={row.tenLop}>
                            {row.tenLop}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-black/70">
                            {row.ngay_dau_ky ?? "—"} → {row.ngay_cuoi_ky ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            <div>{row.donStatus ?? "—"}</div>
                            <div className="text-[11px] text-black/45">{fmtDate(row.donCreatedAt)}</div>
                          </td>
                          {canDelete ? (
                            <td className="px-2 py-2 align-middle">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleDeleteChi(row)}
                                  className="rounded-lg border border-[#EAEAEA] bg-white px-2 py-1 text-[11px] font-semibold text-[#323232] hover:bg-[#F5F7F7] disabled:opacity-45"
                                  title="Xóa dòng chi tiết gắn gói này"
                                >
                                  {chiBusy ? "…" : "Gỡ dòng"}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleDeleteDon(row)}
                                  className="inline-flex items-center gap-0.5 rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-45"
                                  title="Xóa cả đơn thu học phí"
                                >
                                  <Trash2 size={12} aria-hidden />
                                  {donBusy ? "…" : "Xóa đơn"}
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-black/45 tabular-nums">{rows.length} dòng</p>
            </>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-[#EAEAEA] bg-[#FAFAFA] px-5 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-semibold text-black/75 hover:bg-white disabled:opacity-50"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
