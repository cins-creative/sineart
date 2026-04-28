"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, Loader2, Pencil, School } from "lucide-react";

import { DH_MON_THI_HOP_LE } from "@/lib/agent/dh-exam-profiles";
import {
  sortDhTruongLookupByScore,
  type AdminDhTruongLookup,
  type AdminDhTruongNganhRow,
} from "@/lib/data/admin-dh-truong-nganh";
import { updateDhTruongNganhRow } from "@/app/admin/dashboard/dh-truong-nganh/actions";
import { cn } from "@/lib/utils";

type Props = {
  truongs: AdminDhTruongLookup[];
  rows: AdminDhTruongNganhRow[];
  /** `null` = hiển thị mọi trường (lọc «Tất cả»). */
  truongFilterId: number | null;
  missingServiceRole?: boolean;
  loadError?: string | null;
};

const MON_OPTIONS = [...DH_MON_THI_HOP_LE];

function inp(): string {
  return cn(
    "w-full rounded-[10px] border-[1.5px] border-[var(--color-border-subtle,#EAEAEA)] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]",
    "outline-none focus:border-[#F8A568] focus:ring-[3px] focus:ring-[#F8A568]/15",
  );
}

export default function DhTruongNganhView({
  truongs,
  rows,
  truongFilterId,
  missingServiceRole,
  loadError,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [editRow, setEditRow] = useState<AdminDhTruongNganhRow | null>(null);
  const [form, setForm] = useState({
    details: "",
    monThi: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const showTruongColumn = truongFilterId == null;

  useEffect(() => {
    if (!editRow) return;
    setForm({
      details: editRow.details ?? "",
      monThi: [...editRow.mon_thi],
    });
    setErr(null);
  }, [editRow]);

  const onFilterChange = useCallback(
    (value: string) => {
      if (!value) router.push(pathname);
      else router.push(`${pathname}?truong=${encodeURIComponent(value)}`);
    },
    [pathname, router],
  );

  const filterSelectValue = truongFilterId != null ? String(truongFilterId) : "";

  const handleSave = async () => {
    if (!editRow) return;
    setSaving(true);
    setErr(null);
    const res = await updateDhTruongNganhRow({
      truongId: editRow.truong_id,
      nganhId: editRow.nganh_id,
      details: form.details.trim() || null,
      monThi: form.monThi,
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setEditRow(null);
    router.refresh();
  };

  const toggleMon = (label: string) => {
    setForm((f) => ({
      ...f,
      monThi: f.monThi.includes(label) ? f.monThi.filter((x) => x !== label) : [...f.monThi, label],
    }));
  };

  const truongLabelById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of truongs) m.set(t.id, t.ten);
    return m;
  }, [truongs]);

  /** Dropdown: cùng quy tắc bảng — score thấp (ưu tiên cao) lên trước. */
  const truongsSelectSorted = useMemo(() => sortDhTruongLookupByScore(truongs), [truongs]);

  return (
    <div
      className={cn(
        "-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col gap-4 bg-[#F5F7F7] px-4 py-5 font-sans text-[#323232] md:-m-6 md:w-[calc(100%+3rem)] md:px-6",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F8A568]">
            Điều hành
          </p>
          <h1 className="m-0 mt-1 flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#1a1a2e]">
            <GraduationCap className="h-6 w-6 text-[#EE5CA2]" aria-hidden />
            Trường &amp; ngành thi ĐH
          </h1>
        </div>
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-black/45">
            Lọc theo trường đại học
          </span>
          <div className="relative">
            <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <select
              className={cn(inp(), "appearance-none pl-10 pr-9")}
              value={filterSelectValue}
              onChange={(e) => onFilterChange(e.target.value)}
            >
              <option value="">— Tất cả trường —</option>
              {truongsSelectSorted.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.ten}
                </option>
              ))}
            </select>
          </div>
        </label>
        <p className="m-0 text-[12px] text-black/40 sm:pt-6">
          {rows.length} cặp trường–ngành
          {truongFilterId != null
            ? ` · ${truongLabelById.get(truongFilterId) ?? `ID ${truongFilterId}`}`
            : ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wide text-black/45">
                {showTruongColumn ? (
                  <th className="whitespace-nowrap px-3 py-3 md:px-4">Trường</th>
                ) : null}
                <th className="min-w-[140px] px-3 py-3 md:px-4">Ngành</th>
                <th className="min-w-[200px] px-3 py-3 md:px-4">Môn / hình thức thi</th>
                <th className="min-w-[220px] px-3 py-3 md:px-4">Ghi chú thêm</th>
                <th className="whitespace-nowrap px-3 py-3 text-right md:px-4"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={showTruongColumn ? 5 : 4}
                    className="px-4 py-10 text-center text-[13px] font-semibold text-black/40"
                  >
                    Không có dòng nào
                    {truongFilterId != null ? " cho trường đã chọn" : ""}.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={`${r.truong_id}-${r.nganh_id}`} className="border-b border-black/[0.04] last:border-0">
                    {showTruongColumn ? (
                      <td className="align-top px-3 py-3 font-semibold text-[#1a1a2e] md:px-4">{r.ten_truong}</td>
                    ) : null}
                    <td className="align-top px-3 py-3 font-medium text-black/85 md:px-4">{r.ten_nganh}</td>
                    <td className="align-top px-3 py-3 md:px-4">
                      <div className="flex flex-wrap gap-1">
                        {r.mon_thi.length ? (
                          r.mon_thi.map((m) => (
                            <span
                              key={m}
                              className="inline-flex rounded-md bg-[#f8a568]/12 px-2 py-0.5 text-[11px] font-semibold text-[#c2410c]"
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-black/35">—</span>
                        )}
                      </div>
                    </td>
                    <td className="align-top px-3 py-3 text-[12px] leading-snug text-black/55 md:px-4">
                      {r.details ? (
                        <span className="line-clamp-3" title={r.details}>
                          {r.details}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="align-top px-3 py-2 text-right md:px-4">
                      <button
                        type="button"
                        onClick={() => setEditRow(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[12px] font-bold text-black/70 hover:bg-black/[0.03]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {editRow ? (
          <motion.div
            key="dh-tn-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) setEditRow(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.28)]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="border-b border-[#f0f0f0] px-5 py-4">
                <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F8A568]">
                  Chỉnh sửa cặp trường–ngành
                </p>
                <p className="m-0 mt-1 text-[15px] font-extrabold text-[#1a1a2e]">{editRow.ten_truong}</p>
                <p className="m-0 mt-0.5 text-[13px] font-semibold text-black/55">{editRow.ten_nganh}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-black/40">
                      Môn / hình thức thi
                    </p>
                    <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-xl border border-[#EAEAEA] bg-[#fafafa] p-3">
                      {MON_OPTIONS.map((m) => (
                        <label key={m} className="flex cursor-pointer items-start gap-2 text-[13px]">
                          <input
                            type="checkbox"
                            checked={form.monThi.includes(m)}
                            onChange={() => toggleMon(m)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#ccc]"
                          />
                          <span>{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-black/40">
                      Chi tiết thêm (ghi chú nội bộ / tư vấn)
                    </label>
                    <textarea
                      className={cn(inp(), "min-h-[100px] resize-y")}
                      value={form.details}
                      onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                      placeholder="Cách tính điểm của ngành & trường"
                    />
                  </div>
                  {err ? (
                    <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{err}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-[#f0f0f0] px-5 py-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditRow(null)}
                  className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-semibold text-black/55"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Lưu
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
