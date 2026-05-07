import {
  Banknote,
  Briefcase,
  Building2,
  CalendarClock,
  GraduationCap,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  User,
  Wallet,
} from "lucide-react";

import type { AdminStaffPersonalDashboardData } from "@/lib/data/admin-staff-personal-dashboard";
import { normalizeHrStaffStatusDisplayLabel } from "@/lib/admin/staff-employment-status";
import StaffPersonalPayrollSection from "@/app/admin/dashboard/ho-so-ca-nhan/[staffId]/StaffPersonalPayrollSection";
import { Field, SectionTitle } from "@/app/admin/dashboard/ho-so-ca-nhan/[staffId]/StaffPersonalDashboardShared";
import { cn } from "@/lib/utils";

function staffInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

function fmtDateVi(ymd: string | null | undefined): string {
  if (!ymd?.trim()) return "—";
  const s = ymd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function employmentStartYmd(data: AdminStaffPersonalDashboardData["staff"]): string | null {
  const sa = data.sa_startdate?.trim();
  if (sa && /^\d{4}-\d{2}-\d{2}/.test(sa)) return sa.slice(0, 10);
  const cr = data.created_at?.trim();
  if (cr) {
    const d = new Date(cr);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function tenureLabelVi(startYmd: string): string {
  const [ys, ms, ds] = startYmd.split("-").map((x) => Number(x));
  if (!Number.isFinite(ys) || !Number.isFinite(ms)) return "—";
  const start = new Date(Date.UTC(ys, ms - 1, Number.isFinite(ds) ? ds : 1));
  const now = new Date();
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const mo = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} năm`);
  if (mo > 0) parts.push(`${mo} tháng`);
  if (parts.length === 0) parts.push("dưới 1 tháng");
  return parts.join(" ");
}

function fmtVnd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n)));
}

function kyLabel(row: AdminStaffPersonalDashboardData["bangLuong"][number]): string {
  const tRaw = row.ky_thang?.trim();
  const y = row.ky_nam?.trim();
  const t =
    tRaw && /^tháng\s+/i.test(tRaw) ? tRaw.replace(/^tháng\s+/i, "").trim() || tRaw : tRaw;
  if (t && y) return `Tháng ${t} / ${y}`;
  if (y) return `Năm ${y}`;
  if (row.created_at) {
    const d = new Date(row.created_at);
    if (!Number.isNaN(d.getTime())) return `Tạo ${fmtDateVi(d.toISOString().slice(0, 10))}`;
  }
  return `Phiếu #${row.id}`;
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: Readonly<{
  icon: import("react").ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub?: string;
}>) {
  return (
    <div className="min-w-0 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm ring-1 ring-black/[0.03]">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f8a668] to-[#ee5ca2] text-white shadow-md shadow-[#ee5ca2]/25">
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/45">{label}</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-[#1a1a1a]">{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-black/50">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function statusPillClass(label: string): string {
  const n = label.trim().toLowerCase();
  if (n.includes("nghỉ") || n === "nghi")
    return "border-red-200/80 bg-red-50 text-red-800";
  if (n.includes("thử") || n.includes("thu"))
    return "border-amber-200/90 bg-amber-50 text-amber-900";
  if (n.includes("đang") || n.includes("dang"))
    return "border-emerald-200/90 bg-emerald-50 text-emerald-900";
  return "border-black/[0.08] bg-black/[0.04] text-black/75";
}

export default function StaffPersonalDashboardView({
  payload,
  isSelf,
}: Readonly<{
  payload: AdminStaffPersonalDashboardData;
  isSelf: boolean;
}>) {
  const { staff, chiNhanhTen, phongLabel, banLabel, bangLuong, lopGiang } = payload;
  const startYmd = employmentStartYmd(staff);
  const statusLabel = normalizeHrStaffStatusDisplayLabel(staff.status);
  const displayName = staff.full_name?.trim() || "Nhân sự";
  const avatarUrl = staff.avatar?.trim() || null;
  const recentKy = bangLuong[0] ? kyLabel(bangLuong[0]) : null;

  return (
    <div className="min-h-full w-full min-w-0 max-w-full overflow-x-hidden bg-[#F5F4F2] pb-12 pt-4">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-8 md:px-6">
        <header className="max-w-full min-w-0 overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-4 shadow-sm ring-1 ring-black/[0.03] md:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm md:h-[96px] md:w-[96px]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-2xl font-bold text-white md:text-3xl"
                    style={{ background: "linear-gradient(135deg, #f8a668, #ee5ca2)" }}
                    aria-hidden
                  >
                    {staffInitial(displayName)}
                  </div>
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-[#1a1a1a] md:text-2xl">{displayName}</h1>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      isSelf
                        ? "border-[#bc89f8]/40 bg-[#f5f0ff] text-[#6b21a8]"
                        : "border-black/[0.08] bg-black/[0.04] text-black/60",
                    )}
                  >
                    {isSelf ? "Hồ sơ của bạn" : "Xem hồ sơ"}
                  </span>
                </div>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-black/55">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#1a1a1a]/85">
                    <Briefcase className="h-3.5 w-3.5 text-[#c2417c]" strokeWidth={2} aria-hidden />
                    {staff.vai_tro?.trim() || "—"}
                  </span>
                  <span className="text-black/25" aria-hidden>
                    ·
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      statusPillClass(statusLabel),
                    )}
                  >
                    {statusLabel}
                  </span>
                </p>
                <p className="mt-3 max-w-xl text-xs leading-relaxed text-black/45">
                  Thông tin nhân sự, thời gian tại Sine Art và các kỳ trả lương.
                </p>
              </div>
            </div>
            <p className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35 sm:pt-1">
              Hồ sơ nhân sự
            </p>
          </div>
        </header>

        {/* Quick stats */}
        <div className="mt-5 grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3">
          <StatTile
            icon={CalendarClock}
            label="Thời gian tại Sine Art"
            value={startYmd ? tenureLabelVi(startYmd) : "—"}
            sub={startYmd ? `Từ ${fmtDateVi(startYmd)}` : undefined}
          />
          <StatTile
            icon={ScrollText}
            label="Kỳ trả lương"
            value={bangLuong.length ? `${bangLuong.length} kỳ` : "—"}
            sub={recentKy ? `Gần nhất: ${recentKy}` : undefined}
          />
          <StatTile
            icon={GraduationCap}
            label="Lớp giảng dạy"
            value={lopGiang.length ? `${lopGiang.length} lớp` : "—"}
            sub={lopGiang.length ? "Theo ghi nhận ql_lop_hoc" : undefined}
          />
        </div>

        <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start lg:gap-5">
          <div className="min-w-0 space-y-4">
            {/* Contact & org */}
            <section className="max-w-full min-w-0 overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] md:p-5">
              <SectionTitle
                icon={User}
                title="Liên hệ & tổ chức"
                description="Thông tin làm việc và phòng ban."
              />
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field icon={Mail} label="Email">
                  {staff.email?.trim() || "—"}
                </Field>
                <Field icon={Phone} label="Điện thoại">
                  {staff.sdt?.trim() || "—"}
                </Field>
                <Field icon={MapPin} label="Chi nhánh">
                  {chiNhanhTen ?? "—"}
                </Field>
                <Field icon={Building2} label="Phòng">
                  {phongLabel ?? "—"}
                </Field>
                <Field icon={IdCard} label="Ban" className="sm:col-span-2">
                  {banLabel ?? "—"}
                </Field>
              </div>
            </section>

            {/* Compensation */}
            <section className="max-w-full min-w-0 overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] md:p-5">
              <SectionTitle
                icon={Wallet}
                title="Lương & thanh toán"
                description="Tham chiếu từ hồ sơ nhân sự (cập nhật tại Quản lý nhân sự)."
              />
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field icon={Banknote} label="Hình thức tính lương">
                  {staff.hinh_thuc_tinh_luong?.trim() || "—"}
                </Field>
                <Field icon={CalendarClock} label="Ngày sinh">
                  {fmtDateVi(staff.ngay_sinh)}
                </Field>
                <Field icon={Wallet} label="Lương cơ bản">
                  {fmtVnd(staff.luong_co_ban)}
                </Field>
                <Field icon={Wallet} label="Trợ cấp">
                  {fmtVnd(staff.tro_cap)}
                </Field>
                <Field icon={Landmark} label="BHXH (mức)">
                  {fmtVnd(staff.bhxh)}
                </Field>
                <Field icon={Landmark} label="STK / Ngân hàng">
                  {[staff.stk_nhan_luong ?? staff.bank_stk, staff.bank_name].filter(Boolean).join(" · ") || "—"}
                </Field>
              </div>
            </section>

            <StaffPersonalPayrollSection staff={staff} bangLuong={bangLuong} />
          </div>

          {/* Sidebar: tenure + teaching */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
            <div className="max-w-full min-w-0 overflow-hidden rounded-3xl border border-[#f8a668]/20 bg-gradient-to-b from-white to-[#fff8f3] p-4 shadow-[0_4px_24px_rgba(248,166,104,0.12)] ring-1 ring-[#f8a668]/15">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c2417c]">
                <CalendarClock className="h-4 w-4" strokeWidth={2} aria-hidden />
                Gắn bó Sine Art
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a]">
                {startYmd ? tenureLabelVi(startYmd) : "—"}
              </p>
              <p className="mt-1 text-xs text-black/50">
                Ngày bắt đầu: <span className="font-semibold text-black/70">{startYmd ? fmtDateVi(startYmd) : "—"}</span>
              </p>
              {staff.hop_dong_lao_dong?.trim() ? (
                <p className="mt-4 border-t border-black/[0.06] pt-4 text-xs leading-relaxed text-black/55">
                  <span className="font-semibold text-black/70">HĐLĐ: </span>
                  {staff.hop_dong_lao_dong.trim()}
                </p>
              ) : null}
            </div>

            {lopGiang.length > 0 ? (
              <div className="max-w-full min-w-0 overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03]">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#bc89f8]/15 to-[#ee5ca2]/10 text-[#7c3aed]">
                    <GraduationCap className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1a1a1a]">Lớp giảng dạy</h3>
                    <p className="text-[10px] text-black/45">Chủ nhiệm / GV trên lớp</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {lopGiang.map((l) => (
                    <li
                      key={l.id}
                      className="rounded-xl border border-black/[0.05] bg-[#fafafa]/80 px-3 py-2.5 text-sm transition-colors hover:border-[#f8a668]/30 hover:bg-white"
                    >
                      <span className="font-semibold text-[#1a1a1a]">{l.class_full_name?.trim() || l.class_name}</span>
                      {l.ten_mon_hoc ? (
                        <span className="mt-0.5 block text-xs text-black/45">{l.ten_mon_hoc}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
