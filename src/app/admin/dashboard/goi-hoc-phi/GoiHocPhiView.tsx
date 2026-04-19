"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Copy,
  Layers2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import {
  createHpComboMon,
  deleteGoiHocPhi,
  deleteHpComboMon,
  duplicateGoiHocPhi,
  saveGoiHocPhi,
  saveGoiHocPhiBulk,
  updateHpComboMon,
} from "@/app/admin/dashboard/goi-hoc-phi/actions";
import type {
  ComboMonFormState,
  GoiHocPhiBulkRowInput,
  GoiHocPhiFormState,
} from "@/app/admin/dashboard/goi-hoc-phi/actions";
import type {
  AdminComboOption,
  AdminGoiHocPhiBundle,
  AdminGoiHocPhiRow,
  AdminMonOption,
} from "@/lib/data/admin-goi-hoc-phi";

type Props = {
  bundle: AdminGoiHocPhiBundle;
};

function fmtVnd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₫";
}

function fmtNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

function parseClientNumNullable(raw: string): number | null {
  const t = raw.replace(/\s/g, "").replace(/,/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function tenMon(id: number | null, mons: AdminMonOption[]): string {
  if (id == null) return "—";
  return mons.find((m) => m.id === id)?.ten_mon_hoc ?? `#${id}`;
}

/** Tên gói hiển thị: Môn + post_title + gói đặc biệt + number + đơn vị (cách nhau bằng khoảng trắng). */
function buildTuDongTenGoiParts(p: {
  tenMon: string;
  post_title: string;
  special: string;
  goi_number: string;
  don_vi: string;
}): string {
  const parts: string[] = [];
  const tm = p.tenMon.trim();
  if (tm) parts.push(tm);
  const pt = p.post_title.trim();
  if (pt) parts.push(pt);
  const sp = p.special.trim();
  if (sp) parts.push(sp);
  const n = parseClientNumNullable(p.goi_number);
  if (n != null) parts.push(fmtNum(n));
  const dv = p.don_vi.trim();
  if (dv) parts.push(dv);
  return parts.length ? parts.join(" ") : "—";
}

function buildTuDongTenGoiFromRow(r: AdminGoiHocPhiRow, mons: AdminMonOption[]): string {
  const tenM = tenMon(r.mon_hoc, mons);
  return buildTuDongTenGoiParts({
    tenMon: tenM !== "—" ? tenM : "",
    post_title: r.post_title ?? "",
    special: r.special ?? "",
    goi_number: r.goiNumber != null ? String(r.goiNumber) : "",
    don_vi: r.don_vi ?? "",
  });
}

const GOI_LIST_PAGE_SIZE = 10;

function tenCombo(id: number | null, combos: AdminComboOption[]): string {
  if (id == null) return "—";
  return combos.find((c) => c.id === id)?.ten_combo ?? `#${id}`;
}

/** Bản nháp một dòng khi chỉnh sửa cả bảng (chuỗi giống form modal). */
type EditableGoiDraft = {
  id: number;
  mon_hoc: string;
  post_title: string;
  goi_number: string;
  don_vi: string;
  gia_goc: string;
  discount: string;
  combo_id: string;
  special: string;
  note: string;
  so_buoi: string;
};

function buildTuDongTenGoiFromDraft(d: EditableGoiDraft, mons: AdminMonOption[]): string {
  const monRaw = d.mon_hoc.trim();
  const monId = monRaw === "" ? null : Number(monRaw);
  const tenM =
    monId != null && Number.isFinite(monId) && monId > 0 ? tenMon(monId, mons) : "";
  return buildTuDongTenGoiParts({
    tenMon: tenM && tenM !== "—" ? tenM : "",
    post_title: d.post_title,
    special: d.special,
    goi_number: d.goi_number,
    don_vi: d.don_vi,
  });
}

function rowToDraft(r: AdminGoiHocPhiRow): EditableGoiDraft {
  return {
    id: r.id,
    mon_hoc: r.mon_hoc != null ? String(r.mon_hoc) : "",
    post_title: r.post_title ?? "",
    goi_number: r.goiNumber != null ? String(r.goiNumber) : "",
    don_vi: r.don_vi ?? "",
    gia_goc: r.gia_goc != null ? String(Math.round(r.gia_goc)) : "",
    discount: r.discount != null ? String(r.discount) : "",
    combo_id: r.combo_id != null ? String(r.combo_id) : "",
    special: r.special ?? "",
    note: r.note ?? "",
    so_buoi: r.so_buoi != null ? String(r.so_buoi) : "",
  };
}

function draftToBulkInput(
  d: EditableGoiDraft,
): { ok: true; row: GoiHocPhiBulkRowInput } | { ok: false; error: string } {
  const monRaw = d.mon_hoc.trim();
  const mon_hoc = monRaw === "" ? null : Number(monRaw);
  if (mon_hoc != null && (!Number.isFinite(mon_hoc) || mon_hoc <= 0)) {
    return { ok: false, error: `Gói #${d.id}: Môn học không hợp lệ.` };
  }
  const comboRaw = d.combo_id.trim();
  const combo_id = comboRaw === "" ? null : Number(comboRaw);
  if (combo_id != null && (!Number.isFinite(combo_id) || combo_id <= 0)) {
    return { ok: false, error: `Gói #${d.id}: Combo không hợp lệ.` };
  }
  const don_vi = d.don_vi.trim() || null;
  if (don_vi != null && don_vi.length > 500) {
    return { ok: false, error: `Gói #${d.id}: Đơn vị quá dài (tối đa 500 ký tự).` };
  }
  const specialTrim = d.special.trim();
  if (specialTrim.length > 500) {
    return { ok: false, error: `Gói #${d.id}: Gói đặc biệt quá dài (tối đa 500 ký tự).` };
  }
  const noteTrim = d.note.trim();
  if (noteTrim.length > 4000) {
    return { ok: false, error: `Gói #${d.id}: Ghi chú quá dài (tối đa 4000 ký tự).` };
  }
  const postTitleTrim = d.post_title.trim();
  if (postTitleTrim.length > 500) {
    return { ok: false, error: `Gói #${d.id}: Hậu tố (post_title) quá dài (tối đa 500 ký tự).` };
  }
  return {
    ok: true,
    row: {
      id: d.id,
      mon_hoc,
      goi_number: parseClientNumNullable(d.goi_number),
      don_vi,
      gia_goc: parseClientNumNullable(d.gia_goc),
      discount: parseClientNumNullable(d.discount),
      combo_id,
      so_buoi: parseClientNumNullable(d.so_buoi),
      special: specialTrim === "" ? null : specialTrim,
      note: noteTrim === "" ? null : noteTrim,
      post_title: postTitleTrim === "" ? null : postTitleTrim,
    },
  };
}

function ComboMonCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: AdminComboOption) => void;
}) {
  const router = useRouter();
  const [banner, setBanner] = useState("");
  const [state, action, pending] = useActionState(createHpComboMon, null as ComboMonFormState | null);

  useEffect(() => {
    if (state?.ok) {
      onCreated({ id: state.id, ten_combo: state.ten_combo, gia_giam: state.gia_giam });
      router.refresh();
      onClose();
    } else if (state && !state.ok) {
      setBanner(state.error);
    }
  }, [state, onCreated, onClose, router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EAEAEA] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Layers2 size={18} className="text-[#BC8AF9]" />
            <h3 className="m-0 text-base font-bold text-[#323232]">Combo mới (hp_combo_mon)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-0 bg-black/[0.04] p-2 text-black/60 hover:bg-black/[0.08]"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
        <form action={action} className="space-y-4 px-5 py-4">
          {banner ? (
            <div className="rounded-xl border border-[#FFCDD2] bg-[#FFF0F3] px-3 py-2 text-sm text-[#C0244E]">
              {banner}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">
              Tên combo
            </span>
            <input
              name="ten_combo"
              required
              maxLength={500}
              className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
              placeholder="VD: HH Onl & TTM Onl 1 tháng"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">
              Giá giảm (₫)
            </span>
            <input
              name="gia_giam"
              className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
              inputMode="numeric"
              placeholder="0 = không giảm"
            />
            <p className="mt-1 text-[11px] text-black/45">Số tiền giảm khi đủ điều kiện combo (logic thanh toán hiện tại).</p>
          </label>
          <div className="flex justify-end gap-2 border-t border-[#EAEAEA] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-semibold text-black/70 hover:bg-[#F5F7F7]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Đang tạo…" : "Tạo combo"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ComboMonEditModal({
  combo,
  onClose,
  onUpdated,
}: {
  combo: AdminComboOption;
  onClose: () => void;
  onUpdated: (c: AdminComboOption) => void;
}) {
  const router = useRouter();
  const [banner, setBanner] = useState("");
  const [state, action, pending] = useActionState(updateHpComboMon, null as ComboMonFormState | null);

  useEffect(() => {
    setBanner("");
  }, [combo.id]);

  useEffect(() => {
    if (state?.ok) {
      onUpdated({ id: state.id, ten_combo: state.ten_combo, gia_giam: state.gia_giam });
      router.refresh();
      onClose();
    } else if (state && !state.ok) {
      setBanner(state.error);
    }
  }, [state, onUpdated, onClose, router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EAEAEA] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Pencil size={18} className="text-[#BC8AF9]" />
            <h3 className="m-0 text-base font-bold text-[#323232]">Sửa combo #{combo.id}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-0 bg-black/[0.04] p-2 text-black/60 hover:bg-black/[0.08]"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
        <form key={combo.id} action={action} className="space-y-4 px-5 py-4">
          <input type="hidden" name="combo_row_id" value={String(combo.id)} />
          {banner ? (
            <div className="rounded-xl border border-[#FFCDD2] bg-[#FFF0F3] px-3 py-2 text-sm text-[#C0244E]">
              {banner}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">
              Tên combo
            </span>
            <input
              name="ten_combo"
              required
              maxLength={500}
              defaultValue={combo.ten_combo}
              className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">
              Giá giảm (₫)
            </span>
            <input
              name="gia_giam"
              defaultValue={String(Math.round(combo.gia_giam))}
              className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
              inputMode="numeric"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-[#EAEAEA] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-semibold text-black/70 hover:bg-[#F5F7F7]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Đang lưu…" : "Lưu combo"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function GoiModal({
  row,
  isNew,
  goiTableName,
  specialSuggestions,
  monOptions,
  allComboOptions,
  onComboCreated,
  onClose,
}: {
  row: AdminGoiHocPhiRow | null;
  isNew: boolean;
  goiTableName: string;
  specialSuggestions: string[];
  monOptions: AdminMonOption[];
  allComboOptions: AdminComboOption[];
  onComboCreated: (c: AdminComboOption) => void;
  onClose: () => void;
}) {
  const { canDelete: roleMayDeleteCombo } = useAdminDashboardAbilities();
  const comboPickList = allComboOptions.length > 0;
  const router = useRouter();
  const [deletePending, startDeleteTransition] = useTransition();
  const [modalError, setModalError] = useState("");
  const [comboCreateOpen, setComboCreateOpen] = useState(false);
  const [comboCreateKey, setComboCreateKey] = useState(0);
  const [comboEditOpen, setComboEditOpen] = useState(false);
  const [comboEditKey, setComboEditKey] = useState(0);
  const [deleteComboWarningOpen, setDeleteComboWarningOpen] = useState(false);
  const specialListId = useId();
  const supportsSpecial = goiTableName !== "hp_goi_hoc_phi";
  const [form, setForm] = useState({
    mon_hoc: row?.mon_hoc != null ? String(row.mon_hoc) : "",
    post_title: row?.post_title ?? "",
    goi_number: row?.goiNumber != null ? String(row.goiNumber) : "",
    don_vi: row?.don_vi ?? "",
    gia_goc: row?.gia_goc != null ? String(Math.round(row.gia_goc)) : "",
    discount: row?.discount != null ? String(row.discount) : "",
    combo_id: row?.combo_id != null ? String(row.combo_id) : "",
    special: row?.special ?? "",
    note: row?.note ?? "",
    so_buoi: row?.so_buoi != null ? String(row.so_buoi) : "",
  });

  const [saveState, saveAction, savePending] = useActionState(saveGoiHocPhi, null as GoiHocPhiFormState | null);

  const selectedCombo = useMemo(() => {
    const raw = form.combo_id.trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return allComboOptions.find((c) => c.id === n) ?? null;
  }, [form.combo_id, allComboOptions]);

  useEffect(() => {
    if (!form.combo_id.trim()) {
      setComboEditOpen(false);
      setDeleteComboWarningOpen(false);
    }
  }, [form.combo_id]);

  function executeDeleteCombo() {
    if (!selectedCombo) return;
    const id = selectedCombo.id;
    startDeleteTransition(async () => {
      const res = await deleteHpComboMon(id);
      setDeleteComboWarningOpen(false);
      if (res.ok) {
        setModalError("");
        setForm((f) => ({ ...f, combo_id: "" }));
        router.refresh();
      } else {
        setModalError(res.error);
      }
    });
  }

  useEffect(() => {
    setForm({
      mon_hoc: row?.mon_hoc != null ? String(row.mon_hoc) : "",
      post_title: row?.post_title ?? "",
      goi_number: row?.goiNumber != null ? String(row.goiNumber) : "",
      don_vi: row?.don_vi ?? "",
      gia_goc: row?.gia_goc != null ? String(Math.round(row.gia_goc)) : "",
      discount: row?.discount != null ? String(row.discount) : "",
      combo_id: row?.combo_id != null ? String(row.combo_id) : "",
      special: row?.special ?? "",
      note: row?.note ?? "",
      so_buoi: row?.so_buoi != null ? String(row.so_buoi) : "",
    });
    setModalError("");
  }, [row, isNew]);

  const modalTenGoiPreview = useMemo(() => {
    if (!supportsSpecial) return "";
    return buildTuDongTenGoiFromDraft(
      {
        id: 0,
        mon_hoc: form.mon_hoc,
        post_title: form.post_title,
        goi_number: form.goi_number,
        don_vi: form.don_vi,
        gia_goc: "",
        discount: "",
        combo_id: "",
        special: form.special,
        note: "",
        so_buoi: "",
      },
      monOptions,
    );
  }, [
    supportsSpecial,
    form.mon_hoc,
    form.post_title,
    form.goi_number,
    form.don_vi,
    form.special,
    monOptions,
  ]);

  useEffect(() => {
    if (saveState?.ok) {
      router.refresh();
      onClose();
    } else if (saveState && !saveState.ok) {
      setModalError(saveState.error);
    }
  }, [saveState, onClose, router]);

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 420 }}
        className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#EAEAEA] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-bold text-[#323232]">
                {isNew ? "Thêm gói học phí" : `Sửa gói #${row?.id ?? ""}`}
              </h2>
              <p className="m-0 mt-1 text-xs text-[#AAAAAA]">
                Bảng gói theo cấu hình server (mặc định <code className="rounded bg-black/[0.04] px-1">hp_goi_hoc_phi_new</code>
                ).
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border-0 bg-black/[0.04] p-2 text-black/60 hover:bg-black/[0.08]"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form action={saveAction} className="space-y-4 px-6 py-5">
          <input type="hidden" name="id" value={isNew ? "" : String(row?.id ?? "")} />

          {modalError ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#FFCDD2] bg-[#FFF0F3] px-3 py-2 text-sm text-[#C0244E]">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{modalError}</span>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">Môn học</span>
            <select
              name="mon_hoc"
              value={form.mon_hoc}
              onChange={(e) => setForm((f) => ({ ...f, mon_hoc: e.target.value }))}
              className="w-full rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
            >
              <option value="">— Không gán môn —</option>
              {monOptions.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.ten_mon_hoc}
                </option>
              ))}
            </select>
          </label>

          {supportsSpecial ? (
            <>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">
                  Hậu tố <span className="font-normal normal-case text-black/40">(post_title)</span>
                </span>
                <input
                  name="post_title"
                  value={form.post_title}
                  onChange={(e) => setForm((f) => ({ ...f, post_title: e.target.value }))}
                  maxLength={500}
                  className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
                  placeholder="VD: 2 môn"
                />
                <p className="mt-1 text-[11px] leading-snug text-black/45">
                  Ghép tên gói: Môn + hậu tố + gói đặc biệt + số (number) + đơn vị.
                </p>
              </label>
              <div className="rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#323232]">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-black/40">
                  Tên gói (xem trước)
                </span>
                <span className="font-medium leading-snug">{modalTenGoiPreview}</span>
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">
                Số (number)
              </span>
              <input
                name="goi_number"
                value={form.goi_number}
                onChange={(e) => setForm((f) => ({ ...f, goi_number: e.target.value }))}
                className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
                inputMode="decimal"
                placeholder="VD: 1"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">Đơn vị</span>
              <input
                name="don_vi"
                value={form.don_vi}
                onChange={(e) => setForm((f) => ({ ...f, don_vi: e.target.value }))}
                className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
                placeholder="VD: tháng, buổi…"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">Giá gốc (₫)</span>
              <input
                name="gia_goc"
                value={form.gia_goc}
                onChange={(e) => setForm((f) => ({ ...f, gia_goc: e.target.value }))}
                className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
                inputMode="numeric"
                placeholder="VD: 3500000"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">Discount</span>
              <input
                name="discount"
                value={form.discount}
                onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
                inputMode="decimal"
                placeholder="VD: 10 (% hoặc số tiền tùy DB)"
              />
            </label>
          </div>

          <div className="block space-y-2">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">
              Combo <span className="font-normal normal-case text-black/40">(hp_combo_mon.id)</span>
            </span>
            {comboPickList ? (
              <select
                name="combo_id"
                value={form.combo_id}
                onChange={(e) => setForm((f) => ({ ...f, combo_id: e.target.value }))}
                className="w-full rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
              >
                <option value="">— Không thuộc combo —</option>
                {allComboOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.ten_combo}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  name="combo_id"
                  value={form.combo_id}
                  onChange={(e) => setForm((f) => ({ ...f, combo_id: e.target.value }))}
                  className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
                  inputMode="numeric"
                  placeholder="Để trống = không combo, hoặc nhập số ID"
                />
                <p className="mt-1.5 text-[11px] leading-snug text-black/45">
                  Không tải được danh sách tên combo — nhập trực tiếp <code className="rounded bg-black/[0.04] px-0.5">id</code>{" "}
                  từ bảng <code className="rounded bg-black/[0.04] px-0.5">hp_combo_mon</code>. Sửa/xóa combo khi chỉ có ID: dùng SQL
                  Editor hoặc cấp quyền đọc danh sách rồi chọn combo ở trên.
                </p>
              </>
            )}
            {comboPickList && selectedCombo ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setComboEditKey((k) => k + 1);
                    setComboEditOpen(true);
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2 text-[13px] font-semibold text-[#323232] hover:border-[#BC8AF9]/45 hover:bg-[#BC8AF9]/10 sm:flex-initial"
                >
                  <Pencil size={14} />
                  Sửa combo này
                </button>
                {roleMayDeleteCombo ? (
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={() => setDeleteComboWarningOpen(true)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-[13px] font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50 sm:flex-initial"
                  >
                    <Trash2 size={14} />
                    Xóa combo
                  </button>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setComboCreateKey((k) => k + 1);
                setComboCreateOpen(true);
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#BC8AF9]/50 bg-[#BC8AF9]/08 px-3 py-2 text-[13px] font-semibold text-[#7a5bb0] hover:border-[#BC8AF9] hover:bg-[#BC8AF9]/14"
            >
              <Plus size={15} strokeWidth={2.5} />
              Thêm combo mới
            </button>
          </div>

          {supportsSpecial ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">
                Gói đặc biệt <span className="font-normal normal-case text-black/40">(special)</span>
              </span>
              <datalist id={specialListId}>
                {specialSuggestions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <input
                name="special"
                list={specialListId}
                value={form.special}
                onChange={(e) => setForm((f) => ({ ...f, special: e.target.value }))}
                maxLength={500}
                autoComplete="off"
                className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
                placeholder="Chọn gợi ý hoặc gõ nhãn mới…"
              />
              <p className="mt-1 text-[11px] leading-snug text-black/45">
                Gợi ý lấy từ các giá trị đã lưu trên gói khác; để trống nếu không áp dụng.
              </p>
            </label>
          ) : null}

          {supportsSpecial ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">
                Ghi chú <span className="font-normal normal-case text-black/40">(note)</span>
              </span>
              <textarea
                name="note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                maxLength={4000}
                rows={4}
                className="min-h-[88px] w-full resize-y rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm leading-relaxed outline-none ring-[#BC8AF9] focus:ring-2"
                placeholder="Nội dung hiển thị hoặc mô tả bổ sung cho gói…"
              />
              <p className="mt-1 text-[11px] leading-snug text-black/45">
                Tối đa 4000 ký tự — lưu trong cột <code className="rounded bg-black/[0.04] px-0.5">note</code>.
              </p>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-black/45">Số buổi</span>
            <input
              name="so_buoi"
              value={form.so_buoi}
              onChange={(e) => setForm((f) => ({ ...f, so_buoi: e.target.value }))}
              className="w-full rounded-xl border border-[#EAEAEA] px-3 py-2.5 text-sm outline-none ring-[#BC8AF9] focus:ring-2"
              inputMode="decimal"
              placeholder="VD: 12"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#EAEAEA] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-sm font-semibold text-black/70 hover:bg-[#F5F7F7]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savePending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savePending ? (
                "Đang lưu…"
              ) : (
                <>
                  <Save size={16} />
                  {isNew ? "Thêm" : "Lưu"}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {comboCreateOpen ? (
          <ComboMonCreateModal
            key={comboCreateKey}
            onClose={() => setComboCreateOpen(false)}
            onCreated={(c) => {
              onComboCreated(c);
              setForm((f) => ({ ...f, combo_id: String(c.id) }));
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {comboEditOpen && selectedCombo ? (
          <ComboMonEditModal
            key={`${comboEditKey}-${selectedCombo.id}`}
            combo={selectedCombo}
            onClose={() => setComboEditOpen(false)}
            onUpdated={(c) => {
              onComboCreated(c);
            }}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>

    <AnimatePresence>
      {roleMayDeleteCombo && deleteComboWarningOpen && selectedCombo ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[125] flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm"
          onClick={() => {
            if (!deletePending) setDeleteComboWarningOpen(false);
          }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 380 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="del-combo-title"
            aria-describedby="del-combo-desc"
            className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-amber-100 bg-amber-50/90 px-5 py-4">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle size={22} strokeWidth={2.2} aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 id="del-combo-title" className="m-0 text-base font-bold text-amber-950">
                    Cảnh báo — xóa combo
                  </h3>
                  <p className="m-0 mt-1 text-xs font-semibold text-amber-900/80">
                    Combo #{selectedCombo.id}
                  </p>
                </div>
              </div>
            </div>
            <div id="del-combo-desc" className="space-y-3 px-5 py-4 text-sm leading-relaxed text-[#323232]">
              <p className="m-0">
                Bạn sắp <strong className="text-red-800">xóa vĩnh viễn</strong> combo{" "}
                <span className="font-semibold">«{selectedCombo.ten_combo}»</span> khỏi bảng{" "}
                <code className="rounded bg-black/[0.06] px-1 text-xs">hp_combo_mon</code>.
              </p>
              <ul className="m-0 list-disc space-y-1.5 pl-5 text-[13px] text-black/75">
                <li>
                  Các <strong>gói học phí</strong> đang gắn <code className="rounded bg-black/[0.06] px-1">combo_id</code>{" "}
                  trỏ tới combo này có thể bị <strong>gỡ liên kết</strong> (thường là SET NULL) — tùy cấu hình FK trên
                  database.
                </li>
                <li>Thao tác này <strong>không hoàn tác</strong> từ giao diện này.</li>
              </ul>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#EAEAEA] bg-[#FAFAFA] px-5 py-4">
              <button
                type="button"
                disabled={deletePending}
                onClick={() => setDeleteComboWarningOpen(false)}
                className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-sm font-semibold text-black/75 hover:bg-white disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deletePending}
                onClick={executeDeleteCombo}
                className="rounded-xl border border-red-300 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deletePending ? "Đang xóa…" : "Xóa vĩnh viễn"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    </>
  );
}

export default function GoiHocPhiView({ bundle }: Props) {
  const router = useRouter();
  const tableSpecialListId = useId();
  const editBaselineRef = useRef<Map<number, string>>(new Map());
  const [bannerError, setBannerError] = useState(bundle.loadError ?? "");
  const [comboBannerDismissed, setComboBannerDismissed] = useState(false);
  const [extraComboOptions, setExtraComboOptions] = useState<AdminComboOption[]>([]);
  const [filterMonId, setFilterMonId] = useState<string>("");
  const [rowSearch, setRowSearch] = useState("");
  const [goiListPage, setGoiListPage] = useState(1);
  const [isNew, setIsNew] = useState(false);
  const [editDraftById, setEditDraftById] = useState<Map<number, EditableGoiDraft> | null>(null);
  const [bulkHint, setBulkHint] = useState<{ ok: boolean; text: string } | null>(null);
  const [bulkSavePending, startBulkSave] = useTransition();
  const [deleteRowPendingId, setDeleteRowPendingId] = useState<number | null>(null);
  const [duplicateRowPendingId, setDuplicateRowPendingId] = useState<number | null>(null);

  const tableEditMode = editDraftById != null;
  const emptyTableColSpan =
    (bundle.tableName !== "hp_goi_hoc_phi" ? 14 : 10) + (tableEditMode ? 1 : 0);

  useEffect(() => {
    setBannerError(bundle.loadError ?? "");
    setComboBannerDismissed(false);
  }, [bundle.loadError, bundle.comboWarning]);

  useEffect(() => {
    setExtraComboOptions([]);
  }, [bundle.comboOptions]);

  const sorted = useMemo(
    () => [...bundle.rows].sort((a, b) => b.id - a.id),
    [bundle.rows],
  );

  const allComboOptions = useMemo(() => {
    const byId = new Map<number, AdminComboOption>();
    for (const c of bundle.comboOptions) byId.set(c.id, c);
    for (const c of extraComboOptions) byId.set(c.id, c);
    return [...byId.values()].sort((a, b) => a.id - b.id);
  }, [bundle.comboOptions, extraComboOptions]);

  const comboPickList = allComboOptions.length > 0;
  const isNewGoiTable = bundle.tableName !== "hp_goi_hoc_phi";

  const filteredRows = useMemo(() => {
    let list = sorted;
    if (filterMonId === "__none__") list = list.filter((r) => r.mon_hoc == null);
    else if (filterMonId) {
      const mid = Number(filterMonId);
      if (Number.isFinite(mid)) list = list.filter((r) => r.mon_hoc === mid);
    }
    const s = rowSearch.trim().toLowerCase();
    if (s) {
      list = list.filter((r) => {
        const monName = tenMon(r.mon_hoc, bundle.monOptions).toLowerCase();
        const comboName = tenCombo(r.combo_id, allComboOptions).toLowerCase();
        const dv = (r.don_vi ?? "").toLowerCase();
        const gn = fmtNum(r.goiNumber).toLowerCase();
        const sb = fmtNum(r.so_buoi).toLowerCase();
        const sp = (r.special ?? "").toLowerCase();
        const nt = (r.note ?? "").toLowerCase();
        const pt = (r.post_title ?? "").toLowerCase();
        const tenTuDong = buildTuDongTenGoiFromRow(r, bundle.monOptions).toLowerCase();
        return (
          String(r.id).includes(s) ||
          monName.includes(s) ||
          comboName.includes(s) ||
          dv.includes(s) ||
          gn.includes(s) ||
          sb.includes(s) ||
          sp.includes(s) ||
          nt.includes(s) ||
          pt.includes(s) ||
          tenTuDong.includes(s)
        );
      });
    }
    return list;
  }, [sorted, filterMonId, rowSearch, bundle.monOptions, allComboOptions]);

  useEffect(() => {
    setGoiListPage(1);
  }, [rowSearch, filterMonId]);

  const goiTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / GOI_LIST_PAGE_SIZE)),
    [filteredRows.length],
  );

  useEffect(() => {
    setGoiListPage((p) => Math.min(Math.max(1, p), goiTotalPages));
  }, [goiTotalPages]);

  const pagedRows = useMemo(() => {
    const start = (goiListPage - 1) * GOI_LIST_PAGE_SIZE;
    return filteredRows.slice(start, start + GOI_LIST_PAGE_SIZE);
  }, [filteredRows, goiListPage]);

  const mergeCombo = (c: AdminComboOption) => {
    setExtraComboOptions((prev) => {
      const i = prev.findIndex((x) => x.id === c.id);
      if (i === -1) return [...prev, c];
      const next = [...prev];
      next[i] = c;
      return next;
    });
  };

  const specialSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const r of bundle.rows) {
      const t = (r.special ?? "").trim();
      if (t) set.add(t);
    }
    if (editDraftById) {
      for (const d of editDraftById.values()) {
        const t = d.special.trim();
        if (t) set.add(t);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [bundle.rows, editDraftById]);

  const tableEditDirty = useMemo(() => {
    if (!editDraftById) return false;
    const base = editBaselineRef.current;
    for (const [id, d] of editDraftById) {
      if (JSON.stringify(d) !== base.get(id)) return true;
    }
    return false;
  }, [editDraftById]);

  function beginTableEdit() {
    setBulkHint(null);
    const drafts = new Map<number, EditableGoiDraft>();
    const baseline = new Map<number, string>();
    for (const row of sorted) {
      const d = rowToDraft(row);
      drafts.set(row.id, d);
      baseline.set(row.id, JSON.stringify(d));
    }
    editBaselineRef.current = baseline;
    setEditDraftById(drafts);
  }

  function cancelTableEdit() {
    setEditDraftById(null);
    editBaselineRef.current = new Map();
    setBulkHint(null);
  }

  function patchEditDraft(id: number, patch: Partial<EditableGoiDraft>) {
    setEditDraftById((prev) => {
      if (!prev) return prev;
      const cur = prev.get(id);
      if (!cur) return prev;
      const next = new Map(prev);
      next.set(id, { ...cur, ...patch });
      return next;
    });
  }

  function runSaveAllTable() {
    if (!editDraftById) return;
    setBulkHint(null);
    const toSave: GoiHocPhiBulkRowInput[] = [];
    const base = editBaselineRef.current;
    for (const [id, d] of editDraftById) {
      if (JSON.stringify(d) === base.get(id)) continue;
      const parsed = draftToBulkInput(d);
      if (!parsed.ok) {
        setBulkHint({ ok: false, text: parsed.error });
        return;
      }
      toSave.push(parsed.row);
    }
    startBulkSave(async () => {
      const res = await saveGoiHocPhiBulk(toSave);
      if (res.ok) {
        setBulkHint({ ok: true, text: res.message });
        setEditDraftById(null);
        editBaselineRef.current = new Map();
        router.refresh();
      } else {
        setBulkHint({ ok: false, text: res.error });
      }
    });
  }

  async function handleDeleteGoiRow(id: number) {
    if (
      !window.confirm(
        `Xóa vĩnh viễn gói học phí #${id}? Hành động không hoàn tác (nếu còn dữ liệu tham chiếu, xóa sẽ thất bại).`,
      )
    ) {
      return;
    }
    setBulkHint(null);
    setDeleteRowPendingId(id);
    try {
      const res = await deleteGoiHocPhi(id);
      if (res.ok) {
        editBaselineRef.current.delete(id);
        setEditDraftById((prev) => {
          if (!prev) return prev;
          const next = new Map(prev);
          next.delete(id);
          if (next.size === 0) {
            editBaselineRef.current = new Map();
            return null;
          }
          return next;
        });
        setBulkHint({ ok: true, text: `Đã xóa gói #${id}.` });
        router.refresh();
      } else {
        setBulkHint({ ok: false, text: res.error });
      }
    } finally {
      setDeleteRowPendingId(null);
    }
  }

  async function handleDuplicateGoiRow(id: number) {
    setBulkHint(null);
    setDuplicateRowPendingId(id);
    try {
      const res = await duplicateGoiHocPhi(id);
      if (res.ok) {
        setEditDraftById(null);
        editBaselineRef.current = new Map();
        setBulkHint({ ok: true, text: `Đã nhân bản #${id} → gói mới #${res.newId}.` });
        setGoiListPage(1);
        router.refresh();
      } else {
        setBulkHint({ ok: false, text: res.error });
      }
    } finally {
      setDuplicateRowPendingId(null);
    }
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2] text-white">
            <Banknote size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#BC8AF9" }}>
              Điều hành
            </p>
            <h1 className="m-0 text-[17px] font-bold tracking-tight text-[#323232]">Gói học phí</h1>
            <p className="m-0 mt-0.5 text-xs text-[#AAAAAA]">
              Bảng <code className="rounded bg-black/[0.04] px-1">{bundle.tableName}</code> · {sorted.length} gói
              {filterMonId ? ` · đang hiển thị ${filteredRows.length}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {tableEditMode ? (
            <>
              <button
                type="button"
                disabled={bulkSavePending}
                onClick={cancelTableEdit}
                className="rounded-xl border border-[#EAEAEA] bg-white px-[16px] py-2.5 text-[13px] font-semibold text-black/70 hover:bg-[#F5F7F7] disabled:opacity-50"
              >
                Hủy chỉnh sửa
              </button>
              <button
                type="button"
                disabled={bulkSavePending || !tableEditDirty}
                onClick={runSaveAllTable}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                <Save size={15} />
                {bulkSavePending ? "Đang lưu…" : "Lưu tất cả"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={sorted.length === 0}
              onClick={beginTableEdit}
              className="flex items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-[16px] py-2.5 text-[13px] font-semibold text-[#323232] hover:border-[#BC8AF9]/40 hover:bg-[#BC8AF9]/8 disabled:opacity-45"
            >
              <Pencil size={15} />
              Chỉnh sửa bảng
            </button>
          )}
          <button
            type="button"
            disabled={tableEditMode}
            title={tableEditMode ? "Hủy chỉnh sửa bảng hoặc lưu trước khi thêm gói mới." : undefined}
            onClick={() => setIsNew(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-45"
          >
            <Plus size={15} /> Thêm gói
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto px-6 pb-6 pt-3">
        {bannerError ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#FFCDD2] bg-[#FFF0F3] px-4 py-2.5 text-sm text-[#C0244E]">
            <AlertTriangle size={14} />
            <span className="flex-1">{bannerError}</span>
            <button type="button" className="border-0 bg-transparent text-[#C0244E]" onClick={() => setBannerError("")}>
              <X size={12} />
            </button>
          </div>
        ) : null}

        {bundle.comboWarning && !comboBannerDismissed ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700" />
            <span className="flex-1 leading-snug">{bundle.comboWarning}</span>
            <button
              type="button"
              className="shrink-0 border-0 bg-transparent text-amber-800 hover:text-amber-950"
              onClick={() => setComboBannerDismissed(true)}
              aria-label="Đóng cảnh báo"
            >
              <X size={12} />
            </button>
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-[min(1680px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[#EAEAEA] bg-[#FAFAFA] px-4 py-3">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input
                value={rowSearch}
                onChange={(e) => setRowSearch(e.target.value)}
                placeholder="Tìm ID, tên gói (tự ghép), hậu tố, môn, combo, đặc biệt, ghi chú…"
                className="h-10 w-full rounded-xl border border-[#EAEAEA] bg-white pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-[#BC8AF9]"
                aria-label="Tìm trong danh sách gói"
              />
              {rowSearch ? (
                <button
                  type="button"
                  aria-label="Xóa tìm"
                  onClick={() => setRowSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/60"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-[200px] flex-1 flex-col gap-1 sm:min-w-[260px] sm:flex-row sm:items-center sm:gap-3">
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-black/45">
                  Lọc theo môn
                </span>
                <select
                  value={filterMonId}
                  onChange={(e) => setFilterMonId(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2 text-sm font-medium text-[#323232] outline-none ring-[#BC8AF9] focus:ring-2"
                  aria-label="Lọc danh sách gói theo môn học"
                >
                  <option value="">Tất cả môn</option>
                  <option value="__none__">Chưa gán môn</option>
                  {bundle.monOptions.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.ten_mon_hoc}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-xs text-black/45">
                {filteredRows.length}/{sorted.length} gói
              </span>
            </div>
          </div>
          {bulkHint ? (
            <div
              className={
                bulkHint.ok
                  ? "border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-950"
                  : "border-b border-[#FFCDD2] bg-[#FFF0F3] px-4 py-2.5 text-sm text-[#C0244E]"
              }
            >
              {bulkHint.text}
            </div>
          ) : null}
          {tableEditMode ? (
            <p className="m-0 border-b border-amber-100 bg-amber-50/90 px-4 py-2 text-xs leading-relaxed text-amber-950">
              Đang chỉnh sửa toàn bộ danh sách đã tải. Dùng <strong className="font-semibold">Lưu tất cả</strong> để ghi
              xuống database; cột <strong className="font-semibold">Xóa</strong> gỡ bản ghi ngay (không cần Lưu).{" "}
              <strong className="font-semibold">Nhân bản</strong> tạo bản ghi mới và thoát chế độ chỉnh sửa bảng. Chuyển
              trang vẫn giữ bản nháp cho mọi dòng.
            </p>
          ) : null}
          <div className="w-full min-w-0 overflow-x-auto">
            {bundle.tableName !== "hp_goi_hoc_phi" && tableEditMode ? (
              <datalist id={tableSpecialListId}>
                {specialSuggestions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            ) : null}
            <table
              className={`w-full border-collapse text-left text-sm ${
                isNewGoiTable
                  ? tableEditMode
                    ? "min-w-[1760px]"
                    : "min-w-[1540px]"
                  : tableEditMode
                    ? "min-w-[1340px]"
                    : "min-w-[1140px]"
              }`}
            >
              <thead>
                <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-black/45">
                  <th className="w-[4.25rem] shrink-0 whitespace-nowrap px-3 py-3">ID</th>
                  {bundle.tableName !== "hp_goi_hoc_phi" ? (
                    <th className="min-w-[13rem] max-w-[18rem] px-3 py-3 normal-case">Tên gói</th>
                  ) : null}
                  <th className="min-w-[10rem] max-w-[13rem] px-3 py-3">Môn</th>
                  {bundle.tableName !== "hp_goi_hoc_phi" ? (
                    <th className="min-w-[7rem] max-w-[10rem] px-3 py-3 normal-case">Hậu tố</th>
                  ) : null}
                  <th className="w-[4.5rem] shrink-0 px-3 py-3">number</th>
                  <th className="min-w-[5rem] max-w-[9rem] px-3 py-3">Đơn vị</th>
                  <th className="min-w-[7rem] px-3 py-3">Giá gốc</th>
                  <th className="w-[5.5rem] shrink-0 px-3 py-3">Discount</th>
                  <th className="min-w-[11rem] max-w-[15rem] px-3 py-3">Combo</th>
                  {bundle.tableName !== "hp_goi_hoc_phi" ? (
                    <th className="min-w-[8rem] max-w-[11rem] px-3 py-3">Gói đặc biệt</th>
                  ) : null}
                  {bundle.tableName !== "hp_goi_hoc_phi" ? (
                    <th className="min-w-[220px] max-w-[320px] px-3 py-3">Ghi chú</th>
                  ) : null}
                  <th className="w-[4.5rem] shrink-0 px-3 py-3">Số buổi</th>
                  <th className="w-11 shrink-0 px-2 py-3 text-center normal-case">
                    <span className="sr-only">Nhân bản</span>
                    <Copy className="mx-auto inline h-3.5 w-3.5 opacity-50" aria-hidden />
                  </th>
                  {tableEditMode ? (
                    <th className="w-11 shrink-0 px-2 py-3 text-center normal-case">Xóa</th>
                  ) : null}
                  <th className="min-w-[6.5rem] whitespace-nowrap px-3 py-3">Tạo</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={emptyTableColSpan}
                      className="px-4 py-16 text-center text-[#AAAAAA]"
                    >
                      Chưa có gói nào. Nhấn &quot;Thêm gói&quot; để tạo.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={emptyTableColSpan}
                      className="px-4 py-16 text-center text-[#AAAAAA]"
                    >
                      Không có gói nào khớp bộ lọc môn. Đổi &quot;Lọc theo môn&quot; hoặc thêm gói cho môn này.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((r) => {
                    const d = tableEditMode && editDraftById ? editDraftById.get(r.id) : undefined;
                    const draft = d;
                    const showRowEdit = Boolean(tableEditMode && draft);
                    const cellInput =
                      "min-w-0 max-w-[9.5rem] rounded-lg border border-[#EAEAEA] bg-white px-2 py-1 text-xs outline-none ring-[#BC8AF9] focus:ring-1";
                    return (
                      <tr key={r.id} className="border-b border-[#F0F0F0] hover:bg-[#FFFBF8]/80">
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-black/70">{r.id}</td>
                        {showRowEdit && draft ? (
                          <>
                            {bundle.tableName !== "hp_goi_hoc_phi" ? (
                              <td
                                className="min-w-0 max-w-[18rem] px-3 py-2 align-top text-xs leading-snug text-black/75"
                                title={buildTuDongTenGoiFromDraft(draft, bundle.monOptions)}
                              >
                                <span className="line-clamp-3">{buildTuDongTenGoiFromDraft(draft, bundle.monOptions)}</span>
                              </td>
                            ) : null}
                            <td className="min-w-0 max-w-[13rem] px-3 py-2">
                              <select
                                value={draft.mon_hoc}
                                onChange={(e) => patchEditDraft(r.id, { mon_hoc: e.target.value })}
                                className={`${cellInput} max-w-[13rem]`}
                                aria-label={`Môn học gói #${r.id}`}
                              >
                                <option value="">— Không gán —</option>
                                {bundle.monOptions.map((m) => (
                                  <option key={m.id} value={String(m.id)}>
                                    {m.ten_mon_hoc}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {bundle.tableName !== "hp_goi_hoc_phi" ? (
                              <td className="min-w-0 max-w-[10rem] px-3 py-2">
                                <input
                                  value={draft.post_title}
                                  onChange={(e) => patchEditDraft(r.id, { post_title: e.target.value })}
                                  maxLength={500}
                                  className={`${cellInput} w-full max-w-[10rem]`}
                                  aria-label={`Hậu tố (post_title) gói #${r.id}`}
                                />
                              </td>
                            ) : null}
                            <td className="px-3 py-2">
                              <input
                                value={draft.goi_number}
                                onChange={(e) => patchEditDraft(r.id, { goi_number: e.target.value })}
                                className={`${cellInput} w-20 font-mono`}
                                inputMode="decimal"
                                aria-label={`Số number gói #${r.id}`}
                              />
                            </td>
                            <td className="min-w-0 max-w-[9rem] px-3 py-2">
                              <input
                                value={draft.don_vi}
                                onChange={(e) => patchEditDraft(r.id, { don_vi: e.target.value })}
                                maxLength={500}
                                className={`${cellInput} w-full max-w-[9rem]`}
                                aria-label={`Đơn vị gói #${r.id}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={draft.gia_goc}
                                onChange={(e) => patchEditDraft(r.id, { gia_goc: e.target.value })}
                                className={`${cellInput} w-28 font-mono`}
                                inputMode="numeric"
                                aria-label={`Giá gốc gói #${r.id}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={draft.discount}
                                onChange={(e) => patchEditDraft(r.id, { discount: e.target.value })}
                                className={`${cellInput} w-24 font-mono`}
                                inputMode="decimal"
                                aria-label={`Discount gói #${r.id}`}
                              />
                            </td>
                            <td className="min-w-0 max-w-[15rem] px-3 py-2">
                              {comboPickList ? (
                                <select
                                  value={draft.combo_id}
                                  onChange={(e) => patchEditDraft(r.id, { combo_id: e.target.value })}
                                  className={`${cellInput} max-w-[15rem]`}
                                  aria-label={`Combo gói #${r.id}`}
                                >
                                  <option value="">— Không combo —</option>
                                  {allComboOptions.map((c) => (
                                    <option key={c.id} value={String(c.id)}>
                                      {c.ten_combo}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  value={draft.combo_id}
                                  onChange={(e) => patchEditDraft(r.id, { combo_id: e.target.value })}
                                  className={`${cellInput} w-24 font-mono`}
                                  inputMode="numeric"
                                  placeholder="ID"
                                  aria-label={`Combo id gói #${r.id}`}
                                />
                              )}
                            </td>
                            {bundle.tableName !== "hp_goi_hoc_phi" ? (
                              <td className="min-w-0 max-w-[11rem] px-3 py-2">
                                <input
                                  value={draft.special}
                                  list={tableSpecialListId}
                                  onChange={(e) => patchEditDraft(r.id, { special: e.target.value })}
                                  maxLength={500}
                                  autoComplete="off"
                                  className={`${cellInput} w-full max-w-[11rem]`}
                                  aria-label={`Gói đặc biệt gói #${r.id}`}
                                />
                              </td>
                            ) : null}
                            {bundle.tableName !== "hp_goi_hoc_phi" ? (
                              <td className="min-w-[220px] max-w-[320px] px-3 py-2 align-top">
                                <textarea
                                  value={draft.note}
                                  onChange={(e) => patchEditDraft(r.id, { note: e.target.value })}
                                  maxLength={4000}
                                  rows={3}
                                  className="min-h-[72px] w-full max-w-[min(320px,100%)] resize-y rounded-lg border border-[#EAEAEA] bg-white px-2 py-1.5 text-xs leading-snug outline-none ring-[#BC8AF9] focus:ring-1"
                                  aria-label={`Ghi chú gói #${r.id}`}
                                />
                              </td>
                            ) : null}
                            <td className="px-3 py-2">
                              <input
                                value={draft.so_buoi}
                                onChange={(e) => patchEditDraft(r.id, { so_buoi: e.target.value })}
                                className={`${cellInput} w-20 font-mono`}
                                inputMode="decimal"
                                aria-label={`Số buổi gói #${r.id}`}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            {bundle.tableName !== "hp_goi_hoc_phi" ? (
                              <td
                                className="min-w-0 max-w-[18rem] px-3 py-3 align-top text-xs leading-snug text-black/80"
                                title={buildTuDongTenGoiFromRow(r, bundle.monOptions)}
                              >
                                <span className="line-clamp-3 whitespace-pre-wrap break-words">
                                  {buildTuDongTenGoiFromRow(r, bundle.monOptions)}
                                </span>
                              </td>
                            ) : null}
                            <td className="min-w-0 max-w-[13rem] truncate px-3 py-3 font-medium">
                              {tenMon(r.mon_hoc, bundle.monOptions)}
                            </td>
                            {bundle.tableName !== "hp_goi_hoc_phi" ? (
                              <td
                                className="min-w-0 max-w-[10rem] truncate px-3 py-3 text-xs text-black/70"
                                title={(r.post_title ?? "").trim() || undefined}
                              >
                                {(r.post_title ?? "").trim() || "—"}
                              </td>
                            ) : null}
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{fmtNum(r.goiNumber)}</td>
                            <td className="min-w-0 max-w-[9rem] truncate px-3 py-3 text-black/70">{r.don_vi ?? "—"}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold tabular-nums">{fmtVnd(r.gia_goc)}</td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs tabular-nums">{fmtNum(r.discount)}</td>
                            <td className="min-w-0 max-w-[15rem] truncate px-3 py-3 text-xs text-black/70">
                              {tenCombo(r.combo_id, allComboOptions)}
                            </td>
                            {bundle.tableName !== "hp_goi_hoc_phi" ? (
                              <td className="min-w-0 max-w-[11rem] truncate px-3 py-3 text-xs text-black/70">
                                {(r.special ?? "").trim() || "—"}
                              </td>
                            ) : null}
                            {bundle.tableName !== "hp_goi_hoc_phi" ? (
                              <td
                                className="min-w-[220px] max-w-[320px] px-3 py-3 align-top text-xs leading-snug text-black/75"
                                title={(r.note ?? "").trim() || undefined}
                              >
                                {(r.note ?? "").trim() ? (
                                  <span className="line-clamp-4 whitespace-pre-wrap break-words">{r.note}</span>
                                ) : (
                                  "—"
                                )}
                              </td>
                            ) : null}
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{fmtNum(r.so_buoi)}</td>
                          </>
                        )}
                        <td className="px-2 py-2 align-middle text-center">
                          <button
                            type="button"
                            disabled={
                              bulkSavePending ||
                              deleteRowPendingId !== null ||
                              duplicateRowPendingId !== null
                            }
                            onClick={() => void handleDuplicateGoiRow(r.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-[#7a5bb0] hover:border-[#BC8AF9]/50 hover:bg-[#BC8AF9]/12 disabled:opacity-45"
                            title="Nhân bản gói (bản sao cùng dữ liệu)"
                            aria-label={`Nhân bản gói học phí #${r.id}`}
                          >
                            <Copy size={15} strokeWidth={2} />
                          </button>
                        </td>
                        {tableEditMode ? (
                          <td className="px-2 py-2 align-middle text-center">
                            <button
                              type="button"
                              disabled={
                                bulkSavePending ||
                                deleteRowPendingId !== null ||
                                duplicateRowPendingId !== null
                              }
                              onClick={() => void handleDeleteGoiRow(r.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-45"
                              title="Xóa gói này"
                              aria-label={`Xóa gói học phí #${r.id}`}
                            >
                              <Trash2 size={15} strokeWidth={2} />
                            </button>
                          </td>
                        ) : null}
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-black/55">{fmtDate(r.created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {filteredRows.length > GOI_LIST_PAGE_SIZE ? (
              <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[#EAEAEA] bg-[#FAFAFA] px-4 py-2 text-[11px] text-black/55">
                <span className="tabular-nums">
                  {(goiListPage - 1) * GOI_LIST_PAGE_SIZE + 1}–
                  {Math.min(goiListPage * GOI_LIST_PAGE_SIZE, filteredRows.length)} / {filteredRows.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={goiListPage <= 1}
                    onClick={() => setGoiListPage((p) => Math.max(1, p - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="min-w-[4.75rem] text-center text-[10px] font-bold uppercase tracking-wide">
                    Trang <span className="text-black/80">{goiListPage}</span> / {goiTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={goiListPage >= goiTotalPages}
                    onClick={() => setGoiListPage((p) => Math.min(goiTotalPages, p + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white disabled:opacity-40"
                    aria-label="Trang sau"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isNew ? (
          <GoiModal
            row={null}
            isNew
            goiTableName={bundle.tableName}
            specialSuggestions={specialSuggestions}
            monOptions={bundle.monOptions}
            allComboOptions={allComboOptions}
            onComboCreated={mergeCombo}
            onClose={() => setIsNew(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
