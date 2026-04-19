import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchKyByKhoaHocVienIds } from "@/lib/data/hp-thu-hp-chi-tiet-ky";

const PAGE = 1000;
const IN_CHUNK = 200;

export type AdminQlhvStudent = {
  id: number;
  full_name: string;
  email: string | null;
  /** `ql_thong_tin_hoc_vien.avatar` (Cloudflare Images) — có thể null nếu DB chưa có cột hoặc trống. */
  avatar: string | null;
  sdt: string | null;
  is_hoc_vien_mau: boolean;
  facebook: string | null;
  sex: string | null;
  loai_khoa_hoc: string | null;
  ngay_bat_dau: string | null;
  ngay_ket_thuc: string | null;
  nam_thi: number | null;
  /** `ql_thong_tin_hoc_vien.created_at` — dùng làm «ngày bắt đầu» hiển thị theo tài khoản. */
  created_at: string | null;
};

/** Một dòng nguyện vọng / trường–ngành (`ql_hv_truong_nganh`). */
export type AdminQlhvTruongNganhItem = {
  id: number;
  hoc_vien: number;
  truong_dai_hoc: number | null;
  nganh_dao_tao: number | null;
  ten_truong: string;
  ten_nganh: string;
  nam_thi: number | null;
  ghi_chu: string | null;
};

export type AdminQlhvLopBrief = {
  id: number;
  class_name: string | null;
  class_full_name: string | null;
  mon_hoc: number | null;
  special: boolean;
};

export type AdminQlhvEnrollment = {
  id: number;
  hoc_vien_id: number;
  lop_hoc: number | null;
  tien_do_hoc: number | null;
  ghi_chu: string | null;
  ngay_dau_ky: string | null;
  ngay_cuoi_ky: string | null;
  lop: AdminQlhvLopBrief | null;
};

export type AdminQlhvBaiTapBrief = {
  id: number;
  /** `hv_he_thong_bai_tap.mon_hoc` — lọc bài theo môn lớp. */
  mon_hoc: number | null;
  ten_bai_tap: string;
  bai_so: number | null;
  thumbnail: string | null;
};

function nId(v: unknown): number | null {
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** `ql_thong_tin_hoc_vien.sdt` — PostgREST có thể trả bigint/số; bỏ qua kiểu không phải chuỗi số. */
function coerceQlhvSdt(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "boolean" || typeof v === "object") return null;
  const s =
    typeof v === "bigint"
      ? v.toString().trim()
      : String(v).replace(/^[\s"'`]+|[\s"'`]+$/g, "").trim();
  return s === "" ? null : s;
}

/**
 * Gói dữ liệu cho trang admin «Quản lý học viên».
 *
 * Map UI chi tiết học viên (`StudentDetailBody`):
 * - `students` → `ql_thong_tin_hoc_vien`
 * - `truongNganhByHvId` → `ql_hv_truong_nganh` (+ `dh_truong_dai_hoc`, `dh_nganh_dao_tao`)
 * - `enrollments` → `ql_quan_ly_hoc_vien` (lớp embed từ `ql_lop_hoc`; ngày kỳ chỉ từ `hp_thu_hp_chi_tiet`)
 * - `baiTapById` → `hv_he_thong_bai_tap` (tiến độ `tien_do_hoc` trên ghi danh)
 */
export async function fetchAdminQuanLyHocVienBundle(supabase: SupabaseClient): Promise<{
  students: AdminQlhvStudent[];
  lopById: Record<string, AdminQlhvLopBrief>;
  enrollments: AdminQlhvEnrollment[];
  baiTapById: Record<string, AdminQlhvBaiTapBrief>;
  truongNganhByHvId: Record<string, AdminQlhvTruongNganhItem[]>;
  error: string | null;
}> {
  const studentSelectFull =
    "id, full_name, email, sdt, is_hoc_vien_mau, facebook, sex, loai_khoa_hoc, ngay_bat_dau, ngay_ket_thuc, nam_thi, created_at";
  const studentSelectWithAvatar = `${studentSelectFull}, avatar`;
  let studentSelect = studentSelectWithAvatar;
  const studentRows: Record<string, unknown>[] = [];
  let studentFrom = 0;
  let studentsErr: { message: string } | null = null;

  for (;;) {
    const studentsRes = await supabase
      .from("ql_thong_tin_hoc_vien")
      .select(studentSelect)
      .order("created_at", { ascending: false })
      .range(studentFrom, studentFrom + PAGE - 1);

    if (studentsRes.error) {
      const msg = studentsRes.error.message.toLowerCase();
      if (msg.includes("column") || msg.includes("schema")) {
        if (studentSelect === studentSelectWithAvatar) {
          studentSelect = studentSelectFull;
          studentFrom = 0;
          studentRows.length = 0;
          continue;
        }
        if (studentSelect === studentSelectFull) {
          studentSelect = "id, full_name, email, sdt, is_hoc_vien_mau, created_at";
          studentFrom = 0;
          studentRows.length = 0;
          continue;
        }
      }
      studentsErr = studentsRes.error;
      break;
    }
    const batch = (studentsRes.data ?? []) as unknown as Record<string, unknown>[];
    if (!batch.length) break;
    studentRows.push(...batch);
    if (batch.length < PAGE) break;
    studentFrom += PAGE;
  }

  if (studentsErr) {
    return {
      students: [],
      lopById: {},
      enrollments: [],
      baiTapById: {},
      truongNganhByHvId: {},
      error: studentsErr.message,
    };
  }

  const lopRes = await supabase
    .from("ql_lop_hoc")
    .select("id, class_name, class_full_name, mon_hoc, special")
    .order("class_full_name", { ascending: true });

  const lopById: Record<string, AdminQlhvLopBrief> = {};
  if (!lopRes.error && lopRes.data) {
    for (const raw of lopRes.data as Record<string, unknown>[]) {
      const id = nId(raw.id);
      if (!id) continue;
      lopById[String(id)] = {
        id,
        class_name: raw.class_name != null ? String(raw.class_name).trim() || null : null,
        class_full_name: raw.class_full_name != null ? String(raw.class_full_name).trim() || null : null,
        mon_hoc: nId(raw.mon_hoc),
        special: raw.special != null && String(raw.special).trim() !== "",
      };
    }
  }

  const studentIds = studentRows
    .map((r) => nId(r.id))
    .filter((x): x is number => x != null && x > 0);

  const enrollments: Record<string, unknown>[] = [];
  let enrollSelect = "id, hoc_vien_id, lop_hoc, tien_do_hoc, ghi_chu, created_at";

  /** Chỉ lấy ghi danh của các học viên đang có trong danh sách (tránh trùng / thiếu do giới hạn trang). */
  for (;;) {
    enrollments.length = 0;
    let columnRetry = false;
    for (let si = 0; si < studentIds.length; si += IN_CHUNK) {
      const chunk = studentIds.slice(si, si + IN_CHUNK);
      let enrollFrom = 0;
      for (;;) {
        const res = await supabase
          .from("ql_quan_ly_hoc_vien")
          .select(enrollSelect)
          .in("hoc_vien_id", chunk)
          .order("id", { ascending: false })
          .range(enrollFrom, enrollFrom + PAGE - 1);
        if (res.error && enrollSelect.includes("tien_do_hoc")) {
          const msg = res.error.message.toLowerCase();
          if (msg.includes("column") || msg.includes("schema")) {
            enrollSelect = "id, hoc_vien_id, lop_hoc, ghi_chu, created_at";
            columnRetry = true;
            break;
          }
          return {
            students: [],
            lopById: {},
            enrollments: [],
            baiTapById: {},
            truongNganhByHvId: {},
            error: res.error.message,
          };
        }
        if (res.error) {
          return {
            students: [],
            lopById: {},
            enrollments: [],
            baiTapById: {},
            truongNganhByHvId: {},
            error: res.error.message,
          };
        }
        const batch = (res.data ?? []) as unknown as Record<string, unknown>[];
        if (!batch.length) break;
        enrollments.push(...batch);
        if (batch.length < PAGE) break;
        enrollFrom += PAGE;
      }
      if (columnRetry) break;
    }
    if (columnRetry) continue;
    break;
  }

  const qlIds = enrollments
    .map((r) => nId((r as { id?: unknown }).id))
    .filter((x): x is number => x != null);

  const ngayMap = await fetchKyByKhoaHocVienIds(supabase, qlIds);

  const baiTapRes = await supabase
    .from("hv_he_thong_bai_tap")
    .select("id, mon_hoc, ten_bai_tap, bai_so, thumbnail")
    .order("mon_hoc", { ascending: true })
    .order("bai_so", { ascending: true });

  const baiTapById: Record<string, AdminQlhvBaiTapBrief> = {};
  if (!baiTapRes.error && baiTapRes.data) {
    for (const raw of baiTapRes.data as Record<string, unknown>[]) {
      const id = nId(raw.id);
      if (!id) continue;
      baiTapById[String(id)] = {
        id,
        mon_hoc: nId(raw.mon_hoc),
        ten_bai_tap: String(raw.ten_bai_tap ?? "").trim() || "—",
        bai_so: raw.bai_so != null && Number.isFinite(Number(raw.bai_so)) ? Number(raw.bai_so) : null,
        thumbnail: raw.thumbnail != null ? String(raw.thumbnail).trim() || null : null,
      };
    }
  }

  const outEnroll: AdminQlhvEnrollment[] = (enrollments as Record<string, unknown>[]).map((r) => {
    const id = nId(r.id) ?? 0;
    const hvId = nId(r.hoc_vien_id) ?? 0;
    const lopId = nId(r.lop_hoc);
    const dates = ngayMap.get(id);
    return {
      id,
      hoc_vien_id: hvId,
      lop_hoc: lopId,
      tien_do_hoc: nId(r.tien_do_hoc),
      ghi_chu: r.ghi_chu != null ? String(r.ghi_chu).trim() || null : null,
      ngay_dau_ky: dates?.ngay_dau_ky ?? null,
      ngay_cuoi_ky: dates?.ngay_cuoi_ky ?? null,
      lop: lopId ? lopById[String(lopId)] ?? null : null,
    };
  });

  const rawStudents = studentRows;
  const students: AdminQlhvStudent[] = rawStudents
    .map((r) => {
      const id = nId(r.id) ?? 0;
      const namRaw = r.nam_thi;
      const namNum = typeof namRaw === "number" ? namRaw : Number(namRaw);
      return {
        id,
        full_name: String(r.full_name ?? "").trim() || "—",
        email: r.email != null ? String(r.email).trim() || null : null,
        avatar: r.avatar != null && String(r.avatar).trim() !== "" ? String(r.avatar).trim() : null,
        sdt: coerceQlhvSdt(r.sdt),
        is_hoc_vien_mau: Boolean(r.is_hoc_vien_mau),
        facebook: r.facebook != null ? String(r.facebook).trim() || null : null,
        sex: r.sex != null ? String(r.sex).trim() || null : null,
        loai_khoa_hoc: r.loai_khoa_hoc != null ? String(r.loai_khoa_hoc).trim() || null : null,
        ngay_bat_dau:
          r.ngay_bat_dau != null && String(r.ngay_bat_dau).trim() !== ""
            ? String(r.ngay_bat_dau).trim().slice(0, 10)
            : null,
        ngay_ket_thuc:
          r.ngay_ket_thuc != null && String(r.ngay_ket_thuc).trim() !== ""
            ? String(r.ngay_ket_thuc).trim().slice(0, 10)
            : null,
        nam_thi: namRaw != null && Number.isFinite(namNum) ? Math.trunc(namNum) : null,
        created_at: r.created_at != null ? String(r.created_at) : null,
      };
    })
    .filter((s) => s.id > 0);

  const truongNganhByHvId: Record<string, AdminQlhvTruongNganhItem[]> = {};
  const hvIdList = students.map((s) => s.id).filter((id) => id > 0);
  const nvRows: Record<string, unknown>[] = [];
  for (let i = 0; i < hvIdList.length; i += IN_CHUNK) {
    const chunk = hvIdList.slice(i, i + IN_CHUNK);
    if (!chunk.length) break;
    const nvRes = await supabase
      .from("ql_hv_truong_nganh")
      .select("id, hoc_vien, truong_dai_hoc, nganh_dao_tao, nam_thi, ghi_chu")
      .in("hoc_vien", chunk)
      .order("id", { ascending: true });
    if (nvRes.error) break;
    nvRows.push(...((nvRes.data ?? []) as Record<string, unknown>[]));
  }

  const trIds = [...new Set(nvRows.map((r) => nId(r.truong_dai_hoc)).filter((x): x is number => x != null))];
  const ngIds = [...new Set(nvRows.map((r) => nId(r.nganh_dao_tao)).filter((x): x is number => x != null))];
  const trMap = new Map<number, string>();
  const ngMap = new Map<number, string>();
  if (trIds.length) {
    const tr = await supabase.from("dh_truong_dai_hoc").select("id, ten_truong_dai_hoc").in("id", trIds);
    if (!tr.error && tr.data) {
      for (const t of tr.data as { id?: unknown; ten_truong_dai_hoc?: unknown }[]) {
        const id = nId(t.id);
        if (id) trMap.set(id, String(t.ten_truong_dai_hoc ?? "").trim() || "—");
      }
    }
  }
  if (ngIds.length) {
    const ng = await supabase.from("dh_nganh_dao_tao").select("id, ten_nganh").in("id", ngIds);
    if (!ng.error && ng.data) {
      for (const n of ng.data as { id?: unknown; ten_nganh?: unknown }[]) {
        const id = nId(n.id);
        if (id) ngMap.set(id, String(n.ten_nganh ?? "").trim() || "—");
      }
    }
  }

  for (const r of nvRows) {
    const hv = nId(r.hoc_vien);
    const id = nId(r.id);
    if (!hv || !id) continue;
    const tid = nId(r.truong_dai_hoc);
    const nid = nId(r.nganh_dao_tao);
    const nt = r.nam_thi != null && Number.isFinite(Number(r.nam_thi)) ? Math.trunc(Number(r.nam_thi)) : null;
    const item: AdminQlhvTruongNganhItem = {
      id,
      hoc_vien: hv,
      truong_dai_hoc: tid,
      nganh_dao_tao: nid,
      ten_truong: tid ? trMap.get(tid) ?? "—" : "—",
      ten_nganh: nid ? ngMap.get(nid) ?? "—" : "—",
      nam_thi: nt,
      ghi_chu: r.ghi_chu != null ? String(r.ghi_chu).trim() || null : null,
    };
    const key = String(hv);
    if (!truongNganhByHvId[key]) truongNganhByHvId[key] = [];
    truongNganhByHvId[key].push(item);
  }

  return {
    students,
    lopById,
    enrollments: outEnroll.filter((e) => e.id > 0 && e.hoc_vien_id > 0),
    baiTapById,
    truongNganhByHvId,
    error: null,
  };
}
