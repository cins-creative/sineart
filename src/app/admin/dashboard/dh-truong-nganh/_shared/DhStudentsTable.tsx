"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Loader2, Pencil, Phone, X } from "lucide-react";

import {
  sortDhStudentExamRowsByScore,
  type AdminDhStudentExamRow,
} from "@/lib/data/admin-dh-truong-nganh";
import { updateHocVienStudyDates } from "@/app/admin/dashboard/quan-ly-hoc-vien/actions";
import {
  updateQlHvTruongNganhGhiChu,
  updateQlHvTruongNganhScore,
} from "@/app/admin/dashboard/dh-truong-nganh/actions";
import {
  monthsBetweenCalendarYmd,
  resolveNgayBatDauForThang,
  todayIsoDateLocal,
} from "@/lib/data/admin-qlhv-tinh-trang";
import { cn } from "@/lib/utils";

type Props = {
  rows: AdminDhStudentExamRow[];
  /**
   * Khi xem chi tiết 1 cặp (trường, ngành) cụ thể thì cột «Ngành đăng ký» bị
   * ẩn (mọi dòng đều cùng ngành) — truyền `false` để giấu.
   */
  showNganhColumn?: boolean;
  /** Build link sang sub-subpage cho ngành; nếu không truyền → render text. */
  hrefForNganh?: (nganhId: number) => string;
  emptyText: string;
};

export default function DhStudentsTable({
  rows,
  showNganhColumn = true,
  hrefForNganh,
  emptyText,
}: Props) {
  const sortedRows = useMemo(() => sortDhStudentExamRowsByScore(rows), [rows]);

  if (!sortedRows.length) {
    return (
      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div className="px-4 py-10 text-center text-[13px] font-semibold text-black/40">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-black/[0.06] bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wide text-black/45">
              <th className="min-w-[180px] px-3 py-3 md:px-4">Học viên</th>
              <th className="min-w-[160px] px-3 py-3 md:px-4">Liên hệ</th>
              {showNganhColumn ? (
                <th className="min-w-[160px] px-3 py-3 md:px-4">Ngành đăng ký</th>
              ) : null}
              <th className="whitespace-nowrap px-3 py-3 md:px-4">Năm thi</th>
              <th className="min-w-[140px] whitespace-nowrap px-3 py-3 md:px-4">
                <span className="inline-flex items-center gap-1">
                  Điểm thi
                  <span className="text-[9px] font-bold normal-case text-[#EE5CA2]" title="Sắp cao → thấp">
                    ↓
                  </span>
                </span>
              </th>
              <th className="min-w-[180px] px-3 py-3 md:px-4">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((s) => (
              <tr key={s.id} className="border-b border-black/[0.04] last:border-0">
                <td className="align-top px-3 py-3 md:px-4">
                  <div className="font-semibold text-[#1a1a2e]">{s.full_name}</div>
                  <HvTinhTrangBadge value={s.tinh_trang} />
                  <ThangHocTaiSineCell row={s} />
                </td>
                <td className="align-top px-3 py-3 md:px-4">
                  <div className="flex flex-col gap-0.5 text-[12px]">
                    {s.sdt ? (
                      <a
                        href={`tel:${s.sdt}`}
                        className="inline-flex items-center gap-1 text-black/75 hover:text-[#EE5CA2]"
                      >
                        <Phone className="h-3 w-3" aria-hidden />
                        {s.sdt}
                      </a>
                    ) : null}
                    {s.email ? <CopyEmailButton email={s.email} /> : null}
                    {s.facebook ? (
                      <a
                        href={s.facebook}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-black/55 hover:text-[#EE5CA2]"
                      >
                        <Link2 className="h-3 w-3" aria-hidden />
                        <span className="truncate">Facebook</span>
                      </a>
                    ) : null}
                    {!s.sdt && !s.email && !s.facebook ? (
                      <span className="text-black/35">—</span>
                    ) : null}
                  </div>
                </td>
                {showNganhColumn ? (
                  <td className="align-top px-3 py-3 font-medium text-black/85 md:px-4">
                    {s.nganh_id != null && hrefForNganh ? (
                      <Link
                        href={hrefForNganh(s.nganh_id)}
                        className="text-left underline-offset-4 hover:text-[#EE5CA2] hover:underline"
                      >
                        {s.ten_nganh}
                      </Link>
                    ) : (
                      s.ten_nganh
                    )}
                  </td>
                ) : null}
                <td className="align-top px-3 py-3 md:px-4">
                  {s.nam_thi != null ? (
                    <span className="inline-flex rounded-md bg-[#BB89F8]/15 px-2 py-0.5 text-[12px] font-bold text-[#6b3fbf]">
                      {s.nam_thi}
                    </span>
                  ) : (
                    <span className="text-black/35">—</span>
                  )}
                </td>
                <td className="align-top px-3 py-3 md:px-4">
                  <ExamScoresCell
                    rowId={s.id}
                    monThi={s.mon_thi}
                    scores={[s.score, s.score_2]}
                  />
                </td>
                <td className="align-top px-3 py-3 text-[12px] leading-snug text-black/55 md:px-4">
                  <GhiChuCell rowId={s.id} rowName={s.full_name} initialGhiChu={s.ghi_chu} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const HV_TINH_TRANG_COLOR: Record<string, { bg: string; text: string }> = {
  "Đang học": { bg: "#dcfce7", text: "#16a34a" },
  "Chưa học": { bg: "#e2e8f0", text: "#475569" },
  Nghỉ: { bg: "#fee2e2", text: "#dc2626" },
};

function HvTinhTrangBadge({ value }: { value: string }) {
  const cfg = HV_TINH_TRANG_COLOR[value] ?? { bg: "#f3f4f6", text: "#6b7280" };
  return (
    <span
      className="mt-0.5 inline-block whitespace-nowrap rounded-full px-2 py-px text-[10px] font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {value || "—"}
    </span>
  );
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard
      .writeText(email)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* trình duyệt không hỗ trợ clipboard */
      });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex max-w-full items-center gap-1 rounded px-0.5 -mx-0.5 text-left text-black/65 transition-colors hover:bg-[#EE5CA2]/08 hover:text-[#EE5CA2]"
      title={copied ? "Đã copy email" : "Copy email"}
      aria-label={copied ? "Đã copy email" : `Copy email ${email}`}
    >
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="truncate">{email}</span>
    </button>
  );
}

function isoDateInput(d: string | null | undefined): string {
  if (d == null || String(d).trim() === "") return "";
  return String(d).trim().slice(0, 10);
}

function resolveNgayBatDauDisplay(row: AdminDhStudentExamRow): string {
  return resolveNgayBatDauForThang(row.created_at, row.ngay_bat_dau) ?? "";
}

function previewThangLabel(ngayBatDau: string, ngayKetThuc: string, createdAt: string | null): string {
  const start = ngayBatDau.trim().slice(0, 10) || resolveNgayBatDauForThang(createdAt, null);
  if (!start) return "—";
  const end = ngayKetThuc.trim().slice(0, 10) || todayIsoDateLocal();
  const m = monthsBetweenCalendarYmd(start, end);
  return m != null ? `${m} tháng` : "—";
}

function ThangHocTaiSineCell({ row }: { row: AdminDhStudentExamRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const label = row.thang_hoc_tai_sine ?? previewThangLabel("", isoDateInput(row.ngay_ket_thuc), row.created_at);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group mt-0.5 inline-flex items-center gap-1 rounded px-0.5 -mx-0.5 text-left text-[11px] font-semibold transition-colors",
          label !== "—"
            ? "text-black/50 hover:bg-[#F8A568]/10 hover:text-[#c2410c]"
            : "text-black/35 hover:bg-black/[0.04] hover:text-black/55",
        )}
        title="Bấm để chỉnh ngày bắt đầu và ngày nghỉ"
      >
        <span>{label !== "—" ? `${label} tại Sine Art` : "— tại Sine Art"}</span>
        <Pencil className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
      {open ? (
        <StudyDatesModal
          row={row}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function StudyDatesModal({
  row,
  onClose,
  onSaved,
}: {
  row: AdminDhStudentExamRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nbd, setNbd] = useState(() => resolveNgayBatDauDisplay(row));
  const [nkt, setNkt] = useState(() => isoDateInput(row.ngay_ket_thuc));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const preview = useMemo(
    () => previewThangLabel(nbd, nkt, row.created_at),
    [nbd, nkt, row.created_at],
  );

  async function submit() {
    setSaving(true);
    setErr(null);
    const r = await updateHocVienStudyDates(row.hoc_vien_id, {
      ngay_bat_dau: nbd.trim() || null,
      ngay_ket_thuc: nkt.trim() || null,
    });
    setSaving(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    onSaved();
  }

  const fieldLbl = "mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#64748b]";
  const fieldInp =
    "w-full rounded-lg border-[1.5px] border-[#EAEAEA] bg-white px-2.5 py-2 text-[13px] font-semibold text-[#1a1a2e] outline-none focus:border-[#F8A568] focus:ring-[2px] focus:ring-[#F8A568]/15 disabled:opacity-55";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="dh-study-dates-title"
        aria-modal="true"
        className="w-full max-w-[400px] rounded-xl border border-black/[0.06] bg-white p-4 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 id="dh-study-dates-title" className="m-0 text-[14px] font-extrabold text-[#1a1a2e]">
              Thời gian học tại Sine Art
            </h3>
            <p className="m-0 mt-0.5 truncate text-[11px] font-semibold text-black/45">
              {row.full_name} · ID #{row.hoc_vien_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EAEAEA] text-black/50 hover:bg-black/[0.04]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className={fieldLbl}>Ngày bắt đầu học</span>
            <input
              type="date"
              value={nbd}
              disabled={saving}
              onChange={(e) => setNbd(e.target.value)}
              className={fieldInp}
            />
          </label>
          <label className="block">
            <span className={fieldLbl}>Ngày nghỉ</span>
            <input
              type="date"
              value={nkt}
              disabled={saving}
              onChange={(e) => setNkt(e.target.value)}
              className={fieldInp}
            />
            <p className="m-0 mt-1 text-[10px] font-medium text-black/40">
              Để trống nếu học viên vẫn đang học (tính đến hôm nay hoặc theo học phí).
            </p>
          </label>
          <p className="m-0 rounded-lg bg-[#F8A568]/10 px-2.5 py-2 text-[12px] font-bold text-[#c2410c]">
            ≈ {preview} tại Sine Art
          </p>
        </div>

        {err ? <p className="mb-0 mt-2 text-[11px] font-semibold text-red-700">{err}</p> : null}

        <div className="mt-4 flex justify-end gap-2 border-t border-[#f0f0f0] pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-semibold text-[#475569] hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Ô điểm thi theo môn: 1 hoặc 2 ô tương ứng `dh_truong_nganh.mon_thi`.
 * Nếu chưa khai báo môn → một ô điểm chung (cột `score`).
 */
function GhiChuCell({
  rowId,
  rowName,
  initialGhiChu,
}: {
  rowId: number;
  rowName: string;
  initialGhiChu: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ghiChu, setGhiChu] = useState(initialGhiChu ?? "");

  useEffect(() => {
    if (!open) setGhiChu(initialGhiChu ?? "");
  }, [initialGhiChu, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group inline-flex max-w-full items-start gap-1 rounded px-0.5 -mx-0.5 text-left transition-colors",
          initialGhiChu
            ? "text-black/55 hover:bg-amber-50/80 hover:text-amber-900"
            : "text-black/35 hover:bg-black/[0.04] hover:text-black/55",
        )}
        title={initialGhiChu ? initialGhiChu : "Bấm để thêm ghi chú"}
      >
        <span className={cn("min-w-0 break-words", initialGhiChu ? "line-clamp-3" : "italic")}>
          {initialGhiChu || "Thêm ghi chú…"}
        </span>
        <Pencil className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
      {open ? (
        <GhiChuModal
          rowId={rowId}
          rowName={rowName}
          value={ghiChu}
          onChange={setGhiChu}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function GhiChuModal({
  rowId,
  rowName,
  value,
  onChange,
  onClose,
  onSaved,
}: {
  rowId: number;
  rowName: string;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setErr(null);
    const r = await updateQlHvTruongNganhGhiChu({
      rowId,
      ghiChu: value.trim() || null,
    });
    setSaving(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    onSaved();
  }

  const fieldLbl = "mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#64748b]";
  const fieldInp =
    "w-full resize-y rounded-lg border-[1.5px] border-[#EAEAEA] bg-white px-2.5 py-2 text-[13px] font-medium text-[#1a1a2e] outline-none focus:border-[#F8A568] focus:ring-[2px] focus:ring-[#F8A568]/15 disabled:opacity-55";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="dh-ghi-chu-title"
        aria-modal="true"
        className="w-full max-w-[420px] rounded-xl border border-black/[0.06] bg-white p-4 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 id="dh-ghi-chu-title" className="m-0 text-[14px] font-extrabold text-[#1a1a2e]">
              Ghi chú nguyện vọng
            </h3>
            <p className="m-0 mt-0.5 truncate text-[11px] font-semibold text-black/45">{rowName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EAEAEA] text-black/50 hover:bg-black/[0.04]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block">
          <span className={fieldLbl}>Nội dung</span>
          <textarea
            rows={4}
            autoFocus
            disabled={saving}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ghi chú về nguyện vọng, điểm dự kiến, tình trạng thi…"
            className={fieldInp}
          />
        </label>

        {err ? <p className="mb-0 mt-2 text-[11px] font-semibold text-red-700">{err}</p> : null}

        <div className="mt-4 flex justify-end gap-2 border-t border-[#f0f0f0] pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-semibold text-[#475569] hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Ô điểm thi theo môn: 1 hoặc 2 ô tương ứng `dh_truong_nganh.mon_thi`.
 * Nếu chưa khai báo môn → một ô điểm chung (cột `score`).
 */
function ExamScoresCell({
  rowId,
  monThi,
  scores,
}: {
  rowId: number;
  monThi: string[];
  scores: [number | null, number | null];
}) {
  const subjects = monThi.length > 0 ? monThi.slice(0, 2) : [null as string | null];

  return (
    <div className="flex min-w-[120px] flex-col gap-1.5">
      {subjects.map((label, idx) => (
        <div key={`${label ?? "score"}-${idx}`} className="flex flex-col gap-0.5">
          {label ? (
            <span className="max-w-[180px] truncate text-[10px] font-semibold leading-tight text-black/45" title={label}>
              {label}
            </span>
          ) : null}
          <ScoreCell
            rowId={rowId}
            subjectIndex={idx === 1 ? 1 : 0}
            initialScore={scores[idx] ?? null}
            subjectLabel={label}
          />
        </div>
      ))}
    </div>
  );
}

function ScoreCell({
  rowId,
  initialScore,
  subjectIndex = 0,
  subjectLabel,
}: {
  rowId: number;
  initialScore: number | null;
  subjectIndex?: 0 | 1;
  subjectLabel?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(initialScore != null ? String(initialScore) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(initialScore);

  useEffect(() => {
    setScore(initialScore);
    if (!editing) setValue(initialScore != null ? String(initialScore) : "");
  }, [editing, initialScore]);

  const startEdit = () => {
    setValue(score != null ? String(score) : "");
    setErr(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setErr(null);
    setValue(score != null ? String(score) : "");
  };

  const submit = async () => {
    const trimmed = value.trim();
    let next: number | null = null;
    if (trimmed !== "") {
      const n = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(n)) {
        setErr("Số không hợp lệ");
        return;
      }
      if (n < 0) {
        setErr("Không được âm");
        return;
      }
      next = n;
    }
    setSaving(true);
    setErr(null);
    const res = await updateQlHvTruongNganhScore({ rowId, score: next, subjectIndex });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setScore(next);
    setEditing(false);
    router.refresh();
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        title={
          subjectLabel
            ? `Bấm để nhập / sửa điểm — ${subjectLabel}`
            : "Bấm để nhập / sửa điểm thi"
        }
        className={cn(
          "group inline-flex min-w-[60px] items-center justify-between gap-1 rounded-md border border-transparent px-2 py-0.5 text-[12px] font-bold transition-colors",
          score != null
            ? "bg-[#F8A568]/15 text-[#c2410c] hover:border-[#F8A568]/45"
            : "text-black/35 hover:border-[#EAEAEA] hover:bg-black/[0.03]",
        )}
      >
        <span>{score != null ? score : "—"}</span>
        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          autoFocus
          disabled={saving}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            }
          }}
          className="w-[80px] rounded-md border-[1.5px] border-[#EAEAEA] bg-white px-2 py-1 text-[12px] font-semibold text-[#1a1a2e] outline-none focus:border-[#F8A568] focus:ring-[2px] focus:ring-[#F8A568]/20 disabled:opacity-55"
          placeholder="—"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          aria-label="Lưu điểm"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={saving}
          aria-label="Huỷ"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#EAEAEA] bg-white text-black/55 hover:bg-black/[0.04] disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {err ? <p className="m-0 text-[10px] font-semibold text-red-700">{err}</p> : null}
    </div>
  );
}
