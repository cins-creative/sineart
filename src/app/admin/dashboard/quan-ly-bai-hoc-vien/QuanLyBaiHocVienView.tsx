"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  ImageIcon,
  Images,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";

import {
  deleteBaiHocVien,
  updateBaiHocVien,
  type UpdateBaiHocVienPayload,
} from "@/app/admin/dashboard/quan-ly-bai-hoc-vien/actions";
import {
  ADMIN_BHV_STATUS_TABS,
  type AdminBaiHocVienRow,
  type AdminBhvExerciseOpt,
  type AdminBhvHocVienOpt,
  type AdminBhvLopOpt,
  type AdminBhvStatusTab,
  type AdminQuanLyBaiHocVienBundle,
} from "@/lib/data/admin-quan-ly-bai-hoc-vien";
import { cn } from "@/lib/utils";

const STATUS_OPTS = ["Chờ xác nhận", "Hoàn thiện", "Không đủ chất lượng"] as const;

const PAGE_SIZE = 20;
const BHV_LAYOUT_STORAGE_KEY = "admin-quan-ly-bai-hoc-vien-layout";
type BhvLayout = "table" | "grid";

type Props = {
  bundle: AdminQuanLyBaiHocVienBundle;
  activeTab: AdminBhvStatusTab;
};

function tabHref(id: AdminBhvStatusTab): string {
  return id === "cho" ? "/admin/dashboard/quan-ly-bai-hoc-vien" : `/admin/dashboard/quan-ly-bai-hoc-vien?tab=${id}`;
}

function statusBadgeClass(s: string): string {
  if (s === "Hoàn thiện") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (s === "Không đủ chất lượng") return "bg-red-50 text-red-800 ring-red-200";
  return "bg-amber-50 text-amber-900 ring-amber-200";
}

function mergeBhvDisplayRow(
  base: AdminBaiHocVienRow,
  patch: UpdateBaiHocVienPayload | undefined,
  ctx: {
    hocVienOptions: AdminBhvHocVienOpt[];
    lopOptions: AdminBhvLopOpt[];
    exercises: AdminBhvExerciseOpt[];
  },
): AdminBaiHocVienRow {
  if (!patch || Object.keys(patch).length === 0) return base;
  const { hocVienOptions, lopOptions, exercises } = ctx;
  const m: AdminBaiHocVienRow = { ...base };
  if (patch.photo !== undefined) m.photo = patch.photo;
  if (patch.status !== undefined) m.status = patch.status;
  if (patch.score !== undefined) m.score = patch.score;
  if (patch.thuoc_bai_tap !== undefined) {
    m.thuoc_bai_tap = patch.thuoc_bai_tap;
    const ex = patch.thuoc_bai_tap != null ? exercises.find((e) => e.id === patch.thuoc_bai_tap) : undefined;
    m.bai_tap_name = ex?.ten_bai_tap ?? "—";
    m.ten_mon_hoc = ex?.ten_mon_hoc ?? "";
  }
  if (patch.bai_mau !== undefined) m.bai_mau = patch.bai_mau;
  if (patch.ghi_chu !== undefined) m.ghi_chu = patch.ghi_chu;
  if (patch.hoc_vien_id !== undefined) {
    m.hoc_vien_id = patch.hoc_vien_id;
    m.ten_hoc_vien_name =
      patch.hoc_vien_id == null
        ? "—"
        : hocVienOptions.find((h) => h.id === patch.hoc_vien_id)?.full_name ?? base.ten_hoc_vien_name;
  }
  if (patch.lop_id !== undefined) {
    m.lop_id = patch.lop_id;
    m.lop_name = patch.lop_id == null ? "—" : lopOptions.find((l) => l.id === patch.lop_id)?.label ?? base.lop_name;
  }
  return m;
}

async function uploadPhotoToCf(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/admin/api/upload-cf-image", { method: "POST", body: fd, credentials: "same-origin" });
  const j = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !j.ok || typeof j.url !== "string") {
    throw new Error(j.error || "Upload thất bại.");
  }
  return j.url;
}

/** Khi chưa gõ tìm: chỉ gợi ý vài tên; chủ yếu dùng ô search. */
const HV_COMBO_IDLE_HINT = 10;
const HV_COMBO_SEARCH_MAX = 60;

const HocVienSearchSelect = memo(function HocVienSearchSelect({
  value,
  options,
  fallbackLabel,
  disabled,
  onChange,
  className,
}: {
  value: number | null;
  options: AdminBhvHocVienOpt[];
  fallbackLabel: string;
  disabled: boolean;
  onChange: (id: number | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const qDeferred = useDeferredValue(q.trim());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (ev: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const mergedOpts = useMemo(() => {
    if (value == null) return options;
    if (options.some((o) => o.id === value)) return options;
    return [{ id: value, full_name: fallbackLabel.trim() ? fallbackLabel : `HV #${value}` }, ...options];
  }, [options, value, fallbackLabel]);

  const filteredFull = useMemo(() => {
    const s = qDeferred.toLowerCase();
    if (!s) {
      let list = mergedOpts.slice(0, HV_COMBO_IDLE_HINT);
      if (value != null) {
        const cur = mergedOpts.find((o) => o.id === value);
        if (cur && !list.some((o) => o.id === value)) {
          list = [cur, ...list.slice(0, HV_COMBO_IDLE_HINT - 1)];
        }
      }
      return list;
    }
    return mergedOpts.filter((o) => o.full_name.toLowerCase().includes(s));
  }, [mergedOpts, qDeferred, value]);

  const filtered = useMemo(() => {
    const searching = qDeferred.trim().length > 0;
    if (!searching) return filteredFull;
    if (filteredFull.length <= HV_COMBO_SEARCH_MAX) return filteredFull;
    return filteredFull.slice(0, HV_COMBO_SEARCH_MAX);
  }, [filteredFull, qDeferred]);

  const hiddenCount = filteredFull.length - filtered.length;
  const isSearching = qDeferred.trim().length > 0;

  const label =
    value == null ? "— Chưa gán HV —" : mergedOpts.find((o) => o.id === value)?.full_name ?? fallbackLabel;

  return (
    <div ref={wrapRef} className={cn("relative w-full min-w-0", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#EAEAEA] bg-white px-2 py-1.5 text-left text-[12px] outline-none focus:border-[#BC8AF9] disabled:opacity-50",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-black/40 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-lg border border-[#EAEAEA] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-2 border-b border-[#EAEAEA] px-2 py-2">
            <Search className="h-4 w-4 shrink-0 text-black/35" aria-hidden />
            <input
              autoFocus
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên học viên…"
              className="min-w-0 flex-1 border-0 bg-transparent text-[12px] text-[#1a1a2e] outline-none placeholder:text-black/35"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-[12px] text-black/60 hover:bg-black/[0.04]"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              — Chưa gán HV —
            </button>
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-[12px] hover:bg-black/[0.04]",
                  o.id === value ? "bg-[#BC8AF9]/10 font-semibold text-[#BC8AF9]" : "text-[#1a1a2e]",
                )}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                {o.full_name}
              </button>
            ))}
            {isSearching && filteredFull.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] text-black/40">Không khớp tên.</div>
            ) : null}
            {isSearching && hiddenCount > 0 ? (
              <div className="border-t border-[#f0f0f0] px-3 py-2 text-center text-[10px] text-black/45">
                +{hiddenCount} học viên khớp — thu hẹp từ khóa để xem thêm
              </div>
            ) : null}
            {!isSearching && mergedOpts.length > HV_COMBO_IDLE_HINT ? (
              <div className="border-t border-[#f0f0f0] px-3 py-2 text-center text-[10px] text-black/45">
                Gõ tên để tìm trong {mergedOpts.length.toLocaleString("vi-VN")} học viên…
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});

type BhvSelectFilterOpt = { id: number; label: string };

const BhvSelectWithFilter = memo(function BhvSelectWithFilter({
  valueId,
  onPick,
  disabled,
  emptyLabel,
  options,
  selectClassName,
}: {
  valueId: number | null;
  onPick: (id: number | null) => void;
  disabled: boolean;
  emptyLabel: string;
  options: BhvSelectFilterOpt[];
  selectClassName?: string;
}) {
  const filtered = useMemo(() => {
    let list = options;
    if (valueId != null) {
      const cur = options.find((o) => o.id === valueId);
      if (cur && !list.some((o) => o.id === valueId)) list = [cur, ...list];
    }
    return list;
  }, [options, valueId]);

  return (
    <div className="min-w-0">
      <select
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border border-[#EAEAEA] bg-white px-2 py-1.5 text-[12px] outline-none focus:border-[#BC8AF9]",
          selectClassName,
        )}
        value={valueId ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onPick(v === "" ? null : Number(v));
        }}
      >
        <option value="">{emptyLabel}</option>
        {filtered.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
});

type BhvMergeCtx = {
  hocVienOptions: AdminBhvHocVienOpt[];
  lopOptions: AdminBhvLopOpt[];
  exercises: AdminBhvExerciseOpt[];
};

type BhvPagedRowProps = {
  layout: BhvLayout;
  tableBulk: { index: number; selected: boolean; onMouseDown: (e: React.MouseEvent<HTMLInputElement>) => void } | null;
  baseRow: AdminBaiHocVienRow;
  draftPatch: UpdateBaiHocVienPayload | undefined;
  mergeCtx: BhvMergeCtx;
  exercises: AdminBhvExerciseOpt[];
  hocVienOptions: AdminBhvHocVienOpt[];
  lopOptions: AdminBhvLopOpt[];
  rowBusy: boolean;
  saveBusy: boolean;
  uploadBusy: boolean;
  dispatchDraft: (id: number, patch: UpdateBaiHocVienPayload) => void;
  dispatchRemoveField: (id: number, field: keyof UpdateBaiHocVienPayload) => void;
  onUploadRowStart: (id: number) => void;
  onUploadRowEnd: () => void;
  onDeleteRow: (id: number) => void;
};

const BhvPagedRow = memo(
  function BhvPagedRow(props: BhvPagedRowProps) {
    const merged = useMemo(
      () => mergeBhvDisplayRow(props.baseRow, props.draftPatch, props.mergeCtx),
      [props.baseRow, props.draftPatch, props.mergeCtx],
    );
    const id = props.baseRow.id;
    const onDraftPatch = useCallback((p: UpdateBaiHocVienPayload) => props.dispatchDraft(id, p), [id, props.dispatchDraft]);
    const onRemoveField = useCallback((f: keyof UpdateBaiHocVienPayload) => props.dispatchRemoveField(id, f), [
      id,
      props.dispatchRemoveField,
    ]);
    const onUploadStart = useCallback(() => props.onUploadRowStart(id), [id, props.onUploadRowStart]);
    const onDelete = useCallback(() => {
      void props.onDeleteRow(id);
    }, [id, props.onDeleteRow]);

    return (
      <RowEditor
        layout={props.layout}
        tableBulk={props.tableBulk}
        row={merged}
        baselineScore={props.baseRow.score}
        exercises={props.exercises}
        hocVienOptions={props.hocVienOptions}
        lopOptions={props.lopOptions}
        rowBusy={props.rowBusy}
        saveBusy={props.saveBusy}
        uploadBusy={props.uploadBusy}
        onDraftChange={onDraftPatch}
        onDraftRemoveField={onRemoveField}
        onUploadStart={onUploadStart}
        onUploadEnd={props.onUploadRowEnd}
        onDelete={onDelete}
      />
    );
  },
  (prev, next) =>
    prev.baseRow === next.baseRow &&
    prev.draftPatch === next.draftPatch &&
    prev.mergeCtx === next.mergeCtx &&
    prev.layout === next.layout &&
    ((prev.tableBulk == null && next.tableBulk == null) ||
      (prev.tableBulk != null &&
        next.tableBulk != null &&
        prev.tableBulk.index === next.tableBulk.index &&
        prev.tableBulk.selected === next.tableBulk.selected &&
        prev.tableBulk.onMouseDown === next.tableBulk.onMouseDown)) &&
    prev.rowBusy === next.rowBusy &&
    prev.saveBusy === next.saveBusy &&
    prev.uploadBusy === next.uploadBusy &&
    prev.exercises === next.exercises &&
    prev.hocVienOptions === next.hocVienOptions &&
    prev.lopOptions === next.lopOptions &&
    prev.dispatchDraft === next.dispatchDraft &&
    prev.dispatchRemoveField === next.dispatchRemoveField &&
    prev.onUploadRowStart === next.onUploadRowStart &&
    prev.onUploadRowEnd === next.onUploadRowEnd &&
    prev.onDeleteRow === next.onDeleteRow,
);

export default function QuanLyBaiHocVienView({ bundle, activeTab }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<BhvLayout>("table");
  const [draftByRowId, setDraftByRowId] = useState<Record<number, UpdateBaiHocVienPayload>>({});
  const [saveBusy, setSaveBusy] = useState(false);
  const [uploadRowId, setUploadRowId] = useState<number | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(() => new Set());
  const bulkAnchorIndexRef = useRef<number | null>(null);
  const bulkSelectedIdsRef = useRef(bulkSelectedIds);
  bulkSelectedIdsRef.current = bulkSelectedIds;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const mergeCtx = useMemo(
    () => ({
      hocVienOptions: bundle.hocVienOptions,
      lopOptions: bundle.lopOptions,
      exercises: bundle.exercises,
    }),
    [bundle.hocVienOptions, bundle.lopOptions, bundle.exercises],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BHV_LAYOUT_STORAGE_KEY);
      if (raw === "grid" || raw === "table") setLayout(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setLayoutPersist = useCallback((next: BhvLayout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(BHV_LAYOUT_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const totalRows = bundle.rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return bundle.rows.slice(start, start + PAGE_SIZE);
  }, [bundle.rows, page]);

  const clearBulkSelection = useCallback(() => {
    setBulkSelectedIds(new Set());
    bulkAnchorIndexRef.current = null;
  }, []);

  const onBulkCheckboxMouseDown = useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      e.preventDefault();
      const t = e.currentTarget;
      const indexInPage = Number(t.dataset.bhvPageIdx);
      const rowId = Number(t.dataset.bhvRowId);
      if (!Number.isFinite(indexInPage) || !Number.isFinite(rowId)) return;
      if (e.shiftKey && bulkAnchorIndexRef.current != null) {
        const a = bulkAnchorIndexRef.current;
        const lo = Math.min(a, indexInPage);
        const hi = Math.max(a, indexInPage);
        setBulkSelectedIds(new Set(pagedRows.slice(lo, hi + 1).map((r) => r.id)));
      } else {
        bulkAnchorIndexRef.current = indexInPage;
        setBulkSelectedIds(new Set([rowId]));
      }
    },
    [pagedRows],
  );

  useEffect(() => {
    clearBulkSelection();
  }, [page, activeTab, layout, clearBulkSelection]);

  useEffect(() => {
    if (layout !== "table") return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") clearBulkSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout, clearBulkSelection]);

  const hasDirty = useMemo(
    () => Object.values(draftByRowId).some((p) => p != null && Object.keys(p).length > 0),
    [draftByRowId],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const notify = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const onDraftChange = useCallback((id: number, fragment: UpdateBaiHocVienPayload) => {
    const sel = bulkSelectedIdsRef.current;
    const targets =
      layoutRef.current === "table" && sel.size > 1 && sel.has(id) ? Array.from(sel) : [id];
    setDraftByRowId((prev) => {
      const next = { ...prev };
      for (const tid of targets) {
        next[tid] = { ...(prev[tid] ?? {}), ...fragment };
      }
      return next;
    });
  }, []);

  const onDraftRemoveField = useCallback((id: number, field: keyof UpdateBaiHocVienPayload) => {
    const sel = bulkSelectedIdsRef.current;
    const targets =
      layoutRef.current === "table" && sel.size > 1 && sel.has(id) ? Array.from(sel) : [id];
    setDraftByRowId((prev) => {
      const next = { ...prev };
      for (const tid of targets) {
        const cur = next[tid];
        if (!cur) continue;
        const nextPatch = { ...cur };
        delete nextPatch[field];
        if (Object.keys(nextPatch).length === 0) delete next[tid];
        else next[tid] = nextPatch;
      }
      return next;
    });
  }, []);

  const discardDrafts = useCallback(() => {
    setDraftByRowId({});
  }, []);

  const confirmLeave = useCallback(() => {
    if (!hasDirty) return true;
    return globalThis.confirm("Có thay đổi chưa lưu. Bỏ qua và tiếp tục?");
  }, [hasDirty]);

  const saveAllDrafts = useCallback(async () => {
    const entries = Object.entries(draftByRowId).filter(([, p]) => p && Object.keys(p).length > 0) as [
      string,
      UpdateBaiHocVienPayload,
    ][];
    if (entries.length === 0) return;
    setSaveBusy(true);
    try {
      for (const [idStr, patch] of entries) {
        const id = Number(idStr);
        const res = await updateBaiHocVien(id, patch);
        if (!res.ok) {
          notify(`Dòng #${id}: ${res.error}`, false);
          return;
        }
      }
      discardDrafts();
      notify("Đã lưu thay đổi.", true);
      refresh();
    } finally {
      setSaveBusy(false);
    }
  }, [draftByRowId, discardDrafts, notify, refresh]);

  const onDelete = useCallback(
    async (id: number) => {
      if (!globalThis.confirm("Xóa bản ghi này? Không hoàn tác.")) return;
      setBusyId(id);
      try {
        const res = await deleteBaiHocVien(id);
        if (!res.ok) {
          notify(res.error, false);
          return;
        }
        setDraftByRowId((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setBulkSelectedIds((s) => {
          if (!s.has(id)) return s;
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        notify("Đã xóa.", true);
        refresh();
      } finally {
        setBusyId(null);
      }
    },
    [notify, refresh],
  );

  const onRowUploadStart = useCallback((id: number) => {
    setUploadRowId(id);
  }, []);
  const onRowUploadEnd = useCallback(() => {
    setUploadRowId(null);
  }, []);
  const onDeleteRow = useCallback(
    (id: number) => {
      void onDelete(id);
    },
    [onDelete],
  );

  return (
    <div className="-m-4 flex h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] min-h-0 flex-col overflow-hidden bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <Images className="text-white" size={20} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Quản lý bài học viên</div>
            <div className="text-xs text-[#AAAAAA]">
              {totalRows} dòng · {PAGE_SIZE}/trang client · hv_bai_hoc_vien (tối đa 50k/tab)
              {hasDirty ? <span className="text-amber-700"> · Chưa lưu</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasDirty ? (
            <>
              <button
                type="button"
                disabled={saveBusy}
                onClick={discardDrafts}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-[14px] py-2.5 text-[13px] font-semibold text-[#666] hover:bg-black/[0.03] disabled:opacity-50"
              >
                Hủy thay đổi
              </button>
              <button
                type="button"
                disabled={saveBusy || pending}
                onClick={() => void saveAllDrafts()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {saveBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Lưu thay đổi
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-3">
          <div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="shrink-0 space-y-2 border-b border-[#EAEAEA] bg-white px-6 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1">
                  {ADMIN_BHV_STATUS_TABS.map((t) => (
                    <Link
                      key={t.id}
                      href={tabHref(t.id)}
                      onClick={(e) => {
                        if (!hasDirty) return;
                        if (!confirmLeave()) e.preventDefault();
                        else discardDrafts();
                      }}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        activeTab === t.id
                          ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]"
                          : "border-[#EAEAEA] text-black/50 hover:border-black/15 hover:text-black/70",
                      )}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
                <div
                  className="flex shrink-0 rounded-xl border border-[#EAEAEA] bg-[#fafafa] p-0.5"
                  role="group"
                  aria-label="Kiểu hiển thị"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (layout === "table") return;
                      if (hasDirty && !confirmLeave()) return;
                      if (hasDirty) discardDrafts();
                      setLayoutPersist("table");
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                      layout === "table" ? "bg-white text-[#BC8AF9] shadow-sm" : "text-black/45 hover:text-black/65",
                    )}
                  >
                    <List className="h-3.5 w-3.5" aria-hidden />
                    Bảng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (layout === "grid") return;
                      if (hasDirty && !confirmLeave()) return;
                      if (hasDirty) discardDrafts();
                      setLayoutPersist("grid");
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                      layout === "grid" ? "bg-white text-[#BC8AF9] shadow-sm" : "text-black/45 hover:text-black/65",
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                    Lưới
                  </button>
                </div>
              </div>
            </div>

            {layout === "table" ? (
              <>
                {bulkSelectedIds.size > 0 ? (
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#EAEAEA] bg-[#BC8AF9]/10 px-4 py-2 text-[12px] text-[#323232]">
                    <span className="text-black/80">
                      Đã chọn <span className="font-semibold text-[#1a1a2e]">{bulkSelectedIds.size}</span> dòng trên
                      trang này · Shift+click ô chọn để chọn dải · chỉnh một ô để áp dụng nháp cho cả nhóm · Esc để bỏ
                      chọn
                    </span>
                    <button
                      type="button"
                      onClick={clearBulkSelection}
                      className="shrink-0 rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1 text-[11px] font-semibold text-black/70 hover:bg-black/[0.03]"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[1000px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wide text-black/45">
                      <th
                        className="w-9 px-1 py-2.5 text-center font-normal normal-case tracking-normal"
                        title="Click chọn dòng · Shift+click để chọn cả dải"
                      >
                        <span className="sr-only">Chọn nhiều dòng</span>
                        <span className="text-[10px] text-black/35" aria-hidden>
                          ☐
                        </span>
                      </th>
                      <th className="px-6 py-2.5">Ảnh</th>
                      <th className="px-3 py-2.5">Học viên</th>
                      <th className="px-3 py-2.5">Lớp</th>
                      <th className="px-3 py-2.5">Bài / môn</th>
                      <th className="px-3 py-2.5">Điểm</th>
                      <th className="px-3 py-2.5">Trạng thái</th>
                      <th className="px-3 py-2.5">Mẫu</th>
                      <th className="px-6 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-sm text-[#888]">
                          Không có bản ghi trong tab này.
                        </td>
                      </tr>
                    ) : (
                      pagedRows.map((base, idx) => (
                        <BhvPagedRow
                          key={base.id}
                          layout="table"
                          tableBulk={{
                            index: idx,
                            selected: bulkSelectedIds.has(base.id),
                            onMouseDown: onBulkCheckboxMouseDown,
                          }}
                          baseRow={base}
                          draftPatch={draftByRowId[base.id]}
                          mergeCtx={mergeCtx}
                          exercises={bundle.exercises}
                          hocVienOptions={bundle.hocVienOptions}
                          lopOptions={bundle.lopOptions}
                          rowBusy={busyId === base.id}
                          saveBusy={saveBusy}
                          uploadBusy={uploadRowId === base.id}
                          dispatchDraft={onDraftChange}
                          dispatchRemoveField={onDraftRemoveField}
                          onUploadRowStart={onRowUploadStart}
                          onUploadRowEnd={onRowUploadEnd}
                          onDeleteRow={onDeleteRow}
                        />
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
                {bundle.rows.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#888]">Không có bản ghi trong tab này.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {pagedRows.map((base) => (
                      <BhvPagedRow
                        key={base.id}
                        layout="grid"
                        tableBulk={null}
                        baseRow={base}
                        draftPatch={draftByRowId[base.id]}
                        mergeCtx={mergeCtx}
                        exercises={bundle.exercises}
                        hocVienOptions={bundle.hocVienOptions}
                        lopOptions={bundle.lopOptions}
                        rowBusy={busyId === base.id}
                        saveBusy={saveBusy}
                        uploadBusy={uploadRowId === base.id}
                        dispatchDraft={onDraftChange}
                        dispatchRemoveField={onDraftRemoveField}
                        onUploadRowStart={onRowUploadStart}
                        onUploadRowEnd={onRowUploadEnd}
                        onDeleteRow={onDeleteRow}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {totalRows > 0 ? (
              <div className="flex shrink-0 flex-col gap-3 border-t border-[#EAEAEA] bg-[#fafafa] px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-black/55">
                  Hiển thị{" "}
                  <span className="font-semibold text-[#1a1a2e]">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalRows)}
                  </span>{" "}
                  / {totalRows} · Trang{" "}
                  <span className="font-semibold text-[#1a1a2e]">
                    {page}/{totalPages}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#EAEAEA] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#323232] hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#EAEAEA] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#323232] hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

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
    </div>
  );
}

function RowEditor({
  layout,
  tableBulk,
  row,
  baselineScore,
  exercises,
  hocVienOptions,
  lopOptions,
  rowBusy,
  saveBusy,
  uploadBusy,
  onDraftChange,
  onDraftRemoveField,
  onUploadStart,
  onUploadEnd,
  onDelete,
}: {
  layout: BhvLayout;
  tableBulk: { index: number; selected: boolean; onMouseDown: (e: React.MouseEvent<HTMLInputElement>) => void } | null;
  row: AdminBaiHocVienRow;
  baselineScore: number | null;
  exercises: AdminBhvExerciseOpt[];
  hocVienOptions: AdminBhvHocVienOpt[];
  lopOptions: AdminBhvLopOpt[];
  rowBusy: boolean;
  saveBusy: boolean;
  uploadBusy: boolean;
  onDraftChange: (patch: UpdateBaiHocVienPayload) => void;
  onDraftRemoveField: (field: keyof UpdateBaiHocVienPayload) => void;
  onUploadStart: () => void;
  onUploadEnd: () => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const photoWrapRef = useRef<HTMLDivElement>(null);
  const [scoreLocal, setScoreLocal] = useState(row.score != null ? String(Math.round(row.score)) : "");

  const disabled = rowBusy || saveBusy;

  useEffect(() => {
    setScoreLocal(row.score != null ? String(Math.round(row.score)) : "");
  }, [row.id, row.score]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const s = scoreLocal.trim();
      if (s === "") {
        if (baselineScore != null) onDraftChange({ score: null });
        else onDraftRemoveField("score");
        return;
      }
      const n = Number(s.replace(",", "."));
      if (!Number.isFinite(n)) return;
      if (n === baselineScore) onDraftRemoveField("score");
      else onDraftChange({ score: n });
    }, 400);
    return () => window.clearTimeout(t);
  }, [scoreLocal, onDraftChange, onDraftRemoveField, baselineScore]);

  const lopSelectOpts = useMemo(() => {
    if (row.lop_id == null) return lopOptions;
    if (lopOptions.some((l) => l.id === row.lop_id)) return lopOptions;
    return [...lopOptions, { id: row.lop_id, label: row.lop_name.trim() ? row.lop_name : `Lớp #${row.lop_id}` }];
  }, [lopOptions, row.lop_id, row.lop_name]);

  const exerciseSelectOpts = useMemo((): BhvSelectFilterOpt[] => {
    const base = exercises.map((ex) => ({
      id: ex.id,
      label: `${ex.ten_bai_tap}${ex.ten_mon_hoc ? ` · ${ex.ten_mon_hoc}` : ""}`.trim(),
    }));
    if (row.thuoc_bai_tap == null || base.some((o) => o.id === row.thuoc_bai_tap)) return base;
    const label =
      `${row.bai_tap_name}${row.ten_mon_hoc ? ` · ${row.ten_mon_hoc}` : ""}`.trim() || `Bài #${row.thuoc_bai_tap}`;
    return [...base, { id: row.thuoc_bai_tap, label }];
  }, [exercises, row.thuoc_bai_tap, row.bai_tap_name, row.ten_mon_hoc]);

  const applyImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      window.alert("Chỉ chấp nhận file ảnh.");
      return;
    }
    onUploadStart();
    try {
      const url = await uploadPhotoToCf(file);
      onDraftChange({ photo: url });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Lỗi upload");
    } finally {
      onUploadEnd();
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    await applyImageFile(f);
  };

  const onPhotoPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items?.length) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && it.type.startsWith("image/")) {
        e.preventDefault();
        const f = it.getAsFile();
        if (f) void applyImageFile(f);
        return;
      }
    }
  };

  const pasteImageFromClipboard = async () => {
    photoWrapRef.current?.focus();
    if (typeof navigator === "undefined" || !navigator.clipboard || !("read" in navigator.clipboard)) return;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const mime = blob.type || type;
            const sub = mime.includes("png")
              ? "png"
              : mime.includes("jpeg") || mime.includes("jpg")
                ? "jpg"
                : "png";
            await applyImageFile(new File([blob], `paste.${sub}`, { type: mime || "image/png" }));
            return;
          }
        }
      }
    } catch {
      /* Không đọc được clipboard (quyền hoặc không có ảnh) — vẫn có thể Ctrl+V khi ô ảnh đang focus */
    }
  };

  const fieldLabel = (t: string) => (
    <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-black/40">{t}</div>
  );

  const photoInner = (
    <>
      {row.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.photo} alt="" className="pointer-events-none h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-black/25">
          <ImageIcon className={layout === "grid" ? "h-10 w-10" : "h-6 w-6"} aria-hidden />
          {layout === "table" ? <span className="text-[9px] leading-tight">Click · Ctrl+V</span> : null}
        </div>
      )}
    </>
  );

  if (layout === "grid") {
    return (
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-xl border border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow [content-visibility:auto] [contain-intrinsic-size:auto_420px]",
          (rowBusy || uploadBusy) && "ring-2 ring-[#BC8AF9]/40",
        )}
      >
        <div
          ref={photoWrapRef}
          tabIndex={0}
          role="button"
          aria-label="Ảnh bài — click để chọn ảnh hoặc dán từ clipboard"
          onPaste={onPhotoPaste}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          className={cn(
            "relative aspect-[4/3] w-full shrink-0 cursor-pointer bg-[#f5f5f5] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#BC8AF9]/50",
            uploadBusy && "pointer-events-none opacity-60",
          )}
        >
          {photoInner}
          {uploadBusy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden />
            </div>
          ) : null}
          {!uploadBusy ? (
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                void pasteImageFromClipboard();
              }}
              className="absolute bottom-1.5 right-1.5 rounded-md border border-black/10 bg-white/95 p-1.5 text-black/55 shadow-sm hover:bg-white hover:text-black/80 disabled:opacity-40"
              title="Dán ảnh từ clipboard (hoặc Ctrl+V khi đang focus vùng ảnh)"
            >
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Dán ảnh</span>
            </button>
          ) : null}
        </div>
        <p className="border-b border-[#f0f0f0] px-3 py-1.5 text-center text-[10px] text-black/40">
          Ảnh: click vùng ảnh hoặc Ctrl+V để dán từ clipboard
        </p>
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <div>
            {fieldLabel("Học viên")}
            <HocVienSearchSelect
              value={row.hoc_vien_id}
              options={hocVienOptions}
              fallbackLabel={row.ten_hoc_vien_name}
              disabled={disabled}
              onChange={(id) => onDraftChange({ hoc_vien_id: id })}
            />
          </div>
          <div>
            {fieldLabel("Lớp")}
            <BhvSelectWithFilter
              valueId={row.lop_id}
              onPick={(id) => onDraftChange({ lop_id: id })}
              disabled={disabled}
              emptyLabel="— Chưa gán lớp —"
              options={lopSelectOpts}
            />
          </div>
          <div>
            {fieldLabel("Bài / môn")}
            <BhvSelectWithFilter
              valueId={row.thuoc_bai_tap}
              onPick={(id) => onDraftChange({ thuoc_bai_tap: id })}
              disabled={disabled}
              emptyLabel="— Chọn bài —"
              options={exerciseSelectOpts}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              {fieldLabel("Điểm")}
              <input
                disabled={disabled}
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border border-[#EAEAEA] px-2 py-1.5 text-right text-[13px] outline-none focus:border-[#BC8AF9]"
                value={scoreLocal}
                onChange={(e) => setScoreLocal(e.target.value.replace(/[^\d.,-]/g, ""))}
                onBlur={() => {
                  const t = scoreLocal.trim();
                  if (t === "") return;
                  const n = Number(t.replace(",", "."));
                  if (!Number.isFinite(n)) setScoreLocal(row.score != null ? String(Math.round(row.score)) : "");
                }}
              />
            </div>
            <div className="min-w-0 flex-[1.4]">
              {fieldLabel("Trạng thái")}
              <select
                disabled={disabled}
                className={cn(
                  "w-full rounded-lg px-2 py-1.5 text-[11px] font-semibold ring-1 ring-inset outline-none",
                  statusBadgeClass(row.status),
                )}
                value={row.status}
                onChange={(e) => {
                  const v = e.target.value;
                  if (STATUS_OPTS.includes(v as (typeof STATUS_OPTS)[number])) onDraftChange({ status: v });
                }}
              >
                {STATUS_OPTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[#f0f0f0] pt-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-black/70">
              <input
                type="checkbox"
                disabled={disabled}
                checked={row.bai_mau}
                onChange={(e) => onDraftChange({ bai_mau: e.target.checked })}
                className="h-4 w-4 rounded border-[#ccc] accent-[#BC8AF9]"
              />
              Mẫu
            </label>
            <div className="flex gap-1">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <button
                type="button"
                disabled={disabled}
                onClick={() => void onDelete()}
                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
                title="Xóa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr
      className={cn(
        "border-b border-[#f0f0f0] last:border-0 hover:bg-black/[0.015] [content-visibility:auto] [contain-intrinsic-size:auto_88px]",
        tableBulk?.selected && "bg-[#BC8AF9]/08",
      )}
    >
      {tableBulk ? (
        <td className="w-9 px-1 align-middle text-center">
          <input
            type="checkbox"
            checked={tableBulk.selected}
            onChange={() => {}}
            data-bhv-page-idx={tableBulk.index}
            data-bhv-row-id={row.id}
            onMouseDown={tableBulk.onMouseDown}
            className="h-3.5 w-3.5 cursor-pointer rounded border-[#ccc] accent-[#BC8AF9]"
            aria-label="Chọn dòng (Shift+click để chọn dải)"
          />
        </td>
      ) : null}
      <td className="px-6 py-2 align-middle">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <div className="flex items-center gap-1">
          <div
            ref={photoWrapRef}
            tabIndex={0}
            role="button"
            aria-label="Ảnh — click hoặc Ctrl+V để dán ảnh"
            onPaste={onPhotoPaste}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
            className={cn(
              "relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[#EAEAEA] bg-[#f5f5f5] outline-none focus-visible:ring-2 focus-visible:ring-[#BC8AF9]/50",
              uploadBusy && "pointer-events-none opacity-60",
            )}
          >
            {photoInner}
            {uploadBusy ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={disabled || uploadBusy}
            onClick={(e) => {
              e.stopPropagation();
              void pasteImageFromClipboard();
            }}
            className="shrink-0 rounded-lg border border-[#EAEAEA] p-1.5 text-black/55 hover:bg-black/[0.04] disabled:opacity-40"
            title="Dán ảnh từ clipboard (cần quyền trình duyệt). Hoặc focus ô ảnh rồi Ctrl+V."
          >
            <ClipboardPaste className="h-4 w-4" aria-hidden />
            <span className="sr-only">Dán ảnh</span>
          </button>
        </div>
      </td>
      <td className="min-w-[200px] max-w-[280px] px-3 py-2 align-middle">
        <HocVienSearchSelect
          value={row.hoc_vien_id}
          options={hocVienOptions}
          fallbackLabel={row.ten_hoc_vien_name}
          disabled={disabled}
          onChange={(id) => onDraftChange({ hoc_vien_id: id })}
        />
      </td>
      <td className="max-w-[160px] px-3 py-2 align-middle">
        <BhvSelectWithFilter
          valueId={row.lop_id}
          onPick={(id) => onDraftChange({ lop_id: id })}
          disabled={disabled}
          emptyLabel="— Chưa gán lớp —"
          options={lopSelectOpts}
          selectClassName="max-w-[160px]"
        />
      </td>
      <td className="min-w-[200px] px-3 py-2 align-middle">
        <BhvSelectWithFilter
          valueId={row.thuoc_bai_tap}
          onPick={(id) => onDraftChange({ thuoc_bai_tap: id })}
          disabled={disabled}
          emptyLabel="— Chọn bài —"
          options={exerciseSelectOpts}
          selectClassName="max-w-[260px]"
        />
      </td>
      <td className="px-3 py-2 align-middle">
        <input
          disabled={disabled}
          type="text"
          inputMode="decimal"
          className="w-20 rounded-lg border border-[#EAEAEA] px-2 py-1.5 text-right text-[13px] outline-none focus:border-[#BC8AF9]"
          value={scoreLocal}
          onChange={(e) => setScoreLocal(e.target.value.replace(/[^\d.,-]/g, ""))}
          onBlur={() => {
            const t = scoreLocal.trim();
            if (t === "") return;
            const n = Number(t.replace(",", "."));
            if (!Number.isFinite(n)) setScoreLocal(row.score != null ? String(Math.round(row.score)) : "");
          }}
        />
      </td>
      <td className="px-3 py-2 align-middle">
        <select
          disabled={disabled}
          className={cn(
            "max-w-[200px] rounded-lg px-2 py-1.5 text-[12px] font-semibold ring-1 ring-inset outline-none",
            statusBadgeClass(row.status),
          )}
          value={row.status}
          onChange={(e) => {
            const v = e.target.value;
            if (STATUS_OPTS.includes(v as (typeof STATUS_OPTS)[number])) onDraftChange({ status: v });
          }}
        >
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 align-middle">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-black/70">
          <input
            type="checkbox"
            disabled={disabled}
            checked={row.bai_mau}
            onChange={(e) => onDraftChange({ bai_mau: e.target.checked })}
            className="h-4 w-4 rounded border-[#ccc] accent-[#BC8AF9]"
          />
          Mẫu
        </label>
      </td>
      <td className="px-6 py-2 align-middle text-right">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onDelete()}
            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
            title="Xóa"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
