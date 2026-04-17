import { isValidStudentEmail } from "@/lib/donghocphi/profile-step1";
import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import {
  firstApplicableComboDiscountDong,
  rawToHocPhiComboRow,
  rawToHocPhiGoiRow,
} from "@/lib/donghocphi/combo-discount";
import { insertQlQuanLyHocVienEnrollment } from "@/lib/supabase/insert-ql-quan-ly-hoc-vien";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DhpNguyenVongPair = {
  truong_dai_hoc: number;
  nganh_dao_tao: number;
};

export type DhpCreateStudentPayload = {
  full_name: string;
  sdt: string;
  email: string;
  sex: string | null;
  nam_thi: number | null;
  loai_khoa_hoc: string | null;
  facebook: string | null;
  /** `ql_thong_tin_hoc_vien.avatar` — thiếu field = không ghi đè khi cập nhật HV */
  avatar?: string | null;
  /**
   * Cặp trường–ngành (đã lọc trùng). Rỗng = xóa hết `ql_hv_truong_nganh` của HV.
   * Thiếu field = không đụng bảng (tương thích client cũ).
   */
  nguyen_vong?: DhpNguyenVongPair[];
};

export type DhpCreateLinePayload = {
  lopId: number;
  goiId: number;
};

export type DhpCreateOrderOk = {
  ok: true;
  donId: number;
  maDon: string;
  maDonSo: string;
  invoiceTotalDong: number;
  hocVienId: number;
};

export type DhpCreateOrderErr = {
  ok: false;
  error: string;
  code?: string;
};

export type DhpCreateOrderResult = DhpCreateOrderOk | DhpCreateOrderErr;

function parseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
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

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(start: string, days: number): string {
  const [yy, mm, dd] = start.split("-").map(Number);
  const t = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
  t.setDate(t.getDate() + Math.max(0, days));
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const day = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function syncQlHvTruongNganh(
  supabase: SupabaseClient,
  hocVienId: number,
  pairs: DhpNguyenVongPair[] | undefined,
  namThi: number | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = pairs ?? [];
  const seen = new Set<string>();
  const unique: DhpNguyenVongPair[] = [];
  for (const p of raw) {
    const t = Number(p.truong_dai_hoc);
    const n = Number(p.nganh_dao_tao);
    if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(n) || n <= 0) continue;
    const k = `${t},${n}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push({ truong_dai_hoc: t, nganh_dao_tao: n });
  }

  for (const p of unique) {
    const { data, error } = await supabase
      .from("dh_truong_nganh")
      .select("truong_dai_hoc")
      .eq("truong_dai_hoc", p.truong_dai_hoc)
      .eq("nganh_dao_tao", p.nganh_dao_tao)
      .maybeSingle();
    if (error) {
      return { ok: false, error: error.message };
    }
    if (data == null) {
      return {
        ok: false,
        error: "Cặp trường / ngành không hợp lệ — chọn lại theo danh mục hệ thống.",
      };
    }
  }

  const { error: delErr } = await supabase
    .from("ql_hv_truong_nganh")
    .delete()
    .eq("hoc_vien", hocVienId);
  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  if (!unique.length) {
    return { ok: true };
  }

  const { error: insErr } = await supabase.from("ql_hv_truong_nganh").insert(
    unique.map((p) => ({
      hoc_vien: hocVienId,
      truong_dai_hoc: p.truong_dai_hoc,
      nganh_dao_tao: p.nganh_dao_tao,
      nam_thi: namThi,
      ghi_chu: null,
    }))
  );
  if (insErr) {
    return { ok: false, error: insErr.message };
  }
  return { ok: true };
}

async function waitForDonCodes(
  supabase: SupabaseClient,
  donId: number
): Promise<{ ma_don: string; ma_don_so: string }> {
  /** Theo PAYMENT_FLOW_BRIEF: tối đa 8 lần, cách 1.5s sau INSERT header đơn. */
  const MAX_TRIES = 8;
  const INTERVAL_MS = 1500;
  for (let i = 0; i < MAX_TRIES; i += 1) {
    const { data, error } = await supabase
      .from("hp_don_thu_hoc_phi")
      .select("ma_don, ma_don_so")
      .eq("id", donId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = data as { ma_don?: string | null; ma_don_so?: string | null } | null;
    const so = row?.ma_don_so?.trim();
    if (so) {
      return {
        ma_don: String(row?.ma_don ?? "").trim(),
        ma_don_so: so,
      };
    }
    await sleep(INTERVAL_MS);
  }
  throw new Error("Trigger chưa sinh ma_don_so — kiểm tra DB hoặc thử lại.");
}

/**
 * Tạo / cập nhật học viên, enrollment chờ thanh toán, đơn + chi tiết học phí.
 */
/** Thanh toán tự động — `nguoi_tao` để null (học viên tự tạo đơn, không gắn nhân sự). */
export async function createDongHocPhiOrder(
  supabase: SupabaseClient,
  student: DhpCreateStudentPayload,
  lines: DhpCreateLinePayload[]
): Promise<DhpCreateOrderResult> {
  const name = student.full_name?.trim() ?? "";
  const sdt = student.sdt?.trim() ?? "";
  const email = student.email?.trim().toLowerCase() ?? "";
  const fb = student.facebook?.trim() ?? "";
  if (name.length < 2 || sdt.length < 8 || !isValidStudentEmail(email) || fb.length < 1) {
    return { ok: false, error: "Thiếu hoặc sai thông tin học viên (họ tên, SĐT, email, Facebook).", code: "VALIDATION" };
  }
  if (!lines.length) {
    return { ok: false, error: "Chưa có dòng lớp / gói.", code: "VALIDATION" };
  }

  const seenLop = new Set<number>();
  for (const ln of lines) {
    if (!Number.isFinite(ln.lopId) || ln.lopId <= 0 || !Number.isFinite(ln.goiId) || ln.goiId <= 0) {
      return { ok: false, error: "lopId / goiId không hợp lệ.", code: "VALIDATION" };
    }
    if (seenLop.has(ln.lopId)) {
      return { ok: false, error: "Trùng lớp trong cùng đơn.", code: "VALIDATION" };
    }
    seenLop.add(ln.lopId);
  }

  type ValidatedLine = {
    lopId: number;
    monHocId: number;
    goiId: number;
    payableDong: number;
    soBuoi: number;
    comboId: number | null;
    packageNumber: number;
    donVi: string;
  };

  const validated: ValidatedLine[] = [];
  let invoiceSubtotal = 0;
  const goiTable = hpGoiHocPhiTableName();

  for (const ln of lines) {
    const { data: lopRow, error: lopErr } = await supabase
      .from("ql_lop_hoc")
      .select("id, mon_hoc")
      .eq("id", ln.lopId)
      .maybeSingle();
    if (lopErr || !lopRow) {
      return { ok: false, error: `Không tìm thấy lớp id=${ln.lopId}.`, code: "LOP" };
    }
    const monHocId = Number((lopRow as { mon_hoc: unknown }).mon_hoc);
    if (!Number.isFinite(monHocId) || monHocId <= 0) {
      return { ok: false, error: `Lớp ${ln.lopId} chưa gán môn học.`, code: "LOP" };
    }

    const { data: goiRow, error: goiErr } = await supabase
      .from(goiTable)
      .select('id, mon_hoc, "number", don_vi, gia_goc, discount, so_buoi, combo_id')
      .eq("id", ln.goiId)
      .maybeSingle();
    if (goiErr) {
      return {
        ok: false,
        error: `Lỗi đọc gói học phí id=${ln.goiId} (bảng ${goiTable}): ${goiErr.message}`,
        code: "GOI",
      };
    }
    if (!goiRow) {
      return {
        ok: false,
        error: `Không có dòng id=${ln.goiId} trong ${goiTable}. Kiểm tra Supabase (cùng project với NEXT_PUBLIC_SUPABASE_URL) hoặc biến HP_GOI_HOC_PHI_TABLE nếu bảng đổi tên.`,
        code: "GOI",
      };
    }
    const gr = goiRow as {
      mon_hoc: unknown;
      number?: unknown;
      don_vi?: unknown;
      gia_goc: unknown;
      discount: unknown;
      so_buoi: unknown;
      combo_id?: unknown;
    };
    const goiMon = Number(gr.mon_hoc);
    if (goiMon !== monHocId) {
      return {
        ok: false,
        error: `Gói ${ln.goiId} không thuộc môn của lớp đã chọn.`,
        code: "GOI_MON_MISMATCH",
      };
    }
    const giaGoc = parseMoney(gr.gia_goc);
    const discount = parseMoney(gr.discount);
    const payable = discountToPayable(giaGoc, discount);
    const sbRaw = gr.so_buoi;
    const soBuoi =
      sbRaw == null || sbRaw === ""
        ? 0
        : Math.max(0, Math.round(Number(sbRaw)) || 0);

    const numRaw = gr.number;
    const packageNumber =
      numRaw == null || numRaw === "" ? 0 : Number(numRaw);
    const donVi = String(gr.don_vi ?? "").trim() || "tháng";
    const comboRaw = gr.combo_id;
    const comboNum = comboRaw == null || comboRaw === "" ? null : Number(comboRaw);
    const comboId =
      comboNum != null && Number.isFinite(comboNum) && comboNum > 0 ? comboNum : null;

    validated.push({
      lopId: ln.lopId,
      monHocId,
      goiId: ln.goiId,
      payableDong: payable,
      soBuoi,
      comboId,
      packageNumber: Number.isFinite(packageNumber) ? packageNumber : 0,
      donVi,
    });
    invoiceSubtotal += payable;
  }

  const payingComboLines = validated.map((v) => ({
    monHocId: v.monHocId,
    number: v.packageNumber,
    donVi: v.donVi,
    comboId: v.comboId,
  }));

  const distinctComboIds = [
    ...new Set(
      validated
        .map((v) => v.comboId)
        .filter((x): x is number => x != null && x > 0)
    ),
  ];

  let comboDiscountDong = 0;
  if (distinctComboIds.length > 0) {
    const { data: comboRows, error: comboErr } = await supabase
      .from("hp_combo_mon")
      .select("id, ten_combo, gia_giam")
      .in("id", distinctComboIds)
      .order("id", { ascending: true });
    if (!comboErr && comboRows?.length) {
      const combosOrdered = (comboRows as Record<string, unknown>[]).map(rawToHocPhiComboRow);
      const { data: goiComboRows, error: goiComboErr } = await supabase
        .from(goiTable)
        .select('id, mon_hoc, "number", don_vi, gia_goc, discount, combo_id, so_buoi')
        .in("combo_id", distinctComboIds);
      if (!goiComboErr && goiComboRows?.length) {
        const allGoisForCombo = (goiComboRows as Record<string, unknown>[]).map(rawToHocPhiGoiRow);
        comboDiscountDong = firstApplicableComboDiscountDong(
          payingComboLines,
          combosOrdered,
          allGoisForCombo
        );
      }
    }
  }

  const invoiceTotal = Math.max(0, Math.round(invoiceSubtotal) - Math.round(comboDiscountDong));

  if (invoiceTotal <= 0) {
    return { ok: false, error: "Tổng đơn = 0 — kiểm tra giá gói / ưu đãi combo.", code: "AMOUNT" };
  }

  const emailPrefix = email.split("@")[0] ?? "";

  const { data: existingHv, error: hvSelErr } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select("id")
    .eq("email", email)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (hvSelErr) {
    return { ok: false, error: hvSelErr.message, code: "HV_LOOKUP" };
  }

  let hocVienId: number;
  const hvPayload = {
    full_name: name,
    sdt,
    email,
    email_prefix: emailPrefix || null,
    sex: student.sex?.trim() || null,
    nam_thi: student.nam_thi != null && Number.isFinite(student.nam_thi) ? student.nam_thi : null,
    loai_khoa_hoc: student.loai_khoa_hoc?.trim() || null,
    facebook: fb,
    ...(student.avatar !== undefined ? { avatar: student.avatar?.trim() || null } : {}),
  };

  let wasNewHv = false;
  if (existingHv?.id != null) {
    hocVienId = Number((existingHv as { id: unknown }).id);
    const { error: upErr } = await supabase
      .from("ql_thong_tin_hoc_vien")
      .update(hvPayload)
      .eq("id", hocVienId);
    if (upErr) {
      return { ok: false, error: upErr.message, code: "HV_UPDATE" };
    }
  } else {
    wasNewHv = true;
    const { data: insHv, error: insErr } = await supabase
      .from("ql_thong_tin_hoc_vien")
      .insert(hvPayload)
      .select("id")
      .single();
    if (insErr || !insHv) {
      return { ok: false, error: insErr?.message ?? "Không tạo được học viên.", code: "HV_INSERT" };
    }
    hocVienId = Number((insHv as { id: unknown }).id);
  }

  if (student.nguyen_vong !== undefined) {
    const syncNv = await syncQlHvTruongNganh(
      supabase,
      hocVienId,
      student.nguyen_vong,
      hvPayload.nam_thi
    );
    if (!syncNv.ok) {
      if (wasNewHv) {
        await supabase.from("ql_thong_tin_hoc_vien").delete().eq("id", hocVienId);
      }
      return { ok: false, error: syncNv.error, code: "NGUYEN_VONG" };
    }
  }

  const createdQlIds: number[] = [];
  const qlIdsByLop = new Map<number, number>();

  try {
    for (const v of validated) {
      const { data: existingQl, error: qlSelErr } = await supabase
        .from("ql_quan_ly_hoc_vien")
        .select("id")
        .eq("hoc_vien_id", hocVienId)
        .eq("lop_hoc", v.lopId)
        .limit(1)
        .maybeSingle();
      if (qlSelErr) throw new Error(qlSelErr.message);

      if (existingQl?.id != null) {
        qlIdsByLop.set(v.lopId, Number((existingQl as { id: unknown }).id));
      } else {
        const insQl = await insertQlQuanLyHocVienEnrollment(supabase, hocVienId, v.lopId);
        if (!insQl.ok) {
          throw new Error(insQl.error);
        }
        const qid = insQl.id;
        createdQlIds.push(qid);
        qlIdsByLop.set(v.lopId, qid);
      }
    }

    const { data: donRow, error: donErr } = await supabase
      .from("hp_don_thu_hoc_phi")
      .insert({
        student: hocVienId,
        nguoi_tao: null,
        hinh_thuc_thu: "Chuyen khoan",
        status: "Chờ thanh toán",
        giam_gia: comboDiscountDong > 0 ? comboDiscountDong : null,
      })
      .select("id")
      .single();
    if (donErr || !donRow) {
      throw new Error(donErr?.message ?? "Không tạo được đơn thu học phí.");
    }
    const donId = Number((donRow as { id: unknown }).id);

    const ngayDau = todayIsoDate();

    try {
      for (const v of validated) {
        const khoaHocVienId = qlIdsByLop.get(v.lopId);
        if (khoaHocVienId == null) throw new Error("Thiếu ql_quan_ly_hoc_vien.");
        const ngayCuoi =
          v.soBuoi > 0 ? addDaysIso(ngayDau, v.soBuoi) : ngayDau;
        /**
         * Kỳ học (`ngay_dau_ky` / `ngay_cuoi_ky`) được ghi **ngay khi tạo đơn**, cùng lúc `status` = «Chờ thanh toán».
         * SePay (hoặc đồng bộ tay) đổi đơn + dòng chi tiết sang «Đã thanh toán».
         * UI (`fetchKyByKhoaHocVienIds`) chỉ tính ngày học khi `hp_thu_hp_chi_tiet.status` = «Đã thanh toán» — chưa TT thì không dùng kỳ đó.
         */
        // goi_hoc_phi FK trên DB phải trỏ cùng bảng với hpGoiHocPhiTableName() (vd. hp_goi_hoc_phi_new).
        const { error: ctErr } = await supabase.from("hp_thu_hp_chi_tiet").insert({
          don_thu: donId,
          nguoi_tao: null,
          khoa_hoc_vien: khoaHocVienId,
          goi_hoc_phi: v.goiId,
          ngay_dau_ky: ngayDau,
          ngay_cuoi_ky: ngayCuoi,
          status: "Chờ thanh toán",
        });
        if (ctErr) throw new Error(ctErr.message);
      }
    } catch (e) {
      await supabase.from("hp_thu_hp_chi_tiet").delete().eq("don_thu", donId);
      await supabase.from("hp_don_thu_hoc_phi").delete().eq("id", donId);
      throw e;
    }

    let codes: { ma_don: string; ma_don_so: string };
    try {
      codes = await waitForDonCodes(supabase, donId);
    } catch (e) {
      await supabase.from("hp_thu_hp_chi_tiet").delete().eq("don_thu", donId);
      await supabase.from("hp_don_thu_hoc_phi").delete().eq("id", donId);
      throw e;
    }

    return {
      ok: true,
      donId,
      maDon: codes.ma_don,
      maDonSo: codes.ma_don_so,
      invoiceTotalDong: invoiceTotal,
      hocVienId,
    };
  } catch (e) {
    for (const qid of createdQlIds) {
      await supabase.from("ql_quan_ly_hoc_vien").delete().eq("id", qid);
    }
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, error: msg, code: "TX" };
  }
}
