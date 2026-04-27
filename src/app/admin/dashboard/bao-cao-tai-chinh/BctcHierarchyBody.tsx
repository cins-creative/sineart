"use client";

import { Fragment, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import {
  BCTC_LAYER1_DISPLAY_LABELS,
  BCTC_LAYER1_KEYS,
  BCTC_NAV_TREE,
  type BctcLayer1Key,
  type BaoCaoColumn,
  type ColData,
  type PriorComparisonMeta,
  type RowDef,
  ROW_DEF_MAP,
  fmtNum,
  n,
} from "@/lib/data/bao-cao-tai-chinh-config";
import { cn } from "@/lib/utils";

/** % so với cùng kỳ năm trước (không nhãn YoY). */
function VsPriorPct({ current, prior }: { current: number; prior: number }) {
  if (prior === 0 && current === 0) return null;
  if (prior === 0) {
    return (
      <div className="mt-0.5 text-[9px] font-semibold leading-tight tabular-nums text-[#94a3b8]">—</div>
    );
  }
  const pct = ((current - prior) / prior) * 100;
  const pos = pct >= 0;
  return (
    <div
      className={cn(
        "mt-0.5 text-[9px] font-bold leading-tight tabular-nums",
        pos ? "text-emerald-600" : "text-red-600",
      )}
    >
      {pos ? "+" : ""}
      {pct.toFixed(1)}%
    </div>
  );
}

const BORDER = "#EAEAEA";
const LABEL_COL_BORDER_RIGHT = "2px solid #aeb2ba";
const QUARTER_BORDER_L = "#a5b4fc";

function quarterNumCellBg(
  isQuarter: boolean,
  isEditing: boolean,
  rowBg: string | null,
  rowType: RowDef["type"],
): string {
  if (!isQuarter) return isEditing ? "#f3f4f6" : (rowBg ?? "#fff");
  if (isEditing) return "#e0e7ff";
  if (rowType === "result") return "#dde4ff";
  if (rowType === "formula") return "#e4e9ff";
  return rowBg === "#FAFAFA" ? "#eff4ff" : "#f5f8ff";
}

function getRowBg(row: RowDef, idx: number): string | null {
  if (row.type === "section") return null;
  if (row.type === "result") return "#ececed";
  if (row.type === "formula") return "#f5f5f6";
  return idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
}

type Props = {
  readonly: boolean;
  displayCols: BaoCaoColumn[];
  /** So sánh cùng kỳ — `comparable === false` → hiển thị «Chưa đủ dữ liệu» */
  priorComparisonByColId: Map<string, PriorComparisonMeta>;
  /** Bật hiển thị % / «Chưa đủ dữ liệu» dưới mỗi ô */
  showPriorComparison: boolean;
  labelWidth: number;
  getColW: (id: string) => number;
  /** Mở layer 1 theo chỉ tiêu gốc */
  openLayer1: Set<BctcLayer1Key>;
  toggleLayer1: (k: BctcLayer1Key) => void;
  /** Mở chi tiết L3 trong khối L2: id dạng `${l1}_${block.id}` */
  openLayer2Blocks: Set<string>;
  toggleLayer2Block: (id: string) => void;
  editingCell: { colId: string; key: string } | null;
  setEditingCell: (v: { colId: string; key: string } | null) => void;
  editValue: string;
  setEditValue: (v: string) => void;
  commitEdit: () => void;
};

export function BctcHierarchyBody(props: Props) {
  const {
    readonly,
    displayCols,
    priorComparisonByColId,
    showPriorComparison,
    labelWidth,
    getColW,
    openLayer1,
    toggleLayer1,
    openLayer2Blocks,
    toggleLayer2Block,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    commitEdit,
  } = props;

  let stripeSeq = 0;

  function renderCells(
    row: RowDef,
    rowBg: string | null,
    colDataAccessor: (col: BaoCaoColumn) => ColData,
  ) {
    const isFormula = row.type === "formula" || row.type === "result";
    const isResult = row.type === "result";

    return displayCols.map((col) => {
      const colData = colDataAccessor(col);
      const val = row.formula ? row.formula(colData) : n(colData[row.key]);
      const comparison = priorComparisonByColId.get(col.id);
      let priorVal: number | null = null;
      if (
        showPriorComparison &&
        comparison?.comparable &&
        comparison.priorColData != null
      ) {
        const pd = comparison.priorColData;
        priorVal = row.formula ? row.formula(pd) : n(pd[row.key]);
      }
      const isEditing = !col.isQuarter && editingCell?.colId === col.id && editingCell?.key === row.key;
      const isNeg = val < 0;
      const isQ = col.isQuarter === true;
      const cw = getColW(col.id);
      return (
        <td
          key={col.id}
          className={cn(
            "bcc-num-cell border-b text-right text-xs align-middle transition-colors",
            !isQ && "cursor-text",
            isQ && "bcc-fin-num-quarter",
          )}
          onClick={() => {
            if (!readonly && !isFormula && !isQ) {
              setEditingCell({ colId: col.id, key: row.key });
              setEditValue(col.data[row.key] ?? "");
            }
          }}
          style={{
            width: cw,
            minWidth: cw,
            background: quarterNumCellBg(isQ, isEditing, rowBg, row.type),
            ...(isQ
              ? {
                  borderLeftWidth: 3,
                  borderLeftStyle: "solid",
                  borderLeftColor: QUARTER_BORDER_L,
                }
              : {}),
            borderRight: `1px solid ${BORDER}`,
            borderBottom: `1px solid ${BORDER}`,
            padding: "6px 10px",
            fontSize: isQ ? 11 : 12,
            fontWeight: isQ || row.bold ? 600 : isResult ? 600 : 400,
            color: isNeg
              ? "#dc2626"
              : val === 0 && (isQ || isFormula)
                ? "#b4b4b4"
                : "#323232",
            cursor: readonly || isFormula || isQ ? "default" : "text",
          }}
        >
          {!readonly && !isQ && isEditing ? (
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
            <span className="inline-flex flex-col items-end gap-0">
              <span>
                {val !== 0 ? (
                  fmtNum(val)
                ) : isQ ? (
                  <span className="opacity-30">—</span>
                ) : isFormula ? (
                  "—"
                ) : readonly ? (
                  "—"
                ) : (
                  <span className="text-[10px] text-gray-300">click để nhập</span>
                )}
              </span>
              {!isEditing && showPriorComparison && comparison ? (
                comparison.comparable && priorVal !== null ? (
                  <VsPriorPct current={val} prior={priorVal} />
                ) : !comparison.comparable ? (
                  <span className="mt-0.5 block text-[9px] font-medium leading-tight text-[#94a3b8] opacity-40">
                    Chưa đủ dữ liệu
                  </span>
                ) : null
              ) : null}
            </span>
          )}
        </td>
      );
    });
  }

  function renderDataRow(
    row: RowDef,
    reactKey: string,
    options: {
      padLeft: number;
      labelOverride?: string;
      l1Highlight?: boolean;
      chevron?: { open: boolean; onToggle: () => void; visible: boolean };
    },
  ) {
    const isFormula = row.type === "formula" || row.type === "result";
    const isResult = row.type === "result";
    const idx = stripeSeq++;
    const rowBg = getRowBg(row, idx);

    const label =
      options.labelOverride ??
      row.label;

    return (
      <tr key={reactKey} className={cn(!isFormula && !readonly && "cursor-pointer")}>
        <td
          className="bcc-fin-label-cell sticky left-0 z-[22] border-b text-nowrap font-bold text-[#323232] shadow-[4px_0_12px_rgba(0,0,0,0.04)]"
          style={{
            width: labelWidth,
            minWidth: labelWidth,
            background: rowBg ?? "#fff",
            borderRight: LABEL_COL_BORDER_RIGHT,
            borderBottomColor: BORDER,
            paddingTop: options.l1Highlight ? 10 : 7,
            paddingBottom: options.l1Highlight ? 10 : 7,
            paddingLeft: options.padLeft,
            paddingRight: 12,
            fontSize:
              options.l1Highlight ? 14 : row.type === "formula" ? 13 : row.type === "result" ? 13 : 12,
            fontWeight:
              options.l1Highlight || row.type === "formula" || row.type === "result"
                ? 800
                : row.bold
                  ? 800
                  : 700,
            color: isResult || options.l1Highlight ? "#1a1a1a" : "#323232",
          }}
        >
          <div className="flex items-center gap-2">
            {options.chevron?.visible ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  options.chevron?.onToggle();
                }}
                className="flex shrink-0 items-center justify-center rounded p-0.5 text-[#888] hover:bg-black/[0.04] hover:text-[#323232]"
                aria-expanded={options.chevron.open}
              >
                <ChevronRight
                  strokeWidth={2.5}
                  className={cn("h-4 w-4 transition-transform duration-200", options.chevron.open && "rotate-90")}
                  aria-hidden
                />
              </button>
            ) : (
              <span className="inline-block w-5 shrink-0" aria-hidden />
            )}
            <span>{label}</span>
          </div>
        </td>
        {renderCells(row, rowBg, (col) => (col.isQuarter ? col.quarterData ?? {} : col.data))}
        {!readonly ? (
          <td
            className="bcc-num-cell border-b border-l border-[#EAEAEA] bg-[#fafafa]"
            style={{ width: 52, minWidth: 52, borderBottomColor: BORDER }}
            aria-hidden
          />
        ) : null}
      </tr>
    );
  }

  const out: ReactNode[] = [];

  for (const l1Key of BCTC_LAYER1_KEYS) {
    const l1Row = ROW_DEF_MAP[l1Key];
    if (!l1Row) continue;

    const l1Open = openLayer1.has(l1Key);
    out.push(
      renderDataRow(l1Row, `l1-${l1Key}`, {
        padLeft: 12,
        labelOverride: BCTC_LAYER1_DISPLAY_LABELS[l1Key as BctcLayer1Key] ?? l1Row.label,
        l1Highlight: true,
        chevron: { open: l1Open, onToggle: () => toggleLayer1(l1Key as BctcLayer1Key), visible: true },
      }),
    );

    if (!l1Open) continue;

    const blocks = BCTC_NAV_TREE[l1Key as BctcLayer1Key];
    for (const block of blocks) {
      const compound = `${l1Key}_${block.id}`;

      if (block.kind === "flat") {
        for (const rk of block.rowKeys) {
          const r = ROW_DEF_MAP[rk];
          if (!r) continue;
          out.push(renderDataRow(r, `${compound}-${rk}`, { padLeft: 28 }));
        }
        continue;
      }

      const subRow = ROW_DEF_MAP[block.subtotalKey];
      const hasL3 = block.detailKeys.length > 0;
      const l3Open = openLayer2Blocks.has(compound);

      if (subRow) {
        out.push(
          renderDataRow(subRow, `${compound}-sum`, {
            padLeft: 28,
            chevron: hasL3
              ? {
                  open: l3Open,
                  onToggle: () => toggleLayer2Block(compound),
                  visible: true,
                }
              : { open: false, onToggle: () => {}, visible: false },
          }),
        );
      }

      if (hasL3 && l3Open) {
        for (const dk of block.detailKeys) {
          const dr = ROW_DEF_MAP[dk];
          if (!dr) continue;
          out.push(renderDataRow(dr, `${compound}-d-${dk}`, { padLeft: 44 }));
        }
      }
    }
  }

  return <Fragment>{out}</Fragment>;
}
