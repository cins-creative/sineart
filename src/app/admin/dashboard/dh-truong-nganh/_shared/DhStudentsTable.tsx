"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Link2, Loader2, Mail, Pencil, Phone, X } from "lucide-react";

import type { AdminDhStudentExamRow } from "@/lib/data/admin-dh-truong-nganh";
import { updateQlHvTruongNganhScore } from "@/app/admin/dashboard/dh-truong-nganh/actions";
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
  if (!rows.length) {
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
              <th className="whitespace-nowrap px-3 py-3 md:px-4">Điểm thi</th>
              <th className="min-w-[180px] px-3 py-3 md:px-4">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-black/[0.04] last:border-0">
                <td className="align-top px-3 py-3 md:px-4">
                  <div className="font-semibold text-[#1a1a2e]">{s.full_name}</div>
                  <div className="mt-0.5 text-[11px] text-black/40">ID #{s.hoc_vien_id}</div>
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
                    {s.email ? (
                      <a
                        href={`mailto:${s.email}`}
                        className="inline-flex items-center gap-1 text-black/65 hover:text-[#EE5CA2]"
                      >
                        <Mail className="h-3 w-3" aria-hidden />
                        <span className="truncate">{s.email}</span>
                      </a>
                    ) : null}
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
                  <ScoreCell rowId={s.id} initialScore={s.score} />
                </td>
                <td className="align-top px-3 py-3 text-[12px] leading-snug text-black/55 md:px-4">
                  {s.ghi_chu ? (
                    <span className="line-clamp-3" title={s.ghi_chu}>
                      {s.ghi_chu}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Ô điểm thi: click → chuyển sang `<input type="number">`. Nhấn Enter / nút lưu
 * sẽ gọi server action; Esc / nút huỷ sẽ rollback. Sau khi lưu thành công
 * `router.refresh()` để stats card và bảng cập nhật.
 */
function ScoreCell({
  rowId,
  initialScore,
}: {
  rowId: number;
  initialScore: number | null;
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
    const res = await updateQlHvTruongNganhScore({ rowId, score: next });
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
        title="Bấm để nhập / sửa điểm thi"
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
