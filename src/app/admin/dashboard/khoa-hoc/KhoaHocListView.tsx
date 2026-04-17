"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";

import type { KhoaHocFormState } from "@/app/admin/dashboard/khoa-hoc/actions";
import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import { createKhoaHoc, deleteKhoaHoc, updateKhoaHoc } from "@/app/admin/dashboard/khoa-hoc/actions";
import { cn } from "@/lib/utils";

/** Dòng `ql_mon_hoc` cho danh sách + panel sửa (đủ field gửi `updateKhoaHoc`). */
export type AdminMonRow = {
  id: number;
  ten_mon_hoc: string;
  thumbnail: string | null;
  loai_khoa_hoc: string | null;
  thu_tu_hien_thi: number;
  is_featured: boolean;
  hinh_thuc: string | null;
  si_so: number | null;
  /** Số lớp `ql_lop_hoc` gắn `mon_hoc` = id môn */
  so_lop_hoc: number;
  /** Số học viên distinct (ghi danh hoạt động trên các lớp của môn) */
  so_hoc_vien: number;
};

const LOAI_KHOA = ["Luyện thi", "Digital", "Kids", "Bổ trợ"] as const;

const LOAI_COLOR: Record<string, { bg: string; text: string }> = {
  "Luyện thi": { bg: "#fef3c7", text: "#d97706" },
  Digital: { bg: "#ede9fe", text: "#7c3aed" },
  Kids: { bg: "#fce7f3", text: "#db2777" },
  "Bổ trợ": { bg: "#dcfce7", text: "#16a34a" },
};

const DS = {
  teacher: "#BC8AF9",
  border: "#EAEAEA",
};

type Props = {
  rows: AdminMonRow[];
  /** Khi phân trang — thống kê trên toàn bộ kết quả sau lọc. */
  listStats?: { total: number; featured: number };
  dbEmpty?: boolean;
  searchHadNoMatch?: boolean;
};

function loaiBadgeColors(loai: string | null): { bg: string; text: string } | null {
  if (!loai) return null;
  return LOAI_COLOR[loai] ?? { bg: "#f3f4f6", text: "#6b7280" };
}

function MonLoaiSelect({ name, defaultValue }: { name: string; defaultValue: string | null }) {
  const custom =
    defaultValue && !LOAI_KHOA.includes(defaultValue as (typeof LOAI_KHOA)[number])
      ? defaultValue
      : "";
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
    >
      <option value="">— Chọn loại —</option>
      {LOAI_KHOA.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      {custom ? <option value={custom}>{custom} (tùy chỉnh)</option> : null}
    </select>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#AAAAAA]">{children}</div>
  );
}

function MonHocCard({
  item,
  onEdit,
  onAskDelete,
  canDelete,
}: {
  item: AdminMonRow;
  onEdit: () => void;
  onAskDelete: () => void;
  canDelete: boolean;
}) {
  const loaiCfg = loaiBadgeColors(item.loai_khoa_hoc);
  const [imgErr, setImgErr] = useState(false);

  return (
    <motion.div
      layout
      whileHover={{ y: -2, borderColor: DS.teacher }}
      transition={{ duration: 0.15 }}
      className="flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white shadow-sm"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
    >
      <div className="relative aspect-[16/7] w-full bg-[#F5F7F7]">
        {item.thumbnail && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL ngoài (Cloudflare…) không cố định trong next.config
          <img
            src={item.thumbnail}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">📚</div>
        )}
        {item.is_featured ? (
          <div className="absolute left-2 top-2 flex items-center gap-0.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#ee5b9f] shadow-sm">
            <Sparkles size={11} className="shrink-0" />
            Nổi bật
          </div>
        ) : null}
        {loaiCfg && item.loai_khoa_hoc ? (
          <div
            className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: loaiCfg.bg, color: loaiCfg.text }}
          >
            {item.loai_khoa_hoc}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
        <p className="m-0 line-clamp-2 text-sm font-bold text-[#1a1a2e]">
          {item.ten_mon_hoc || <span className="font-normal italic text-[#AAAAAA]">Chưa đặt tên</span>}
        </p>
        <p className="mt-1 text-[11px] tabular-nums text-[#AAAAAA]">
          {item.so_lop_hoc} lớp · {item.so_hoc_vien} học viên
        </p>
      </div>
      <div className="flex border-t border-[#F5F7F7]">
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[#888] transition hover:bg-[#BC8AF9]/10 hover:text-[#BC8AF9]",
            canDelete ? "flex-1 border-r border-[#F5F7F7]" : "flex-1",
          )}
        >
          <Pencil size={14} strokeWidth={2} />
          Sửa
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={onAskDelete}
            className="px-3.5 py-2.5 text-[#AAAAAA] transition hover:text-red-500"
            aria-label="Xóa"
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

function MonSidePanel({
  open,
  mode,
  row,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  row: AdminMonRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [createState, createAction, createPending] = useActionState(createKhoaHoc, null as KhoaHocFormState | null);
  const [updateState, updateAction, updatePending] = useActionState(updateKhoaHoc, null as KhoaHocFormState | null);

  const pending = mode === "create" ? createPending : updatePending;
  const state = mode === "create" ? createState : updateState;

  useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const title = mode === "create" ? "Tạo môn học mới" : row?.ten_mon_hoc || "Sửa môn học";
  const sub = mode === "create" ? "TẠO MỚI" : "CHỈNH SỬA";

  return (
    <AnimatePresence>
      {open ? (
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
            className="fixed bottom-0 right-0 top-0 z-[70] flex w-full max-w-[min(100vw,440px)] flex-col border-l border-[#EAEAEA] bg-white shadow-[-8px_0_32px_rgba(0,0,0,.08)]"
          >
            <div
              className="flex shrink-0 items-center justify-between border-b px-[18px] py-4"
              style={{ borderColor: DS.border }}
            >
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
              {mode === "create" ? (
                <form key="create" action={createAction} className="flex flex-col gap-3.5">
                  <div>
                    <FieldLabel>Tên môn học *</FieldLabel>
                    <input
                      name="ten_mon_hoc"
                      required
                      maxLength={500}
                      placeholder="Vd: Hình họa cơ bản"
                      className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
                    />
                  </div>
                  <div>
                    <FieldLabel>Loại khoá</FieldLabel>
                    <MonLoaiSelect name="loai_khoa_hoc" defaultValue={null} />
                  </div>
                  <AdminCfImageInput label="Ảnh khóa học" name="thumbnail" defaultValue="" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Thứ tự hiển thị</FieldLabel>
                      <input
                        name="thu_tu_hien_thi"
                        type="number"
                        min={0}
                        max={9999}
                        defaultValue={99}
                        className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#555]">
                        <input type="checkbox" name="is_featured" value="true" className="rounded border-[#ccc]" />
                        Nổi bật trang chủ
                      </label>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Hình thức</FieldLabel>
                    <input
                      name="hinh_thuc"
                      maxLength={200}
                      placeholder="Online, Tại lớp…"
                      className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                    />
                  </div>
                  <div>
                    <FieldLabel>Sĩ số (tuỳ chọn)</FieldLabel>
                    <input
                      name="si_so"
                      type="text"
                      inputMode="decimal"
                      placeholder="VD: 24"
                      className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                    />
                  </div>
                  {state?.ok === false ? (
                    <div className="rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                      {state.error}
                    </div>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <motion.button
                      type="submit"
                      disabled={pending}
                      whileHover={{ scale: pending ? 1 : 1.02 }}
                      whileTap={{ scale: pending ? 1 : 0.98 }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] py-2.5 text-[13px] font-bold text-white disabled:cursor-wait disabled:opacity-60"
                    >
                      {pending ? "Đang lưu…" : "+ Tạo môn học"}
                    </motion.button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-medium text-[#888]"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              ) : row ? (
                <form key={`edit-${row.id}`} action={updateAction} className="flex flex-col gap-3.5">
                  <input type="hidden" name="id" value={row.id} />
                  <div>
                    <FieldLabel>Tên môn học *</FieldLabel>
                    <input
                      name="ten_mon_hoc"
                      required
                      maxLength={500}
                      defaultValue={row.ten_mon_hoc}
                      className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
                    />
                  </div>
                  <div>
                    <FieldLabel>Loại khoá</FieldLabel>
                    <MonLoaiSelect name="loai_khoa_hoc" defaultValue={row.loai_khoa_hoc} />
                  </div>
                  <AdminCfImageInput
                    label="Ảnh khóa học"
                    name="thumbnail"
                    defaultValue={row.thumbnail}
                    syncKey={row.id}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Thứ tự hiển thị</FieldLabel>
                      <input
                        name="thu_tu_hien_thi"
                        type="number"
                        min={0}
                        max={9999}
                        defaultValue={row.thu_tu_hien_thi}
                        className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#555]">
                        <input
                          type="checkbox"
                          name="is_featured"
                          value="true"
                          defaultChecked={row.is_featured}
                          className="rounded border-[#ccc]"
                        />
                        Nổi bật trang chủ
                      </label>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Hình thức</FieldLabel>
                    <input
                      name="hinh_thuc"
                      maxLength={200}
                      defaultValue={row.hinh_thuc ?? ""}
                      className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                    />
                  </div>
                  <div>
                    <FieldLabel>Sĩ số (tuỳ chọn)</FieldLabel>
                    <input
                      name="si_so"
                      type="text"
                      inputMode="decimal"
                      defaultValue={row.si_so != null ? String(row.si_so) : ""}
                      placeholder="VD: 24"
                      className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
                    />
                  </div>
                  {state?.ok === false ? (
                    <div className="rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                      {state.error}
                    </div>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <motion.button
                      type="submit"
                      disabled={pending}
                      whileHover={{ scale: pending ? 1 : 1.02 }}
                      whileTap={{ scale: pending ? 1 : 0.98 }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] py-2.5 text-[13px] font-bold text-white disabled:cursor-wait disabled:opacity-60"
                    >
                      {pending ? "Đang lưu…" : "✓ Lưu thay đổi"}
                    </motion.button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-medium text-[#888]"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export default function KhoaHocListView({
  rows,
  listStats,
  dbEmpty = false,
  searchHadNoMatch = false,
}: Props) {
  const { canDelete } = useAdminDashboardAbilities();
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "create" | "edit">("none");
  const [editing, setEditing] = useState<AdminMonRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMonRow | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const featuredFromRows = useMemo(() => rows.filter((r) => r.is_featured).length, [rows]);
  const featuredCount = listStats?.featured ?? featuredFromRows;
  const totalLabel = listStats?.total ?? rows.length;

  function notify(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await deleteKhoaHoc(deleteTarget.id);
      if (res.ok) {
        notify(res.message ?? "Đã xóa", true);
        setDeleteTarget(null);
        router.refresh();
      } else {
        notify(res.error, false);
      }
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <BookOpen className="text-white" size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Quản lý khóa học</div>
            <div className="text-xs text-[#AAAAAA]">
              {totalLabel} khóa học · {featuredCount} nổi bật
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setPanel("create");
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus size={15} /> Môn học mới
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 pt-16 text-center">
              <span className="text-4xl">{searchHadNoMatch ? "🔍" : "📭"}</span>
              <p className="m-0 text-sm text-[#888]">
                {searchHadNoMatch
                  ? "Không có môn học khớp tìm kiếm. Thử từ khóa khác."
                  : dbEmpty
                    ? "Chưa có môn học nào. Nhấn «Môn học mới»."
                    : "Không có môn trên trang này."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5 pb-4 pt-2">
              {rows.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.13, delay: Math.min(i * 0.025, 0.3) }}
                >
                  <MonHocCard
                    item={item}
                    canDelete={canDelete}
                    onEdit={() => {
                      setEditing(item);
                      setPanel("edit");
                    }}
                    onAskDelete={() => setDeleteTarget(item)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MonSidePanel
        key={panel === "none" ? "khoa-panel-idle" : panel === "create" ? "khoa-panel-create" : `khoa-panel-edit-${editing?.id ?? 0}`}
        open={panel !== "none"}
        mode={panel === "create" ? "create" : "edit"}
        row={editing}
        onClose={() => {
          setPanel("none");
          setEditing(null);
        }}
      />

      <AnimatePresence>
        {deleteTarget && canDelete ? (
          <>
            <motion.button
              type="button"
              aria-label="Đóng"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/40"
              onClick={() => !deleteBusy && setDeleteTarget(null)}
            />
            <motion.div
              role="alertdialog"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-xl"
            >
              <p className="m-0 text-sm font-bold text-[#1a1a2e]">Xóa môn học?</p>
              <p className="mt-2 text-sm leading-relaxed text-[#666]">
                Xóa «{deleteTarget.ten_mon_hoc}» khỏi <code className="rounded bg-black/[0.06] px-1 text-xs">ql_mon_hoc</code>
                . Thao tác không hoàn tác nếu không còn ràng buộc dữ liệu.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-lg border border-[#EAEAEA] px-3 py-2 text-xs font-semibold text-[#666]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => void confirmDelete()}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {deleteBusy ? "Đang xóa…" : "Xóa"}
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`fixed bottom-6 right-6 z-[100] max-w-[min(90vw,360px)] rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg ${
              toast.ok ? "bg-gradient-to-r from-[#4dffb0] to-[#00c08b]" : "bg-gradient-to-r from-[#ff6b6b] to-[#EE5CA2]"
            }`}
          >
            {toast.ok ? "✓ " : "✕ "}
            {toast.msg}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
