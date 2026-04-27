"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { BctcHierarchyBody } from "@/app/admin/dashboard/bao-cao-tai-chinh/BctcHierarchyBody";
import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import {
  deleteBaoCaoTaiChinhRow,
  saveBaoCaoTaiChinhColumn,
  updateBaoCaoTaiChinhPeriod,
} from "@/app/admin/dashboard/bao-cao-tai-chinh/actions";
import {
  type BctcLayer1Key,
  type BaoCaoColumn,
  THANG_FULL_ORDER,
  THANG_FULL_TO_SHORT,
  THANG_OPT,
  THANG_SHORT_TO_FULL,
  buildDisplayCols,
  getPriorComparisonMeta,
  type PriorComparisonMeta,
  namOptions,
} from "@/lib/data/bao-cao-tai-chinh-config";
import { cn } from "@/lib/utils";

const DEFAULT_LABEL_W = 240;
const DEFAULT_COL_W = 150;
const MIN_LABEL_W = 140;
const MIN_COL_W = 90;
/** Viền phải cột chỉ tiêu — tách rõ khối số liệu khi cuộn ngang. */
const LABEL_COL_BORDER_RIGHT = "2px solid #aeb2ba";

/** Cột Σ quý — tách khỏi cột tháng (nền indigo nhạt + viền trái). */
const QUARTER_HDR_BG = "#eef2ff";
const QUARTER_BORDER_L = "#a5b4fc";

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

function defaultBctcYearFilter(cols: BaoCaoColumn[]): string {
  const ys = [...new Set(cols.map((c) => c.nam))]
    .filter((n) => n !== "")
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  return ys.length ? ys[ys.length - 1]! : "__all__";
}

type Props = {
  initialColumns: BaoCaoColumn[];
  /** `summary` = chỉ chỉ tiêu tổng hợp & KQKD, chỉ xem (dashboard nhân viên). */
  variant?: "full" | "summary";
  /** Gắn trong tab Overview — không chiếm full viewport. */
  embed?: boolean;
};

export default function BaoCaoTaiChinhView({
  initialColumns,
  variant: variantProp = "full",
  embed = false,
}: Props) {
  const variant = variantProp;
  const readonly = variant === "summary";
  const router = useRouter();
  const { canDelete: roleMayDeleteCol } = useAdminDashboardAbilities();
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

  const [editPeriodOpen, setEditPeriodOpen] = useState(false);
  const [editPeriodColId, setEditPeriodColId] = useState<string | null>(null);
  const [editPeriodNam, setEditPeriodNam] = useState(String(centerYear));
  const [editPeriodThangShort, setEditPeriodThangShort] = useState("");
  const [editPeriodErr, setEditPeriodErr] = useState("");
  const [editPeriodBusy, setEditPeriodBusy] = useState(false);

  const [deleteColOpen, setDeleteColOpen] = useState(false);
  const [deleteColId, setDeleteColId] = useState<string | null>(null);
  const [deleteColLabel, setDeleteColLabel] = useState("");
  const [deleteColRecordId, setDeleteColRecordId] = useState<number | null>(null);
  const [deleteColAck, setDeleteColAck] = useState(false);
  const [deleteColBusy, setDeleteColBusy] = useState(false);
  const [deleteColErr, setDeleteColErr] = useState("");

  const [openLayer1, setOpenLayer1] = useState<Set<BctcLayer1Key>>(() => new Set());
  const [openLayer2Blocks, setOpenLayer2Blocks] = useState<Set<string>>(() => new Set());

  const [filterNam, setFilterNam] = useState<string>(() => defaultBctcYearFilter(initialColumns));
  const [showPriorYearComparison, setShowPriorYearComparison] = useState(true);

  const toggleLayer1 = (key: BctcLayer1Key) => {
    setOpenLayer1((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleLayer2Block = (compoundId: string) => {
    setOpenLayer2Blocks((prev) => {
      const next = new Set(prev);
      if (next.has(compoundId)) next.delete(compoundId);
      else next.add(compoundId);
      return next;
    });
  };

  const yearsInData = useMemo(() => {
    const ys = [...new Set(columns.map((c) => c.nam))]
      .filter((n) => n !== "")
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return ys;
  }, [columns]);

  useEffect(() => {
    if (filterNam === "__all__" || yearsInData.length === 0) return;
    if (!yearsInData.includes(filterNam)) {
      setFilterNam(yearsInData[yearsInData.length - 1] ?? "__all__");
    }
  }, [yearsInData, filterNam]);

  const displayColsFull = useMemo(() => buildDisplayCols(columns), [columns]);

  const displayCols = useMemo(() => {
    if (filterNam === "__all__") return displayColsFull;
    return displayColsFull.filter((c) => c.nam === filterNam);
  }, [displayColsFull, filterNam]);

  const priorComparisonByColId = useMemo(() => {
    const m = new Map<string, PriorComparisonMeta>();
    for (const c of displayCols) {
      m.set(c.id, getPriorComparisonMeta(c, columns));
    }
    return m;
  }, [displayCols, columns]);

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

  const usedThangForEdit = columns
    .filter((c) => c.nam === editPeriodNam && c.id !== editPeriodColId)
    .map((c) => THANG_FULL_TO_SHORT[c.thang])
    .filter(Boolean);
  const availableThangEdit = THANG_OPT.filter(
    (t) => !usedThangForEdit.includes(t) || t === editPeriodThangShort,
  );

  function sortCols(list: BaoCaoColumn[]): BaoCaoColumn[] {
    return [...list].sort((a, b) => {
      const ya = parseInt(a.nam, 10);
      const yb = parseInt(b.nam, 10);
      if (ya !== yb) return ya - yb;
      return THANG_FULL_ORDER.indexOf(a.thang) - THANG_FULL_ORDER.indexOf(b.thang);
    });
  }

  function openEditPeriod(col: BaoCaoColumn) {
    if (col.isQuarter) return;
    setEditPeriodErr("");
    setEditPeriodColId(col.id);
    setEditPeriodNam(col.nam);
    const short = THANG_FULL_TO_SHORT[col.thang];
    setEditPeriodThangShort(short && THANG_OPT.includes(short) ? short : "");
    setEditPeriodOpen(true);
  }

  function openDeleteColumn(col: BaoCaoColumn) {
    if (col.isQuarter) return;
    const short = THANG_FULL_TO_SHORT[col.thang] || col.thang;
    setDeleteColErr("");
    setDeleteColLabel(`${short} · ${col.nam}`);
    setDeleteColId(col.id);
    setDeleteColRecordId(col.recordId ?? null);
    setDeleteColAck(false);
    setDeleteColOpen(true);
  }

  async function submitEditPeriod() {
    if (!editPeriodColId) return;
    const col = columns.find((c) => c.id === editPeriodColId);
    if (!col) return;
    if (!editPeriodThangShort) {
      setEditPeriodErr("Chọn tháng");
      return;
    }
    const thangFull = THANG_SHORT_TO_FULL[editPeriodThangShort];
    if (!thangFull) {
      setEditPeriodErr("Tháng không hợp lệ");
      return;
    }
    if (columns.some((c) => c.id !== col.id && c.nam === editPeriodNam && c.thang === thangFull)) {
      setEditPeriodErr("Kỳ này đã tồn tại");
      return;
    }
    setEditPeriodErr("");
    if (col.recordId != null && col.recordId > 0) {
      setEditPeriodBusy(true);
      try {
        const res = await updateBaoCaoTaiChinhPeriod({
          recordId: col.recordId,
          newNam: editPeriodNam,
          newThang: thangFull,
          data: col.data,
        });
        if (!res.ok) {
          setEditPeriodErr(res.error);
          return;
        }
        setColumns((prev) =>
          sortCols(
            prev.map((c) =>
              c.id === col.id
                ? {
                    ...c,
                    nam: editPeriodNam,
                    thang: thangFull,
                    dirty: false,
                    error: undefined,
                    id: String(res.id),
                    recordId: res.id,
                  }
                : c,
            ),
          ),
        );
        setEditPeriodOpen(false);
        setEditPeriodColId(null);
        router.refresh();
      } finally {
        setEditPeriodBusy(false);
      }
    } else {
      setColumns((prev) =>
        sortCols(
          prev.map((c) =>
            c.id === col.id ? { ...c, nam: editPeriodNam, thang: thangFull, dirty: true } : c,
          ),
        ),
      );
      setEditPeriodOpen(false);
      setEditPeriodColId(null);
    }
  }

  async function submitDeleteColumn() {
    if (!deleteColId || !deleteColAck) return;
    setDeleteColErr("");
    setDeleteColBusy(true);
    try {
      if (deleteColRecordId != null && deleteColRecordId > 0) {
        const res = await deleteBaoCaoTaiChinhRow(deleteColRecordId);
        if (!res.ok) {
          setDeleteColErr(res.error);
          return;
        }
        router.refresh();
      }
      setColumns((prev) => prev.filter((c) => c.id !== deleteColId));
      setDeleteColOpen(false);
      setDeleteColAck(false);
      setDeleteColId(null);
      setDeleteColRecordId(null);
    } finally {
      setDeleteColBusy(false);
    }
  }

  const outerClass =
    embed === true
      ? "flex w-full flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-[#F5F7F7] font-sans text-[#323232]"
      : "-m-4 flex h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] min-h-0 w-[calc(100%+2rem)] max-w-none min-w-0 flex-col overflow-hidden bg-[#F5F7F7] font-sans text-[#323232] md:-m-6 md:w-[calc(100%+3rem)]";

  const headerSubtitle = readonly
    ? "Chỉ xem — chỉ tiêu tổng hợp & KQKD (dữ liệu cùng bảng báo cáo tài chính)."
    : embed
      ? `${monthCount} kỳ nhập · chỉnh sửa đầy đủ có trên trang Báo cáo tài chính`
      : `${monthCount} kỳ nhập · bảng theo tháng / quý · hover tiêu đề cột tháng để đổi kỳ / xóa`;

  const headerTitle = readonly ? "BCTC tổng quan" : embed ? "BCTC chi tiết" : "Báo cáo tài chính";

  return (
    <div className={outerClass} data-supabase-table="tc_bao_cao_tai_chinh">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] md:px-6 md:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <BarChart3 size={20} strokeWidth={2} className="text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">{headerTitle}</div>
            <div className="text-xs text-[#AAAAAA]">{headerSubtitle}</div>
            {embed ? (
              <Link
                href="/admin/dashboard/bao-cao-tai-chinh"
                className="mt-1 inline-block text-[11px] font-semibold text-[#BC8AF9] underline-offset-2 hover:underline"
              >
                {readonly ? "Mở báo cáo đầy đủ trên trang riêng →" : "Mở trang báo cáo đầy đủ →"}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {columns.length > 0 ? (
            <>
              <label className="flex shrink-0 items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Năm</span>
                <select
                  value={filterNam}
                  onChange={(e) => setFilterNam(e.target.value)}
                  className="h-[30px] cursor-pointer rounded-lg border border-[#EAEAEA] bg-white px-2 text-[11px] font-semibold text-[#323232] shadow-sm outline-none hover:border-[#BC8AF9]/40 focus:border-[#BC8AF9]"
                  aria-label="Lọc theo năm hiển thị"
                >
                  <option value="__all__">Tất cả năm</option>
                  {yearsInData.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex shrink-0 items-center gap-2 border-l border-[#EAEAEA] pl-2 md:pl-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showPriorYearComparison}
                  aria-label="Bật hoặc tắt so sánh cùng kỳ năm trước"
                  title={
                    showPriorYearComparison
                      ? "Đang bật so sánh năm trước — bấm để tắt"
                      : "Đang tắt — bấm để hiện % và trạng thái đủ dữ liệu"
                  }
                  onClick={() => setShowPriorYearComparison((v) => !v)}
                  className={cn(
                    "relative h-[26px] w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC8AF9]/45",
                    showPriorYearComparison
                      ? "bg-gradient-to-r from-[#f8a668] to-[#ee5b9f]"
                      : "bg-[#E3E5E5]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1 block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                      showPriorYearComparison ? "translate-x-[18px]" : "translate-x-0",
                    )}
                  />
                </button>
                <span className="max-w-[160px] text-[11px] font-semibold leading-snug text-[#555]">
                  So sánh cùng kỳ năm trước
                </span>
              </div>
            </>
          ) : null}
          {!readonly ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95"
            >
              <Plus size={16} strokeWidth={2.5} />
              Thêm tháng
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-0 w-full max-w-full min-w-0 flex-col",
          embed ? "min-h-[min(68vh,760px)]" : "flex-1",
        )}
      >
        <div
          className={cn(
            "flex min-h-0 w-full max-w-full min-w-0 flex-col px-[10px] pb-6 pt-3",
            embed ? "h-full min-h-[min(64vh,720px)]" : "h-full flex-1",
          )}
        >
          <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            {columns.length === 0 ? (
              <div className="flex min-h-[min(48vh,420px)] flex-col items-center justify-center gap-3 px-6 py-12">
                <div className="text-5xl opacity-80" aria-hidden>
                  📋
                </div>
                <p className="m-0 text-sm font-semibold text-[#888]">Chưa có dữ liệu</p>
                {!readonly ? (
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    Thêm tháng đầu tiên
                  </button>
                ) : null}
              </div>
            ) : displayCols.length === 0 ? (
              <div className="flex min-h-[min(48vh,420px)] flex-col items-center justify-center gap-2 px-6 py-12">
                <p className="m-0 text-sm font-semibold text-[#888]">Không có cột hiển thị cho năm đã chọn</p>
                <p className="m-0 text-xs text-[#AAA]">Đổi bộ lọc năm hoặc chọn «Tất cả năm»</p>
              </div>
            ) : (
              <div
                ref={tableRef}
                className="bcc-fin-scroll min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain"
              >
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
                          {!readonly ? resizeHandle(onLabelResizeStart, "label") : null}
                        </div>
                      </th>
                      {displayCols.map((col) => {
                        const w = getColW(col.id);
                        if (col.isQuarter) {
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
                              title="Cột tổng quý — chỉnh hoặc xóa trên từng tháng trong quý"
                            >
                              <div className="relative px-2 pb-2 pt-2.5">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[9px] font-bold text-indigo-500">Σ</span>
                                  <span className="text-[13px] font-extrabold text-indigo-950">
                                    {col.quarterLabel}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[9px] font-medium text-indigo-700/75">
                                  {col.quarterPartial ? (
                                    <span>{col.quarterCount}/3 tháng</span>
                                  ) : (
                                    "Tổng quý · 3 tháng"
                                  )}
                                </div>
                                {!readonly ? resizeHandle((e) => onColResizeStart(e, col.id), "header") : null}
                              </div>
                            </th>
                          );
                        }
                        return (
                          <th
                            key={col.id}
                            className="group sticky top-0 border-b border-r border-[#EAEAEA] bg-[#fafafa] p-0 text-center align-top"
                            style={{ width: w, minWidth: w }}
                          >
                            <div className="relative px-2 pb-2 pt-2.5">
                              <div className="text-[13px] font-extrabold leading-tight text-[#1a1a2e]">
                                {THANG_FULL_TO_SHORT[col.thang] || col.thang}
                              </div>
                              <div className="mt-0.5 text-[10px] font-semibold text-[#AAA]">{col.nam}</div>
                              {!readonly ? (
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
                                    onClick={() => openEditPeriod(col)}
                                    className="rounded-md p-1 text-[#888] transition hover:bg-black/[0.05] hover:text-[#BC8AF9]"
                                    aria-label={`Đổi kỳ ${THANG_FULL_TO_SHORT[col.thang] || col.thang} ${col.nam}`}
                                    title="Đổi năm / tháng kỳ"
                                  >
                                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                  </button>
                                  {roleMayDeleteCol ? (
                                    <button
                                      type="button"
                                      onClick={() => openDeleteColumn(col)}
                                      className="rounded-md p-1 text-[#888] transition hover:bg-red-50 hover:text-red-600"
                                      aria-label={`Xóa kỳ ${THANG_FULL_TO_SHORT[col.thang] || col.thang} ${col.nam}`}
                                      title="Xóa kỳ"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                              {!readonly ? (
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
                              ) : null}
                              {col.error ? (
                                <div className="mt-1 px-1 text-[8px] font-medium leading-snug text-red-600">
                                  {col.error}
                                </div>
                              ) : null}
                              {!readonly ? resizeHandle((e) => onColResizeStart(e, col.id), "header") : null}
                            </div>
                          </th>
                        );
                      })}
                      {!readonly ? (
                      <th
                        className="sticky top-0 min-w-[52px] border-b border-[#EAEAEA] bg-[#fafafa] px-1 py-2.5 text-center"
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
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    <BctcHierarchyBody
                      readonly={readonly}
                      displayCols={displayCols}
                      priorComparisonByColId={priorComparisonByColId}
                      showPriorComparison={showPriorYearComparison}
                      labelWidth={labelWidth}
                      getColW={getColW}
                      openLayer1={openLayer1}
                      toggleLayer1={toggleLayer1}
                      openLayer2Blocks={openLayer2Blocks}
                      toggleLayer2Block={toggleLayer2Block}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                      editValue={editValue}
                      setEditValue={setEditValue}
                      commitEdit={commitEdit}
                    />
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

      {editPeriodOpen && editPeriodColId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => {
            if (editPeriodBusy) return;
            setEditPeriodOpen(false);
            setEditPeriodColId(null);
            setEditPeriodErr("");
          }}
        >
          <div
            className="w-full max-w-[360px] rounded-[20px] border border-[#EAEAEA] bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bcc-edit-period-title"
          >
            <h3 id="bcc-edit-period-title" className="m-0 text-lg font-extrabold text-[#1a1a1a]">
              Đổi kỳ báo cáo
            </h3>
            <p className="mb-5 mt-1.5 text-[13px] text-[#888]">Năm và tháng đại diện cho cột (không trùng kỳ khác).</p>
            <div className="mb-3 grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
                  Năm
                </label>
                <select
                  value={editPeriodNam}
                  onChange={(e) => {
                    setEditPeriodNam(e.target.value);
                    setEditPeriodErr("");
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
                  value={editPeriodThangShort}
                  onChange={(e) => {
                    setEditPeriodThangShort(e.target.value);
                    setEditPeriodErr("");
                  }}
                  className="h-10 w-full cursor-pointer rounded-[10px] border border-[#EAEAEA] bg-white px-2.5 text-[13px] outline-none focus:border-[#BC8AF9]"
                >
                  <option value="">— Chọn —</option>
                  {availableThangEdit.length === 0 ? (
                    <option disabled value="">
                      Không còn tháng trống
                    </option>
                  ) : (
                    availableThangEdit.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            {editPeriodErr ? <p className="mb-3 text-xs font-semibold text-red-600">{editPeriodErr}</p> : null}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={editPeriodBusy}
                onClick={() => {
                  setEditPeriodOpen(false);
                  setEditPeriodColId(null);
                  setEditPeriodErr("");
                }}
                className="flex-1 rounded-xl border border-[#EAEAEA] bg-white py-3 text-[13px] font-semibold text-[#666] disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={editPeriodBusy}
                onClick={() => void submitEditPeriod()}
                className="flex-[2] rounded-xl border-0 py-3 text-[13px] font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#F8A568,#EE5CA2)" }}
              >
                {editPeriodBusy ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Đang lưu…
                  </span>
                ) : (
                  "Lưu kỳ"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {roleMayDeleteCol && deleteColOpen && deleteColId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => {
            if (deleteColBusy) return;
            setDeleteColOpen(false);
            setDeleteColAck(false);
            setDeleteColErr("");
          }}
        >
          <div
            className="w-full max-w-[400px] rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
            role="dialog"
            aria-labelledby="bcc-del-col-title"
            aria-describedby="bcc-del-col-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="bcc-del-col-title" className="m-0 text-[17px] font-bold text-[#323232]">
              Xóa kỳ báo cáo?
            </h2>
            <p id="bcc-del-col-desc" className="mt-2 text-sm leading-relaxed text-[#666]">
              Bạn sắp xóa kỳ <span className="font-semibold text-[#1a1a2e]">{deleteColLabel}</span> khỏi bảng báo cáo
              tài chính.
            </p>
            <div
              className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-left"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-amber-900">Cảnh báo</div>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] leading-snug text-amber-950/90">
                  <li>Toàn bộ số liệu đã nhập cho kỳ này sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu.</li>
                  <li>Không thể hoàn tác từ giao diện này.</li>
                </ul>
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-left">
              <input
                type="checkbox"
                checked={deleteColAck}
                onChange={(e) => setDeleteColAck(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#ccc] text-[#EE5CA2] focus:ring-[#BC8AF9]"
              />
              <span className="text-[12px] font-semibold leading-snug text-[#323232]">
                Tôi hiểu rủi ro và muốn xóa kỳ này
              </span>
            </label>
            {deleteColErr ? (
              <p className="mt-3 text-xs font-semibold text-red-600">{deleteColErr}</p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={deleteColBusy}
                onClick={() => {
                  setDeleteColOpen(false);
                  setDeleteColAck(false);
                  setDeleteColErr("");
                }}
                className="flex-1 rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#666] disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={deleteColBusy || !deleteColAck}
                onClick={() => void submitDeleteColumn()}
                className="flex-[2] rounded-[10px] border border-red-200 bg-red-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteColBusy ? (
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
    </div>
  );
}
