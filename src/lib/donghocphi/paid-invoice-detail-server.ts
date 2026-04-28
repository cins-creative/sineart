import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import type { SupabaseClient } from "@supabase/supabase-js";

const HP_DA_THANH_TOAN = "Đã thanh toán";

function parseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function discountToPayable(giaGoc: number, discountPct: number): number {
  const g = Math.max(0, giaGoc);
  const d = Math.min(100, Math.max(0, discountPct));
  return Math.round((g * (100 - d)) / 100);
}

export type PaidInvoiceDetailLine = {
  label: string;
  package_label: string;
  amount_dong: number;
  ngay_dau_ky: string | null;
  ngay_cuoi_ky: string | null;
};

export type PaidInvoiceDetailPayload = {
  don: {
    id: number;
    ma_don_so: string | null;
    ma_don: string | null;
    ngay_thanh_toan: string | null;
    giam_gia_dong: number;
    /** Trừ thêm VND (sau KM gói / % trên đơn). */
    giam_gia_vnd_dong: number;
    hinh_thuc_thu: string | null;
    status: string;
  };
  lines: PaidInvoiceDetailLine[];
  total_dong: number;
};

export type PaidInvoiceDetailResult =
  | { ok: true; data: PaidInvoiceDetailPayload }
  | { ok: false; code: "NOT_FOUND" | "NOT_PAID" | "NO_LINES" | "DON_READ" | "CHI_READ" };

/**
 * Đọc đơn + dòng `hp_thu_hp_chi_tiet` cho học viên đã thanh toán (service role).
 */
export async function fetchPaidInvoiceDetailForStudent(
  supabase: SupabaseClient,
  donId: number,
  studentId: number,
): Promise<PaidInvoiceDetailResult> {
  if (!Number.isFinite(donId) || donId <= 0 || !Number.isFinite(studentId) || studentId <= 0) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const { data: don, error: donErr } = await supabase
    .from("hp_don_thu_hoc_phi")
    .select("id, student, status, ma_don, ma_don_so, ngay_thanh_toan, giam_gia, giam_gia_vnd, hinh_thuc_thu")
    .eq("id", donId)
    .maybeSingle();

  if (donErr || !don) {
    return { ok: false, code: "DON_READ" };
  }

  const dr = don as {
    id?: unknown;
    student?: unknown;
    status?: unknown;
    ma_don?: string | null;
    ma_don_so?: string | null;
    ngay_thanh_toan?: string | null;
    giam_gia?: unknown;
    giam_gia_vnd?: unknown;
    hinh_thuc_thu?: string | null;
  };

  const sid = Number(dr.student);
  if (!Number.isFinite(sid) || sid !== studentId) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const st = String(dr.status ?? "").trim();
  if (st !== HP_DA_THANH_TOAN) {
    return { ok: false, code: "NOT_PAID" };
  }

  const { data: chiRows, error: chiErr } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .select("khoa_hoc_vien, goi_hoc_phi, ngay_dau_ky, ngay_cuoi_ky")
    .eq("don_thu", donId);

  if (chiErr || !chiRows?.length) {
    return { ok: false, code: chiErr ? "CHI_READ" : "NO_LINES" };
  }

  const qlIds = [
    ...new Set(
      chiRows
        .map((r) => Number((r as { khoa_hoc_vien?: unknown }).khoa_hoc_vien))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  const qlById = new Map<number, number>();
  if (qlIds.length > 0) {
    const { data: qlRows } = await supabase
      .from("ql_quan_ly_hoc_vien")
      .select("id, lop_hoc")
      .in("id", qlIds);
    for (const q of qlRows ?? []) {
      const row = q as { id?: unknown; lop_hoc?: unknown };
      const qid = Number(row.id);
      const lid = Number(row.lop_hoc);
      if (Number.isFinite(qid) && Number.isFinite(lid)) qlById.set(qid, lid);
    }
  }

  const lopIds = [...new Set(qlById.values())];
  const lopById = new Map<number, { class_name: string; mon_hoc: number }>();
  if (lopIds.length > 0) {
    const { data: lopRows } = await supabase
      .from("ql_lop_hoc")
      .select("id, class_name, mon_hoc")
      .in("id", lopIds);
    for (const l of lopRows ?? []) {
      const row = l as { id?: unknown; class_name?: unknown; mon_hoc?: unknown };
      const id = Number(row.id);
      if (!Number.isFinite(id)) continue;
      lopById.set(id, {
        class_name: String(row.class_name ?? "").trim() || `Lớp ${id}`,
        mon_hoc: Number(row.mon_hoc) || 0,
      });
    }
  }

  const monIds = [...new Set([...lopById.values()].map((x) => x.mon_hoc).filter((m) => m > 0))];
  const monName = new Map<number, string>();
  if (monIds.length > 0) {
    const { data: monRows } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .in("id", monIds);
    for (const m of monRows ?? []) {
      const row = m as { id?: unknown; ten_mon_hoc?: unknown };
      const id = Number(row.id);
      if (!Number.isFinite(id)) continue;
      monName.set(id, String(row.ten_mon_hoc ?? "").trim() || `Môn ${id}`);
    }
  }

  const goiIds = [
    ...new Set(
      chiRows
        .map((raw) => Number((raw as { goi_hoc_phi?: unknown }).goi_hoc_phi))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  const goiTable = hpGoiHocPhiTableName();
  const goiById = new Map<
    number,
    { number: unknown; don_vi: unknown; gia_goc: unknown; discount: unknown }
  >();
  if (goiIds.length > 0) {
    const { data: goiRows } = await supabase
      .from(goiTable)
      .select('id, "number", don_vi, gia_goc, discount')
      .in("id", goiIds);
    for (const g of goiRows ?? []) {
      const row = g as {
        id?: unknown;
        number?: unknown;
        don_vi?: unknown;
        gia_goc?: unknown;
        discount?: unknown;
      };
      const gid = Number(row.id);
      if (!Number.isFinite(gid)) continue;
      goiById.set(gid, {
        number: row.number,
        don_vi: row.don_vi,
        gia_goc: row.gia_goc,
        discount: row.discount,
      });
    }
  }

  const lines: PaidInvoiceDetailLine[] = [];
  let subtotal = 0;

  for (const raw of chiRows) {
    const r = raw as {
      khoa_hoc_vien?: unknown;
      goi_hoc_phi?: unknown;
      ngay_dau_ky?: string | null;
      ngay_cuoi_ky?: string | null;
    };
    const qlId = Number(r.khoa_hoc_vien);
    const goiId = Number(r.goi_hoc_phi);
    if (!Number.isFinite(goiId) || goiId <= 0) continue;

    const gr = goiById.get(goiId);
    if (!gr) continue;

    const giaGoc = parseMoney(gr.gia_goc);
    const disc = parseMoney(gr.discount);
    const payable = discountToPayable(giaGoc, disc);
    subtotal += payable;

    const num = gr.number != null && gr.number !== "" ? Number(gr.number) : 0;
    const dv = String(gr.don_vi ?? "").trim() || "tháng";
    const packageLabel =
      Number.isFinite(num) && num > 0 ? `${num} ${dv}` : "—";

    const lopId = qlById.get(qlId);
    const lop = lopId != null ? lopById.get(lopId) : undefined;
    const mon = lop?.mon_hoc ? monName.get(lop.mon_hoc) : undefined;
    const label =
      mon && lop
        ? `${mon} · ${lop.class_name}`
        : lop
          ? lop.class_name
          : `Ghi danh #${qlId}`;

    lines.push({
      label,
      package_label: packageLabel,
      amount_dong: payable,
      ngay_dau_ky: r.ngay_dau_ky != null ? String(r.ngay_dau_ky).slice(0, 10) : null,
      ngay_cuoi_ky: r.ngay_cuoi_ky != null ? String(r.ngay_cuoi_ky).slice(0, 10) : null,
    });
  }

  if (lines.length === 0) {
    return { ok: false, code: "NO_LINES" };
  }

  const giamGia = parseMoney(dr.giam_gia);
  const giamGiaVnd = parseMoney(dr.giam_gia_vnd);
  const totalDong = Math.max(0, Math.round(subtotal - giamGia - giamGiaVnd));

  return {
    ok: true,
    data: {
      don: {
        id: donId,
        ma_don_so: dr.ma_don_so ?? null,
        ma_don: dr.ma_don != null && String(dr.ma_don).trim() !== "" ? String(dr.ma_don).trim() : null,
        ngay_thanh_toan: dr.ngay_thanh_toan != null ? String(dr.ngay_thanh_toan) : null,
        giam_gia_dong: giamGia,
        giam_gia_vnd_dong: giamGiaVnd,
        hinh_thuc_thu: dr.hinh_thuc_thu != null ? String(dr.hinh_thuc_thu).trim() || null : null,
        status: st,
      },
      lines,
      total_dong: totalDong,
    },
  };
}
