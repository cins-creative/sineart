"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LineChart, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import {
  createMkDataWeek,
  deleteMkDataWeek,
  saveMkDataRow,
  updateMkDataWeekDate,
} from "@/app/admin/dashboard/report-mkt/actions";
import { MK_GROUP_META, MK_INPUT_COLS, type MkDataAnalysisRow, type MkNumericKey } from "@/lib/data/admin-report-mkt";
import { cn } from "@/lib/utils";

type LocalRow = MkDataAnalysisRow & { _dirty?: boolean };

type Props = {
  initialRows: MkDataAnalysisRow[];
};

function fNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return Math.round(v).toLocaleString("vi-VN");
}

function normalizeRows(list: MkDataAnalysisRow[]): LocalRow[] {
  return list.map((r) => ({ ...r, _dirty: false }));
}

function colIsPct(col: (typeof MK_INPUT_COLS)[number]): boolean {
  return "isPct" in col && (col as { isPct?: boolean }).isPct === true;
}

function mktFieldClass(): string {
  return cn(
    "w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]",
    "outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15",
  );
}

export default function ReportMktView({ initialRows }: Props) {
  const { canDelete: roleMayDeleteWeek } = useAdminDashboardAbilities();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<LocalRow[]>(() => normalizeRows(initialRows));
  const [labelW, setLabelW] = useState(220);
  const dragging = useRef<{ startX: number; startW: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const [editingCell, setEditingCell] = useState<{ rowId: string; key: MkNumericKey } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedFlashId, setSavedFlashId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [addErr, setAddErr] = useState("");
  const [addingRow, setAddingRow] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const [editWeekOpen, setEditWeekOpen] = useState(false);
  const [editWeekId, setEditWeekId] = useState<string | null>(null);
  const [editWeekDate, setEditWeekDate] = useState("");
  const [editWeekErr, setEditWeekErr] = useState("");
  const [editWeekBusy, setEditWeekBusy] = useState(false);

  const [deleteWeekOpen, setDeleteWeekOpen] = useState(false);
  const [deleteWeekId, setDeleteWeekId] = useState<string | null>(null);
  const [deleteWeekLabel, setDeleteWeekLabel] = useState("");
  const [deleteWeekBusy, setDeleteWeekBusy] = useState(false);
  const [deleteWeekAck, setDeleteWeekAck] = useState(false);

  useEffect(() => {
    setRows(normalizeRows(initialRows));
  }, [initialRows]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragging.current.startX;
      setLabelW(Math.max(140, dragging.current.startW + dx));
    };
    const onUp = () => {
      dragging.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const notify = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const sortedRows = [...rows].sort((a, b) => (a.ngay_thang_nhap || "").localeCompare(b.ngay_thang_nhap || ""));

  const updateLocal = useCallback((rowId: string, key: MkNumericKey, raw: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const col = MK_INPUT_COLS.find((c) => c.key === key);
        const cleaned = raw.replace(/[^0-9.,-]/g, "");
        if (cleaned === "") return { ...r, [key]: null, _dirty: true };
        const n = Number(cleaned.replace(",", "."));
        if (!Number.isFinite(n)) return { ...r, [key]: null, _dirty: true };
        const stored = col != null && colIsPct(col) ? n / 100 : n;
        return { ...r, [key]: stored, _dirty: true };
      }),
    );
  }, []);

  const saveRow = useCallback(
    async (rowId: string) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;
      setSavingId(rowId);
      try {
        const { _dirty: _d, ...clean } = row;
        const res = await saveMkDataRow(clean);
        if (!res.ok) {
          notify(res.error, false);
          return;
        }
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId ? { ...r, _dirty: false, ...((res.row ?? {}) as MkDataAnalysisRow) } : r,
          ),
        );
        setSavedFlashId(rowId);
        window.setTimeout(() => setSavedFlashId(null), 2000);
        notify(res.message ?? "Đã lưu.", true);
        startTransition(() => router.refresh());
      } finally {
        setSavingId(null);
      }
    },
    [rows, notify, router],
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { rowId, key } = editingCell;
    updateLocal(rowId, key, editValue);
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue, updateLocal]);

  const openEditWeek = useCallback((row: LocalRow) => {
    setEditingCell(null);
    setEditValue("");
    setEditWeekId(row.id);
    setEditWeekDate((row.ngay_thang_nhap ?? "").trim());
    setEditWeekErr("");
    setEditWeekOpen(true);
  }, []);

  const submitEditWeek = useCallback(async () => {
    if (!editWeekId) return;
    setEditWeekBusy(true);
    setEditWeekErr("");
    try {
      const res = await updateMkDataWeekDate(editWeekId, editWeekDate.trim());
      if (!res.ok) {
        setEditWeekErr(res.error);
        return;
      }
      if (res.row) {
        const next = { ...(res.row as MkDataAnalysisRow), _dirty: false };
        setRows((prev) => prev.map((r) => (r.id === editWeekId ? next : r)));
      }
      setEditingCell((c) => (c?.rowId === editWeekId ? null : c));
      setSavingId((sid) => (sid === editWeekId ? null : sid));
      setSavedFlashId((fid) => (fid === editWeekId ? null : fid));
      setEditWeekOpen(false);
      setEditWeekId(null);
      setEditWeekDate("");
      notify(res.message ?? "Đã cập nhật.", true);
      startTransition(() => router.refresh());
    } finally {
      setEditWeekBusy(false);
    }
  }, [editWeekId, editWeekDate, notify, router]);

  const openDeleteWeek = useCallback((row: LocalRow) => {
    setEditingCell(null);
    setEditValue("");
    setDeleteWeekId(row.id);
    setDeleteWeekLabel(row.ngay_thang_nhap ?? row.id);
    setDeleteWeekAck(false);
    setDeleteWeekOpen(true);
  }, []);

  const submitDeleteWeek = useCallback(async () => {
    if (!deleteWeekId) return;
    setDeleteWeekBusy(true);
    try {
      const res = await deleteMkDataWeek(deleteWeekId);
      if (!res.ok) {
        notify(res.error, false);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleteWeekId));
      setEditingCell((c) => (c?.rowId === deleteWeekId ? null : c));
      setSavingId((sid) => (sid === deleteWeekId ? null : sid));
      setDeleteWeekOpen(false);
      setDeleteWeekId(null);
      setDeleteWeekAck(false);
      setSavedFlashId(null);
      notify(res.message ?? "Đã xóa.", true);
      startTransition(() => router.refresh());
    } finally {
      setDeleteWeekBusy(false);
    }
  }, [deleteWeekId, notify, router]);

  const addWeek = useCallback(async () => {
    if (!newDate.trim()) {
      setAddErr("Chọn ngày");
      return;
    }
    setAddingRow(true);
    setAddErr("");
    try {
      const res = await createMkDataWeek(newDate.trim());
      if (!res.ok) {
        setAddErr(res.error);
        return;
      }
      if (res.row) {
        const added: LocalRow = { ...(res.row as MkDataAnalysisRow), _dirty: false };
        setRows((prev) => [...prev, added].sort((a, b) => (a.ngay_thang_nhap || "").localeCompare(b.ngay_thang_nhap || "")));
      }
      setShowAdd(false);
      setNewDate("");
      notify(res.message ?? "Đã thêm tuần.", true);
      startTransition(() => router.refresh());
      window.setTimeout(() => tableRef.current?.scrollTo({ left: 99999, behavior: "smooth" }), 120);
    } finally {
      setAddingRow(false);
    }
  }, [newDate, notify, router]);

  return (
    <div className="-m-4 flex h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] min-h-0 flex-col overflow-hidden bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <LineChart className="text-white" size={20} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Marketing analytics</div>
            <div className="text-xs text-[#AAAAAA]">
              {sortedRows.length} kỳ · nhập liệu <code className="rounded bg-black/[0.04] px-1 text-[11px]">mk_data_analysis</code>
              {" · "}% hiển thị dạng 12,5 → lưu 0,125
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAdd(true);
              setAddErr("");
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus size={15} aria-hidden />
            Thêm kỳ
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-3">
          <div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="shrink-0 border-b border-[#EAEAEA] bg-white px-6 py-3">
              <p className="m-0 text-[12px] leading-relaxed text-black/55">
                Click ô số để sửa · cột ngày: <span className="font-semibold text-[#1a1a2e]">MM-DD</span> phía trên, năm
                phía dưới · đưa chuột vào đầu cột ngày để hiện nút đổi ngày / xóa kỳ · kéo cạnh phải ô &quot;Chỉ
                tiêu&quot; để chỉnh độ rộng cột nhãn.
              </p>
            </div>

            <div ref={tableRef} className="min-h-0 flex-1 overflow-auto">
              {sortedRows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                  <span className="text-4xl" aria-hidden>
                    📊
                  </span>
                  <p className="m-0 text-sm text-[#888]">Chưa có kỳ nào. Nhấn «Thêm kỳ» để tạo dòng theo ngày.</p>
                </div>
              ) : (
                <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wide text-black/45">
                      <th
                        className="sticky left-0 z-[30] border-b border-r border-[#EAEAEA] bg-[#fafafa] py-2.5 pl-4 pr-2 text-left"
                        style={{ width: labelW, minWidth: labelW }}
                      >
                        <div className="relative pr-2">
                          <span>Chỉ tiêu</span>
                          <button
                            type="button"
                            aria-label="Kéo để chỉnh độ rộng cột nhãn"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              dragging.current = { startX: e.clientX, startW: labelW };
                            }}
                            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize rounded-sm border-r-2 border-[#EAEAEA] hover:border-[#BC8AF9]/60"
                          />
                        </div>
                      </th>
                      {sortedRows.map((row) => (
                        <th
                          key={row.id}
                          className="group border-b border-r border-[#EAEAEA] bg-[#fafafa] px-2 py-2.5 text-center align-top font-normal normal-case tracking-normal"
                          style={{ width: 140, minWidth: 140 }}
                        >
                          <div className="text-[13px] font-bold text-[#1a1a2e]">{row.ngay_thang_nhap?.slice(5)}</div>
                          <div className="mt-0.5 text-[11px] font-medium text-black/40">{row.ngay_thang_nhap?.slice(0, 4)}</div>
                          <div
                            className={cn(
                              "mt-1 flex min-h-[26px] items-center justify-center gap-0.5 transition-opacity duration-200 ease-out",
                              "pointer-events-none opacity-0",
                              "group-hover:pointer-events-auto group-hover:opacity-100",
                              "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => openEditWeek(row)}
                              className="rounded-md p-1 text-[#888] transition hover:bg-black/[0.05] hover:text-[#BC8AF9]"
                              aria-label={`Đổi ngày kỳ ${row.ngay_thang_nhap ?? ""}`}
                              title="Đổi ngày kỳ"
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                            </button>
                            {roleMayDeleteWeek ? (
                              <button
                                type="button"
                                onClick={() => openDeleteWeek(row)}
                                className="rounded-md p-1 text-[#888] transition hover:bg-red-50 hover:text-red-600"
                                aria-label={`Xóa kỳ ${row.ngay_thang_nhap ?? ""}`}
                                title="Xóa kỳ"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-1.5 min-h-[26px]">
                            {row._dirty ? (
                              <button
                                type="button"
                                onClick={() => void saveRow(row.id)}
                                disabled={savingId === row.id}
                                className={cn(
                                  "inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50",
                                  savedFlashId === row.id
                                    ? "bg-emerald-600"
                                    : "bg-gradient-to-r from-[#F8A568] to-[#EE5CA2]",
                                )}
                              >
                                {savingId === row.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                ) : savedFlashId === row.id ? (
                                  "Đã lưu"
                                ) : (
                                  "Lưu"
                                )}
                              </button>
                            ) : savedFlashId === row.id ? (
                              <span className="text-[11px] font-semibold text-emerald-600">Đã lưu</span>
                            ) : null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MK_GROUP_META.map((grp) => {
                      const grpCols = MK_INPUT_COLS.filter((c) => c.group === grp.key);
                      return (
                        <FragmentRows
                          key={grp.key}
                          grp={grp}
                          grpCols={grpCols}
                          sortedRows={sortedRows}
                          labelW={labelW}
                          editingCell={editingCell}
                          editValue={editValue}
                          setEditingCell={setEditingCell}
                          setEditValue={setEditValue}
                          commitEdit={commitEdit}
                        />
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAdd ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-[380px] rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
            role="dialog"
            aria-labelledby="mkt-add-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="mkt-add-title" className="m-0 text-[17px] font-bold text-[#323232]">
              Thêm kỳ mới
            </h2>
            <p className="mt-1 text-xs text-[#AAAAAA]">Một ngày đại diện cho kỳ (trùng ngày sẽ báo lỗi).</p>
            <div className="mt-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Ngày</div>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={mktFieldClass()} />
            </div>
            {addErr ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {addErr}
              </div>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setAddErr("");
                }}
                className="flex-1 rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#666]"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={addingRow}
                onClick={() => void addWeek()}
                className="flex-[2] rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {addingRow ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Đang tạo…
                  </span>
                ) : (
                  "Thêm kỳ"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editWeekOpen && editWeekId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            setEditWeekOpen(false);
            setEditWeekErr("");
          }}
        >
          <div
            className="w-full max-w-[380px] rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
            role="dialog"
            aria-labelledby="mkt-edit-week-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="mkt-edit-week-title" className="m-0 text-[17px] font-bold text-[#323232]">
              Đổi ngày kỳ
            </h2>
            <p className="mt-1 text-xs text-[#AAAAAA]">
              Một ngày đại diện cho cột. Không được trùng ngày với kỳ khác.
            </p>
            <div className="mt-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Ngày kỳ</div>
              <input
                type="date"
                value={editWeekDate}
                onChange={(e) => setEditWeekDate(e.target.value)}
                className={mktFieldClass()}
              />
            </div>
            {editWeekErr ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {editWeekErr}
              </div>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditWeekOpen(false);
                  setEditWeekErr("");
                  setEditWeekId(null);
                }}
                className="flex-1 rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#666]"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={editWeekBusy}
                onClick={() => void submitEditWeek()}
                className="flex-[2] rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {editWeekBusy ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Đang lưu…
                  </span>
                ) : (
                  "Lưu ngày"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {roleMayDeleteWeek && deleteWeekOpen && deleteWeekId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (deleteWeekBusy) return;
            setDeleteWeekOpen(false);
            setDeleteWeekAck(false);
          }}
        >
          <div
            className="w-full max-w-[400px] rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
            role="dialog"
            aria-labelledby="mkt-del-week-title"
            aria-describedby="mkt-del-week-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="mkt-del-week-title" className="m-0 text-[17px] font-bold text-[#323232]">
              Xóa kỳ?
            </h2>
            <p id="mkt-del-week-desc" className="mt-2 text-sm leading-relaxed text-[#666]">
              Bạn sắp xóa kỳ <span className="font-semibold text-[#1a1a2e]">{deleteWeekLabel}</span> khỏi bảng phân
              tích.
            </p>
            <div
              className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-left"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-amber-900">Cảnh báo</div>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] leading-snug text-amber-950/90">
                  <li>Toàn bộ số liệu đã nhập cho cột ngày này sẽ bị xóa vĩnh viễn.</li>
                  <li>Không thể hoàn tác; không có bản sao lưu tự động từ màn hình này.</li>
                </ul>
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-left">
              <input
                type="checkbox"
                checked={deleteWeekAck}
                onChange={(e) => setDeleteWeekAck(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#ccc] text-[#EE5CA2] focus:ring-[#BC8AF9]"
              />
              <span className="text-[12px] font-semibold leading-snug text-[#323232]">
                Tôi hiểu rủi ro và muốn xóa kỳ này
              </span>
            </label>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={deleteWeekBusy}
                onClick={() => {
                  setDeleteWeekOpen(false);
                  setDeleteWeekAck(false);
                }}
                className="flex-1 rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#666] disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={deleteWeekBusy || !deleteWeekAck}
                onClick={() => void submitDeleteWeek()}
                className="flex-[2] rounded-[10px] border border-red-200 bg-red-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteWeekBusy ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Đang xóa…
                  </span>
                ) : (
                  "Xóa kỳ"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl px-5 py-2.5 text-[13px] font-semibold shadow-lg",
            toast.ok ? "bg-emerald-700 text-white" : "bg-red-700 text-white",
          )}
          role="status"
        >
          {toast.msg}
        </div>
      ) : null}

      {pending ? <span className="sr-only" aria-live="polite">Đang làm mới</span> : null}
    </div>
  );
}

function FragmentRows({
  grp,
  grpCols,
  sortedRows,
  labelW,
  editingCell,
  editValue,
  setEditingCell,
  setEditValue,
  commitEdit,
}: {
  grp: (typeof MK_GROUP_META)[number];
  grpCols: readonly (typeof MK_INPUT_COLS)[number][];
  sortedRows: LocalRow[];
  labelW: number;
  editingCell: { rowId: string; key: MkNumericKey } | null;
  editValue: string;
  setEditingCell: (v: { rowId: string; key: MkNumericKey } | null) => void;
  setEditValue: (v: string) => void;
  commitEdit: () => void;
}) {
  return (
    <>
      <tr>
        <td
          className="sticky left-0 z-[5] border-y border-r border-[#EAEAEA] bg-[#fafafa] py-2 pl-3.5 pr-3 text-xs font-bold text-[#323232]"
          style={{ borderLeftWidth: 4, borderLeftColor: grp.color }}
          colSpan={sortedRows.length + 1}
        >
          {grp.label}
        </td>
      </tr>
      {grpCols.map((col, ridx) => (
        <tr
          key={col.key}
          className="border-b border-[#f0f0f0] last:border-0 hover:bg-black/[0.015] [content-visibility:auto]"
        >
          <td
            className={cn(
              "sticky left-0 z-10 border-b border-r border-[#EAEAEA] py-2 pl-5 pr-3 text-[13px] text-[#323232] whitespace-nowrap",
              ridx % 2 === 0 ? "bg-white" : "bg-[#fafafa]",
            )}
            style={{ width: labelW, minWidth: labelW }}
          >
            {col.label}
            {colIsPct(col) ? <span className="ml-1 text-[11px] font-normal text-black/40">%</span> : null}
          </td>
          {sortedRows.map((row) => {
            const isEditing = editingCell?.rowId === row.id && editingCell?.key === col.key;
            const rawVal = row[col.key];
            const displayVal =
              rawVal != null
                ? colIsPct(col)
                  ? `${(rawVal * 100).toFixed(1)}`
                  : fNum(rawVal)
                : null;
            return (
              <td
                key={row.id}
                className={cn(
                  "cursor-text border-b border-r border-[#f0f0f0] px-2.5 py-2 text-right text-[13px] tabular-nums transition-colors",
                  isEditing ? "bg-[#BC8AF9]/10 ring-1 ring-inset ring-[#BC8AF9]/25" : ridx % 2 === 0 ? "bg-white" : "bg-[#fafafa]",
                  rawVal == null && !isEditing ? "text-[#AAAAAA]" : "text-[#323232]",
                )}
                style={{ width: 140, minWidth: 140 }}
                onClick={() => {
                  setEditingCell({ rowId: row.id, key: col.key });
                  setEditValue(
                    rawVal != null
                      ? colIsPct(col)
                        ? `${(rawVal * 100).toFixed(1)}`
                        : String(rawVal)
                      : "",
                  );
                }}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    className="w-full border-0 bg-transparent p-0 text-right text-[13px] text-[#1a1a2e] outline-none"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,-]/g, ""))}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        commitEdit();
                      }
                      if (e.key === "Escape") {
                        setEditingCell(null);
                        setEditValue("");
                      }
                    }}
                  />
                ) : displayVal != null ? (
                  <span>
                    {displayVal}
                    {colIsPct(col) ? <span className="text-[11px] text-black/40">%</span> : null}
                  </span>
                ) : (
                  <span className="text-[12px] text-[#ccc]">—</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
