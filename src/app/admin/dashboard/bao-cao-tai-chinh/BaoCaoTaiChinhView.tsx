"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveBaoCaoTaiChinhColumn } from "@/app/admin/dashboard/bao-cao-tai-chinh/actions";
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
const BORDER = "#E5E7EB";
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

  const resizeHandle = (onMouseDown: (e: React.MouseEvent) => void, light?: boolean) => (
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
        light ? "hover:border-r-2 hover:border-r-white/40" : "hover:border-r-2 hover:border-r-white/30",
      )}
    />
  );

  const yearOpts = namOptions(centerYear);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-5 py-4 text-white"
        style={{ background: "linear-gradient(135deg,#F8A568,#EE5CA2)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg">
            📊
          </div>
          <div className="min-w-0">
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/75">
              Sine Art · Tài chính
            </p>
            <h1 className="m-0 text-lg font-extrabold leading-tight">Báo cáo tài chính</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="shrink-0 rounded-[10px] border-0 bg-white/25 px-4 py-2 text-[13px] font-bold text-white backdrop-blur-sm transition hover:bg-white/35"
        >
          + Thêm tháng
        </button>
      </div>

      <div ref={tableRef} className="relative min-h-[320px] flex-1 overflow-auto bg-[#F8F9FA]">
        {columns.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 p-8">
            <div className="text-5xl">📋</div>
            <p className="m-0 text-sm font-semibold text-gray-500">Chưa có dữ liệu</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-[10px] border-0 px-5 py-2.5 text-[13px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#F8A568,#EE5CA2)" }}
            >
              + Thêm tháng đầu tiên
            </button>
          </div>
        ) : (
          <table
            className="bcc-fin-table w-max min-w-full border-separate border-spacing-0 text-[13px]"
            style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
          >
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-[30] border-b border-white/10 border-r border-white/10 bg-[#1a1a2e] p-0 text-left"
                  style={{ width: labelWidth, minWidth: labelWidth }}
                >
                  <div className="relative px-4 py-3.5 text-[9px] font-extrabold uppercase tracking-widest text-white/60">
                    <span>Chỉ tiêu</span>
                    {resizeHandle(onLabelResizeStart, true)}
                  </div>
                </th>
                {displayCols.map((col) => {
                  const w = getColW(col.id);
                  if (col.isQuarter) {
                    return (
                      <th
                        key={col.id}
                        className="border-b border-amber-200/30 border-l-2 border-r-2 border-amber-100/25 bg-[#0f2027] p-0 text-center align-top"
                        style={{ width: w, minWidth: w }}
                      >
                        <div className="relative px-2 pb-1.5 pt-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[9px] text-amber-200/60">Σ</span>
                            <span className="text-[13px] font-extrabold text-[#FFD966]">
                              {col.quarterLabel}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[9px] text-amber-200/50">
                            {col.quarterPartial ? (
                              <span className="text-amber-300/70">
                                {col.quarterCount}/3 tháng
                              </span>
                            ) : (
                              "Tổng quý · 3 tháng"
                            )}
                          </div>
                          {resizeHandle((e) => onColResizeStart(e, col.id), true)}
                        </div>
                      </th>
                    );
                  }
                  return (
                    <th
                      key={col.id}
                      className="border-b border-white/10 border-r border-white/[0.08] bg-[#1a1a2e] p-0 text-center align-top"
                      style={{ width: w, minWidth: w }}
                    >
                      <div className="relative px-2 pb-1.5 pt-2.5">
                        <div className="text-[13px] font-extrabold leading-tight text-white">
                          {THANG_FULL_TO_SHORT[col.thang] || col.thang}
                        </div>
                        <div className="mt-0.5 text-[9px] text-white/50">{col.nam}</div>
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
                              {col.saving ? "..." : col.saved ? "✓ Đã lưu" : "💾 Lưu"}
                            </button>
                          ) : null}
                          {col.saved && !col.dirty ? (
                            <span className="text-[9px] font-bold text-emerald-500">✓</span>
                          ) : null}
                        </div>
                        {col.error ? (
                          <div className="mt-1 px-1 text-[8px] font-medium leading-snug text-red-300">
                            {col.error}
                          </div>
                        ) : null}
                        {resizeHandle((e) => onColResizeStart(e, col.id), true)}
                      </div>
                    </th>
                  );
                })}
                <th
                  className="min-w-[60px] border-b border-white/10 bg-[#1a1a2e] px-2 py-3.5 text-center"
                  style={{ width: 60 }}
                >
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-white/30 bg-transparent text-base text-white/50 transition hover:border-white/50 hover:text-white/70"
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
                        className="sticky left-0 border-b border-t px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest"
                        style={{
                          background: `${row.color ?? HEADER_BG}18`,
                          borderTopColor: `${row.color}30`,
                          borderBottomColor: `${row.color}20`,
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
                      className="sticky left-0 z-10 border-b border-r text-nowrap"
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
                        color: isFormula ? row.color ?? "#10b981" : isResult ? row.color ?? "#1a1a1a" : "#1a1a1a",
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
                          className={cn(!isQ && "bcc-data-cell border-b text-right text-xs transition-colors")}
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
                                ? "#2a1f00"
                                : isFormula
                                  ? "#1a2a1a"
                                  : "#1e1e0a"
                              : isEditing
                                ? "#FFFBF0"
                                : isResult
                                  ? "#FFF5FB"
                                  : isFormula
                                    ? "#F0FDF9"
                                    : rowBg ?? "#fff",
                            borderRight: isQ ? "2px solid rgba(255,220,100,.2)" : `1px solid ${BORDER}`,
                            borderLeft: isQ ? "2px solid rgba(255,220,100,.2)" : undefined,
                            borderBottom: isQ ? "1px solid rgba(255,220,100,.1)" : `1px solid ${BORDER}`,
                            padding: "6px 10px",
                            fontSize: isQ ? 11 : 12,
                            fontWeight: isQ ? 700 : row.bold ? 700 : 400,
                            color: isQ
                              ? isNeg
                                ? "#f87171"
                                : val === 0
                                  ? "rgba(255,220,100,.3)"
                                  : "#FFD966"
                              : isFormula
                                ? row.color ?? "#10b981"
                                : isResult
                                  ? isNeg
                                    ? "#ef4444"
                                    : row.color ?? "#EE5CA2"
                                  : isNeg
                                    ? "#ef4444"
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
                    <td className="border-b bg-[#FAFAFA]" style={{ borderBottomColor: BORDER }} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowAddModal(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-[320px] rounded-[20px] bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bcc-add-title"
          >
            <h3 id="bcc-add-title" className="m-0 text-lg font-extrabold text-[#1a1a1a]">
              Thêm tháng mới
            </h3>
            <p className="mb-5 mt-1.5 text-[13px] text-gray-500">Chọn kỳ báo cáo cần nhập</p>
            <div className="mb-3 grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Năm
                </label>
                <select
                  value={addNam}
                  onChange={(e) => {
                    setAddNam(e.target.value);
                    setAddThang("");
                  }}
                  className="w-full cursor-pointer rounded-[10px] border border-gray-200 p-2.5 text-[13px] outline-none"
                >
                  {yearOpts.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Tháng
                </label>
                <select
                  value={addThang}
                  onChange={(e) => setAddThang(e.target.value)}
                  className="w-full cursor-pointer rounded-[10px] border border-gray-200 p-2.5 text-[13px] outline-none"
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
            {addErr ? <p className="mb-3 text-xs font-semibold text-red-500">{addErr}</p> : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setAddErr("");
                }}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-[13px] font-semibold text-gray-600"
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
