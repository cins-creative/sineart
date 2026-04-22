"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, Loader2, Pencil, RotateCcw, Save, Trash2, X } from "lucide-react";

import {
  bulkUpdateHeThongBaiTap,
  type BaiTapBulkPatch,
} from "@/app/admin/dashboard/he-thong-bai-tap/actions";
import type {
  AdminBaiTapRow,
  AdminMonHocOpt,
} from "@/lib/data/admin-he-thong-bai-tap";
import { cn } from "@/lib/utils";

const MUC_DO_OPTIONS = ["Bắt buộc", "Tập luyện", "Tuỳ chọn"] as const;

/** Field được phép sửa inline trong list view. */
type EditableKey =
  | "ten_bai_tap"
  | "bai_so"
  | "mon_hoc"
  | "so_buoi"
  | "muc_do_quan_trong"
  | "is_visible";

type DraftRow = Partial<Record<EditableKey, unknown>>;
type DraftMap = Record<number, DraftRow>;

type Props = {
  rows: AdminBaiTapRow[];
  monList: AdminMonHocOpt[];
  canDelete: boolean;
  onEditFull: (row: AdminBaiTapRow) => void;
  onDeleteOne: (row: AdminBaiTapRow) => void;
  onToast: (msg: string, ok: boolean) => void;
  onDataChanged: () => void;
};

/**
 * Custom checkbox (button) — onClick nhận `MouseEvent.shiftKey` để shift-select
 * mà không bị vướng default behaviour của `<input type="checkbox">`.
 */
function SelectCell({
  selected,
  indeterminate,
  onClick,
  ariaLabel,
}: {
  selected: boolean;
  indeterminate?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : selected}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "flex size-4 items-center justify-center rounded-[4px] border-[1.5px] transition",
        selected
          ? "border-[#BC8AF9] bg-[#BC8AF9] text-white"
          : indeterminate
            ? "border-[#BC8AF9] bg-[#BC8AF9]/30 text-white"
            : "border-[#D0D0D0] bg-white text-transparent hover:border-[#BC8AF9]",
      )}
    >
      {selected ? <Check size={11} strokeWidth={3} /> : null}
      {!selected && indeterminate ? <span className="block h-[2px] w-2 bg-white" /> : null}
    </button>
  );
}

export default function BaiTapListEditable({
  rows,
  monList,
  canDelete,
  onEditFull,
  onDeleteOne,
  onToast,
  onDataChanged,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [anchorId, setAnchorId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [busy, setBusy] = useState(false);

  const rowIds = useMemo(() => rows.map((r) => r.id), [rows]);

  /**
   * Khi rows từ server đã sync (vd. sau `router.refresh()` sau bulk save) →
   * tự gỡ những field trong draft đã khớp row → reset trạng thái dirty.
   * Cũng dọn draft mồ côi nếu row bị xoá.
   */
  useEffect(() => {
    setDrafts((prev) => {
      let changed = false;
      const next: DraftMap = {};
      for (const [idStr, d] of Object.entries(prev)) {
        if (!d) continue;
        const id = Number(idStr);
        const row = rows.find((r) => r.id === id);
        if (!row) {
          changed = true;
          continue;
        }
        const cleaned: DraftRow = {};
        for (const k of Object.keys(d) as EditableKey[]) {
          const val = d[k];
          const orig = row[k];
          const same =
            val === orig ||
            (val == null && orig == null) ||
            String(val ?? "") === String(orig ?? "");
          if (!same) (cleaned as Record<string, unknown>)[k] = val;
        }
        if (Object.keys(cleaned).length === 0) {
          changed = true;
          continue;
        }
        if (Object.keys(cleaned).length !== Object.keys(d).length) changed = true;
        next[id] = cleaned;
      }
      return changed ? next : prev;
    });
  }, [rows]);

  const dirtyIds = useMemo(() => {
    return Object.entries(drafts)
      .filter(([, v]) => v && Object.keys(v).length > 0)
      .map(([k]) => Number(k));
  }, [drafts]);

  const hasDirty = dirtyIds.length > 0;
  const monLabel = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of monList) map.set(m.id, m.ten_mon_hoc);
    return map;
  }, [monList]);

  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && rowIds.some((id) => selectedIds.has(id));

  /** Lấy value hiển thị/edit: ưu tiên draft nếu có, fallback từ row gốc. */
  const valueOf = useCallback(
    <K extends EditableKey>(row: AdminBaiTapRow, key: K): AdminBaiTapRow[K] => {
      const draft = drafts[row.id];
      if (draft && key in draft) return draft[key] as AdminBaiTapRow[K];
      return row[key];
    },
    [drafts],
  );

  const patchDraft = useCallback(
    (row: AdminBaiTapRow, patch: DraftRow) => {
      setDrafts((prev) => {
        const cur: DraftRow = { ...(prev[row.id] ?? {}), ...patch };
        /**
         * Khi user quay về giá trị gốc → xoá khỏi draft để row không còn được coi là dirty.
         * `null` và `undefined` ở đây được coi ngang nhau (DB cột nullable).
         */
        for (const k of Object.keys(cur) as EditableKey[]) {
          const orig = row[k];
          const val = cur[k];
          const same =
            val === orig ||
            (val == null && orig == null) ||
            String(val ?? "") === String(orig ?? "");
          if (same) delete cur[k];
        }
        if (Object.keys(cur).length === 0) {
          const { [row.id]: _omit, ...rest } = prev;
          void _omit;
          return rest;
        }
        return { ...prev, [row.id]: cur };
      });
    },
    [],
  );

  const toggleSelectOne = useCallback(
    (id: number, shift: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (shift && anchorId != null && anchorId !== id) {
          const anchorIdx = rowIds.indexOf(anchorId);
          const clickIdx = rowIds.indexOf(id);
          if (anchorIdx >= 0 && clickIdx >= 0) {
            const [lo, hi] = anchorIdx < clickIdx ? [anchorIdx, clickIdx] : [clickIdx, anchorIdx];
            /** Shift-range sẽ cùng chuyển trạng thái dựa theo row vừa click. */
            const shouldSelect = !prev.has(id);
            for (let i = lo; i <= hi; i++) {
              const rid = rowIds[i];
              if (rid == null) continue;
              if (shouldSelect) next.add(rid);
              else next.delete(rid);
            }
            return next;
          }
        }
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setAnchorId(id);
    },
    [anchorId, rowIds],
  );

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set(rowIds);
    });
  }, [allSelected, rowIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  async function runUpdates(
    updates: Array<{ id: number; patch: BaiTapBulkPatch }>,
    successMsg?: string,
  ) {
    if (updates.length === 0) return false;
    setBusy(true);
    const r = await bulkUpdateHeThongBaiTap(updates);
    setBusy(false);
    if (r.ok) {
      onToast(successMsg ?? r.message ?? `Đã lưu ${r.updated} bài.`, true);
      return true;
    }
    onToast(r.error, false);
    return false;
  }

  async function saveDrafts() {
    if (!hasDirty) return;
    const updates = dirtyIds.map((id) => ({
      id,
      patch: (drafts[id] ?? {}) as BaiTapBulkPatch,
    }));
    const ok = await runUpdates(updates, `Đã lưu ${updates.length} bài.`);
    if (ok) {
      setDrafts({});
      onDataChanged();
    }
  }

  function resetDrafts() {
    setDrafts({});
  }

  /**
   * Optimistic merge: set draft field cho các row vừa bulk update. Sau khi
   * `router.refresh()` sync rows, `useEffect([rows])` sẽ tự gỡ draft → tránh flash
   * giá trị cũ trong khoảng thời gian refresh chưa xong.
   */
  function mergeDraftsForSelected<K extends EditableKey>(key: K, value: DraftRow[K]) {
    setDrafts((prev) => {
      const next: DraftMap = { ...prev };
      for (const id of selectedIds) {
        next[id] = { ...(next[id] ?? {}), [key]: value } as DraftRow;
      }
      return next;
    });
  }

  async function bulkSetVisibility(value: boolean) {
    if (selectedIds.size === 0) return;
    const updates = [...selectedIds].map((id) => ({
      id,
      patch: { is_visible: value } as BaiTapBulkPatch,
    }));
    const ok = await runUpdates(
      updates,
      `Đã ${value ? "hiện" : "ẩn"} ${updates.length} bài.`,
    );
    if (ok) {
      mergeDraftsForSelected("is_visible", value);
      onDataChanged();
    }
  }

  async function bulkSetMon(monId: number | null) {
    if (selectedIds.size === 0) return;
    const updates = [...selectedIds].map((id) => ({
      id,
      patch: { mon_hoc: monId } as BaiTapBulkPatch,
    }));
    const ok = await runUpdates(
      updates,
      `Đã đổi môn cho ${updates.length} bài.`,
    );
    if (ok) {
      mergeDraftsForSelected("mon_hoc", monId);
      onDataChanged();
    }
  }

  /** Ngăn browser text-select khi shift-click chọn dãy */
  const preventShiftTextSelect = (e: React.MouseEvent<HTMLElement>) => {
    if (e.shiftKey) e.preventDefault();
  };

  /**
   * Kích thước cột: `minmax(0,1fr)` cho tên, còn lại cố định để input khớp nhau.
   * Tổng cố định ≈ 600px → trên container hẹp (~700px) vẫn dư đất cho cột tên.
   */
  const GRID_COLS =
    "grid-cols-[26px_52px_minmax(120px,1fr)_180px_64px_116px_56px_80px]";

  return (
    <div className="flex min-h-0 flex-col">
      {/* BULK ACTION BAR */}
      {selectedIds.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#BC8AF9]/40 bg-[#BC8AF9]/10 px-4 py-2.5 text-[12px] font-semibold text-[#1a1a2e]">
          <span className="mr-1 rounded-full bg-[#BC8AF9] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
            {selectedIds.size}
          </span>
          <span>đã chọn</span>
          <span className="mx-1 h-4 w-px bg-[#BC8AF9]/30" />
          <button
            type="button"
            disabled={busy}
            onClick={() => void bulkSetVisibility(true)}
            className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            <Eye size={13} /> Hiện
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void bulkSetVisibility(false)}
            className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            <EyeOff size={13} /> Ẩn
          </button>
          <label className="flex items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1 text-[11px] text-[#444]">
            Đổi môn →
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                e.target.value = "";
                if (v === "__null") void bulkSetMon(null);
                else if (v) void bulkSetMon(Number(v));
              }}
              className="bg-transparent text-[11px] font-semibold text-[#1a1a2e] outline-none"
            >
              <option value="" disabled>
                chọn…
              </option>
              <option value="__null">— (bỏ trống)</option>
              {monList.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.ten_mon_hoc}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="text-[#888]" />
          </label>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[#666] hover:bg-white"
          >
            <X size={12} /> Bỏ chọn
          </button>
        </div>
      ) : null}

      {/* HEADER */}
      <div className="overflow-x-auto">
      <div
        className={cn(
          "grid gap-2 rounded-t-2xl border-x border-t border-[#EAEAEA] bg-[#FAFBFC] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#888]",
          GRID_COLS,
        )}
      >
        <div className="flex items-center justify-center">
          <SelectCell
            selected={allSelected}
            indeterminate={someSelected}
            onClick={() => toggleSelectAll()}
            ariaLabel="Chọn tất cả"
          />
        </div>
        <div className="text-left">Bài #</div>
        <div className="text-left">Tên bài tập</div>
        <div className="text-left">Môn học</div>
        <div className="text-left">Số buổi</div>
        <div className="text-left">Mức độ</div>
        <div className="text-center">Hiện</div>
        <div className="text-center">Thao tác</div>
      </div>

      {/* ROWS */}
      <div className="flex-1 overflow-hidden rounded-b-2xl border-x border-b border-[#EAEAEA] bg-white">
        {rows.map((row) => {
          const selected = selectedIds.has(row.id);
          const dirty = !!drafts[row.id] && Object.keys(drafts[row.id] ?? {}).length > 0;
          const mon = valueOf(row, "mon_hoc");
          const baiSo = valueOf(row, "bai_so");
          const soBuoi = valueOf(row, "so_buoi");
          const mucDo = valueOf(row, "muc_do_quan_trong") ?? "Bắt buộc";
          const isVis = valueOf(row, "is_visible");
          const ten = valueOf(row, "ten_bai_tap");

          return (
            <div
              key={row.id}
              className={cn(
                "grid items-center gap-2 border-b border-[#F1F1F1] px-3 py-1.5 transition",
                GRID_COLS,
                selected && "bg-[#BC8AF9]/8",
                dirty && "ring-1 ring-inset ring-amber-300/70",
              )}
              onMouseDown={preventShiftTextSelect}
            >
              {/* Select */}
              <div className="flex items-center justify-center">
                <SelectCell
                  selected={selected}
                  onClick={(e) => toggleSelectOne(row.id, e.shiftKey)}
                  ariaLabel={`Chọn bài ${row.ten_bai_tap}`}
                />
              </div>

              {/* Bài số */}
              <input
                type="number"
                min={0}
                value={baiSo == null ? "" : String(baiSo)}
                onChange={(e) => {
                  const raw = e.target.value;
                  patchDraft(row, {
                    bai_so: raw === "" ? null : Number(raw),
                  });
                }}
                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[12px] tabular-nums outline-none focus:border-[#BC8AF9] focus:bg-white focus:ring-[2px] focus:ring-[#BC8AF9]/15"
              />

              {/* Tên */}
              <input
                type="text"
                value={ten}
                onChange={(e) => patchDraft(row, { ten_bai_tap: e.target.value })}
                className="w-full truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] font-semibold text-[#1a1a2e] outline-none focus:border-[#BC8AF9] focus:bg-white focus:ring-[2px] focus:ring-[#BC8AF9]/15"
              />

              {/* Môn */}
              <select
                value={mon == null ? "" : String(mon)}
                onChange={(e) => {
                  const v = e.target.value;
                  patchDraft(row, { mon_hoc: v === "" ? null : Number(v) });
                }}
                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[12px] text-[#444] outline-none focus:border-[#BC8AF9] focus:bg-white focus:ring-[2px] focus:ring-[#BC8AF9]/15"
                title={mon != null ? monLabel.get(Number(mon)) ?? "" : "—"}
              >
                <option value="">— không gán —</option>
                {monList.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.ten_mon_hoc}
                  </option>
                ))}
              </select>

              {/* Số buổi */}
              <input
                type="number"
                min={0}
                value={soBuoi == null ? "" : String(soBuoi)}
                onChange={(e) => {
                  const raw = e.target.value;
                  patchDraft(row, {
                    so_buoi: raw === "" ? null : Number(raw),
                  });
                }}
                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[12px] tabular-nums outline-none focus:border-[#BC8AF9] focus:bg-white focus:ring-[2px] focus:ring-[#BC8AF9]/15"
              />

              {/* Mức độ */}
              <select
                value={String(mucDo ?? "Bắt buộc")}
                onChange={(e) => patchDraft(row, { muc_do_quan_trong: e.target.value })}
                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[12px] text-[#444] outline-none focus:border-[#BC8AF9] focus:bg-white focus:ring-[2px] focus:ring-[#BC8AF9]/15"
              >
                {MUC_DO_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Hiện */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(isVis)}
                  onClick={() => patchDraft(row, { is_visible: !isVis })}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition",
                    isVis ? "bg-emerald-500" : "bg-zinc-300",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-4 rounded-full bg-white shadow transition",
                      isVis ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>

              {/* Thao tác */}
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditFull(row)}
                  title="Sửa đầy đủ (drawer)"
                  className="flex size-7 items-center justify-center rounded-md text-[#666] hover:bg-[#BC8AF9]/10 hover:text-[#BC8AF9]"
                >
                  <Pencil size={13} />
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => onDeleteOne(row)}
                    title="Xoá"
                    className="flex size-7 items-center justify-center rounded-md text-[#AAA] hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[#888]">
            Không có bài tập khớp bộ lọc.
          </p>
        ) : null}
      </div>
      </div>

      <p className="mt-2 text-[11px] text-[#888]">
        Mẹo: giữ <kbd className="rounded bg-[#F1F1F1] px-1.5 py-0.5 text-[10px] font-bold">Shift</kbd>{" "}
        rồi click để chọn dãy. Các thay đổi inline sẽ được lưu hàng loạt ở thanh dưới.
      </p>

      {/* DIRTY SAVE BAR */}
      {hasDirty ? (
        <div className="sticky bottom-3 z-30 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 px-4 py-3 shadow-[0_6px_20px_rgba(245,158,11,0.18)] backdrop-blur">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-900">
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-extrabold text-white">
              {dirtyIds.length}
            </span>
            bài có thay đổi chưa lưu
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={resetDrafts}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-[12px] font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
            >
              <RotateCcw size={13} /> Hoàn tác
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveDrafts()}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-4 py-2 text-[12px] font-bold text-white shadow-sm disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Lưu tất cả
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
