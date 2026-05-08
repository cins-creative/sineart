"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarRange,
  GraduationCap,
  Link2,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  School,
  Users,
  X,
} from "lucide-react";

import {
  DH_MON_THI_ARRAY_MAX_COUNT,
  DH_MON_THI_HOP_LE,
  DH_MON_THI_ITEM_MAX_LEN,
} from "@/lib/agent/dh-exam-profiles";
import {
  buildDhNganhSlug,
  buildDhTruongSlug,
  sortDhTruongLookupByScore,
  type AdminDhStudentExamRow,
  type AdminDhTruongLookup,
  type AdminDhTruongNganhRow,
} from "@/lib/data/admin-dh-truong-nganh";
import { updateDhTruongNganhRow } from "@/app/admin/dashboard/dh-truong-nganh/actions";
import { cn } from "@/lib/utils";

type Props = {
  truongs: AdminDhTruongLookup[];
  rows: AdminDhTruongNganhRow[];
  /** Học viên thi trường đang chọn (rỗng nếu chưa chọn trường). */
  students: AdminDhStudentExamRow[];
  /** Tập năm thi distinct cho dropdown filter (theo trường nếu đã chọn). */
  availableYears: number[];
  /** `${truongId}__${nganhId}` → số HV distinct đăng ký dự thi cặp đó. */
  hvCountByPair: Record<string, number>;
  /** `null` = hiển thị mọi trường (lọc «Tất cả»). */
  truongFilterId: number | null;
  /** `null` = mọi năm. */
  namThiFilter: number | null;
  missingServiceRole?: boolean;
  loadError?: string | null;
};

const MON_OPTIONS = [...DH_MON_THI_HOP_LE];
const PRESET_MON_SET = new Set<string>(MON_OPTIONS);

function inp(): string {
  return cn(
    "w-full rounded-[10px] border-[1.5px] border-[var(--color-border-subtle,#EAEAEA)] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]",
    "outline-none focus:border-[#F8A568] focus:ring-[3px] focus:ring-[#F8A568]/15",
  );
}

export default function DhTruongNganhView({
  truongs,
  rows,
  students,
  availableYears,
  hvCountByPair,
  truongFilterId,
  namThiFilter,
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
  const [customMonInput, setCustomMonInput] = useState("");

  const showTruongColumn = truongFilterId == null;

  useEffect(() => {
    if (!editRow) return;
    setForm({
      details: editRow.details ?? "",
      monThi: [...editRow.mon_thi],
    });
    setCustomMonInput("");
    setErr(null);
  }, [editRow]);

  /** Build URL bảo toàn các param khác — chỉ ghi đè những key được truyền vào. */
  const buildHref = useCallback(
    (overrides: { truong?: string | null; nam?: string | null }): string => {
      const params = new URLSearchParams();
      if (truongFilterId != null) params.set("truong", String(truongFilterId));
      if (namThiFilter != null) params.set("nam", String(namThiFilter));
      for (const [k, v] of Object.entries(overrides)) {
        if (v == null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [namThiFilter, pathname, truongFilterId],
  );

  const onTruongChange = useCallback(
    (value: string) => {
      router.push(buildHref({ truong: value || null, nam: null }));
    },
    [buildHref, router],
  );

  const onNamChange = useCallback(
    (value: string) => {
      router.push(buildHref({ nam: value || null }));
    },
    [buildHref, router],
  );

  const filterSelectValue = truongFilterId != null ? String(truongFilterId) : "";
  const yearSelectValue = namThiFilter != null ? String(namThiFilter) : "";

  /**
   * Slug map cho tên trường — tận dụng `buildDhTruongSlug` ở client (cùng quy
   * tắc khử trùng như server, nhờ truyền toàn bộ tập trường vào).
   */
  const truongSlugById = useMemo(() => {
    const all = truongs.map((t) => ({ id: t.id, ten: t.ten }));
    const m = new Map<number, string>();
    for (const t of all) m.set(t.id, buildDhTruongSlug(t.id, t.ten, all));
    return m;
  }, [truongs]);

  /**
   * Slug map cho tên ngành — chỉ tính trong phạm vi từng trường (đúng như URL
   * routing). Group theo `truong_id` từ `rows` đang có.
   */
  const nganhSlugByTruongAndNganh = useMemo(() => {
    const grouped = new Map<number, { id: number; ten: string }[]>();
    for (const r of rows) {
      const arr = grouped.get(r.truong_id) ?? [];
      if (!arr.some((x) => x.id === r.nganh_id)) {
        arr.push({ id: r.nganh_id, ten: r.ten_nganh });
      }
      grouped.set(r.truong_id, arr);
    }
    const out = new Map<string, string>();
    for (const [trId, list] of grouped) {
      for (const ng of list) {
        out.set(`${trId}__${ng.id}`, buildDhNganhSlug(ng.id, ng.ten, list));
      }
    }
    return out;
  }, [rows]);

  const truongHref = useCallback(
    (truongId: number): string => {
      const slug = truongSlugById.get(truongId);
      if (!slug) return pathname;
      return `/admin/dashboard/dh-truong-nganh/${slug}`;
    },
    [pathname, truongSlugById],
  );

  const nganhHref = useCallback(
    (truongId: number, nganhId: number): string => {
      const trSlug = truongSlugById.get(truongId);
      const ngSlug = nganhSlugByTruongAndNganh.get(`${truongId}__${nganhId}`);
      if (!trSlug || !ngSlug) return pathname;
      return `/admin/dashboard/dh-truong-nganh/${trSlug}/${ngSlug}`;
    },
    [nganhSlugByTruongAndNganh, pathname, truongSlugById],
  );

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

  const customMonInForm = useMemo(
    () => form.monThi.filter((m) => !PRESET_MON_SET.has(m)),
    [form.monThi],
  );

  const toggleMon = (label: string) => {
    setForm((f) => {
      if (f.monThi.includes(label)) {
        return { ...f, monThi: f.monThi.filter((x) => x !== label) };
      }
      if (f.monThi.length >= DH_MON_THI_ARRAY_MAX_COUNT) return f;
      return { ...f, monThi: [...f.monThi, label] };
    });
  };

  const removeMonThi = (label: string) => {
    setForm((f) => ({ ...f, monThi: f.monThi.filter((x) => x !== label) }));
  };

  const addCustomMonThi = () => {
    let t = customMonInput.trim();
    if (!t) return;
    if (t.length > DH_MON_THI_ITEM_MAX_LEN) t = t.slice(0, DH_MON_THI_ITEM_MAX_LEN);
    setForm((f) => {
      if (f.monThi.includes(t)) return f;
      if (f.monThi.length >= DH_MON_THI_ARRAY_MAX_COUNT) return f;
      return { ...f, monThi: [...f.monThi, t] };
    });
    setCustomMonInput("");
  };

  const truongLabelById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of truongs) m.set(t.id, t.ten);
    return m;
  }, [truongs]);

  /** Dropdown: cùng quy tắc bảng — score thấp (ưu tiên cao) lên trước. */
  const truongsSelectSorted = useMemo(() => sortDhTruongLookupByScore(truongs), [truongs]);

  const selectedTruongLabel =
    truongFilterId != null ? truongLabelById.get(truongFilterId) ?? `ID ${truongFilterId}` : null;

  /** Đếm số học viên distinct đang hiển thị trong bảng học viên. */
  const studentDistinctCount = useMemo(() => {
    if (!students.length) return 0;
    const set = new Set<number>();
    for (const s of students) set.add(s.hoc_vien_id);
    return set.size;
  }, [students]);

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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-black/45">
            Lọc theo trường đại học
          </span>
          <div className="relative">
            <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <select
              className={cn(inp(), "appearance-none pl-10 pr-9")}
              value={filterSelectValue}
              onChange={(e) => onTruongChange(e.target.value)}
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

        <label className="flex min-w-0 flex-col gap-1.5 sm:w-44">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-black/45">
            Năm thi
          </span>
          <div className="relative">
            <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <select
              className={cn(inp(), "appearance-none pl-10 pr-9")}
              value={yearSelectValue}
              onChange={(e) => onNamChange(e.target.value)}
              disabled={availableYears.length === 0}
            >
              <option value="">— Tất cả năm —</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </label>

        <p className="m-0 text-[12px] text-black/40 sm:pb-2">
          {rows.length} cặp trường–ngành
          {selectedTruongLabel ? ` · ${selectedTruongLabel}` : ""}
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
                <th className="whitespace-nowrap px-3 py-3 text-right md:px-4">HV thi</th>
                <th className="min-w-[220px] px-3 py-3 md:px-4">Ghi chú thêm</th>
                <th className="whitespace-nowrap px-3 py-3 text-right md:px-4"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={showTruongColumn ? 6 : 5}
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
                      <td className="align-top px-3 py-3 md:px-4">
                        <Link
                          href={truongHref(r.truong_id)}
                          title="Xem học viên đã thi trường này"
                          className="text-left font-semibold text-[#1a1a2e] underline-offset-4 hover:text-[#EE5CA2] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8A568]/40 rounded"
                        >
                          {r.ten_truong}
                        </Link>
                      </td>
                    ) : null}
                    <td className="align-top px-3 py-3 font-medium text-black/85 md:px-4">
                      <Link
                        href={nganhHref(r.truong_id, r.nganh_id)}
                        title="Xem học viên thi ngành này của trường"
                        className="underline-offset-4 hover:text-[#EE5CA2] hover:underline"
                      >
                        {r.ten_nganh}
                      </Link>
                    </td>
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
                    <td className="align-top whitespace-nowrap px-3 py-3 text-right md:px-4">
                      {(() => {
                        const cnt = hvCountByPair[`${r.truong_id}__${r.nganh_id}`] ?? 0;
                        if (cnt <= 0) {
                          return <span className="text-[12px] font-semibold text-black/30">0</span>;
                        }
                        return (
                          <Link
                            href={nganhHref(r.truong_id, r.nganh_id)}
                            title={`Xem ${cnt} học viên thi ngành này`}
                            className="inline-flex items-center gap-1 rounded-md bg-[#BB89F8]/15 px-2 py-0.5 text-[12px] font-bold text-[#6b3fbf] hover:bg-[#BB89F8]/25"
                          >
                            <Users className="h-3 w-3" aria-hidden />
                            {cnt}
                          </Link>
                        );
                      })()}
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

      <section className="flex flex-col gap-2">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#BB89F8]">
              Học viên dự thi
            </p>
            <h2 className="m-0 mt-1 flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-[#1a1a2e]">
              <Users className="h-4 w-4 text-[#BB89F8]" aria-hidden />
              {selectedTruongLabel
                ? `Học viên đã thi: ${selectedTruongLabel}`
                : "Học viên đã thi trường này"}
            </h2>
          </div>
          {selectedTruongLabel ? (
            <p className="m-0 text-[12px] text-black/45">
              {students.length} nguyện vọng · {studentDistinctCount} học viên
              {namThiFilter != null ? ` · năm ${namThiFilter}` : ""}
            </p>
          ) : null}
        </header>

        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
          {selectedTruongLabel == null ? (
            <div className="px-4 py-10 text-center text-[13px] font-semibold text-black/40">
              Chọn một trường ở bộ lọc phía trên (hoặc bấm vào tên trường trong bảng) để xem học viên đã thi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wide text-black/45">
                    <th className="min-w-[180px] px-3 py-3 md:px-4">Học viên</th>
                    <th className="min-w-[160px] px-3 py-3 md:px-4">Liên hệ</th>
                    <th className="min-w-[160px] px-3 py-3 md:px-4">Ngành đăng ký</th>
                    <th className="whitespace-nowrap px-3 py-3 md:px-4">Năm thi</th>
                    <th className="min-w-[180px] px-3 py-3 md:px-4">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-[13px] font-semibold text-black/40"
                      >
                        Chưa có học viên nào thi trường này
                        {namThiFilter != null ? ` vào năm ${namThiFilter}` : ""}.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
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
                        <td className="align-top px-3 py-3 font-medium text-black/85 md:px-4">{s.ten_nganh}</td>
                        <td className="align-top px-3 py-3 md:px-4">
                          {s.nam_thi != null ? (
                            <span className="inline-flex rounded-md bg-[#BB89F8]/15 px-2 py-0.5 text-[12px] font-bold text-[#6b3fbf]">
                              {s.nam_thi}
                            </span>
                          ) : (
                            <span className="text-black/35">—</span>
                          )}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

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
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-black/40">
                      Môn / hình thức thi
                    </p>
                    <p className="m-0 mb-2 text-[11px] leading-snug text-black/45">
                      Chọn từ danh sách gợi ý hoặc thêm / chỉnh dòng tùy chỉnh (tối đa{" "}
                      {DH_MON_THI_ARRAY_MAX_COUNT} mục, {DH_MON_THI_ITEM_MAX_LEN} ký tự/mục).
                    </p>
                    <div className="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-xl border border-[#EAEAEA] bg-[#fafafa] p-3">
                      {MON_OPTIONS.map((m) => (
                        <label key={m} className="flex cursor-pointer items-start gap-2 text-[13px]">
                          <input
                            type="checkbox"
                            checked={form.monThi.includes(m)}
                            onChange={() => toggleMon(m)}
                            disabled={!form.monThi.includes(m) && form.monThi.length >= DH_MON_THI_ARRAY_MAX_COUNT}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#ccc] disabled:opacity-45"
                          />
                          <span>{m}</span>
                        </label>
                      ))}
                    </div>
                    {customMonInForm.length ? (
                      <div className="mt-2">
                        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-wide text-black/40">
                          Môn / hình thức tùy chỉnh
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {customMonInForm.map((m) => (
                            <span
                              key={m}
                              className="inline-flex max-w-full items-center gap-1 rounded-lg border border-[#F8A568]/35 bg-[#f8a568]/10 px-2 py-0.5 text-[12px] font-semibold text-[#b45309]"
                            >
                              <span className="truncate" title={m}>
                                {m}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeMonThi(m)}
                                className="shrink-0 rounded p-0.5 text-[#b45309] hover:bg-black/10"
                                aria-label={`Xóa ${m}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={customMonInput}
                        maxLength={DH_MON_THI_ITEM_MAX_LEN}
                        onChange={(e) => setCustomMonInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomMonThi();
                          }
                        }}
                        placeholder="Thêm môn hoặc hình thức khác…"
                        className={cn(inp(), "min-w-0 flex-1")}
                        disabled={form.monThi.length >= DH_MON_THI_ARRAY_MAX_COUNT}
                      />
                      <button
                        type="button"
                        onClick={() => addCustomMonThi()}
                        disabled={
                          saving ||
                          !customMonInput.trim() ||
                          form.monThi.length >= DH_MON_THI_ARRAY_MAX_COUNT
                        }
                        className="inline-flex shrink-0 items-center justify-center rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2 text-[13px] font-bold text-black/70 hover:bg-black/[0.03] disabled:opacity-45"
                        aria-label="Thêm môn"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="m-0 mt-1.5 text-[10px] font-semibold text-black/35">
                      Đã chọn {form.monThi.length}/{DH_MON_THI_ARRAY_MAX_COUNT} mục
                    </p>
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
