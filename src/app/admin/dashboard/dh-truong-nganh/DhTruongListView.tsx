"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, GraduationCap, Loader2, Plus, School, Trash2, X } from "lucide-react";

import {
  addDhTruongDaiHoc,
  deleteDhTruongDaiHoc,
} from "@/app/admin/dashboard/dh-truong-nganh/actions";
import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import {
  buildDhTruongSlug,
  sortDhTruongLookupByScore,
  type AdminDhTruongListCard,
} from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

type Props = {
  truongs: AdminDhTruongListCard[];
  missingServiceRole?: boolean;
  loadError?: string | null;
};

export default function DhTruongListView({ truongs, missingServiceRole, loadError }: Props) {
  const router = useRouter();
  const { canDelete } = useAdminDashboardAbilities();
  const sorted = sortDhTruongLookupByScore(truongs);

  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelId, setConfirmDelId] = useState<number | null>(null);

  const slugById = useMemo(() => {
    const all = sorted.map((x) => ({ id: x.id, ten: x.ten }));
    const m = new Map<number, string>();
    for (const t of sorted) {
      m.set(t.id, buildDhTruongSlug(t.id, t.ten, all));
    }
    return m;
  }, [sorted]);

  const confirmTarget = confirmDelId != null
    ? sorted.find((t) => t.id === confirmDelId) ?? null
    : null;

  return (
    <div
      className={cn(
        "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-4 bg-[#F5F7F7] px-4 py-5 text-[#323232] md:-m-6 md:w-[calc(100%+3rem)] md:px-6",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#1a1a2e]">
            <School className="h-6 w-6 text-[#EE5CA2]" aria-hidden />
            Trường đại học
          </h1>
          <p className="m-0 mt-1 text-[13px] font-medium text-black/45">
            Chọn trường để xem lịch tuyển sinh theo năm, ngành và học viên Sine Art.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus size={15} strokeWidth={2.5} /> Thêm trường
        </button>
      </div>

      {missingServiceRole ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          Thiếu <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {loadError}
        </div>
      ) : null}

      {sorted.length === 0 && !loadError ? (
        <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-10 text-center text-[13px] font-semibold text-black/40 shadow-sm">
          Chưa có trường nào trong <code className="rounded bg-black/[0.04] px-1">dh_truong_dai_hoc</code>.
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((t) => {
            const slug = slugById.get(t.id) ?? String(t.id);
            const href = `/admin/dashboard/dh-truong-nganh/${slug}`;
            return (
              <li key={t.id} className="relative">
                <Link
                  href={href}
                  className="flex min-h-[100px] flex-col rounded-2xl border border-black/[0.06] bg-white p-4 pr-12 shadow-sm transition-colors hover:border-[#F8A568]/45 hover:shadow-md"
                >
                  <span className="flex items-start gap-2">
                    <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-[#EE5CA2]" aria-hidden />
                    <span className="text-[15px] font-extrabold leading-snug text-[#1a1a2e]">{t.ten}</span>
                  </span>
                  <span className="mt-2 text-[11px] font-bold leading-snug text-black/40">
                    Học viên đang học (đăng ký thi trường này):{" "}
                    <span className="text-[#1a1a2e]">{t.hocVienDangKyThi}</span>
                  </span>
                  <span className="mt-3 text-[11px] font-extrabold tracking-tight text-[#323232]">
                    {t.soNganhDaoTao} ngành đào tạo
                  </span>
                </Link>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmDelId(t.id);
                    }}
                    title={`Xóa ${t.ten}`}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-red-200/70 bg-white/85 text-red-500 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 size={13} strokeWidth={2.4} />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <AddTruongModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => {
          setShowAdd(false);
          router.refresh();
        }}
      />

      <DeleteTruongConfirmModal
        target={confirmTarget}
        onClose={() => setConfirmDelId(null)}
        onDeleted={() => {
          setConfirmDelId(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function AddTruongModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [ten, setTen] = useState("");
  const [score, setScore] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTen("");
      setScore("");
      setErr(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  function submit() {
    setErr(null);
    const trimmedTen = ten.trim();
    if (!trimmedTen) {
      setErr("Nhập tên trường.");
      return;
    }
    let scoreNum: number | null = null;
    if (score.trim() !== "") {
      const n = Number(score);
      if (!Number.isFinite(n)) {
        setErr("Điểm chuẩn phải là số hợp lệ.");
        return;
      }
      scoreNum = n;
    }

    startTransition(async () => {
      const res = await addDhTruongDaiHoc({ ten: trimmedTen, score: scoreNum });
      if (res.ok) {
        onCreated();
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-[#EE5CA2]">
              Tạo mới
            </p>
            <h2 className="m-0 text-base font-extrabold text-[#1a1a2e]">Trường đại học mới</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] text-[#888] hover:bg-slate-50"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {err ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {err}
            </div>
          ) : null}
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
              Tên trường *
            </div>
            <input
              ref={inputRef}
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !pending) submit();
              }}
              maxLength={240}
              placeholder="VD: ĐH Mỹ thuật TP.HCM"
              className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#EE5CA2] focus:ring-[3px] focus:ring-[#EE5CA2]/15"
            />
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
              Điểm chuẩn (ưu tiên xếp dropdown — không bắt buộc)
            </div>
            <input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !pending) submit();
              }}
              inputMode="decimal"
              placeholder="VD: 24.5 (điểm thấp = ưu tiên trước)"
              className="w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#EE5CA2] focus:ring-[3px] focus:ring-[#EE5CA2]/15"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#f0f0f0] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] text-[#666] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !ten.trim()}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {pending ? "Đang tạo…" : "Tạo trường"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteTruongConfirmModal({
  target,
  onClose,
  onDeleted,
}: {
  target: AdminDhTruongListCard | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const confirmInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (target) {
      setErr(null);
      setConfirmText("");
    }
  }, [target]);

  if (!target) return null;

  const hasStudents = target.hocVienDangKyThi > 0;
  const hasNganh = target.soNganhDaoTao > 0;
  const expectedName = target.ten.trim();
  const matchesName = confirmText.trim() === expectedName;
  const canDelete = !pending && !hasStudents && matchesName;

  function handleDelete() {
    if (!target) return;
    if (hasStudents) return;
    if (!matchesName) {
      setErr(`Nhập đúng tên trường "${expectedName}" để xác nhận.`);
      confirmInputRef.current?.focus();
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await deleteDhTruongDaiHoc({ id: target.id });
      if (res.ok) {
        onDeleted();
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-truong-title"
        className="flex w-full max-w-[480px] flex-col overflow-hidden rounded-[20px] border-2 border-red-300 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-start gap-3 border-b border-red-200 bg-gradient-to-br from-red-50 to-red-100/70 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" strokeWidth={2.4} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-red-700">
              Cảnh báo · Hành động không thể hoàn tác
            </p>
            <h2
              id="delete-truong-title"
              className="m-0 mt-0.5 truncate text-[15px] font-extrabold text-[#1a1a2e]"
              title={target.ten}
            >
              Xóa {target.ten}?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition hover:bg-red-50 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-[13px] text-[#1a1a2e]">
          {hasStudents ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12px] font-semibold text-amber-900">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" strokeWidth={2.4} aria-hidden />
              <span>
                Trường này đang có <b>{target.hocVienDangKyThi}</b> học viên đăng ký dự thi. Hệ thống
                sẽ chặn xóa — vui lòng gỡ nguyện vọng của các học viên trước.
              </span>
            </div>
          ) : (
            <>
              <p className="m-0 font-semibold text-red-700">
                Bạn sắp xóa <b>{target.ten}</b>. Dữ liệu sẽ <u>biến mất vĩnh viễn</u>, không thể khôi phục:
              </p>
              <ul className="m-0 list-disc space-y-1 rounded-lg border border-red-200/60 bg-red-50/40 py-2 pl-9 pr-3 text-[12px] text-red-900/90">
                <li>
                  {target.soNganhDaoTao} dòng{" "}
                  <code className="rounded bg-white px-1 font-bold">dh_truong_nganh</code>
                  {hasNganh ? " (cặp trường–ngành)" : ""}
                </li>
                <li>
                  Toàn bộ mốc lịch tuyển sinh (
                  <code className="rounded bg-white px-1 font-bold">dh_moc_lich_tuyen_sinh</code>)
                </li>
                <li>
                  Toàn bộ chỉ tiêu / điểm chuẩn theo năm (
                  <code className="rounded bg-white px-1 font-bold">dh_truong_nganh_theo_nam</code>)
                </li>
                <li>
                  Dòng{" "}
                  <code className="rounded bg-white px-1 font-bold">dh_truong_dai_hoc</code>{" "}
                  của trường
                </li>
              </ul>

              <div className="space-y-1.5 pt-1">
                <label
                  htmlFor="delete-truong-confirm-input"
                  className="block text-[11px] font-bold uppercase tracking-wide text-[#666]"
                >
                  Để xác nhận, nhập đúng tên trường:{" "}
                  <span className="font-extrabold text-red-700">{expectedName}</span>
                </label>
                <input
                  id="delete-truong-confirm-input"
                  ref={confirmInputRef}
                  value={confirmText}
                  onChange={(e) => {
                    setConfirmText(e.target.value);
                    if (err) setErr(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canDelete) handleDelete();
                  }}
                  autoComplete="off"
                  placeholder="Nhập tên trường để mở khóa nút xóa"
                  className={cn(
                    "w-full rounded-[10px] border-[1.5px] bg-white px-3 py-2 text-[13px] outline-none transition focus:ring-[3px]",
                    matchesName
                      ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                      : "border-[#EAEAEA] focus:border-red-500 focus:ring-red-500/15",
                  )}
                />
              </div>
            </>
          )}

          {err ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {err}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#f0f0f0] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-semibold text-[#666] transition hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-red-600 px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {pending ? "Đang xóa…" : "Xóa vĩnh viễn"}
          </button>
        </div>
      </div>
    </div>
  );
}
