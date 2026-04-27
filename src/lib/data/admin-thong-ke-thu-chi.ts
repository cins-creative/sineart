import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminChiTietDisplay, AdminHpDonRow } from "@/lib/data/admin-quan-ly-hoa-don";
import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";

const MAX_HP_DONS = 4000;
const MAX_HC_DONS = 2000;
const MAX_GD = 500;

export type ThongKeThuChiNguon = "hoc-phi" | "hoa-cu" | "giao-dich";

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
};

export type AdminThongKeThuChiBundle = {
  rows: AdminThongKeThuChiRow[];
};

function nId(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function discountToPayable(giaGoc: number, discountPct: number): number {
  const g = Math.max(0, giaGoc);
  const d = Math.min(100, Math.max(0, discountPct));
  return Math.round((g * (100 - d)) / 100);
}

function payableFromGoiRow(row: Record<string, unknown>): number | null {
  const giaGoc = parseMoney(row.gia_goc);
  const disc = parseMoney(row.discount);
  if (giaGoc > 0) return discountToPayable(giaGoc, disc);
  const giaGiam = parseMoney(row.gia_giam);
  if (giaGiam > 0) return Math.round(giaGiam);
  const hp = parseMoney(row.hoc_phi);
  return hp > 0 ? hp : null;
}

function goiHocPhiSelectForTable(table: string): string {
  return table === "hp_goi_hoc_phi" ? "id, hoc_phi, gia_giam" : 'id, "number", don_vi, gia_goc, discount';
}

function subtotalChi(chi: AdminChiTietDisplay[]): number {
  return chi.reduce((s, c) => s + (c.hoc_phi_display ?? 0), 0);
}

function totalDon(don: AdminHpDonRow, chi: AdminChiTietDisplay[]): number {
  return Math.max(0, Math.round(subtotalChi(chi) - parseMoney(don.giam_gia)));
}

function isoOrEmpty(v: string | null | undefined): string {
  if (v == null || String(v).trim() === "") return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00.000Z`;
  return s;
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

function transferIsThu(raw: string | null | undefined): boolean {
  const t = (raw ?? "").trim().toLowerCase();
  return t === "in" || t === "credit" || t.includes("thu");
}

function transferIsChi(raw: string | null | undefined): boolean {
  const t = (raw ?? "").trim().toLowerCase();
  return t === "out" || t === "debit" || t.includes("chi");
}

/**
 * Gộp học phí (đã thanh toán), bán họa cụ, giao dịch SePay (`hp_giao_dich_thanh_toan`) cho trang thống kê.
 * Tiền học phí = tổng dòng `hp_thu_hp_chi_tiet` (theo gói) trừ `giam_gia` đơn — cùng logic «Quản lý hóa đơn».
 */
export async function fetchAdminThongKeThuChiBundle(
  supabase: SupabaseClient
): Promise<{ ok: true; data: AdminThongKeThuChiBundle } | { ok: false; error: string }> {
  const rows: AdminThongKeThuChiRow[] = [];

  const [donRes, banDonRes, gdRes, loaiRes] = await Promise.all([
    supabase
      .from("hp_don_thu_hoc_phi")
      .select(
        "id, created_at, ma_don, ma_don_so, student, nguoi_tao, hinh_thuc_thu, status, ngay_thanh_toan, giam_gia"
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
      .from("hp_giao_dich_thanh_toan")
      .select(
        "id, gateway, transaction_date, transfer_amount, transfer_type, content, description, ma_don_trich_xuat"
      )
      .order("transaction_date", { ascending: false })
      .limit(MAX_GD),
    supabase.from("tc_loai_thu_chi").select("id, giai_nghia"),
  ]);

  if (donRes.error) {
    return { ok: false, error: donRes.error.message || "Không đọc được đơn học phí." };
  }
  if (banDonRes.error) {
    return { ok: false, error: banDonRes.error.message || "Không đọc được đơn bán họa cụ." };
  }
  if (gdRes.error) {
    return { ok: false, error: gdRes.error.message || "Không đọc được giao dịch thanh toán." };
  }
  if (loaiRes.error) {
    return { ok: false, error: loaiRes.error.message || "Không đọc được loại thu chi." };
  }

  const loaiById = new Map<number, string>();
  for (const r of loaiRes.data ?? []) {
    const row = r as { id?: unknown; giai_nghia?: unknown };
    const id = nId(row.id);
    if (id) loaiById.set(id, String(row.giai_nghia ?? "").trim());
  }

  const dons = (donRes.data ?? []) as unknown as AdminHpDonRow[];
  if (dons.length > 0) {
    const donIds = dons.map((d) => d.id).filter((id) => Number.isFinite(id) && id > 0);
    const hvIds = [...new Set(dons.map((d) => nId(d.student)).filter((x): x is number => x != null))];
    const nsIds = [...new Set(dons.map((d) => nId(d.nguoi_tao)).filter((x): x is number => x != null))];

    const { data: chiRaw, error: chiErr } = await supabase
      .from("hp_thu_hp_chi_tiet")
      .select("id, don_thu, khoa_hoc_vien, goi_hoc_phi, ngay_dau_ky, ngay_cuoi_ky, status")
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
        ? supabase.from(goiTable).select(goiHocPhiSelectForTable(goiTable)).in("id", goiIds)
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
    if (lopIds.length > 0) {
      const { data: lopRows, error: lopErr } = await supabase
        .from("ql_lop_hoc")
        .select("id, class_full_name, class_name")
        .in("id", lopIds);
      if (lopErr) {
        return { ok: false, error: lopErr.message || "Không đọc được lớp học." };
      }
      for (const r of lopRows ?? []) {
        const row = r as { id?: unknown; class_full_name?: unknown; class_name?: unknown };
        const id = nId(row.id);
        if (!id) continue;
        const name =
          String(row.class_full_name ?? "").trim() || String(row.class_name ?? "").trim() || `Lớp #${id}`;
        lopNameById.set(id, name);
      }
    }

    const goiRowById = new Map<number, Record<string, unknown>>();
    for (const r of goiRes.data ?? []) {
      const row = r as Record<string, unknown>;
      const id = nId(row.id);
      if (id) goiRowById.set(id, row);
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
      const hocPhiDisplay = goiRow != null ? payableFromGoiRow(goiRow) : null;

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

  for (const raw of gdRes.data ?? []) {
    const r = raw as {
      id?: unknown;
      gateway?: unknown;
      transaction_date?: unknown;
      transfer_amount?: unknown;
      transfer_type?: unknown;
      content?: unknown;
      description?: unknown;
      ma_don_trich_xuat?: unknown;
    };
    const id = nId(r.id);
    if (!id) continue;
    const amount = parseMoney(r.transfer_amount);
    if (amount === 0) continue;
    const tt = r.transfer_type != null ? String(r.transfer_type) : "";
    const isThu = transferIsThu(tt);
    const isChi = transferIsChi(tt);
    let thuAmt = 0;
    let chiAmt = 0;
    if (isChi) chiAmt = Math.round(amount);
    else if (isThu) thuAmt = Math.round(amount);
    else thuAmt = Math.round(amount);
    const mucRaw = r.ma_don_trich_xuat;
    const mucNum = mucRaw != null && String(mucRaw).trim() !== "" ? Number(mucRaw) : NaN;
    const mucTen = Number.isFinite(mucNum) ? loaiById.get(mucNum) ?? "" : "";
    const ts = isoOrEmpty(
      r.transaction_date != null && String(r.transaction_date).trim() !== ""
        ? String(r.transaction_date)
        : null
    );
    const tieude = String(r.content ?? "").trim() || String(r.description ?? "").trim() || "—";
    rows.push({
      id: `gd_${id}`,
      nguon: "giao-dich",
      datetime: ts || "",
      maDon: String(r.ma_don_trich_xuat ?? "").trim(),
      tieude,
      hinhThuc: String(r.gateway ?? "").trim(),
      thu: thuAmt,
      chi: chiAmt,
      trangThai: isChi ? "Chi" : isThu ? "Thu" : tt.trim() ? tt : "Thu",
      ghiChu: mucTen || String(r.description ?? "").trim(),
    });
  }

  rows.sort((a, b) => {
    const ta = new Date(a.datetime).getTime();
    const tb = new Date(b.datetime).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });

  return { ok: true, data: { rows } };
}
