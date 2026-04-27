"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

import type {
  BctcTuDongBundle,
  BctcTuDongMatrixRow,
  BctcTuDongSource,
} from "@/lib/data/bctc-tu-dong";
import { fmtNum } from "@/lib/data/bao-cao-tai-chinh-config";
import { cn } from "@/lib/utils";

const BORDER = "#EAEAEA";
const LABEL_COL_BORDER_RIGHT = "2px solid #aeb2ba";
const QUARTER_BORDER_L = "#a5b4fc";
const QUARTER_HDR_BG = "#eef2ff";

const DEFAULT_LABEL_W = 260;
const DEFAULT_COL_W = 132;
const MIN_LABEL_W = 140;
const MIN_COL_W = 90;

function useTuDongColumnResize(colIds: string[]) {
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

type TuDongDisplayCol =
  | {
      id: string;
      kind: "quarter";
      quarterLabel: string;
      monthKeysInQuarter: string[];
      quarterPartial: boolean;
      quarterCount: number;
    }
  | {
      id: string;
      kind: "month";
      monthKey: string;
      nam: string;
      shortLabel: string;
    };

function monthKeyToShortT(mk: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(mk.trim());
  if (!m) return mk;
  const mi = parseInt(m[2], 10);
  return mi >= 1 && mi <= 12 ? `T${mi}` : mk;
}

/** Giống `buildDisplayCols`: Σ Q1…Q4 trước, sau đó đủ cột tháng theo `monthKeys`. */
function buildTuDongDisplayCols(nam: number, monthKeys: string[]): TuDongDisplayCol[] {
  const mkSet = new Set(monthKeys);
  const orderedMonths = [...monthKeys].sort();

  const out: TuDongDisplayCol[] = [];

  for (let q = 1; q <= 4; q++) {
    const nums = q === 1 ? [1, 2, 3] : q === 2 ? [4, 5, 6] : q === 3 ? [7, 8, 9] : [10, 11, 12];
    const keysInQ = nums.map((n) => `${nam}-${String(n).padStart(2, "0")}`).filter((k) => mkSet.has(k));
    if (keysInQ.length === 0) continue;
    out.push({
      id: `q_${nam}_Q${q}`,
      kind: "quarter",
      quarterLabel: `Q${q} ${nam}`,
      monthKeysInQuarter: keysInQ,
      quarterPartial: keysInQ.length < 3,
      quarterCount: keysInQ.length,
    });
  }

  for (const mk of orderedMonths) {
    out.push({
      id: `m_${mk}`,
      kind: "month",
      monthKey: mk,
      nam: mk.slice(0, 4),
      shortLabel: monthKeyToShortT(mk),
    });
  }

  return out;
}

function sumRowForDisplayCol(row: BctcTuDongMatrixRow, col: TuDongDisplayCol): number {
  if (col.kind === "month") return row.byMonth[col.monthKey] ?? 0;
  return col.monthKeysInQuarter.reduce((s, mk) => s + (row.byMonth[mk] ?? 0), 0);
}

function sourceLabel(source: BctcTuDongSource): string {
  switch (source) {
    case "hoc_phi":
      return "Học phí (đơn TT)";
    case "thu_chi_khac":
      return "Thu chi khác";
    case "hoa_cu_ban":
      return "Bán họa cụ";
    case "hoa_cu_nhap":
      return "Nhập họa cụ";
    case "khau_hao_tscd":
      return "Khấu hao TSCĐ (tc_tai_san_rong)";
    default:
      return source;
  }
}

const THU_SOURCES_ORDER: BctcTuDongSource[] = ["hoc_phi", "thu_chi_khac", "hoa_cu_ban"];
const CHI_SOURCES_ORDER: BctcTuDongSource[] = ["thu_chi_khac", "hoa_cu_nhap", "khau_hao_tscd"];

type Layer1Key = "thu" | "chi";

function groupRowsByOrderedSource(
  rows: BctcTuDongMatrixRow[],
  loai: Layer1Key,
): { source: BctcTuDongSource; rows: BctcTuDongMatrixRow[] }[] {
  const order = loai === "thu" ? THU_SOURCES_ORDER : CHI_SOURCES_ORDER;
  const filtered = rows.filter((r) => r.loai === loai);
  const bySource = new Map<BctcTuDongSource, BctcTuDongMatrixRow[]>();
  for (const r of filtered) {
    const list = bySource.get(r.source);
    if (list) list.push(r);
    else bySource.set(r.source, [r]);
  }
  const out: { source: BctcTuDongSource; rows: BctcTuDongMatrixRow[] }[] = [];
  for (const s of order) {
    const rs = bySource.get(s);
    if (rs?.length) out.push({ source: s, rows: rs });
  }
  return out;
}

function quarterNumCellBg(isQuarter: boolean, rowBg: string | null, variant: "body" | "formula" | "result"): string {
  if (!isQuarter) return rowBg ?? "#fff";
  if (variant === "result") return "#dde4ff";
  if (variant === "formula") return "#e4e9ff";
  return rowBg === "#FAFAFA" ? "#eff4ff" : "#f5f8ff";
}

function resizeHandle(onMouseDown: (e: React.MouseEvent) => void, variant: "label" | "header") {
  return (
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
}

type Props = {
  bundle: BctcTuDongBundle;
};

export default function BctcTuDongView({ bundle }: Props) {
  const { nam, monthKeys, rows } = bundle;

  const displayCols = useMemo(() => buildTuDongDisplayCols(nam, monthKeys), [nam, monthKeys]);

  const colIds = useMemo(() => displayCols.map((c) => c.id), [displayCols]);
  const { labelWidth, getColW, onLabelResizeStart, onColResizeStart } = useTuDongColumnResize(colIds);

  const [openLayer1, setOpenLayer1] = useState<Set<Layer1Key>>(() => new Set(["thu", "chi"]));
  const [openDetailByBlock, setOpenDetailByBlock] = useState<Set<string>>(() => new Set());

  const toggleLayer1 = useCallback((k: Layer1Key) => {
    setOpenLayer1((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  const toggleDetailBlock = useCallback((compoundId: string) => {
    setOpenDetailByBlock((prev) => {
      const next = new Set(prev);
      if (next.has(compoundId)) next.delete(compoundId);
      else next.add(compoundId);
      return next;
    });
  }, []);

  const groupedThu = useMemo(() => groupRowsByOrderedSource(rows, "thu"), [rows]);
  const groupedChi = useMemo(() => groupRowsByOrderedSource(rows, "chi"), [rows]);

  const colTotals = useMemo(() => {
    const thuMonth: Record<string, number> = {};
    const chiMonth: Record<string, number> = {};
    for (const mk of monthKeys) {
      thuMonth[mk] = 0;
      chiMonth[mk] = 0;
    }
    for (const r of rows) {
      for (const mk of monthKeys) {
        const v = r.byMonth[mk] ?? 0;
        if (r.loai === "thu") thuMonth[mk] = (thuMonth[mk] ?? 0) + v;
        else chiMonth[mk] = (chiMonth[mk] ?? 0) + v;
      }
    }
    let sumThu = 0;
    let sumChi = 0;
    for (const r of rows) {
      for (const mk of monthKeys) {
        const v = r.byMonth[mk] ?? 0;
        if (r.loai === "thu") sumThu += v;
        else sumChi += v;
      }
    }
    return { thuMonth, chiMonth, sumThu, sumChi, net: sumThu - sumChi };
  }, [rows, monthKeys]);

  const syntheticThuRow = useMemo(
    () =>
      ({
        key: "__rollup_thu",
        danhMucId: null,
        ma: "",
        ten: "",
        loai: "thu" as const,
        source: "hoc_phi",
        byMonth: Object.fromEntries(monthKeys.map((mk) => [mk, colTotals.thuMonth[mk] ?? 0])),
      }) satisfies BctcTuDongMatrixRow,
    [monthKeys, colTotals.thuMonth],
  );

  const syntheticChiRow = useMemo(
    () =>
      ({
        key: "__rollup_chi",
        danhMucId: null,
        ma: "",
        ten: "",
        loai: "chi" as const,
        source: "hoc_phi",
        byMonth: Object.fromEntries(monthKeys.map((mk) => [mk, colTotals.chiMonth[mk] ?? 0])),
      }) satisfies BctcTuDongMatrixRow,
    [monthKeys, colTotals.chiMonth],
  );

  let stripeSeq = 0;

  function renderNumCells(
    row: BctcTuDongMatrixRow,
    rowBg: string | null,
    variant: "body" | "formula" | "result",
    bold?: boolean,
  ) {
    return displayCols.map((col) => {
      const val = sumRowForDisplayCol(row, col);
      const isQ = col.kind === "quarter";
      const cw = getColW(col.id);
      const isNeg = val < 0;
      return (
        <td
          key={col.id}
          className={cn(
            "bcc-num-cell border-b text-right text-xs align-middle transition-colors tabular-nums",
            isQ && "bcc-fin-num-quarter",
          )}
          style={{
            width: cw,
            minWidth: cw,
            background: quarterNumCellBg(isQ, rowBg, variant),
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
            fontWeight: isQ || bold ? 600 : variant === "result" ? 600 : 400,
            color: isNeg ? "#dc2626" : val === 0 && isQ ? "#b4b4b4" : "#323232",
          }}
        >
          <span className="inline-flex flex-col items-end gap-0">
            <span>{val !== 0 ? fmtNum(val) : isQ ? <span className="opacity-30">—</span> : "—"}</span>
          </span>
        </td>
      );
    });
  }

  function renderLabelRow(params: {
    reactKey: string;
    padLeft: number;
    label: React.ReactNode;
    subtitle?: string;
    l1Highlight?: boolean;
    variant: "body" | "formula" | "result";
    bold?: boolean;
    /** `null` hoặc bỏ qua → xen kẽ ô cho variant body */
    rowBg?: string | null;
    dataRow: BctcTuDongMatrixRow;
    chevron?: { open: boolean; onToggle: () => void; visible: boolean };
  }) {
    const { variant } = params;
    const idx = stripeSeq++;
    let rowBg = params.rowBg ?? null;
    if (params.variant === "body" && params.rowBg == null) {
      rowBg = idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
    }
    if (params.variant === "formula") rowBg = "#f5f5f6";
    if (params.variant === "result") rowBg = "#ececed";

    return (
      <tr key={params.reactKey}>
        <td
          className="bcc-fin-label-cell sticky left-0 z-[22] border-b text-nowrap font-bold text-[#323232] shadow-[4px_0_12px_rgba(0,0,0,0.04)]"
          style={{
            width: labelWidth,
            minWidth: labelWidth,
            background: rowBg ?? "#fff",
            borderRight: LABEL_COL_BORDER_RIGHT,
            borderBottomColor: BORDER,
            paddingTop: params.l1Highlight ? 10 : 7,
            paddingBottom: params.l1Highlight ? 10 : 7,
            paddingLeft: params.padLeft,
            paddingRight: 12,
            fontSize:
              params.l1Highlight ? 14 : params.variant === "formula" ? 13 : params.variant === "result" ? 13 : 12,
            fontWeight:
              params.l1Highlight || params.variant === "formula" || params.variant === "result"
                ? 800
                : params.bold
                  ? 800
                  : 700,
            color: params.variant === "result" || params.l1Highlight ? "#1a1a1a" : "#323232",
          }}
        >
          <div className="flex items-start gap-2">
            {params.chevron?.visible ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  params.chevron?.onToggle();
                }}
                className="mt-0.5 flex shrink-0 items-center justify-center rounded p-0.5 text-[#888] hover:bg-black/[0.04] hover:text-[#323232]"
                aria-expanded={params.chevron?.open ?? false}
              >
                <ChevronRight
                  strokeWidth={2.5}
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    params.chevron.open && "rotate-90",
                  )}
                  aria-hidden
                />
              </button>
            ) : (
              <span className="inline-block w-5 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 leading-snug">
              {params.label}
              {params.subtitle ? (
                <span className="mt-0.5 block text-[11px] font-semibold text-[#888]">{params.subtitle}</span>
              ) : null}
            </span>
          </div>
        </td>
        {renderNumCells(params.dataRow, rowBg, variant, params.bold)}
      </tr>
    );
  }

  function renderSourceBlock(loai: Layer1Key, group: { source: BctcTuDongSource; rows: BctcTuDongMatrixRow[] }) {
    const compound = `${loai}_${group.source}`;
    const list = group.rows;
    const mkPartial = Object.fromEntries(monthKeys.map((mk) => [mk, 0]));
    const rollupRow: BctcTuDongMatrixRow = {
      key: `${compound}_rollup`,
      danhMucId: null,
      ma: "",
      ten: "",
      loai,
      source: group.source,
      byMonth: { ...mkPartial },
    };
    for (const r of list) {
      for (const mk of monthKeys) {
        rollupRow.byMonth[mk] = (rollupRow.byMonth[mk] ?? 0) + (r.byMonth[mk] ?? 0);
      }
    }

    const detailsOpen = openDetailByBlock.has(compound);

    if (list.length === 1) {
      const r = list[0]!;
      return (
        <Fragment key={compound}>
          {renderLabelRow({
            reactKey: compound,
            padLeft: 28,
            label: (
              <span className={loai === "thu" ? "text-emerald-800" : "text-rose-800"}>
                {sourceLabel(group.source)}
              </span>
            ),
            subtitle: `${r.ten} · ${r.ma}`,
            variant: "body",
            bold: false,
            dataRow: r,
            chevron: { open: false, onToggle: () => {}, visible: false },
          })}
        </Fragment>
      );
    }

    return (
      <Fragment key={compound}>
        {renderLabelRow({
          reactKey: `${compound}_sum`,
          padLeft: 28,
          label: sourceLabel(group.source),
          variant: "formula",
          rowBg: "#f5f5f6",
          dataRow: rollupRow,
          chevron: {
            open: detailsOpen,
            onToggle: () => toggleDetailBlock(compound),
            visible: true,
          },
        })}
        {detailsOpen
          ? list.map((r) =>
              renderLabelRow({
                reactKey: `${compound}_${r.key}`,
                padLeft: 44,
                label: r.ten,
                subtitle: r.ma,
                variant: "body",
                bold: false,
                dataRow: r,
                chevron: { open: false, onToggle: () => {}, visible: false },
              }),
            )
          : null}
      </Fragment>
    );
  }

  const tbodyRows = useMemo(() => {
    stripeSeq = 0;
    const nodes: React.ReactNode[] = [];

    const pushL1 = (key: Layer1Key, label: string, rollup: BctcTuDongMatrixRow, groups: typeof groupedThu) => {
      const open = openLayer1.has(key);
      nodes.push(
        renderLabelRow({
          reactKey: `l1-${key}`,
          padLeft: 12,
          label,
          l1Highlight: true,
          variant: "body",
          bold: true,
          rowBg: "#fff",
          dataRow: rollup,
          chevron: {
            open,
            onToggle: () => toggleLayer1(key),
            visible: true,
          },
        }),
      );
      if (!open) return;
      for (const g of groups) {
        nodes.push(renderSourceBlock(key, g));
      }
    };

    pushL1("thu", "Doanh thu (nguồn tự động)", syntheticThuRow, groupedThu);
    pushL1("chi", "Chi phí (nguồn tự động)", syntheticChiRow, groupedChi);

    nodes.push(
      renderLabelRow({
        reactKey: "foot-thu",
        padLeft: 12,
        label: "Tổng thu (theo tháng)",
        variant: "result",
        rowBg: "#ececed",
        dataRow: syntheticThuRow,
      }),
    );
    nodes.push(
      renderLabelRow({
        reactKey: "foot-chi",
        padLeft: 12,
        label: "Tổng chi (theo tháng)",
        variant: "result",
        rowBg: "#ececed",
        dataRow: syntheticChiRow,
      }),
    );
    const netRow: BctcTuDongMatrixRow = {
      key: "__net",
      danhMucId: null,
      ma: "",
      ten: "",
      loai: "thu",
      source: "hoc_phi",
      byMonth: Object.fromEntries(
        monthKeys.map((mk) => [mk, (colTotals.thuMonth[mk] ?? 0) - (colTotals.chiMonth[mk] ?? 0)]),
      ),
    };
    nodes.push(
      renderLabelRow({
        reactKey: "foot-net",
        padLeft: 12,
        label: "Luỹ kế thu − chi",
        variant: "result",
        rowBg: "#ececed",
        dataRow: netRow,
        bold: true,
      }),
    );

    return nodes;
  }, [
    openLayer1,
    openDetailByBlock,
    groupedThu,
    groupedChi,
    syntheticThuRow,
    syntheticChiRow,
    monthKeys,
    colTotals,
    toggleLayer1,
    toggleDetailBlock,
    labelWidth,
    displayCols,
    getColW,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col pb-6">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex shrink-0 flex-col gap-3 border-b border-[#EAEAEA] bg-gradient-to-b from-[#fafafa] to-white px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#BC8AF9]">Kế toán</p>
            <h1 className="m-0 mt-1 text-xl font-extrabold tracking-tight text-[#1a1a2e]">BCTC — nguồn tự động</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:pb-0.5">
            <span className="text-[13px] text-black/60">
              Năm báo cáo: <span className="font-bold text-[#1a1a2e]">{nam}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[nam - 1, nam, nam + 1].map((y) => (
                <Link
                  key={y}
                  href={`/admin/dashboard/bctc-tu-dong?nam=${y}`}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition",
                    y === nam
                      ? "border-[#f8a668]/45 bg-gradient-to-r from-[#f8a668]/18 to-[#ee5b9f]/12 text-[#1a1a2e] shadow-sm"
                      : "border-[#E8EAEB] bg-white text-black/55 hover:border-[#BC8AF9]/25 hover:bg-[#fafafa]",
                  )}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1">
          {rows.length === 0 ? (
            <div className="flex min-h-[min(44vh,380px)] flex-col items-center justify-center gap-3 px-6 py-14">
              <div className="text-5xl opacity-80" aria-hidden>
                📋
              </div>
              <p className="m-0 text-center text-sm font-semibold text-[#888]">
                Chưa có phát sinh trong năm {nam} (hoặc chưa gán danh mục / chưa thanh toán).
              </p>
            </div>
          ) : (
            <div className="bcc-fin-scroll max-h-[min(72vh,820px)] min-h-[min(52vh,560px)] overflow-x-auto overflow-y-auto overscroll-contain">
              <table className="bcc-fin-table w-max min-w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    <th
                      className="bcc-fin-label-cell sticky left-0 top-0 border-b border-[#EAEAEA] bg-[#fafafa] p-0 text-left shadow-[2px_0_8px_rgba(0,0,0,0.06)]"
                      style={{
                        width: labelWidth,
                        minWidth: labelWidth,
                        borderRight: LABEL_COL_BORDER_RIGHT,
                      }}
                    >
                      <div className="relative px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#5c5c5c]">
                        <span>Chỉ tiêu</span>
                        {resizeHandle(onLabelResizeStart, "label")}
                      </div>
                    </th>
                    {displayCols.map((col) => {
                      const w = getColW(col.id);
                      if (col.kind === "quarter") {
                        return (
                          <th
                            key={col.id}
                            className="sticky top-0 border-b border-r border-[#EAEAEA] border-l-[3px] p-0 text-center align-top shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                            style={{
                              width: w,
                              minWidth: w,
                              borderLeftColor: QUARTER_BORDER_L,
                              background: QUARTER_HDR_BG,
                            }}
                          >
                            <div className="relative px-2 pb-2 pt-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-[9px] font-bold text-indigo-500">Σ</span>
                                <span className="text-[13px] font-extrabold text-indigo-950">{col.quarterLabel}</span>
                              </div>
                              <div className="mt-0.5 text-[9px] font-medium text-indigo-700/75">
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
                          className="sticky top-0 border-b border-r border-[#EAEAEA] bg-[#fafafa] p-0 text-center align-top"
                          style={{ width: w, minWidth: w }}
                        >
                          <div className="relative px-2 pb-2 pt-2.5">
                            <div className="text-[13px] font-extrabold leading-tight text-[#1a1a2e]">{col.shortLabel}</div>
                            <div className="mt-0.5 text-[10px] font-semibold text-[#AAA]">{col.nam}</div>
                            {resizeHandle((e) => onColResizeStart(e, col.id), "header")}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>{tbodyRows}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
