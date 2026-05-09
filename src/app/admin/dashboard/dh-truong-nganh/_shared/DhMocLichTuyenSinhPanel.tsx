"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import {
  deleteDhMocLichTuyenSinh,
  insertDhMocLichTuyenSinh,
  updateDhMocLichTuyenSinh,
} from "@/app/admin/dashboard/dh-truong-nganh/actions";
import type { AdminDhMocLichRow } from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

/** Năm 4 chữ số đầu tiên trong mô tả (vd ngày thi); không có thì dùng năm tuyển sinh đang chọn. */
function extractYearFromMocThoiGian(text: string, fallbackNam: number): number {
  const m = text.match(/\b(20\d{2})\b/);
  if (m?.[1]) {
    const y = Number(m[1]);
    if (Number.isFinite(y) && y >= 2000 && y <= 2100) return y;
  }
  return fallbackNam;
}

/** VD: «Tuyển sinh Đại học Mỹ thuật TP.HCM năm 2026» — năm lấy từ ô ngày thi hoặc năm đang xem. */
export function buildTenMocTuDong(
  truongTen: string,
  thoiGianMoTa: string,
  namFallback: number,
): string {
  const ten = truongTen.trim() || "Trường";
  const nam = extractYearFromMocThoiGian(thoiGianMoTa, namFallback);
  return `Tuyển sinh ${ten} năm ${nam}`;
}

function inp(): string {
  return cn(
    "w-full rounded-[10px] border-[1.5px] border-[var(--color-border-subtle,#EAEAEA)] bg-white px-2.5 py-1.5 text-[13px] text-[#1a1a2e]",
    "outline-none focus:border-[#F8A568] focus:ring-[3px] focus:ring-[#F8A568]/15",
  );
}

const emptyFields = () => ({
  thoiGianMoTa: "",
  ghiChu: "",
  nguonThongBao: "",
});

type EditFormState = ReturnType<typeof emptyFields> & { thuTu: number };

export type DhMocLichQuickAddProps = {
  truongId: number;
  /** `dh_truong_dai_hoc.ten_truong` — ghép vào tên mốc tự động. */
  truongTen: string;
  namTuyenSinh: number;
  className?: string;
  /** Tiêu đề khối (mặc định ngắn). */
  title?: string;
  /** Không bọc card trắng — dùng trong panel / ghép đuôi section khác. */
  embedded?: boolean;
  /** Đồng bộ ô ngày thi với tiêu đề panel (controlled). */
  thoiGianDraft?: string;
  onThoiGianDraftChange?: (value: string) => void;
};

/** Form thêm mốc — một khối gọn: điền → Lưu (không dùng bảng). */
export function DhMocLichQuickAdd({
  truongId,
  truongTen,
  namTuyenSinh,
  className,
  title = "Thêm mốc lịch",
  embedded = false,
  thoiGianDraft,
  onThoiGianDraftChange,
}: DhMocLichQuickAddProps) {
  const router = useRouter();
  const [form, setForm] = useState(emptyFields);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const draftControlled = onThoiGianDraftChange != null;
  const thoiGianValue = draftControlled ? (thoiGianDraft ?? "") : form.thoiGianMoTa;

  const refresh = () => router.refresh();

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const tenMoc = buildTenMocTuDong(truongTen, thoiGianValue, namTuyenSinh);
    const res = await insertDhMocLichTuyenSinh({
      truongId,
      namTuyenSinh,
      tenMoc: tenMoc.trim() || null,
      thoiGianMoTa: thoiGianValue,
      ghiChu: form.ghiChu.trim() || null,
      nguonThongBao: form.nguonThongBao.trim() || null,
      thuTu: 0,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setForm(emptyFields());
    if (draftControlled) onThoiGianDraftChange("");
    refresh();
  };

  const shell = embedded
    ? cn("mt-3 border-t border-black/[0.06] pt-3", className)
    : cn(
        "rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm md:p-5",
        className,
      );

  return (
    <div className={shell}>
      {!embedded ? (
        <p className="m-0 text-[13px] font-extrabold text-[#1a1a2e]">{title}</p>
      ) : null}

      {err ? (
        <div
          className={cn(
            "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-800",
            embedded ? "mt-0" : "mt-2",
          )}
        >
          {err}
        </div>
      ) : null}

      <div className={cn("grid gap-2 sm:grid-cols-12", embedded ? "mt-2" : "mt-3")}>
        <label className="flex flex-col gap-0.5 sm:col-span-12">
          <span className="text-[10px] font-extrabold uppercase text-black/45">Ngày thi Đại học *</span>
          <textarea
            rows={2}
            className={cn(inp(), "min-h-[44px] resize-y py-2")}
            value={thoiGianValue}
            onChange={(e) => {
              const v = e.target.value;
              if (draftControlled) onThoiGianDraftChange(v);
              else setForm((f) => ({ ...f, thoiGianMoTa: v }));
            }}
            placeholder="VD: 15/06/2026 — ghi rõ năm (2026) để khớp tên mốc"
          />
        </label>
        <label className="flex flex-col gap-0.5 sm:col-span-6">
          <span className="text-[10px] font-extrabold uppercase text-black/45">Ghi chú</span>
          <input
            className={inp()}
            value={form.ghiChu}
            onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
            placeholder="Tuỳ chọn"
          />
        </label>
        <label className="flex flex-col gap-0.5 sm:col-span-6">
          <span className="text-[10px] font-extrabold uppercase text-black/45">Nguồn</span>
          <input
            className={inp()}
            value={form.nguonThongBao}
            onChange={(e) => setForm((f) => ({ ...f, nguonThongBao: e.target.value }))}
            placeholder="Link hoặc ghi chú"
          />
        </label>
      </div>
      <div className="mt-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-4 py-2 text-[12px] font-extrabold text-white shadow-sm disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Lưu mốc
        </button>
      </div>
    </div>
  );
}

type Props = {
  truongId: number;
  truongTen: string;
  namTuyenSinh: number;
  yearOptions: number[];
  rows: AdminDhMocLichRow[];
  hrefForYear: (year: number) => string;
  /** Hiện form thêm nhanh cuối panel (đặt false khi dùng `DhMocLichQuickAdd` ở chỗ khác). */
  showQuickAdd?: boolean;
};

export default function DhMocLichTuyenSinhPanel({
  truongId,
  truongTen,
  namTuyenSinh,
  yearOptions,
  rows,
  hrefForYear,
  showQuickAdd = true,
}: Props) {
  const router = useRouter();
  /** Ô ngày thi form thêm — đồng bộ tiêu đề section. */
  const [quickThoiGianDraft, setQuickThoiGianDraft] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(() => ({
    ...emptyFields(),
    thuTu: 0,
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Luôn xổ được — gộp năm hiện tại (URL) vào danh sách. */
  const yearChoices = useMemo(() => {
    const set = new Set(yearOptions);
    set.add(namTuyenSinh);
    return [...set].filter((y) => y >= 2000 && y <= 2100).sort((a, b) => b - a);
  }, [yearOptions, namTuyenSinh]);

  useEffect(() => {
    setQuickThoiGianDraft("");
  }, [namTuyenSinh]);

  const headlineTenMoc = useMemo(
    () => buildTenMocTuDong(truongTen, quickThoiGianDraft, namTuyenSinh),
    [truongTen, quickThoiGianDraft, namTuyenSinh],
  );

  const refresh = () => {
    router.refresh();
  };

  const startEdit = (r: AdminDhMocLichRow) => {
    setEditId(r.id);
    setEditForm({
      ...emptyFields(),
      thoiGianMoTa: r.thoi_gian_mo_ta === "—" ? "" : r.thoi_gian_mo_ta,
      ghiChu: r.ghi_chu ?? "",
      nguonThongBao: r.nguon_thong_bao ?? "",
      thuTu: r.thu_tu,
    });
    setErr(null);
  };

  const submitEdit = async () => {
    if (editId == null) return;
    setBusy(true);
    setErr(null);
    const res = await updateDhMocLichTuyenSinh({
      id: editId,
      tenMoc: buildTenMocTuDong(truongTen, editForm.thoiGianMoTa, namTuyenSinh).trim() || null,
      thoiGianMoTa: editForm.thoiGianMoTa,
      ghiChu: editForm.ghiChu.trim() || null,
      nguonThongBao: editForm.nguonThongBao.trim() || null,
      thuTu: editForm.thuTu,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setEditId(null);
    refresh();
  };

  const remove = async (id: number) => {
    if (!globalThis.confirm("Xoá mốc lịch này?")) return;
    setBusy(true);
    setErr(null);
    const res = await deleteDhMocLichTuyenSinh({ id });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    refresh();
  };

  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="m-0 min-w-0 flex-1 text-[13px] font-extrabold leading-snug text-[#1a1a2e] sm:text-[14px] md:text-[15px]">
          {headlineTenMoc}
        </h2>
        <label className="flex w-full min-w-0 flex-col gap-1 sm:w-44 md:w-48">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-black/45">
            Năm tuyển sinh
          </span>
          <select
            className={cn(inp(), "appearance-none bg-white py-2 font-extrabold")}
            value={String(namTuyenSinh)}
            disabled={yearChoices.length === 0}
            onChange={(e) => {
              const y = Number(e.target.value);
              if (!Number.isFinite(y)) return;
              router.push(hrefForYear(y));
            }}
            aria-label="Chọn năm tuyển sinh"
          >
            {yearChoices.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      {err ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-800">
          {err}
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="m-0 mt-3 list-none divide-y divide-black/[0.06] rounded-xl border border-black/[0.06] bg-[#fafafa] p-0">
          {rows.map((r, index) =>
            editId === r.id ? (
              <li key={r.id} className="px-3 py-3">
                <div className="grid gap-2 sm:grid-cols-12">
                  <label className="flex flex-col gap-0.5 sm:col-span-12">
                    <span className="text-[10px] font-extrabold uppercase text-black/45">
                      Ngày thi Đại học *
                    </span>
                    <textarea
                      rows={2}
                      className={cn(inp(), "min-h-[44px] resize-y py-2")}
                      value={editForm.thoiGianMoTa}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, thoiGianMoTa: e.target.value }))
                      }
                      placeholder="VD: 15/06/2026 — ghi rõ năm (2026)"
                    />
                  </label>
                  <p className="m-0 sm:col-span-12 rounded-lg bg-black/[0.03] px-3 py-2 text-[12px] text-black/70">
                    <span className="font-semibold text-black/50">Tên mốc:</span>{" "}
                    <span className="font-semibold text-[#1a1a2e]">
                      {buildTenMocTuDong(truongTen, editForm.thoiGianMoTa, namTuyenSinh)}
                    </span>
                  </p>
                  <label className="flex flex-col gap-0.5 sm:col-span-6">
                    <span className="text-[10px] font-extrabold uppercase text-black/45">Ghi chú</span>
                    <input
                      className={inp()}
                      value={editForm.ghiChu}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, ghiChu: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 sm:col-span-6">
                    <span className="text-[10px] font-extrabold uppercase text-black/45">Nguồn</span>
                    <input
                      className={inp()}
                      value={editForm.nguonThongBao}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, nguonThongBao: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitEdit()}
                    className="rounded-lg bg-[#F8A568] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-95 disabled:opacity-50"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditId(null)}
                    className="rounded-lg border border-[#EAEAEA] px-3 py-1.5 text-[11px] font-bold text-black/55"
                  >
                    Huỷ
                  </button>
                </div>
              </li>
            ) : (
              <li key={r.id} className="flex gap-3 px-3 py-2.5">
                <span className="w-7 shrink-0 pt-0.5 text-center text-[11px] font-extrabold tabular-nums text-black/40">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13px] font-bold text-[#1a1a2e]">{r.ten_moc ?? "Mốc"}</p>
                  <p className="m-0 mt-0.5 whitespace-pre-wrap text-[12px] leading-snug text-black/75">
                    {r.thoi_gian_mo_ta}
                  </p>
                  {(r.ghi_chu || r.nguon_thong_bao) && (
                    <p className="m-0 mt-1 text-[11px] text-black/45">
                      {r.ghi_chu ? <span>{r.ghi_chu}</span> : null}
                      {r.ghi_chu && r.nguon_thong_bao ? <span> · </span> : null}
                      {r.nguon_thong_bao ? (
                        /^https?:\/\//i.test(r.nguon_thong_bao) ? (
                          <a
                            href={r.nguon_thong_bao}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="break-all font-semibold text-[#EE5CA2] underline-offset-2 hover:underline"
                          >
                            {r.nguon_thong_bao.length > 40
                              ? `${r.nguon_thong_bao.slice(0, 40)}…`
                              : r.nguon_thong_bao}
                          </a>
                        ) : (
                          <span className="break-all">{r.nguon_thong_bao}</span>
                        )
                      ) : null}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startEdit(r)}
                    className="inline-flex items-center justify-center gap-0.5 rounded-lg border border-[#EAEAEA] px-2 py-1 text-[11px] font-bold text-black/65 hover:bg-black/[0.03]"
                  >
                    <Pencil className="h-3 w-3" aria-hidden /> Sửa
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(r.id)}
                    className="inline-flex items-center justify-center gap-0.5 rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden /> Xoá
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      ) : null}

      {showQuickAdd ? (
        <DhMocLichQuickAdd
          embedded
          truongId={truongId}
          truongTen={truongTen}
          namTuyenSinh={namTuyenSinh}
          thoiGianDraft={quickThoiGianDraft}
          onThoiGianDraftChange={setQuickThoiGianDraft}
        />
      ) : null}
    </section>
  );
}
