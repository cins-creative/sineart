import LopHocListView, { type AdminLopRow } from "@/app/admin/dashboard/lop-hoc/LopHocListView";
import { fetchHvStatsByLopIds } from "@/lib/data/admin-lop-hoc-enrollment-stats";
import { normalizePortfolioToUrls } from "@/lib/data/courses-page";
import { parseTeacherIds } from "@/lib/utils/parse-teacher-ids";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function LopHocPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
      </div>
    );
  }

  const lopSelectFull =
    "id, class_name, class_full_name, mon_hoc, teacher, chi_nhanh_id, avatar, lich_hoc, url_class, url_google_meet, device, special, tinh_trang";
  const lopSelectMin =
    "id, class_name, class_full_name, mon_hoc, teacher, chi_nhanh_id, avatar, lich_hoc, url_class, device, special, tinh_trang";

  const [lopRes0, monRes, nsRes, cnRes, banRes] = await Promise.all([
    supabase.from("ql_lop_hoc").select(lopSelectFull).order("class_full_name", { ascending: true }),
    supabase.from("ql_mon_hoc").select("id, ten_mon_hoc").order("ten_mon_hoc", { ascending: true }),
    supabase.from("hr_nhan_su").select("id, full_name, avatar, ban, portfolio").order("full_name", { ascending: true }),
    supabase.from("ql_chi_nhanh").select("id, ten").order("id", { ascending: true }),
    supabase.from("hr_ban").select("id, ten_ban"),
  ]);

  let lopData: Record<string, unknown>[] | null = null;
  if (lopRes0.error) {
    const msg = lopRes0.error.message.toLowerCase();
    if (msg.includes("column") || msg.includes("schema")) {
      const retry = await supabase
        .from("ql_lop_hoc")
        .select(lopSelectMin)
        .order("class_full_name", { ascending: true });
      if (retry.error) {
        return (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            Không tải được lớp học: {retry.error.message}
          </div>
        );
      }
      lopData = (retry.data ?? []) as Record<string, unknown>[];
    } else {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Không tải được lớp học: {lopRes0.error.message}
        </div>
      );
    }
  } else {
    lopData = (lopRes0.data ?? []) as Record<string, unknown>[];
  }

  if (monRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được môn học: {monRes.error.message}
      </div>
    );
  }
  if (nsRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được nhân sự: {nsRes.error.message}
      </div>
    );
  }

  const monRows = (monRes.data ?? []) as { id?: unknown; ten_mon_hoc?: unknown }[];
  const monList = monRows
    .map((r) => ({
      id: Number(r.id),
      ten_mon_hoc: r.ten_mon_hoc != null ? String(r.ten_mon_hoc).trim() || null : null,
    }))
    .filter((m) => Number.isFinite(m.id) && m.id > 0);

  // Tìm ban ID của "Đào tạo" để filter danh sách picker
  const banRows = (!banRes.error ? banRes.data ?? [] : []) as { id?: unknown; ten_ban?: unknown }[];
  const daotaoBan = banRows.find((b) =>
    String(b.ten_ban ?? "")
      .trim()
      .toLowerCase()
      .includes("đào tạo"),
  );
  const daotaoBanId =
    daotaoBan?.id != null && Number.isFinite(Number(daotaoBan.id)) ? Number(daotaoBan.id) : null;

  const nsRows = (nsRes.data ?? []) as {
    id?: unknown;
    full_name?: unknown;
    avatar?: unknown;
    ban?: unknown;
    portfolio?: unknown;
  }[];
  const nhanSuListFull = nsRows
    .map((r) => ({
      id: Number(r.id),
      full_name: String(r.full_name ?? "").trim() || "—",
      avatar: r.avatar != null ? String(r.avatar).trim() || null : null,
      banId: r.ban != null && Number.isFinite(Number(r.ban)) ? Number(r.ban) : null,
      portfolio: normalizePortfolioToUrls(r.portfolio),
    }))
    .filter((n) => Number.isFinite(n.id) && n.id > 0);

  // Full list để hiển thị (card, detail panel)
  const nhanSuList = nhanSuListFull.map(({ id, full_name, avatar, portfolio }) => ({ id, full_name, avatar, portfolio }));

  // Picker list — chỉ giáo viên thuộc ban "Đào tạo"; fallback toàn bộ nếu chưa cấu hình ban
  const pickerNhanSuList =
    daotaoBanId != null
      ? nhanSuListFull
          .filter((n) => n.banId === daotaoBanId)
          .map(({ id, full_name, avatar, portfolio }) => ({ id, full_name, avatar, portfolio }))
      : nhanSuList;

  const cnRows = !cnRes.error ? ((cnRes.data ?? []) as { id?: unknown; ten?: unknown }[]) : [];
  const chiNhanhList = cnRows
    .map((r) => ({
      id: Number(r.id),
      ten: String(r.ten ?? "").trim() || `CN #${r.id}`,
    }))
    .filter((c) => Number.isFinite(c.id) && c.id > 0);

  const lopRowsRaw = lopData ?? [];
  const rows: AdminLopRow[] = lopRowsRaw.map((raw) => {
    const id = Number(raw.id);
    const teacherIds = parseTeacherIds(raw.teacher);
    return {
      id: Number.isFinite(id) && id > 0 ? id : 0,
      class_name: raw.class_name != null ? String(raw.class_name).trim() || null : null,
      class_full_name: raw.class_full_name != null ? String(raw.class_full_name).trim() || null : null,
      mon_hoc: raw.mon_hoc != null && Number.isFinite(Number(raw.mon_hoc)) ? Number(raw.mon_hoc) : null,
      teacher: teacherIds,
      chi_nhanh_id:
        raw.chi_nhanh_id != null && Number.isFinite(Number(raw.chi_nhanh_id))
          ? Number(raw.chi_nhanh_id)
          : null,
      avatar: raw.avatar != null ? String(raw.avatar).trim() || null : null,
      lich_hoc: raw.lich_hoc != null ? String(raw.lich_hoc).trim() || null : null,
      url_class: raw.url_class != null ? String(raw.url_class).trim() || null : null,
      url_google_meet:
        raw.url_google_meet != null ? String(raw.url_google_meet).trim() || null : null,
      device: raw.device != null ? String(raw.device).trim() || null : null,
      special: raw.special != null && String(raw.special).trim() !== "",
      tinh_trang: raw.tinh_trang !== false, // default true nếu null/undefined
    };
  });

  const validRows = rows.filter((x) => x.id > 0);
  const statsMap = await fetchHvStatsByLopIds(supabase, validRows.map((r) => r.id));
  const statsByLopId: Record<string, { dang_hoc: number; da_nghi: number }> = {};
  for (const [k, v] of statsMap) {
    statsByLopId[String(k)] = v;
  }

  const defaultChiNhanhId = chiNhanhList[0]?.id ?? null;

  return (
    <LopHocListView
      rows={validRows}
      monList={monList}
      nhanSuList={nhanSuList}
      pickerNhanSuList={pickerNhanSuList}
      chiNhanhList={chiNhanhList}
      statsByLopId={statsByLopId}
      defaultChiNhanhId={defaultChiNhanhId}
    />
  );
}
