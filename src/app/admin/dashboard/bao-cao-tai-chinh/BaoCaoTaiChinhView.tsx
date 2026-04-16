"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Plus, Trash2 } from "lucide-react";

import { deleteBaoCaoTaiChinhRow, saveBaoCaoTaiChinhColumn } from "@/app/admin/dashboard/bao-cao-tai-chinh/actions";
import {
  type BaoCaoColumn,
  type ColData,
  type RowDef,
  ROWS,
  THANG_FULL_ORDER,
  THANG_FULL_TO_SHORT,
  THANG_OPT,
  THANG_SHORT_TO_FULL,
  buildDisplayCols,
  fmtNum,
  namOptions,
  n,
} from "@/lib/data/bao-cao-tai-chinh-config";
import { cn } from "@/lib/utils";

const DEFAULT_LABEL_W = 240;
const DEFAULT_COL_W = 150;
const MIN_LABEL_W = 140;
const MIN_COL_W = 90;
const BORDER = "#EAEAEA";
const HEADER_BG = "#1a1a2e";

function useColumnResize(colIds: string[]) {
  const [labelWidth, setLabelWidth] = useState(DEFAULT_LABEL_W);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const dragging = useRef<{ type: "label" | "col"; colId?: string; startX: number; startW: number } | null>(
    null,
  );

  useEffect(() => {
    setColWidths((prev) => {
      const next = { ...prev };
      for (const id of colIds) {
        if (!(id in next)) next[id] = DEFAULT_COL_W;
      }
      return next;
    });
  }, [colIds.join(",")]);

  const getColW = useCallback((id: string) => colWidths[id] ?? DEFAULT_COL_W, [colWidths]);

  const onLabelResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = { type: "label", startX: e.clientX, startW: labelWidth };
    },
    [labelWidth],
  );

  const onColResizeStart = useCallback(
    (e: React.MouseEvent, colId: string) => {
      e.preventDefault();
      dragging.current = {
        type: "col",
        colId,
        startX: e.clientX,
        startW: colWidths[colId] ?? DEFAULT_COL_W,
      };
    },
    [colWidths],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragging.current.startX;
      if (dragging.current.type === "label") {
        setLabelWidth(Math.max(MIN_LABEL_W, dragging.current.startW + dx));
      } else if (dragging.current.colId) {
        const id = dragging.current.colId;
        setColWidths((prev) => ({
          ...prev,
          [id]: Math.max(MIN_COL_W, dragging.current!.startW + dx),
        }));
      }
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

  return { labelWidth, getColW, onLabelResizeStart, onColResizeStart };
}

function newEmptyCol(id: string, nam: string, thang: string): BaoCaoColumn {
  return { id, nam, thang, data: {}, dirty: false };
}

function getRowBg(row: RowDef, idx: number): string | null {
  if (row.type === "section") return null;
  if (row.type === "result") return "#FFF5FB";
  if (row.type === "formula") return "#F0FDF9";
  return idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
}

type Props = { initialColumns: BaoCaoColumn[] };

export default function BaoCaoTaiChinhView({ initialColumns }: Props) {
  const router = useRouter();
  const [columns, setColumns] = useState<BaoCaoColumn[]>(() =>
    initialColumns.map((c) => ({ ...c, dirty: c.dirty ?? false })),
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const centerYear = new Date().getFullYear();
  const [addNam, setAddNam] = useState(String(centerYear));
  const [addThang, setAddThang] = useState("");
  const [addErr, setAddErr] = useState("");
  const [editingCell, setEditingCell] = useState<{ colId: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingColId, setDeletingColId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const displayCols = buildDisplayCols(columns);
  const colIds = displayCols.map((c) => c.id);
  const { labelWidth, getColW, onLabelResizeStart, onColResizeStart } = useColumnResize(colIds);

  const updateCell = (colId: string, key: string, val: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === colId ? { ...col, data: { ...col.data, [key]: val }, dirty: true } : col,
      ),
    );
  };

  const saveColumn = async (colId: string) => {
    const col = columns.find((c) => c.id === colId);
    if (!col) return;
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, saving: true, error: undefined } : c)),
    );
    try {
      const res = await saveBaoCaoTaiChinhColumn({
        recordId: col.recordId ?? null,
        nam: col.nam,
        thang: col.thang,
        data: col.data,
      });
      if (!res.ok) {
        setColumns((prev) =>
          prev.map((c) => (c.id === colId ? { ...c, saving: false, error: res.error } : c)),
        );
        return;
      }
      setColumns((prev) =>
        prev.map((c) =>
          c.id === colId
            ? {
                ...c,
                saving: false,
                saved: true,
                dirty: false,
                recordId: res.id,
                id: String(res.id),
              }
            : c,
        ),
      );
      window.setTimeout(() => {
        setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, saved: false } : c)));
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      setColumns((prev) =>
        prev.map((c) => (c.id === colId ? { ...c, saving: false, error: msg } : c)),
      );
    }
  };

  const deleteMonthColumn = async (col: BaoCaoColumn) => {
    if (col.isQuarter) return;
    const short = THANG_FULL_TO_SHORT[col.thang] || col.thang;
    const label = `${short} ${col.nam}`.trim();
    if (!globalThis.confirm(`Xóa cột dữ liệu «${label}»? Thao tác không hoàn tác.`)) return;

    setDeletingColId(col.id);
    try {
      if (col.recordId != null && col.recordId > 0) {
        const res = await deleteBaoCaoTaiChinhRow(col.recordId);
        if (!res.ok) {
          setColumns((prev) => prev.map((c) => (c.id === col.id ? { ...c, error: res.error } : c)));
          return;
        }
      }
      setColumns((prev) => prev.filter((c) => c.id !== col.id));
      setEditingCell((ed) => (ed?.colId === col.id ? null : ed));
      router.refresh();
    } finally {
      setDeletingColId(null);
    }
  };

  const usedThang = columns
    .filter((c) => c.nam === addNam)
    .map((c) => THANG_FULL_TO_SHORT[c.thang])
    .filter(Boolean);
  const availableThang = THANG_OPT.filter((t) => !usedThang.includes(t));

  const addColumn = () => {
    if (!addNam || !addThang) {
      setAddErr("Chọn Năm và Tháng");
      return;
    }
    const thangFull = THANG_SHORT_TO_FULL[addThang];
    if (!thangFull) {
      setAddErr("Tháng không hợp lệ");
      return;
    }
    if (columns.some((c) => c.nam === addNam && c.thang === thangFull)) {
      setAddErr("Tháng này đã tồn tại");
      return;
    }
    const id = `new_${Date.now()}`;
    setColumns((prev) => {
      const next = [...prev, newEmptyCol(id, addNam, thangFull)];
      next.sort((a, b) => {
        const ya = parseInt(a.nam, 10);
        const yb = parseInt(b.nam, 10);
        if (ya !== yb) return ya - yb;
        return THANG_FULL_ORDER.indexOf(a.thang) - THANG_FULL_ORDER.indexOf(b.thang);
      });
      return next;
    });
    setShowAddModal(false);
    setAddThang("");
    setAddErr("");
    window.setTimeout(() => {
      tableRef.current?.scrollTo({ left: 99999, behavior: "smooth" });
    }, 100);
  };

  const commitEdit = () => {
    if (editingCell) {
      updateCell(editingCell.colId, editingCell.key, editValue);
      setEditingCell(null);
      setEditValue("");
    }
  };

  const resizeHandle = (onMouseDown: (e: React.MouseEvent) => void, variant: "label" | "header") => (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={(e) => {
        document.body.classList.add("bcc-resizing");
        onMouseDown(e);
        window.addEventListener(
          "mouseup",
          () => document.body.classList.remove("bcc-resizing"),
          { once: true },
        );
      }}
      className={cn(
        "absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none",
        variant === "label"
          ? "hover:border-r-2 hover:border-r-[#BC8AF9]/35"
          : "hover:border-r-2 hover:border-r-[#BC8AF9]/30",
      )}
    />
  );

  const yearOpts = namOptions(centerYear);
  const monthCount = columns.length;

  return (
    <div
      className="-m-4 flex max-h-[calc(100dvh-5.5rem)] min-h-0 w-[calc(100%+2rem)] max-w-none min-w-0 flex-col overflow-hidden bg-[#F5F7F7] font-sans text-[#323232] md:-m-6 md:w-[calc(100%+3rem)]"
      data-supabase-table="tc_bao_cao_tai_chinh"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <BarChart3 size={20} strokeWidth={2} className="text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Báo cáo tài chính</div>
            <div className="text-xs text-[#AAAAAA]">
              {monthCount} kỳ nhập · bảng theo tháng / quý
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          Thêm tháng
        </button>
      </div>

      <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col px-[10px] pb-6 pt-3">
          <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            {columns.length === 0 ? (
              <div className="flex min-h-[min(48vh,420px)] flex-col items-center justify-center gap-3 px-6 py-12">
                <div className="text-5xl opacity-80" aria-hidden>
                  📋
                </div>
                <p className="m-0 text-sm font-semibold text-[#888]">Chưa có dữ liệu</p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Thêm tháng đầu tiên
                </button>
              </div>
            ) : (
              <div
                ref={tableRef}
                className="min-h-0 flex-1 overflow-auto overscroll-contain [max-height:min(72vh,calc(100dvh-11rem))]"
              >
                <table className="bcc-fin-table w-max min-w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      <th
                        className="sticky left-0 top-0 z-[45] border-b border-r border-[#EAEAEA] bg-[#fafafa] p-0 text-left shadow-[2px_0_8px_rgba(0,0,0,0.06)]"
                        style={{ width: labelWidth, minWidth: labelWidth }}
                      >
                        <div className="relative px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
                          <span>Chỉ tiêu</span>
                          {resizeHandle(onLabelResizeStart, "label")}
                        </div>
                      </th>
                      {displayCols.map((col) => {
                        const w = getColW(col.id);
                        const busyDel = deletingColId === col.id;
                        if (col.isQuarter) {
                          return (
                            <th
                              key={col.id}
                              className="sticky top-0 z-[34] border-b border-l border-r border-amber-200/90 bg-amber-50 p-0 text-center align-top"
                              style={{ width: w, minWidth: w }}
                            >
                              <div className="relative px-2 pb-2 pt-2.5">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[9px] font-bold text-amber-700/70">Σ</span>
                                  <span className="text-[13px] font-extrabold text-amber-900">
                                    {col.quarterLabel}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[9px] font-medium text-amber-800/70">
                                  {col.quarterPartial ? (
                                    <span>{col.quarterCount}/3 tháng</span>
                                  ) : (
                                    "Tổng quý · 3 tháng"
                                  )}
                                </div>
                                {resizeHandle((e) => onColResizeStart(e, col.id), "header")}
                              </div>
                            </th>
                          );
                        }
                        return (
                          <th
                            key={col.id}
                            className="sticky top-0 z-[33] border-b border-r border-[#EAEAEA] bg-[#fafafa] p-0 text-center align-top"
                            style={{ width: w, minWidth: w }}
                          >
                            <div className="relative px-2 pb-2 pt-2.5">
                              <button
                                type="button"
                                disabled={busyDel || col.saving}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void deleteMonthColumn(col);
                                }}
                                className="absolute right-1 top-1 z-20 rounded-md p-1 text-[#AAA] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                title="Xóa cột tháng"
                                aria-label={`Xóa ${THANG_FULL_TO_SHORT[col.thang] || col.thang} ${col.nam}`}
                              >
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                              <div className="text-[13px] font-extrabold leading-tight text-[#1a1a2e]">
                                {THANG_FULL_TO_SHORT[col.thang] || col.thang}
                              </div>
                              <div className="mt-0.5 text-[10px] font-semibold text-[#AAA]">{col.nam}</div>
                              <div className="mt-1.5 flex justify-center gap-1">
                                {col.dirty ? (
                                  <button
                                    type="button"
                                    disabled={col.saving}
                                    onClick={() => void saveColumn(col.id)}
                                    className={cn(
                                      "rounded-md border-0 px-2 py-0.5 text-[9px] font-extrabold text-white",
                                      col.saved ? "bg-emerald-500" : "",
                                    )}
                                    style={
                                      col.saved
                                        ? undefined
                                        : { background: "linear-gradient(135deg,#F8A568,#EE5CA2)" }
                                    }
                                  >
                                    {col.saving ? "..." : col.saved ? "✓ Đã lưu" : "Lưu"}
                                  </button>
                                ) : null}
                                {col.saved && !col.dirty ? (
                                  <span className="text-[9px] font-bold text-emerald-600">✓</span>
                                ) : null}
                              </div>
                              {col.error ? (
                                <div className="mt-1 px-1 text-[8px] font-medium leading-snug text-red-600">
                                  {col.error}
                                </div>
                              ) : null}
                              {resizeHandle((e) => onColResizeStart(e, col.id), "header")}
                            </div>
                          </th>
                        );
                      })}
                      <th
                        className="sticky top-0 z-[33] min-w-[52px] border-b border-[#EAEAEA] bg-[#fafafa] px-1 py-2.5 text-center"
                        style={{ width: 52 }}
                      >
                        <button
                          type="button"
                          onClick={() => setShowAddModal(true)}
                          className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-[#ccc] bg-white text-base text-[#888] transition hover:border-[#BC8AF9] hover:text-[#BC8AF9]"
                          aria-label="Thêm cột"
                        >
                          +
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row, ridx) => {
                      if (row.type === "section") {
                        return (
                          <tr key={row.key}>
                            <td
                              colSpan={displayCols.length + 2}
                              className="border-b border-t px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest"
                              style={{
                                background: `${row.color ?? HEADER_BG}14`,
                                borderTopColor: `${row.color}28`,
                                borderBottomColor: `${row.color}18`,
                                color: row.color ?? HEADER_BG,
                              }}
                            >
                              {row.label}
                            </td>
                          </tr>
                        );
                      }
                      const isFormula = row.type === "formula" || row.type === "result";
                      const isResult = row.type === "result";
                      const rowBg = getRowBg(row, ridx);
                      return (
                        <tr key={row.key} className={cn(!isFormula && "cursor-pointer")}>
                          <td
                            className="sticky left-0 z-[25] border-b border-r text-nowrap shadow-[2px_0_6px_rgba(0,0,0,0.04)]"
                            style={{
                              width: labelWidth,
                              minWidth: labelWidth,
                              background: isResult ? "#FFF0F8" : isFormula ? "#F0FDF9" : rowBg ?? "#fff",
                              borderRightColor: BORDER,
                              borderBottomColor: BORDER,
                              paddingTop: 7,
                              paddingBottom: 7,
                              paddingLeft: 12 + (row.indent ?? 0) * 16,
                              paddingRight: 12,
                              fontSize: isResult ? 11 : 12,
                              fontWeight: row.bold ? 800 : isResult ? 700 : 400,
                              color: isFormula
                                ? row.color ?? "#059669"
                                : isResult
                                  ? row.color ?? "#1a1a1a"
                                  : "#1a1a1a",
                            }}
                          >
                            {isFormula ? <span className="mr-1 opacity-60">📊</span> : null}
                            {row.label}
                          </td>
                          {displayCols.map((col) => {
                            const colData: ColData = col.isQuarter ? col.quarterData ?? {} : col.data;
                            const val = row.formula ? row.formula(colData) : n(colData[row.key]);
                            const isEditing =
                              !col.isQuarter && editingCell?.colId === col.id && editingCell?.key === row.key;
                            const isNeg = val < 0;
                            const isQ = col.isQuarter;
                            const cw = getColW(col.id);
                            return (
                              <td
                                key={col.id}
                                className={cn(
                                  "bcc-num-cell border-b text-right text-xs align-middle transition-colors",
                                  !isQ && "cursor-text",
                                )}
                                onClick={() => {
                                  if (!isFormula && !isQ) {
                                    setEditingCell({ colId: col.id, key: row.key });
                                    setEditValue(col.data[row.key] ?? "");
                                  }
                                }}
                                style={{
                                  width: cw,
                                  minWidth: cw,
                                  background: isQ
                                    ? isResult
                                      ? "#fff7ed"
                                      : isFormula
                                        ? "#ecfdf5"
                                        : "#fffbeb"
                                    : isEditing
                                      ? "#FFFBF0"
                                      : isResult
                                        ? "#FFF5FB"
                                        : isFormula
                                          ? "#F0FDF9"
                                          : rowBg ?? "#fff",
                                  borderRight: isQ ? "1px solid rgba(251,191,36,0.45)" : `1px solid ${BORDER}`,
                                  borderLeft: isQ ? "1px solid rgba(251,191,36,0.35)" : undefined,
                                  borderBottom: isQ ? "1px solid rgba(251,191,36,0.25)" : `1px solid ${BORDER}`,
                                  padding: "6px 10px",
                                  fontSize: isQ ? 11 : 12,
                                  fontWeight: isQ ? 700 : row.bold ? 700 : 400,
                                  color: isQ
                                    ? isNeg
                                      ? "#dc2626"
                                      : val === 0
                                        ? "rgba(146,64,14,0.35)"
                                        : "#92400e"
                                    : isFormula
                                      ? row.color ?? "#059669"
                                      : isResult
                                        ? isNeg
                                          ? "#dc2626"
                                          : row.color ?? "#db2777"
                                        : isNeg
                                          ? "#dc2626"
                                          : "#1a1a1a",
                                  cursor: isFormula || isQ ? "default" : "text",
                                }}
                              >
                                {!isQ && isEditing ? (
                                  <input
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value.replace(/[^0-9]/g, ""))}
                                    onBlur={commitEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === "Tab") {
                                        e.preventDefault();
                                        commitEdit();
                                      }
                                      if (e.key === "Escape") setEditingCell(null);
                                    }}
                                    className="w-full border-0 bg-transparent p-0 text-right text-xs text-[#1a1a1a] outline-none"
                                  />
                                ) : (
                                  <span>
                                    {val !== 0 ? (
                                      fmtNum(val)
                                    ) : isQ ? (
                                      <span className="opacity-30">—</span>
                                    ) : isFormula ? (
                                      "—"
                                    ) : (
                                      <span className="text-[10px] text-gray-300">click để nhập</span>
                                    )}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td
                            className="bcc-num-cell border-b border-l border-[#EAEAEA] bg-[#fafafa]"
                            style={{ width: 52, minWidth: 52, borderBottomColor: BORDER }}
                            aria-hidden
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowAddModal(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-[320px] rounded-[20px] border border-[#EAEAEA] bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bcc-add-title"
          >
            <h3 id="bcc-add-title" className="m-0 text-lg font-extrabold text-[#1a1a1a]">
              Thêm tháng mới
            </h3>
            <p className="mb-5 mt-1.5 text-[13px] text-[#888]">Chọn kỳ báo cáo cần nhập</p>
            <div className="mb-3 grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
                  Năm
                </label>
                <select
                  value={addNam}
                  onChange={(e) => {
                    setAddNam(e.target.value);
                    setAddThang("");
                  }}
                  className="h-10 w-full cursor-pointer rounded-[10px] border border-[#EAEAEA] bg-white px-2.5 text-[13px] outline-none focus:border-[#BC8AF9]"
                >
                  {yearOpts.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
                  Tháng
                </label>
                <select
                  value={addThang}
                  onChange={(e) => setAddThang(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-[10px] border border-[#EAEAEA] bg-white px-2.5 text-[13px] outline-none focus:border-[#BC8AF9]"
                >
                  <option value="">— Chọn —</option>
                  {availableThang.length === 0 ? (
                    <option disabled value="">
                      Đã đủ 12 tháng
                    </option>
                  ) : (
                    availableThang.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            {addErr ? <p className="mb-3 text-xs font-semibold text-red-600">{addErr}</p> : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setAddErr("");
                }}
                className="flex-1 rounded-xl border border-[#EAEAEA] bg-white py-3 text-[13px] font-semibold text-[#666]"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={addColumn}
                className="flex-[2] rounded-xl border-0 py-3 text-[13px] font-bold text-white"
                style={{ background: "linear-gradient(135deg,#F8A568,#EE5CA2)" }}
              >
                + Thêm tháng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
