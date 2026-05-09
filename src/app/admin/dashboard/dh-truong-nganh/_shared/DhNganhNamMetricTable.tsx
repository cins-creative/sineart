"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { upsertDhTruongNganhTheoNam } from "@/app/admin/dashboard/dh-truong-nganh/actions";
import type { AdminDhNganhNamMergedRow } from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

function inp(): string {
  return cn(
    "w-full rounded-lg border-[1.5px] border-[var(--color-border-subtle,#EAEAEA)] bg-white px-2 py-1.5 text-[12px] text-[#1a1a2e]",
    "outline-none focus:border-[#F8A568] focus:ring-[2px] focus:ring-[#F8A568]/15",
  );
}

type Props = {
  truongId: number;
  nam: number;
  truongSlug: string;
  rows: AdminDhNganhNamMergedRow[];
};

export default function DhNganhNamMetricTable({ truongId, nam, truongSlug, rows }: Props) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-2xl border border-black/[0.06] bg-white shadow-sm">
      <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-black/[0.06] bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wide text-black/45">
            <th className="min-w-[180px] px-3 py-3 md:px-4">Ngành</th>
            <th className="min-w-[100px] px-3 py-3 md:px-4">Chỉ tiêu</th>
            <th className="min-w-[100px] px-3 py-3 md:px-4">Điểm chuẩn</th>
            <th className="min-w-[160px] px-3 py-3 md:px-4">Ghi chú (theo năm)</th>
            <th className="w-28 px-3 py-3 md:px-4 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <MetricRow
              key={r.nganh_id}
              truongId={truongId}
              nam={nam}
              truongSlug={truongSlug}
              row={r}
              onSaved={() => router.refresh()}
            />
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-[13px] font-semibold text-black/40">
          Trường chưa có cặp ngành trong <code className="rounded bg-black/[0.04] px-1">dh_truong_nganh</code>.
        </div>
      ) : null}
    </div>
  );
}

function MetricRow({
  truongId,
  nam,
  truongSlug,
  row,
  onSaved,
}: {
  truongId: number;
  nam: number;
  truongSlug: string;
  row: AdminDhNganhNamMergedRow;
  onSaved: () => void;
}) {
  const [chiTieu, setChiTieu] = useState<string>(
    row.chi_tieu != null ? String(row.chi_tieu) : "",
  );
  const [diemChuan, setDiemChuan] = useState<string>(
    row.diem_chuan != null ? String(row.diem_chuan) : "",
  );
  const [ghiChu, setGhiChu] = useState<string>(row.metric_ghi_chu ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    const chiRaw = chiTieu.trim();
    const dcRaw = diemChuan.trim();
    const chiParsed = chiRaw === "" ? null : Math.trunc(Number(chiRaw.replace(",", ".")));
    const dcParsed = dcRaw === "" ? null : Number(dcRaw.replace(",", "."));
    if (chiParsed != null && (!Number.isFinite(chiParsed) || chiParsed < 0)) {
      setErr("Chỉ tiêu không hợp lệ");
      setSaving(false);
      return;
    }
    if (dcParsed != null && (!Number.isFinite(dcParsed) || dcParsed < 0)) {
      setErr("Điểm chuẩn không hợp lệ");
      setSaving(false);
      return;
    }
    const res = await upsertDhTruongNganhTheoNam({
      truongId,
      nganhId: row.nganh_id,
      namTuyenSinh: nam,
      chiTieu: chiParsed,
      diemChuan: dcParsed,
      ghiChu: ghiChu.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    onSaved();
  };

  const nganhHref = `/admin/dashboard/dh-truong-nganh/${truongSlug}/nganh/${row.nganh_slug}`;

  return (
    <tr className="border-b border-black/[0.04] align-top">
      <td className="px-3 py-3 md:px-4">
        <Link
          href={nganhHref}
          className="font-bold text-[#1a1a2e] underline-offset-4 hover:text-[#EE5CA2] hover:underline"
        >
          {row.ten_nganh}
        </Link>
        {row.mon_thi.length > 0 ? (
          <div className="mt-1 text-[10px] font-semibold text-black/45">
            Môn: {row.mon_thi.join(" · ")}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3 md:px-4">
        <input
          type="number"
          min={0}
          className={cn(inp(), "w-[88px]")}
          value={chiTieu}
          onChange={(e) => setChiTieu(e.target.value)}
          placeholder="—"
        />
      </td>
      <td className="px-3 py-3 md:px-4">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          className={cn(inp(), "w-[96px]")}
          value={diemChuan}
          onChange={(e) => setDiemChuan(e.target.value)}
          placeholder="—"
        />
      </td>
      <td className="px-3 py-3 md:px-4">
        <textarea
          className={cn(inp(), "min-h-[52px] resize-y")}
          value={ghiChu}
          onChange={(e) => setGhiChu(e.target.value)}
          placeholder="Tuỳ chọn"
          rows={2}
        />
        {err ? <p className="m-0 mt-1 text-[10px] font-bold text-red-700">{err}</p> : null}
      </td>
      <td className="px-3 py-3 text-right md:px-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Lưu
        </button>
      </td>
    </tr>
  );
}
