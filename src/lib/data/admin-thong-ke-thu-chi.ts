import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminChiTietDisplay, AdminHpDonRow } from "@/lib/data/admin-quan-ly-hoa-don";
import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import {
  hpGoiHocPhiSelectForTable,
  hpParseMoney,
  hpResolveHocPhiDong,
} from "@/lib/data/hp-goi-payable";

const MAX_HP_DONS = 4000;
const MAX_HC_DONS = 2000;
const MAX_TC_KHAC = 5000;

export type ThongKeThuChiNguon = "hoc-phi" | "hoa-cu" | "hoa-cu-nhap" | "thu-chi-khac";

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
};

export type AdminThongKeThuChiBundle = {
  rows: AdminThongKeThuChiRow[];
};

function nId(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
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
 * Gộp học phí (đã thanh toán), bán họa cụ (thu), nhập họa cụ (chi), thu chi khác cho trang thống kê.
 * Không gồm `hp_giao_dich_thanh_toan` (SePay) — tránh trùng với dòng Học phí đã match đơn.
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
      .select("id, created_at, hinh_thuc_thu, tong_tien")
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

  const banRecs = banDonRes.data ?? [];
  const banIds = banRecs
    .map((r) => nId((r as { id?: unknown }).id))
    .filter((x): x is number => x != null);

  const banMeta = new Map<number, { created_at: string; hinh_thuc_thu: string; tong_tien_db: unknown }>();
  for (const raw of banRecs) {
    const r = raw as { id?: unknown; created_at?: unknown; hinh_thuc_thu?: unknown; tong_tien?: unknown };
    const id = nId(r.id);
    if (!id) continue;
    banMeta.set(id, {
      created_at: String(r.created_at ?? ""),
      hinh_thuc_thu: String(r.hinh_thuc_thu ?? "").trim(),
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
        maDon: `HC-${donId}`,
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

  rows.sort((a, b) => {
    const ta = new Date(a.datetime).getTime();
    const tb = new Date(b.datetime).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });

  return { ok: true, data: { rows } };
}
