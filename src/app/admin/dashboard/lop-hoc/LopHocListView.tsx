"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, Pencil, Plus, School, Search, X } from "lucide-react";

import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import type { LopHocFormState } from "@/app/admin/dashboard/lop-hoc/actions";
import { createLopHoc, deleteLopHoc, updateLopHoc } from "@/app/admin/dashboard/lop-hoc/actions";
import { cn } from "@/lib/utils";

const DS = {
  teacher: "#BC8AF9",
  border: "#EAEAEA",
  green: "#10b981",
};

const DEVICE_OPTS = ["Tablet", "Laptop"] as const;

const DEVICE_CFG: Record<string, { bg: string; text: string }> = {
  Tablet: { bg: "#eff6ff", text: "#2563eb" },
  Laptop: { bg: "#f0fdf4", text: "#16a34a" },
};

export type AdminLopRow = {
  id: number;
  class_name: string | null;
  class_full_name: string | null;
  mon_hoc: number | null;
  teacher: number | null;
  chi_nhanh_id: number | null;
  avatar: string | null;
  lich_hoc: string | null;
  url_class: string | null;
  url_google_meet: string | null;
  device: string | null;
};

type MonOpt = { id: number; ten_mon_hoc: string | null };
type NsOpt = { id: number; full_name: string; avatar: string | null };
type ChiOpt = { id: number; ten: string };

type Props = {
  rows: AdminLopRow[];
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  chiNhanhList: ChiOpt[];
  statsByLopId: Record<string, { dang_hoc: number; da_nghi: number }>;
  defaultChiNhanhId: number | null;
};

type HvStats = { dang_hoc: number; da_nghi: number };

function getAccent(tenMon: string | null): string {
  if (!tenMon) return DS.teacher;
  const l = tenMon.toLowerCase();
  if (l.includes("hình họa") || l.includes("chân dung") || l.includes("tĩnh vật") || l.includes("ký họa")) {
    return "#D4920E";
  }
  if (l.includes("trang trí") || l.includes("màu nước")) return "#9B6FF0";
  if (l.includes("bố cục")) return "#0DA874";
  if (l.includes("digital")) return "#2074CA";
  return DS.teacher;
}

function getAccentText(accent: string): string {
  const m: Record<string, string> = {
    "#D4920E": "#713f12",
    "#9B6FF0": "#4a1d96",
    "#0DA874": "#065f46",
    "#2074CA": "#ffffff",
    [DS.teacher]: "#4a1d96",
  };
  return m[accent] ?? "#323232";
}

function inpClass(): string {
  return cn(
    "w-full rounded-[10px] border-[1.5px] border-[#EAEAEA] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]",
    "outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
  );
}

function NsAvatar({ name, src, size = 28 }: { name: string; src?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (src && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,#BC8AF9,#ED5C9D)",
      }}
    >
      {initial}
    </div>
  );
}

function LopHocCard({
  item,
  monList,
  nhanSuList,
  hvStats,
  isSelected,
  onClick,
}: {
  item: AdminLopRow;
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  hvStats: HvStats | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tenMon = monList.find((m) => m.id === item.mon_hoc)?.ten_mon_hoc ?? null;
  const gv = nhanSuList.find((n) => n.id === item.teacher) ?? null;
  const devCfg = item.device ? DEVICE_CFG[item.device] ?? { bg: "#f3f4f6", text: "#6b7280" } : null;
  const accent = getAccent(tenMon);
  const aText = getAccentText(accent);
  const [imgErr, setImgErr] = useState(false);

  const subTitle =
    hvStats != null
      ? `${hvStats.dang_hoc} đang học${hvStats.da_nghi > 0 ? ` · ${hvStats.da_nghi} đã nghỉ` : ""}`
      : "—";

  return (
    <motion.div
      role="button"
      tabIndex={0}
      layout
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      whileHover={{ y: -2, borderColor: DS.teacher }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border-[1.5px] bg-white text-left shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#BC8AF9]/40",
        isSelected && "ring-2 ring-[#BC8AF9]/25"
      )}
      style={{
        borderColor: isSelected ? DS.teacher : DS.border,
        boxShadow: isSelected ? "0 6px 20px rgba(188,138,249,0.18)" : "0 1px 4px rgba(0,0,0,.06)",
      }}
    >
      <div className="relative aspect-[16/7] w-full bg-[#F5F7F7]">
        {item.avatar && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatar}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🏫</div>
        )}
        {devCfg && item.device ? (
          <div
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm"
            style={{ background: devCfg.bg, color: devCfg.text }}
          >
            {item.device}
          </div>
        ) : null}
        {tenMon ? (
          <div
            className="absolute right-2 top-2 max-w-[min(100%,12rem)] truncate rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-sm"
            style={{
              background: `${accent}f0`,
              color: aText,
              borderColor: `${accent}55`,
            }}
          >
            {tenMon}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
        <p className="m-0 line-clamp-2 text-sm font-bold text-[#1a1a2e]">
          {item.class_name || item.class_full_name || "—"}
        </p>
        {item.class_full_name && item.class_name ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[#AAAAAA]">{item.class_full_name}</p>
        ) : null}
        {gv ? (
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <NsAvatar name={gv.full_name} src={gv.avatar} size={22} />
            <span className="truncate text-[11px] font-semibold text-[#666]">{gv.full_name}</span>
          </div>
        ) : null}
        {item.lich_hoc ? (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#888]">
            <Calendar className="h-3 w-3 shrink-0 text-[#AAAAAA]" />
            <span className="line-clamp-1">{item.lich_hoc}</span>
          </div>
        ) : null}
        <p className="mt-1 text-[11px] tabular-nums text-[#AAAAAA]">{subTitle}</p>
      </div>
      <div className="flex border-t border-[#F5F7F7]">
        <span className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[#888]">
          Chi tiết
        </span>
        {item.url_class ? (
          <a
            href={item.url_class}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center border-l border-[#F5F7F7] px-3.5 py-2.5 text-[#AAAAAA] transition hover:bg-[#BC8AF9]/10 hover:text-[#BC8AF9]"
            title="Mở URL lớp"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            🔗
          </a>
        ) : null}
      </div>
    </motion.div>
  );
}

type DetailForm = {
  class_name: string;
  class_full_name: string;
  mon_hoc: string;
  teacher: string;
  chi_nhanh_id: string;
  device: string;
  lich_hoc: string;
  url_class: string;
  url_google_meet: string;
  avatar: string;
};

function rowToForm(r: AdminLopRow): DetailForm {
  return {
    class_name: r.class_name ?? "",
    class_full_name: r.class_full_name ?? "",
    mon_hoc: r.mon_hoc != null ? String(r.mon_hoc) : "",
    teacher: r.teacher != null ? String(r.teacher) : "",
    chi_nhanh_id: r.chi_nhanh_id != null ? String(r.chi_nhanh_id) : "",
    device: r.device ?? "",
    lich_hoc: r.lich_hoc ?? "",
    url_class: r.url_class ?? "",
    url_google_meet: r.url_google_meet ?? "",
    avatar: r.avatar ?? "",
  };
}

function LopDetailPanel({
  item,
  monList,
  nhanSuList,
  chiNhanhList,
  hvStats,
  onClose,
}: {
  item: AdminLopRow;
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  chiNhanhList: ChiOpt[];
  hvStats: HvStats | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DetailForm>(() => rowToForm(item));
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, startTransition] = useTransition();
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => {
    setForm(rowToForm(item));
    setEditing(false);
    setErr(null);
    setConfirmDel(false);
  }, [item]);

  const tenMon = monList.find((m) => m.id === item.mon_hoc)?.ten_mon_hoc ?? null;
  const gv = nhanSuList.find((n) => n.id === item.teacher) ?? null;
  const devCfg = item.device ? DEVICE_CFG[item.device] ?? { bg: "#f3f4f6", text: "#6b7280" } : null;

  function setK<K extends keyof DetailForm>(k: K, v: DetailForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function save() {
    setErr(null);
    const fd = new FormData();
    fd.set("id", String(item.id));
    fd.set("class_name", form.class_name);
    fd.set("class_full_name", form.class_full_name);
    fd.set("mon_hoc", form.mon_hoc);
    fd.set("teacher", form.teacher);
    fd.set("chi_nhanh_id", form.chi_nhanh_id);
    fd.set("device", form.device);
    fd.set("lich_hoc", form.lich_hoc);
    fd.set("url_class", form.url_class);
    fd.set("url_google_meet", form.url_google_meet);
    fd.set("avatar", form.avatar);
    startTransition(async () => {
      const r = await updateLopHoc(null, fd);
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else if (!r.ok) {
        setErr(r.error);
      }
    });
  }

  async function remove() {
    setDelBusy(true);
    setErr(null);
    try {
      const r = await deleteLopHoc(item.id);
      if (r.ok) {
        onClose();
        router.refresh();
      } else if (!r.ok) {
        setErr(r.error);
      }
    } finally {
      setDelBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div
        className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-black/[0.06] px-4 py-3.5"
        style={{ background: "linear-gradient(135deg,#BC8AF910,#ED5C9D08)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-[#888] hover:bg-white"
          aria-label="Đóng"
        >
          <ChevronLeft size={16} />
        </button>
        {item.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatar}
            alt=""
            className="h-[42px] w-[42px] shrink-0 rounded-[10px] object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] text-xl" style={{ background: "linear-gradient(135deg,#BC8AF9,#ED5C9D)" }}>
            🏫
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-[15px] font-extrabold text-[#1a1a2e]">
            {item.class_full_name || item.class_name || "—"}
          </h2>
          <div className="mt-1 flex flex-wrap gap-1">
            {item.class_name && item.class_full_name ? (
              <span
                className="rounded-full px-2 py-px text-[10px] font-semibold"
                style={{ color: DS.teacher, background: `${DS.teacher}22` }}
              >
                {item.class_name}
              </span>
            ) : null}
            {devCfg && item.device ? (
              <span className="rounded-full px-2 py-px text-[10px] font-bold" style={{ background: devCfg.bg, color: devCfg.text }}>
                {item.device}
              </span>
            ) : null}
          </div>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#666] hover:bg-white"
          >
            <Pencil size={13} /> Sửa
          </button>
        ) : (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(rowToForm(item));
                setErr(null);
              }}
              className="rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-[11px] text-[#666]"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-gradient-to-r from-[#BC8AF9] to-[#ED5C9D] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {pending ? "Lưu…" : "✓ Lưu"}
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">✕ {err}</div>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[14px] border border-emerald-200/50 bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] p-3.5">
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-emerald-600">Đang học</p>
            <p className="m-0 mt-1.5 text-3xl font-extrabold leading-none text-emerald-600">{hvStats?.dang_hoc ?? "—"}</p>
            <p className="mt-1 text-[10px] text-emerald-600/80">học viên</p>
          </div>
          <div className="rounded-[14px] border border-slate-200/80 bg-gradient-to-br from-slate-400/10 to-slate-400/[0.02] p-3.5">
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Đã nghỉ</p>
            <p className="m-0 mt-1.5 text-3xl font-extrabold leading-none text-slate-600">{hvStats?.da_nghi ?? "—"}</p>
            <p className="mt-1 text-[10px] text-slate-500">học viên</p>
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: DS.teacher }}>
            Thông tin lớp
          </p>
          {editing ? (
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Tên lớp đầy đủ</div>
                <input className={inpClass()} value={form.class_full_name} onChange={(e) => setK("class_full_name", e.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Tên lớp rút gọn</div>
                <input className={inpClass()} value={form.class_name} onChange={(e) => setK("class_name", e.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Môn học</div>
                <select className={inpClass()} value={form.mon_hoc} onChange={(e) => setK("mon_hoc", e.target.value)}>
                  <option value="">— Chọn —</option>
                  {monList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.ten_mon_hoc ?? `#${m.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Chi nhánh</div>
                <select className={inpClass()} value={form.chi_nhanh_id} onChange={(e) => setK("chi_nhanh_id", e.target.value)}>
                  <option value="">— Chọn —</option>
                  {chiNhanhList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ten}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Giáo viên</div>
                <select className={inpClass()} value={form.teacher} onChange={(e) => setK("teacher", e.target.value)}>
                  <option value="">— Chọn —</option>
                  {nhanSuList.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Thiết bị</div>
                <select className={inpClass()} value={form.device} onChange={(e) => setK("device", e.target.value)}>
                  <option value="">— Chọn —</option>
                  {DEVICE_OPTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Lịch học</div>
                <input
                  className={inpClass()}
                  value={form.lich_hoc}
                  onChange={(e) => setK("lich_hoc", e.target.value)}
                  placeholder="T2, T4, T6 — 8:00"
                />
              </div>
            </div>
          ) : (
            <dl className="m-0 space-y-2 text-[13px]">
              <div className="flex justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Tên lớp</dt>
                <dd className="m-0 font-semibold text-gray-800">{item.class_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Tên đầy đủ</dt>
                <dd className="m-0 text-right font-semibold text-gray-800">{item.class_full_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Môn học</dt>
                <dd className="m-0 font-semibold" style={{ color: DS.teacher }}>
                  {tenMon ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Giáo viên</dt>
                <dd className="m-0">
                  {gv ? (
                    <span className="flex items-center gap-2">
                      <NsAvatar name={gv.full_name} src={gv.avatar} size={28} />
                      <span className="font-bold text-pink-500">{gv.full_name}</span>
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#f0f0f0] py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Thiết bị</dt>
                <dd className="m-0 font-semibold">{item.device ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-[10px] font-bold uppercase text-[#AAA]">Lịch học</dt>
                <dd className="m-0 font-semibold text-gray-700">{item.lich_hoc ?? "—"}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-600">Đường dẫn</p>
          {editing ? (
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">URL lớp học</div>
                <input className={inpClass()} value={form.url_class} onChange={(e) => setK("url_class", e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">URL Google Meet</div>
                <input
                  className={inpClass()}
                  value={form.url_google_meet}
                  onChange={(e) => setK("url_google_meet", e.target.value)}
                  placeholder="https://meet.google.com/…"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-[13px]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#AAA]">URL lớp học</span>
                {item.url_class ? (
                  <a href={item.url_class} target="_blank" rel="noreferrer" className="mt-1 block break-all text-blue-600">
                    {item.url_class}
                  </a>
                ) : (
                  <p className="m-0 mt-1 text-gray-300">—</p>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#AAA]">Google Meet</span>
                {item.url_google_meet ? (
                  <a href={item.url_google_meet} target="_blank" rel="noreferrer" className="mt-1 block break-all text-emerald-600">
                    {item.url_google_meet}
                  </a>
                ) : (
                  <p className="m-0 mt-1 text-gray-300">—</p>
                )}
              </div>
            </div>
          )}
        </div>

        {editing ? (
          <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
            <AdminCfImageInput
              label="Ảnh lớp"
              value={form.avatar}
              onValueChange={(u) => setK("avatar", u)}
            />
          </div>
        ) : null}

        {!editing ? (
          <div className="pt-1">
            {confirmDel ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px]">
                <p className="m-0 mb-2 font-semibold text-red-800">Xóa «{item.class_full_name || item.class_name || "lớp"}»?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmDel(false)} className="flex-1 rounded-lg border border-red-200 bg-white py-2 text-xs font-semibold text-red-700">
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={delBusy}
                    onClick={remove}
                    className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {delBusy ? "…" : "Xóa"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDel(true)}
                className="w-full rounded-[10px] border border-red-200 bg-red-50 py-2 text-xs font-semibold text-red-600"
              >
                🗑 Xóa lớp học này
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateLopModal({
  open,
  onClose,
  monList,
  nhanSuList,
  chiNhanhList,
  defaultChiNhanhId,
}: {
  open: boolean;
  onClose: () => void;
  monList: MonOpt[];
  nhanSuList: NsOpt[];
  chiNhanhList: ChiOpt[];
  defaultChiNhanhId: number | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createLopHoc, null as LopHocFormState | null);

  useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest" style={{ color: DS.teacher }}>
              Tạo mới
            </p>
            <h2 className="m-0 text-base font-extrabold text-[#1a1a2e]">Lớp học mới</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] text-[#888]">
            <X size={16} />
          </button>
        </div>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {state?.ok === false ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{state.error}</div>
            ) : null}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Tên rút gọn</div>
                <input name="class_name" className={inpClass()} placeholder="VD: HH01" />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Tên đầy đủ *</div>
                <input name="class_full_name" required className={inpClass()} placeholder="VD: Hình họa Online K1" />
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Môn học</div>
              <select name="mon_hoc" className={inpClass()} defaultValue="">
                <option value="">— Chọn môn học —</option>
                {monList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.ten_mon_hoc ?? `#${m.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Chi nhánh</div>
              <select name="chi_nhanh_id" className={inpClass()} defaultValue={defaultChiNhanhId != null ? String(defaultChiNhanhId) : ""}>
                <option value="">— Chọn chi nhánh —</option>
                {chiNhanhList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.ten}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Giáo viên</div>
              <select name="teacher" className={inpClass()} defaultValue="">
                <option value="">— Chọn giáo viên —</option>
                {nhanSuList.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Thiết bị</div>
                <select name="device" className={inpClass()} defaultValue="">
                  <option value="">— Chọn —</option>
                  {DEVICE_OPTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Lịch học</div>
                <input name="lich_hoc" className={inpClass()} placeholder="T2, T4, T6 — 8:00" />
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">URL lớp học</div>
              <input name="url_class" type="url" className={inpClass()} placeholder="https://…" />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">Google Meet</div>
              <input name="url_google_meet" type="url" className={inpClass()} placeholder="https://meet.google.com/…" />
            </div>
            <AdminCfImageInput label="Ảnh lớp" name="avatar" defaultValue="" />
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-[#f0f0f0] px-5 py-3">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] text-[#666]">
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-[10px] bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {pending ? "Đang tạo…" : "✓ Tạo lớp học"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function LopHocListView({
  rows,
  monList,
  nhanSuList,
  chiNhanhList,
  statsByLopId,
  defaultChiNhanhId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(960);
  const [lopSearch, setLopSearch] = useState("");
  const [filterMon, setFilterMon] = useState<number | "">("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = w < 580;

  const filteredLop = useMemo(() => {
    const s = lopSearch.toLowerCase().trim();
    return rows.filter((l) => {
      const nameHit =
        !s ||
        (l.class_full_name ?? "").toLowerCase().includes(s) ||
        (l.class_name ?? "").toLowerCase().includes(s);
      const gv = nhanSuList.find((n) => n.id === l.teacher);
      const gvHit = gv ? gv.full_name.toLowerCase().includes(s) : false;
      const monOk = filterMon === "" || l.mon_hoc === filterMon;
      return (nameHit || gvHit) && monOk;
    });
  }, [rows, lopSearch, filterMon, nhanSuList]);

  const { tongDangHoc, tongDaNghi } = useMemo(() => {
    let d = 0;
    let n = 0;
    for (const r of rows) {
      const st = statsByLopId[String(r.id)];
      if (st) {
        d += st.dang_hoc;
        n += st.da_nghi;
      }
    }
    return { tongDangHoc: d, tongDaNghi: n };
  }, [rows, statsByLopId]);

  const selected = selectedId != null ? rows.find((r) => r.id === selectedId) ?? null : null;

  return (
    <div ref={containerRef} className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <School className="text-white" size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Quản lý lớp học</div>
            <div className="text-xs text-[#AAAAAA]">
              {rows.length} lớp · {tongDangHoc} học viên đang học
              {tongDaNghi > 0 ? ` · ${tongDaNghi} đã nghỉ` : ""}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus size={15} /> Lớp học mới
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
          <div className="mx-auto flex min-h-[min(64vh,560px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="shrink-0 space-y-2 border-b border-[#EAEAEA] bg-white px-6 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input
                value={lopSearch}
                onChange={(e) => setLopSearch(e.target.value)}
                placeholder="Tìm tên lớp, giáo viên…"
                className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-white pl-9 pr-9 text-xs text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
              />
              {lopSearch ? (
                <button
                  type="button"
                  aria-label="Xóa tìm"
                  onClick={() => setLopSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/60"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterMon("")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  filterMon === "" ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]" : "border-[#EAEAEA] text-black/50"
                )}
              >
                Tất cả
              </button>
              {monList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFilterMon(filterMon === m.id ? "" : m.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    filterMon === m.id ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]" : "border-[#EAEAEA] text-black/50"
                  )}
                >
                  {m.ten_mon_hoc ?? `#${m.id}`}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
            {filteredLop.length === 0 ? (
              <div className="flex flex-col items-center gap-2 pt-12 text-center">
                <span className="text-4xl">🏫</span>
                <p className="m-0 text-sm text-[#888]">
                  {lopSearch || filterMon !== "" ? "Không tìm thấy lớp phù hợp" : "Chưa có lớp học nào. Nhấn «Lớp học mới»."}
                </p>
              </div>
            ) : (
              <div className={cn("grid gap-3.5 pb-2 pt-1", isMobile ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(220px,1fr))]")}>
                {filteredLop.map((item) => {
                  const st = statsByLopId[String(item.id)];
                  return (
                    <LopHocCard
                      key={item.id}
                      item={item}
                      monList={monList}
                      nhanSuList={nhanSuList}
                      hvStats={st ?? { dang_hoc: 0, da_nghi: 0 }}
                      isSelected={selectedId === item.id}
                      onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected ? (
          <>
            <motion.button
              key="lop-detail-backdrop"
              type="button"
              aria-label="Đóng"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/35 backdrop-blur-[2px]"
              onClick={() => setSelectedId(null)}
            />
            <motion.div
              key={`lop-detail-drawer-${selected.id}`}
              role="dialog"
              aria-modal="true"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-0 right-0 top-0 z-[110] flex w-full max-w-[min(100vw,440px)] flex-col border-l border-[#EAEAEA] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]"
            >
              <LopDetailPanel
                item={selected}
                monList={monList}
                nhanSuList={nhanSuList}
                chiNhanhList={chiNhanhList}
                hvStats={statsByLopId[String(selected.id)] ?? null}
                onClose={() => setSelectedId(null)}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate ? (
          <CreateLopModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            monList={monList}
            nhanSuList={nhanSuList}
            chiNhanhList={chiNhanhList}
            defaultChiNhanhId={defaultChiNhanhId}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
