import type { AdminChiTietDisplay, AdminHpDonRow } from "@/lib/data/admin-quan-ly-hoa-don";
import { isHcBanDonDaThanhToan, resolveBanDonCodes } from "@/lib/data/hc-don-ban-helpers";
import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import {
  hpGoiHocPhiSelectForTable,
  hpParseMoney,
  hpResolveHocPhiDong,
} from "@/lib/data/hp-goi-payable";
import { computePayrollNetSalary, type PayslipSnapshot } from "@/lib/payroll-snapshot";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_HP_DONS = 4000;
const MAX_HC_DONS = 2000;
const MAX_TC_KHAC = 5000;
const MAX_LUONG = 5000;

/** Nguồn «Lương» trên trang thống kê thu chi (gộp theo kỳ: Giáo viên / Vận hành). */
export const THONG_KE_THU_CHI_INCLUDE_LUONG = true;

export type ThongKeThuChiNguon = "hoc-phi" | "hoa-cu" | "hoa-cu-nhap" | "thu-chi-khac" | "luong";

export type AdminThongKeThuChiRow = {
  id: string;
  nguon: ThongKeThuChiNguon;
  datetime: string;
  maDon: string;
  tieude: string;
  hinhThuc: string;
  thu: number;
  chi: number;
  trangThai: string;
  ghiChu: string;
  /** Các lớp trong đơn học phí (nếu có nhiều dòng chi tiết). */
  lopHoc?: string;
  /** Môn / khóa học (`ql_mon_hoc`) theo gói hoặc lớp. */
  khoaHoc?: string;
  /** Kỳ lương (vd. `5/2026`) — nguồn `luong`. */
  kyLuong?: string;
};

export type AdminThongKeThuChiBundle = {
  rows: AdminThongKeThuChiRow[];
};

function nId(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseMoney(v: unknown): number {
  return hpParseMoney(v);
}

function subtotalChi(chi: AdminChiTietDisplay[]): number {
  return chi.reduce((s, c) => s + (c.hoc_phi_display ?? 0), 0);
}

function totalDon(don: AdminHpDonRow, chi: AdminChiTietDisplay[]): number {
  return Math.max(
    0,
    Math.round(subtotalChi(chi) - parseMoney(don.giam_gia) - parseMoney(don.giam_gia_vnd)),
  );
}

function isoOrEmpty(v: string | null | undefined): string {
  if (v == null || String(v).trim() === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00.000Z`;
  return s;
}

function khoaHocLabelForChi(
  c: AdminChiTietDisplay,
  goiRowById: Map<number, Record<string, unknown>>,
  lopMonById: Map<number, number>,
  monNameById: Map<number, string>,
): string | null {
  const goiRow = c.goi_hoc_phi != null ? goiRowById.get(c.goi_hoc_phi) : undefined;
  const goiMon = goiRow != null ? nId(goiRow.mon_hoc) : null;
  const lopMon = c.lop_id != null ? lopMonById.get(c.lop_id) ?? null : null;
  const monId = goiMon ?? lopMon;
  if (!monId) return null;
  return monNameById.get(monId) ?? `Môn #${monId}`;
}

function formatKyLuong(thang: string | null, nam: string | null): string {
  const t = thang?.trim();
  const n = nam?.trim();
  if (t && n) return `${t}/${n}`;
  if (n) return n;
  return t ?? "";
}

function isMissingColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("column") && (m.includes("does not exist") || m.includes("could not find"));
}

function tonelessVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .toLowerCase()
    .trim();
}

function banLabelMatchesDaoTao(label: string): boolean {
  const ascii = tonelessVi(label).replace(/\s+/g, " ");
  if (ascii.includes("dao tao")) return true;
  if (
    ascii.includes("giang day") ||
    ascii.includes("giao duc") ||
    ascii.includes("giang vien") ||
    ascii.includes("training")
  ) {
    return true;
  }
  return false;
}

type LuongChiBucket = "giao-vien" | "van-hanh";

/** Chỉ ban Đào tạo (một card) → Giáo viên; Đào tạo + ban khác hoặc không thuộc Đào tạo → Vận hành. */
function classifyPayrollChiBucket(banIds: readonly number[], banById: Map<number, string>): LuongChiBucket {
  const hasDaoTao = banIds.some((id) => banLabelMatchesDaoTao(banById.get(id) ?? ""));
  if (hasDaoTao && banIds.length === 1) return "giao-vien";
  return "van-hanh";
}

function luongChiBucketLabel(bucket: LuongChiBucket): string {
  return bucket === "giao-vien" ? "Chi lương Giáo viên" : "Chi lương Vận hành";
}

function luongChiBucketMaPrefix(bucket: LuongChiBucket): string {
  return bucket === "giao-vien" ? "BL-GV" : "BL-VH";
}

/** Ngày giờ hiển thị / lọc — ưu tiên cuối tháng kỳ lương, fallback `created_at`. */
function payrollPeriodIso(thang: string | null, nam: string | null, createdAt: string | null): string {
  const monthMatch = thang ? /(\d{1,2})/.exec(thang) : null;
  const mm = monthMatch ? Number(monthMatch[1]) : NaN;
  const yy = nam ? Number(String(nam).trim()) : NaN;
  if (Number.isFinite(mm) && mm >= 1 && mm <= 12 && Number.isFinite(yy) && yy >= 2000) {
    return new Date(Date.UTC(yy, mm, 0, 12)).toISOString();
  }
  return isoOrEmpty(createdAt);
}

type ChiBanRow = {
  don_ban: number;
  so_luong_ban: number | null;
  mat_hang: number | null;
  thanh_tien?: number | string | null;
  hc_danh_sach_san_pham?: { ten_hang?: string | null; gia_ban?: number | null } | { ten_hang?: string | null; gia_ban?: number | null }[] | null;
};

function unwrapSp(
  v: { ten_hang?: unknown; gia_ban?: unknown } | { ten_hang?: unknown; gia_ban?: unknown }[] | null | undefined
): { tenHang: string; giaBan: number } {
  const o = Array.isArray(v) ? v[0] : v;
  return {
    tenHang: String(o?.ten_hang ?? "").trim(),
    giaBan: Number(o?.gia_ban) || 0,
  };
}

type ChiNhapThongKeRow = {
  don_nhap: number;
  so_luong_nhap: number | null;
  mat_hang: number | null;
  thanh_tien?: number | string | null;
  hc_danh_sach_san_pham?: { ten_hang?: string | null; gia_nhap?: number | null } | { ten_hang?: string | null; gia_nhap?: number | null }[] | null;
};

function unwrapSpNhap(
  v: { ten_hang?: unknown; gia_nhap?: unknown } | { ten_hang?: unknown; gia_nhap?: unknown }[] | null | undefined
): { tenHang: string; giaNhap: number } {
  const o = Array.isArray(v) ? v[0] : v;
  return {
    tenHang: String(o?.ten_hang ?? "").trim(),
    giaNhap: Number(o?.gia_nhap) || 0,
  };
}

/**
 * Gộp học phí (đã thanh toán), bán họa cụ (chỉ đơn đã thanh toán), nhập họa cụ (chi), thu chi khác cho trang thống kê.
 * Không gồm `hp_giao_dich_thanh_toan` (SePay) — tránh trùng với dòng Học phí đã match đơn.
 * Nguồn lương nhân sự: gộp theo kỳ thành «Chi lương Giáo viên» / «Chi lương Vận hành».
 * Tiền học phí = tổng dòng `hp_thu_hp_chi_tiet` (theo gói) trừ `giam_gia` và `giam_gia_vnd` đơn — cùng logic «Quản lý hóa đơn».
 */
export async function fetchAdminThongKeThuChiBundle(
  supabase: SupabaseClient
): Promise<{ ok: true; data: AdminThongKeThuChiBundle } | { ok: false; error: string }> {
  const rows: AdminThongKeThuChiRow[] = [];

  const [donRes, banDonRes, nhapDonRes, loaiRes, tcKhacRes, dmRes] = await Promise.all([
    supabase
      .from("hp_don_thu_hoc_phi")
      .select(
        "id, created_at, ma_don, ma_don_so, student, nguoi_tao, hinh_thuc_thu, status, ngay_thanh_toan, giam_gia, giam_gia_vnd"
      )
      .in("status", ["paid", "Đã thanh toán"])
      .order("created_at", { ascending: false })
      .limit(MAX_HP_DONS),
    supabase
      .from("hc_don_ban_hoa_cu")
      .select("id, created_at, hinh_thuc_thu, status, ma_don, ma_don_so, tong_tien")
      .order("created_at", { ascending: false })
      .limit(MAX_HC_DONS),
    supabase
      .from("hc_nhap_hoa_cu")
      .select("id, created_at, hinh_thuc_chi, tong_tien, nha_cung_cap")
      .order("created_at", { ascending: false })
      .limit(MAX_HC_DONS),
    supabase.from("tc_loai_thu_chi").select("id, giai_nghia"),
    supabase
      .from("tc_thu_chi_khac")
      .select("id, created_at, tieu_de, chu_thich, thu, chi, hinh_thuc, danh_muc_thu_chi_id, loai_thu_chi_id")
      .order("created_at", { ascending: false })
      .limit(MAX_TC_KHAC),
    supabase.from("tc_danh_muc_thu_chi").select("id, ten"),
  ]);

  if (donRes.error) {
    return { ok: false, error: donRes.error.message || "Không đọc được đơn học phí." };
  }
  if (banDonRes.error) {
    return { ok: false, error: banDonRes.error.message || "Không đọc được đơn bán họa cụ." };
  }
  if (nhapDonRes.error) {
    return { ok: false, error: nhapDonRes.error.message || "Không đọc được đơn nhập họa cụ." };
  }
  if (loaiRes.error) {
    return { ok: false, error: loaiRes.error.message || "Không đọc được loại thu chi." };
  }
  if (tcKhacRes.error) {
    return { ok: false, error: tcKhacRes.error.message || "Không đọc được thu chi khác." };
  }
  if (dmRes.error) {
    return { ok: false, error: dmRes.error.message || "Không đọc được danh mục thu chi." };
  }

  const loaiById = new Map<number, string>();
  for (const r of loaiRes.data ?? []) {
    const row = r as { id?: unknown; giai_nghia?: unknown };
    const id = nId(row.id);
    if (id) loaiById.set(id, String(row.giai_nghia ?? "").trim());
  }

  const dmById = new Map<number, string>();
  for (const r of dmRes.data ?? []) {
    const row = r as { id?: unknown; ten?: unknown };
    const id = nId(row.id);
    if (id) dmById.set(id, String(row.ten ?? "").trim());
  }

  const dons = (donRes.data ?? []) as unknown as AdminHpDonRow[];
  if (dons.length > 0) {
    const donIds = dons.map((d) => d.id).filter((id) => Number.isFinite(id) && id > 0);
    const hvIds = [...new Set(dons.map((d) => nId(d.student)).filter((x): x is number => x != null))];
    const nsIds = [...new Set(dons.map((d) => nId(d.nguoi_tao)).filter((x): x is number => x != null))];

    const { data: chiRaw, error: chiErr } = await supabase
      .from("hp_thu_hp_chi_tiet")
      .select("id, don_thu, khoa_hoc_vien, goi_hoc_phi, ngay_dau_ky, ngay_cuoi_ky, status, hoc_phi_dong")
      .in("don_thu", donIds)
      .order("created_at", { ascending: true });

    if (chiErr) {
      return { ok: false, error: chiErr.message || "Không đọc được chi tiết học phí." };
    }

    const chiList = (chiRaw ?? []) as Record<string, unknown>[];
    const qlIds = [...new Set(chiList.map((c) => nId(c.khoa_hoc_vien)).filter((x): x is number => x != null))];
    const goiIds = [...new Set(chiList.map((c) => nId(c.goi_hoc_phi)).filter((x): x is number => x != null))];

    const goiTable = hpGoiHocPhiTableName();

    const [hvRes, nsRes, qlRes, goiRes] = await Promise.all([
      hvIds.length
        ? supabase.from("ql_thong_tin_hoc_vien").select("id, full_name").in("id", hvIds)
        : Promise.resolve({ data: [] as unknown[], error: null }),
      nsIds.length
        ? supabase.from("hr_nhan_su").select("id, full_name").in("id", nsIds)
        : Promise.resolve({ data: [] as unknown[], error: null }),
      qlIds.length
        ? supabase.from("ql_quan_ly_hoc_vien").select("id, lop_hoc").in("id", qlIds)
        : Promise.resolve({ data: [] as unknown[], error: null }),
      goiIds.length
        ? supabase
            .from(goiTable)
            .select(`${hpGoiHocPhiSelectForTable(goiTable)}, mon_hoc`)
            .in("id", goiIds)
        : Promise.resolve({ data: [] as unknown[], error: null }),
    ]);

    if (hvRes.error || nsRes.error || qlRes.error || goiRes.error) {
      const msg =
        hvRes.error?.message ||
        nsRes.error?.message ||
        qlRes.error?.message ||
        goiRes.error?.message ||
        "Lỗi tải tham chiếu học phí.";
      return { ok: false, error: msg };
    }

    const hvNameById: Record<string, string> = {};
    for (const r of hvRes.data ?? []) {
      const row = r as { id?: unknown; full_name?: unknown };
      const id = nId(row.id);
      if (id) hvNameById[String(id)] = String(row.full_name ?? "").trim() || `HV #${id}`;
    }

    const nsNameById: Record<string, string> = {};
    for (const r of nsRes.data ?? []) {
      const row = r as { id?: unknown; full_name?: unknown };
      const id = nId(row.id);
      if (id) nsNameById[String(id)] = String(row.full_name ?? "").trim() || `NS #${id}`;
    }

    const qlLopById = new Map<number, number>();
    for (const r of qlRes.data ?? []) {
      const row = r as { id?: unknown; lop_hoc?: unknown };
      const qid = nId(row.id);
      const lid = nId(row.lop_hoc);
      if (qid && lid) qlLopById.set(qid, lid);
    }

    const lopIds = [...new Set(qlLopById.values())];
    const lopNameById = new Map<number, string>();
    const lopMonById = new Map<number, number>();
    if (lopIds.length > 0) {
      const { data: lopRows, error: lopErr } = await supabase
        .from("ql_lop_hoc")
        .select("id, class_full_name, class_name, mon_hoc")
        .in("id", lopIds);
      if (lopErr) {
        return { ok: false, error: lopErr.message || "Không đọc được lớp học." };
      }
      for (const r of lopRows ?? []) {
        const row = r as { id?: unknown; class_full_name?: unknown; class_name?: unknown; mon_hoc?: unknown };
        const id = nId(row.id);
        if (!id) continue;
        const name =
          String(row.class_full_name ?? "").trim() || String(row.class_name ?? "").trim() || `Lớp #${id}`;
        lopNameById.set(id, name);
        const monId = nId(row.mon_hoc);
        if (monId) lopMonById.set(id, monId);
      }
    }

    const goiRowById = new Map<number, Record<string, unknown>>();
    for (const r of goiRes.data ?? []) {
      const row = r as Record<string, unknown>;
      const id = nId(row.id);
      if (id) goiRowById.set(id, row);
    }

    const monIds = new Set<number>();
    for (const row of goiRowById.values()) {
      const mid = nId(row.mon_hoc);
      if (mid) monIds.add(mid);
    }
    for (const mid of lopMonById.values()) monIds.add(mid);

    const monNameById = new Map<number, string>();
    if (monIds.size > 0) {
      const { data: monRows, error: monErr } = await supabase
        .from("ql_mon_hoc")
        .select("id, ten_mon_hoc")
        .in("id", [...monIds]);
      if (monErr) {
        return { ok: false, error: monErr.message || "Không đọc được khóa học." };
      }
      for (const r of monRows ?? []) {
        const row = r as { id?: unknown; ten_mon_hoc?: unknown };
        const id = nId(row.id);
        if (!id) continue;
        monNameById.set(id, String(row.ten_mon_hoc ?? "").trim() || `Môn #${id}`);
      }
    }

    const chiByDonId: Record<string, AdminChiTietDisplay[]> = {};

    for (const c of chiList) {
      const id = nId(c.id);
      const donThu = nId(c.don_thu);
      if (!id || !donThu) continue;

      const kcv = nId(c.khoa_hoc_vien);
      const goiId = nId(c.goi_hoc_phi);
      const lopId = kcv != null ? qlLopById.get(kcv) ?? null : null;
      const tenLop = lopId != null ? lopNameById.get(lopId) ?? `Lớp #${lopId}` : "—";

      const goiRow = goiId != null ? goiRowById.get(goiId) : undefined;
      const hocPhiDisplay = hpResolveHocPhiDong(c, goiRow);

      const row: AdminChiTietDisplay = {
        id,
        don_thu: donThu,
        khoa_hoc_vien: kcv,
        goi_hoc_phi: goiId,
        ngay_dau_ky: c.ngay_dau_ky != null ? String(c.ngay_dau_ky).slice(0, 10) : null,
        ngay_cuoi_ky: c.ngay_cuoi_ky != null ? String(c.ngay_cuoi_ky).slice(0, 10) : null,
        status: c.status != null ? String(c.status) : null,
        hoc_phi_display: hocPhiDisplay,
        lop_id: lopId,
        ten_lop: tenLop,
      };

      const key = String(donThu);
      if (!chiByDonId[key]) chiByDonId[key] = [];
      chiByDonId[key].push(row);
    }

    for (const d of dons) {
      const sid = nId(d.student);
      const tenHV = sid != null ? hvNameById[String(sid)] ?? `HV #${sid}` : "—";
      const ts = isoOrEmpty(d.ngay_thanh_toan ?? d.created_at ?? null);
      const chi = chiByDonId[String(d.id)] ?? [];
      const thu = totalDon(d, chi);
      const lopNames = [
        ...new Set(chi.map((c) => c.ten_lop).filter((t) => t && t !== "—")),
      ];
      const khoaNames = [
        ...new Set(
          chi
            .map((c) => khoaHocLabelForChi(c, goiRowById, lopMonById, monNameById))
            .filter((t): t is string => Boolean(t)),
        ),
      ];
      rows.push({
        id: `hp_${d.id}`,
        nguon: "hoc-phi",
        datetime: ts || String(d.created_at ?? ""),
        maDon: String(d.ma_don ?? "").trim() || String(d.ma_don_so ?? "").trim() || String(d.id),
        tieude: `HP: ${tenHV}`,
        hinhThuc: String(d.hinh_thuc_thu ?? "").trim(),
        thu,
        chi: 0,
        trangThai: "Đã thanh toán",
        ghiChu: tenHV,
        lopHoc: lopNames.length > 0 ? lopNames.join(" · ") : undefined,
        khoaHoc: khoaNames.length > 0 ? khoaNames.join(" · ") : undefined,
      });
    }
  }

  const banRecs = (banDonRes.data ?? []).filter((raw) => {
    const r = raw as { hinh_thuc_thu?: unknown; status?: unknown };
    return isHcBanDonDaThanhToan(
      r.hinh_thuc_thu != null ? String(r.hinh_thuc_thu) : null,
      r.status != null ? String(r.status) : null,
    );
  });
  const banIds = banRecs
    .map((r) => nId((r as { id?: unknown }).id))
    .filter((x): x is number => x != null);

  const banMeta = new Map<
    number,
    {
      created_at: string;
      hinh_thuc_thu: string;
      status: string | null;
      ma_don: string;
      ma_don_so: string;
      tong_tien_db: unknown;
    }
  >();
  for (const raw of banRecs) {
    const r = raw as {
      id?: unknown;
      created_at?: unknown;
      hinh_thuc_thu?: unknown;
      status?: unknown;
      ma_don?: unknown;
      ma_don_so?: unknown;
      tong_tien?: unknown;
    };
    const id = nId(r.id);
    if (!id) continue;
    const codes = resolveBanDonCodes(id, {
      ma_don: r.ma_don != null ? String(r.ma_don) : null,
      ma_don_so: r.ma_don_so != null ? String(r.ma_don_so) : null,
    });
    banMeta.set(id, {
      created_at: String(r.created_at ?? ""),
      hinh_thuc_thu: String(r.hinh_thuc_thu ?? "").trim(),
      status: r.status != null ? String(r.status) : null,
      ma_don: codes.ma_don,
      ma_don_so: codes.ma_don_so,
      tong_tien_db: r.tong_tien,
    });
  }

  if (banIds.length > 0) {
    const { data: ct, error: ctErr } = await supabase
      .from("hc_ban_hc_chi_tiet")
      .select("don_ban, so_luong_ban, mat_hang, thanh_tien, hc_danh_sach_san_pham(ten_hang,gia_ban)")
      .in("don_ban", banIds);
    if (ctErr) {
      return { ok: false, error: ctErr.message || "Không đọc được chi tiết bán họa cụ." };
    }

    const hoaCuGroups = new Map<
      number,
      { total: number; items: string[]; created_at: string; hinhThuc: string }
    >();

    for (const line of (ct ?? []) as ChiBanRow[]) {
      const donId = nId(line.don_ban);
      if (!donId) continue;
      const meta = banMeta.get(donId);
      const { tenHang, giaBan } = unwrapSp(line.hc_danh_sach_san_pham);
      const sl = Number(line.so_luong_ban) || 1;
      const rawTt = line.thanh_tien;
      const lineTotal =
        rawTt != null && String(rawTt).trim() !== ""
          ? parseMoney(rawTt)
          : giaBan * sl;
      if (!hoaCuGroups.has(donId)) {
        hoaCuGroups.set(donId, {
          total: 0,
          items: [],
          created_at: meta?.created_at ?? "",
          hinhThuc: meta?.hinh_thuc_thu ?? "",
        });
      }
      const g = hoaCuGroups.get(donId)!;
      g.total += lineTotal;
      if (tenHang) g.items.push(tenHang);
    }

    for (const [donId, g] of hoaCuGroups) {
      const meta = banMeta.get(donId);
      const headerRaw = meta?.tong_tien_db;
      const headerTotal =
        headerRaw != null && headerRaw !== ""
          ? parseMoney(headerRaw)
          : null;
      const totalThu = headerTotal !== null ? headerTotal : g.total;
      if (totalThu <= 0) continue;
      const tieude = g.items.filter(Boolean).join(", ") || "Bán họa cụ";
      rows.push({
        id: `hc_${donId}`,
        nguon: "hoa-cu",
        datetime: g.created_at || "",
        maDon: meta?.ma_don ?? `HC-${donId}`,
        tieude,
        hinhThuc: g.hinhThuc,
        thu: Math.round(totalThu),
        chi: 0,
        trangThai: "Đã thanh toán",
        ghiChu: "",
      });
    }
  }

  const nhapRecs = nhapDonRes.data ?? [];
  const nhapIds = nhapRecs
    .map((r) => nId((r as { id?: unknown }).id))
    .filter((x): x is number => x != null);

  const nhapMeta = new Map<
    number,
    { created_at: string; hinh_thuc_chi: string; tong_tien_db: unknown; nha_cung_cap: string }
  >();
  for (const raw of nhapRecs) {
    const r = raw as {
      id?: unknown;
      created_at?: unknown;
      hinh_thuc_chi?: unknown;
      tong_tien?: unknown;
      nha_cung_cap?: unknown;
    };
    const id = nId(r.id);
    if (!id) continue;
    nhapMeta.set(id, {
      created_at: String(r.created_at ?? ""),
      hinh_thuc_chi: String(r.hinh_thuc_chi ?? "").trim(),
      tong_tien_db: r.tong_tien,
      nha_cung_cap: String(r.nha_cung_cap ?? "").trim(),
    });
  }

  if (nhapIds.length > 0) {
    const { data: ctNhap, error: ctNhapErr } = await supabase
      .from("hc_nhap_hoa_cu_chi_tiet")
      .select("don_nhap, so_luong_nhap, mat_hang, thanh_tien, hc_danh_sach_san_pham(ten_hang,gia_nhap)")
      .in("don_nhap", nhapIds);
    if (ctNhapErr) {
      return { ok: false, error: ctNhapErr.message || "Không đọc được chi tiết nhập họa cụ." };
    }

    const nhapGroups = new Map<number, { total: number; items: string[]; created_at: string; hinhThuc: string }>();
    for (const line of (ctNhap ?? []) as ChiNhapThongKeRow[]) {
      const donId = nId(line.don_nhap);
      if (!donId) continue;
      const { tenHang, giaNhap } = unwrapSpNhap(line.hc_danh_sach_san_pham);
      const sl = Number(line.so_luong_nhap) || 1;
      const rawTt = line.thanh_tien;
      const lineTotal =
        rawTt != null && String(rawTt).trim() !== "" ? parseMoney(rawTt) : giaNhap * sl;
      if (!nhapGroups.has(donId)) {
        const m = nhapMeta.get(donId);
        nhapGroups.set(donId, {
          total: 0,
          items: [],
          created_at: m?.created_at ?? "",
          hinhThuc: m?.hinh_thuc_chi ?? "",
        });
      }
      const g = nhapGroups.get(donId)!;
      g.total += lineTotal;
      if (tenHang) g.items.push(tenHang);
    }

    for (const [donId, g] of nhapGroups) {
      const meta = nhapMeta.get(donId);
      const headerRaw = meta?.tong_tien_db;
      const headerTotal =
        headerRaw != null && headerRaw !== "" ? parseMoney(headerRaw) : null;
      const totalChi = headerTotal !== null ? headerTotal : g.total;
      if (totalChi <= 0) continue;
      const tieude = g.items.filter(Boolean).join(", ") || "Nhập họa cụ";
      const ncc = meta?.nha_cung_cap?.trim() ?? "";
      rows.push({
        id: `hcn_${donId}`,
        nguon: "hoa-cu-nhap",
        datetime: g.created_at || "",
        maDon: `HCN-${donId}`,
        tieude,
        hinhThuc: g.hinhThuc,
        thu: 0,
        chi: Math.round(totalChi),
        trangThai: g.hinhThuc || "—",
        ghiChu: ncc ? `NCC: ${ncc}` : "",
      });
    }
  }

  for (const raw of tcKhacRes.data ?? []) {
    const r = raw as {
      id?: unknown;
      created_at?: unknown;
      tieu_de?: unknown;
      chu_thich?: unknown;
      thu?: unknown;
      chi?: unknown;
      hinh_thuc?: unknown;
      danh_muc_thu_chi_id?: unknown;
      loai_thu_chi_id?: unknown;
    };
    const id = nId(r.id);
    if (!id) continue;
    const thuAmt = Math.round(parseMoney(r.thu));
    const chiAmt = Math.round(parseMoney(r.chi));
    if (thuAmt === 0 && chiAmt === 0) continue;

    const dmId = nId(r.danh_muc_thu_chi_id);
    const loaiId = nId(r.loai_thu_chi_id);
    const mucTen = dmId != null ? dmById.get(dmId) ?? "" : "";
    const loaiTen = loaiId != null ? loaiById.get(loaiId) ?? "" : "";
    const danhMucLabel = mucTen || loaiTen;

    const tieuDeRaw = String(r.tieu_de ?? "").trim();
    const chuThich = String(r.chu_thich ?? "").trim();
    const ghiChuParts = [chuThich, danhMucLabel ? `DM: ${danhMucLabel}` : ""].filter(Boolean);

    let trangThai = "—";
    if (thuAmt > 0 && chiAmt === 0) trangThai = "Thu";
    else if (chiAmt > 0 && thuAmt === 0) trangThai = "Chi";
    else if (thuAmt > 0 && chiAmt > 0) trangThai = "Thu + Chi";

    rows.push({
      id: `tck_${id}`,
      nguon: "thu-chi-khac",
      datetime: String(r.created_at ?? ""),
      maDon: `TCK-${id}`,
      tieude: tieuDeRaw || danhMucLabel || "Thu chi khác",
      hinhThuc: String(r.hinh_thuc ?? "").trim(),
      thu: thuAmt,
      chi: chiAmt,
      trangThai,
      ghiChu: ghiChuParts.join(" · "),
    });
  }

  if (THONG_KE_THU_CHI_INCLUDE_LUONG) {
  const payrollSelects = [
    "id, created_at, nhan_vien, tam_ung, thuong, luong_co_ban, tro_cap, hinh_thuc_tinh_luong",
    "id, created_at, nhan_vien, tam_ung, thuong, luong_co_ban, tro_cap",
    "id, created_at, nhan_vien, tam_ung, thuong",
  ];

  let payrollRaw: Record<string, unknown>[] = [];
  let payrollFetchErr: string | null = null;
  for (const sel of payrollSelects) {
    const { data, error } = await supabase
      .from("hr_bang_tinh_luong")
      .select(sel)
      .order("created_at", { ascending: false })
      .limit(MAX_LUONG);
    if (!error && data) {
      payrollRaw = (data ?? []) as unknown as Record<string, unknown>[];
      payrollFetchErr = null;
      break;
    }
    payrollFetchErr = error?.message || "Không đọc được bảng lương nhân sự.";
  }

  if (payrollFetchErr && payrollRaw.length === 0) {
    return { ok: false, error: payrollFetchErr };
  }

  if (payrollRaw.length > 0) {
    const bangIds = payrollRaw.map((r) => nId(r.id)).filter((x): x is number => x != null);
    const staffIds = [...new Set(payrollRaw.map((r) => nId(r.nhan_vien)).filter((x): x is number => x != null))];

    const [staffRes, lichRes, nvPhongRes] = await Promise.all([
      staffIds.length
        ? supabase
            .from("hr_nhan_su")
            .select("id, full_name, hinh_thuc_tinh_luong, luong_co_ban, tro_cap, ban")
            .in("id", staffIds)
        : Promise.resolve({ data: [] as unknown[], error: null }),
      bangIds.length
        ? supabase
            .from("hr_lich_diem_danh")
            .select("id, bang_tinh_luong, thang, nam, so_buoi_lam_viec")
            .in("bang_tinh_luong", bangIds)
            .order("id", { ascending: true })
        : Promise.resolve({ data: [] as unknown[], error: null }),
      staffIds.length
        ? supabase.from("hr_nhan_su_phong").select("nhan_su_id, phong_id").in("nhan_su_id", staffIds)
        : Promise.resolve({ data: [] as unknown[], error: null }),
    ]);

    if (staffRes.error || lichRes.error || nvPhongRes.error) {
      return {
        ok: false,
        error:
          staffRes.error?.message ||
          lichRes.error?.message ||
          nvPhongRes.error?.message ||
          "Không đọc được dữ liệu kỳ lương nhân sự.",
      };
    }

    const staffById = new Map<number, Record<string, unknown>>();
    for (const raw of staffRes.data ?? []) {
      const row = raw as Record<string, unknown>;
      const id = nId(row.id);
      if (id) staffById.set(id, row);
    }

    const phongIdsByStaff = new Map<number, number[]>();
    const phongIds = new Set<number>();
    for (const raw of nvPhongRes.data ?? []) {
      const row = raw as Record<string, unknown>;
      const sid = nId(row.nhan_su_id);
      const pid = nId(row.phong_id);
      if (!sid || !pid) continue;
      phongIds.add(pid);
      const cur = phongIdsByStaff.get(sid) ?? [];
      if (!cur.includes(pid)) cur.push(pid);
      phongIdsByStaff.set(sid, cur);
    }

    const phongToBanId = new Map<number, number>();
    if (phongIds.size > 0) {
      let phongRes = await supabase.from("hr_phong").select("id, ban").in("id", [...phongIds]);
      if (phongRes.error && isMissingColumnError(phongRes.error.message ?? "")) {
        phongRes = (await supabase.from("hr_phong").select("id").in("id", [...phongIds])) as typeof phongRes;
      }
      if (phongRes.error) {
        return { ok: false, error: phongRes.error.message || "Không đọc được phòng nhân sự." };
      }
      for (const raw of phongRes.data ?? []) {
        const row = raw as Record<string, unknown>;
        const pid = nId(row.id);
        const bid = nId(row.ban);
        if (pid && bid) phongToBanId.set(pid, bid);
      }
    }

    const banIdsByStaffId = new Map<number, number[]>();
    const allBanIds = new Set<number>();
    for (const sid of staffIds) {
      const set = new Set<number>();
      const staff = staffById.get(sid);
      const directBan = nId(staff?.ban);
      if (directBan) set.add(directBan);
      for (const pid of phongIdsByStaff.get(sid) ?? []) {
        const bid = phongToBanId.get(pid);
        if (bid) set.add(bid);
      }
      const ids = [...set].sort((a, b) => a - b);
      banIdsByStaffId.set(sid, ids);
      for (const id of ids) allBanIds.add(id);
    }

    const banById = new Map<number, string>();
    if (allBanIds.size > 0) {
      const banRes = await supabase.from("hr_ban").select("id, ten_ban").in("id", [...allBanIds]);
      if (banRes.error) {
        return { ok: false, error: banRes.error.message || "Không đọc được ban nhân sự." };
      }
      for (const raw of banRes.data ?? []) {
        const row = raw as Record<string, unknown>;
        const id = nId(row.id);
        if (!id) continue;
        banById.set(id, String(row.ten_ban ?? "").trim() || `Ban #${id}`);
      }
    }

    const lichByBangId = new Map<
      number,
      { thang: string | null; nam: string | null; so_buoi_lam_viec: number | null }
    >();
    for (const raw of lichRes.data ?? []) {
      const row = raw as Record<string, unknown>;
      const bangId = nId(row.bang_tinh_luong);
      if (!bangId || lichByBangId.has(bangId)) continue;
      lichByBangId.set(bangId, {
        thang: row.thang != null ? String(row.thang).trim() || null : null,
        nam: row.nam != null ? String(row.nam).trim() || null : null,
        so_buoi_lam_viec: nNum(row.so_buoi_lam_viec),
      });
    }

    type LuongAgg = {
      total: number;
      staffCount: number;
      thang: string | null;
      nam: string | null;
      createdAt: string | null;
    };
    const aggByBucketKy = new Map<string, LuongAgg>();

    for (const raw of payrollRaw) {
      const bangId = nId(raw.id);
      const staffId = nId(raw.nhan_vien);
      if (!bangId) continue;

      const staff = staffId != null ? staffById.get(staffId) : undefined;
      const lich = lichByBangId.get(bangId);
      const snap: PayslipSnapshot = {
        hinh_thuc_tinh_luong:
          String(raw.hinh_thuc_tinh_luong ?? staff?.hinh_thuc_tinh_luong ?? "").trim() || null,
        luong_co_ban: nNum(raw.luong_co_ban) ?? nNum(staff?.luong_co_ban),
        tro_cap: nNum(raw.tro_cap) ?? nNum(staff?.tro_cap),
        bhxh: null,
      };
      const net = computePayrollNetSalary(snap, {
        tam_ung: nNum(raw.tam_ung),
        thuong: nNum(raw.thuong),
        so_buoi_lam_viec: lich?.so_buoi_lam_viec ?? null,
      });
      if (net <= 0) continue;

      const kyLabel = formatKyLuong(lich?.thang ?? null, lich?.nam ?? null);
      const bucket = classifyPayrollChiBucket(
        staffId != null ? banIdsByStaffId.get(staffId) ?? [] : [],
        banById,
      );
      const aggKey = `${bucket}|${kyLabel || "?"}`;

      const cur = aggByBucketKy.get(aggKey) ?? {
        total: 0,
        staffCount: 0,
        thang: lich?.thang ?? null,
        nam: lich?.nam ?? null,
        createdAt: raw.created_at != null ? String(raw.created_at) : null,
      };
      cur.total += net;
      cur.staffCount += 1;
      if (!cur.thang && lich?.thang) cur.thang = lich.thang;
      if (!cur.nam && lich?.nam) cur.nam = lich.nam;
      aggByBucketKy.set(aggKey, cur);
    }

    for (const [aggKey, agg] of aggByBucketKy) {
      if (agg.total <= 0) continue;
      const pipe = aggKey.indexOf("|");
      const bucket = (pipe >= 0 ? aggKey.slice(0, pipe) : aggKey) as LuongChiBucket;
      const kyLabel = pipe >= 0 ? aggKey.slice(pipe + 1) : "";
      const safeKy = kyLabel && kyLabel !== "?" ? kyLabel : formatKyLuong(agg.thang, agg.nam);

      rows.push({
        id: `luong_${bucket}_${safeKy.replace(/\//g, "-")}`,
        nguon: "luong",
        datetime: payrollPeriodIso(agg.thang, agg.nam, agg.createdAt),
        maDon: safeKy ? `${luongChiBucketMaPrefix(bucket)}-${safeKy}` : luongChiBucketMaPrefix(bucket),
        tieude: luongChiBucketLabel(bucket),
        hinhThuc: "",
        thu: 0,
        chi: Math.round(agg.total),
        trangThai: "Chi",
        ghiChu: [
          safeKy ? `Kỳ ${safeKy}` : "",
          agg.staffCount > 0 ? `${agg.staffCount} phiếu lương` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        kyLuong: safeKy || undefined,
      });
    }
  }
  }

  rows.sort((a, b) => {
    const ta = new Date(a.datetime).getTime();
    const tb = new Date(b.datetime).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });

  return { ok: true, data: { rows } };
}
