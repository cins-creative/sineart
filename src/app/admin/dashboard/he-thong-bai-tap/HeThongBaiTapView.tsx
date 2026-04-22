"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import { createHeThongBaiTap, deleteHeThongBaiTap, updateHeThongBaiTap } from "@/app/admin/dashboard/he-thong-bai-tap/actions";
import BaiTapListEditable from "@/app/admin/dashboard/he-thong-bai-tap/BaiTapListEditable";
import type { AdminBaiTapRow, AdminHeThongBaiTapBundle, AdminMonHocOpt } from "@/lib/data/admin-he-thong-bai-tap";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

const DS = { teacher: "#BC8AF9", border: "#EAEAEA" };

function linesToUrlArray(text: string): string[] | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines : null;
}

function urlArrayToLines(arr: string[] | null | undefined): string {
  return (arr ?? []).join("\n");
}

function firstNonEmptyLine(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const line = raw.split(/\r?\n/).find((s) => s.trim().length > 0);
  return line != null ? line.trim() : null;
}

function primaryBaiTapUrl(item: AdminBaiTapRow): string | null {
  const vbg = firstNonEmptyLine(item.video_bai_giang);
  if (vbg) return vbg;
  const ly = item.video_ly_thuyet?.find((u) => u.trim());
  if (ly) return ly.trim();
  const tk = item.video_tham_khao?.find((u) => u.trim());
  return tk?.trim() ?? null;
}

type Props = { bundle: AdminHeThongBaiTapBundle };

export default function HeThongBaiTapView({ bundle }: Props) {
  const { canDelete } = useAdminDashboardAbilities();
  const router = useRouter();
  const [filterMon, setFilterMon] = useState<number | "">("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [panel, setPanel] = useState<"none" | "create" | "edit">("none");
  const [editing, setEditing] = useState<AdminBaiTapRow | null>(null);
  const [drawerKey, setDrawerKey] = useState(0);
  const [delTarget, setDelTarget] = useState<AdminBaiTapRow | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 2800);
  };

  /** Môn có ít nhất một bài — chỉ dùng làm filter, không hiển thị số lượng. */
  const monFilterOptions = useMemo(() => {
    return bundle.monHoc.filter((m) => bundle.baiTap.some((b) => b.mon_hoc === m.id));
  }, [bundle.baiTap, bundle.monHoc]);

  const filtered = useMemo(() => {
    return bundle.baiTap.filter((it) => {
      if (filterMon !== "" && it.mon_hoc !== filterMon) return false;
      return true;
    });
  }, [bundle.baiTap, filterMon]);

  async function confirmDelete() {
    if (!delTarget) return;
    setDelBusy(true);
    try {
      const r = await deleteHeThongBaiTap(delTarget.id);
      if (r.ok) {
        notify(r.message ?? "Đã xóa", true);
        setDelTarget(null);
        router.refresh();
      } else {
        notify(r.error, false);
      }
    } finally {
      setDelBusy(false);
    }
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #BC8AF9, #ED5C9D)" }}
          >
            <BookOpen size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: DS.teacher }}>
              Quản lý
            </p>
            <h1 className="m-0 text-[17px] font-bold tracking-tight">Hệ thống bài tập</h1>
            <p className="m-0 mt-0.5 text-xs text-[#AAAAAA]">{bundle.baiTap.length} bài · hv_he_thong_bai_tap</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Chế độ hiển thị"
            className="flex h-10 items-center overflow-hidden rounded-xl border border-[#EAEAEA] bg-white p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              title="Dạng lưới"
              className={cn(
                "flex h-full w-9 items-center justify-center rounded-lg text-[#888] transition",
                viewMode === "grid"
                  ? "bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] text-white shadow-sm"
                  : "hover:bg-[#fafafa]",
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "list"}
              onClick={() => setViewMode("list")}
              title="Dạng danh sách (sửa inline, shift-select)"
              className={cn(
                "flex h-full w-9 items-center justify-center rounded-lg text-[#888] transition",
                viewMode === "list"
                  ? "bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] text-white shadow-sm"
                  : "hover:bg-[#fafafa]",
              )}
            >
              <ListIcon size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EAEAEA] bg-white text-[#888] hover:bg-[#fafafa]"
            aria-label="Tải lại"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDrawerKey((k) => k + 1);
              setPanel("create");
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus size={16} strokeWidth={2.5} />
            Bài tập mới
          </button>
        </div>
      </div>

      {monFilterOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b border-[#EAEAEA] bg-white px-6 py-3">
          <button
            type="button"
            onClick={() => setFilterMon("")}
            className={cn(
              "rounded-full border-[1.5px] px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wide transition",
              filterMon === "" ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#1a1a2e]" : "border-[#EAEAEA] bg-[#F5F7F7] text-[#666]"
            )}
          >
            Tất cả
          </button>
          {monFilterOptions.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setFilterMon(m.id)}
              title={m.ten_mon_hoc}
              className={cn(
                "max-w-[200px] rounded-full border-[1.5px] px-3.5 py-2 text-left text-[11px] font-bold transition",
                filterMon === m.id ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#1a1a2e]" : "border-[#EAEAEA] bg-[#F5F7F7] text-[#555]"
              )}
            >
              <span className="block truncate">{m.ten_mon_hoc}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
        {filtered.length === 0 ? (
          <p className="m-0 pt-8 text-center text-sm text-[#888]">Không có bài tập khớp bộ lọc.</p>
        ) : viewMode === "list" ? (
          <BaiTapListEditable
            rows={filtered}
            monList={bundle.monHoc}
            canDelete={canDelete}
            onEditFull={(row) => {
              setEditing(row);
              setDrawerKey((k) => k + 1);
              setPanel("edit");
            }}
            onDeleteOne={(row) => setDelTarget(row)}
            onToast={notify}
            onDataChanged={() => router.refresh()}
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12, delay: Math.min(i * 0.02, 0.25) }}
                className="flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white shadow-sm"
              >
                <div className="relative aspect-[16/9] bg-[#F5F7F7]">
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">📚</div>
                  )}
                  {item.bai_so != null ? (
                    <div className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#BC8AF9] shadow-sm">
                      Bài {item.bai_so}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-sm",
                      item.is_visible ? "bg-emerald-500/95 text-white" : "bg-zinc-600/90 text-white"
                    )}
                  >
                    {item.is_visible ? "Hiện" : "Ẩn"}
                  </div>
                </div>
                <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
                  <p className="m-0 line-clamp-2 text-sm font-bold text-[#1a1a2e]">{item.ten_bai_tap}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] text-[#AAAAAA]">{item.ten_mon_hoc ?? "—"}</p>
                  {primaryBaiTapUrl(item) ? (
                    <a
                      href={primaryBaiTapUrl(item)!}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 truncate text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      {item.video_bai_giang?.trim() ? "Video bài giảng →" : "Mở liên kết →"}
                    </a>
                  ) : null}
                </div>
                <div className="flex border-t border-[#F5F7F7]">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(item);
                      setDrawerKey((k) => k + 1);
                      setPanel("edit");
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[#888] hover:bg-[#BC8AF9]/10 hover:text-[#BC8AF9]",
                      canDelete ? "flex-1 border-r border-[#F5F7F7]" : "flex-1",
                    )}
                  >
                    <Pencil size={14} /> Sửa
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setDelTarget(item)}
                      className="px-3.5 py-2.5 text-[#AAAAAA] hover:text-red-500"
                      aria-label="Xóa"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {panel !== "none" ? (
          <Fragment key={drawerKey}>
            <BaiTapDrawer
              mode={panel === "create" ? "create" : "edit"}
              row={panel === "create" ? null : editing}
            monList={bundle.monHoc}
            onClose={() => {
              setPanel("none");
              setEditing(null);
            }}
            onSaved={(msg) => {
              notify(msg, true);
              setPanel("none");
              setEditing(null);
              router.refresh();
            }}
            onError={(err) => notify(err, false)}
            />
          </Fragment>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {delTarget && canDelete ? (
          <>
            <motion.button
              type="button"
              aria-label="Đóng"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/40"
              onClick={() => !delBusy && setDelTarget(null)}
            />
            <motion.div
              role="alertdialog"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-xl"
            >
              <p className="m-0 text-sm font-bold text-[#1a1a2e]">Xóa bài tập?</p>
              <p className="mt-2 text-sm leading-relaxed text-[#666]">«{delTarget.ten_bai_tap}» — không hoàn tác nếu không còn ràng buộc dữ liệu.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={delBusy}
                  onClick={() => setDelTarget(null)}
                  className="rounded-lg border border-[#EAEAEA] px-3 py-2 text-xs font-semibold text-[#666]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={delBusy}
                  onClick={() => void confirmDelete()}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {delBusy ? "…" : "Xóa"}
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn(
              "fixed bottom-6 right-6 z-[100] max-w-[min(90vw,360px)] rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg",
              toast.ok ? "bg-gradient-to-r from-[#4dffb0] to-[#00c08b]" : "bg-gradient-to-r from-[#ff6b6b] to-[#EE5CA2]"
            )}
          >
            {toast.ok ? "✓ " : "✕ "}
            {toast.msg}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BaiTapDrawer({
  mode,
  row,
  monList,
  onClose,
  onSaved,
  onError,
}: {
  mode: "create" | "edit";
  row: AdminBaiTapRow | null;
  monList: AdminMonHocOpt[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [ten, setTen] = useState(() => (mode === "create" ? "" : row?.ten_bai_tap ?? ""));
  const [baiSo, setBaiSo] = useState(() =>
    mode === "create" || row?.bai_so == null ? "" : String(row.bai_so)
  );
  const [monId, setMonId] = useState(() =>
    mode === "create" || row?.mon_hoc == null ? "" : String(row.mon_hoc)
  );
  const [thumb, setThumb] = useState(() => (mode === "create" ? "" : row?.thumbnail ?? ""));
  const [videoBaiGiang, setVideoBaiGiang] = useState(() =>
    mode === "create" ? "" : row?.video_bai_giang ?? ""
  );
  const [noiDungLietKe, setNoiDungLietKe] = useState(() =>
    mode === "create" ? "" : row?.noi_dung_liet_ke ?? ""
  );
  const [moTa, setMoTa] = useState(() => (mode === "create" ? "" : row?.mo_ta_bai_tap ?? ""));
  const [loiSai, setLoiSai] = useState(() => (mode === "create" ? "" : row?.loi_sai ?? ""));
  const [videoLyLines, setVideoLyLines] = useState(() =>
    mode === "create" ? "" : urlArrayToLines(row?.video_ly_thuyet)
  );
  const [videoThamLines, setVideoThamLines] = useState(() =>
    mode === "create" ? "" : urlArrayToLines(row?.video_tham_khao)
  );
  const [isVisible, setIsVisible] = useState(() => (mode === "create" ? true : Boolean(row?.is_visible)));
  const [soBuoi, setSoBuoi] = useState(() =>
    mode === "create" ? "1" : row?.so_buoi != null ? String(row.so_buoi) : ""
  );
  const [mucDo, setMucDo] = useState(() => {
    if (mode === "create") return "Bắt buộc";
    const m = row?.muc_do_quan_trong?.trim();
    if (m === "Tập luyện" || m === "Tuỳ chọn" || m === "Tùy chọn") return m === "Tùy chọn" ? "Tuỳ chọn" : m;
    return m || "Bắt buộc";
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!ten.trim()) {
      onError("Nhập tên bài tập.");
      return;
    }
    const bai_so = baiSo.trim() === "" ? null : Number(baiSo);
    if (baiSo.trim() !== "" && (bai_so === null || !Number.isFinite(bai_so) || bai_so < 1)) {
      onError("Bài số không hợp lệ.");
      return;
    }
    const mon_hoc = monId === "" ? null : Number(monId);
    if (monId !== "") {
      const m = mon_hoc;
      if (m == null || !Number.isFinite(m) || m <= 0) {
        onError("Chọn môn học hợp lệ.");
        return;
      }
    }
    const so_buoi = soBuoi.trim() === "" ? null : Number(soBuoi);
    if (soBuoi.trim() !== "") {
      const s = so_buoi;
      if (s == null || !Number.isFinite(s) || s < 0) {
        onError("Số buổi không hợp lệ.");
        return;
      }
    }
    setBusy(true);
    const payload = {
      ten_bai_tap: ten,
      bai_so,
      mon_hoc,
      thumbnail: thumb.trim() || null,
      noi_dung_liet_ke: noiDungLietKe.trim() || null,
      mo_ta_bai_tap: moTa.trim() || null,
      video_bai_giang: videoBaiGiang.trim() || null,
      loi_sai: loiSai.trim() || null,
      video_ly_thuyet: linesToUrlArray(videoLyLines),
      video_tham_khao: linesToUrlArray(videoThamLines),
      is_visible: isVisible,
      so_buoi,
      muc_do_quan_trong: mucDo.trim() || null,
    };
    let r: Awaited<ReturnType<typeof createHeThongBaiTap>>;
    if (mode === "create") {
      r = await createHeThongBaiTap(payload);
    } else if (row) {
      r = await updateHeThongBaiTap(row.id, payload);
    } else {
      r = { ok: false as const, error: "Thiếu bản ghi." };
    }
    setBusy(false);
    if (r.ok) onSaved(r.message ?? "Đã lưu.");
    else onError(r.error);
  }

  const title = mode === "create" ? "Tạo bài tập mới" : row?.ten_bai_tap || "Sửa bài tập";
  const sub = mode === "create" ? "TẠO MỚI" : "CHỈNH SỬA";

  return (
    <>
      <motion.button
        type="button"
        aria-label="Đóng"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="fixed bottom-0 right-0 top-0 z-[70] flex w-full max-w-[min(100vw,480px)] flex-col border-l border-[#EAEAEA] bg-white shadow-[-8px_0_32px_rgba(0,0,0,.08)]"
      >
            <div className="flex shrink-0 items-center justify-between border-b px-[18px] py-4" style={{ borderColor: DS.border }}>
              <div>
                <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: DS.teacher }}>
                  {sub}
                </p>
                <h2 className="m-0 mt-0.5 max-w-[280px] truncate text-[15px] font-extrabold text-[#1a1a2e]">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-[#888] hover:bg-[#fafafa]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-4">
              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Tên bài tập *</div>
                  <input
                    value={ten}
                    onChange={(e) => setTen(e.target.value)}
                    className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
                    placeholder="VD: Vẽ khối hộp ánh sáng"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Bài số</div>
                  <input
                    type="number"
                    min={1}
                    value={baiSo}
                    onChange={(e) => setBaiSo(e.target.value)}
                    className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                    placeholder="1"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Môn học</div>
                  <select
                    value={monId}
                    onChange={(e) => setMonId(e.target.value)}
                    className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                  >
                    <option value="">— Chọn môn học —</option>
                    {monList.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.ten_mon_hoc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
                    Video bài giảng (URL)
                  </div>
                  <p className="mb-1.5 text-[11px] leading-snug text-[#AAAAAA]">
                    Mỗi dòng một URL — dòng đầu có YouTube hợp lệ được dùng làm video chính trên trang bài.
                  </p>
                  <textarea
                    value={videoBaiGiang}
                    onChange={(e) => setVideoBaiGiang(e.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 font-mono text-[12px] outline-none focus:border-[#BC8AF9]"
                    placeholder={"https://…\nhttps://…"}
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Nội dung liệt kê</div>
                  <textarea
                    value={noiDungLietKe}
                    onChange={(e) => setNoiDungLietKe(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                    placeholder="Gạch đầu dòng / mô tả ngắn…"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Mô tả bài tập</div>
                  <textarea
                    value={moTa}
                    onChange={(e) => setMoTa(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                    placeholder="Hướng dẫn chi tiết…"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Lỗi sai thường gặp</div>
                  <textarea
                    value={loiSai}
                    onChange={(e) => setLoiSai(e.target.value)}
                    rows={2}
                    className="w-full resize-y rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                    placeholder="Gợi ý sửa lỗi…"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
                    Video lý thuyết (mỗi dòng một URL)
                  </div>
                  <textarea
                    value={videoLyLines}
                    onChange={(e) => setVideoLyLines(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 font-mono text-[12px] outline-none focus:border-[#BC8AF9]"
                    placeholder={"https://…\nhttps://…"}
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">
                    Video tham khảo (mỗi dòng một URL)
                  </div>
                  <textarea
                    value={videoThamLines}
                    onChange={(e) => setVideoThamLines(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 font-mono text-[12px] outline-none focus:border-[#BC8AF9]"
                    placeholder={"https://…\nhttps://…"}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[#444]">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => setIsVisible(e.target.checked)}
                      className="h-4 w-4 rounded border-[#EAEAEA] text-[#BC8AF9] focus:ring-[#BC8AF9]"
                    />
                    Hiển thị công khai (is_visible)
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Số buổi</div>
                    <input
                      type="number"
                      min={0}
                      value={soBuoi}
                      onChange={(e) => setSoBuoi(e.target.value)}
                      className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">Mức độ</div>
                    <select
                      value={mucDo}
                      onChange={(e) => setMucDo(e.target.value)}
                      className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                    >
                      <option value="Bắt buộc">Bắt buộc</option>
                      <option value="Tập luyện">Tập luyện</option>
                      <option value="Tuỳ chọn">Tuỳ chọn</option>
                    </select>
                  </div>
                </div>
                <AdminCfImageInput label="Thumbnail" value={thumb} onValueChange={setThumb} />
              </div>
            </div>
            <div className="flex shrink-0 gap-2 border-t border-[#EAEAEA] px-[18px] py-4">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : null}
                {mode === "create" ? "Tạo bài" : "Lưu thay đổi"}
              </button>
              <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-medium text-[#888]">
                Hủy
              </button>
            </div>
          </motion.div>
    </>
  );
}
