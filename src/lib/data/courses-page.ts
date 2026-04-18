import { cache } from "react";

import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import { createClient } from "@/lib/supabase/server";
import { parseTeacherIds } from "@/lib/utils/parse-teacher-ids";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonHoc } from "@/types/homepage";
import type {
  CourseGroupId,
  GoiHocPhi,
  HinhThucHocTag,
  HocPhiBlockData,
  HocPhiComboRow,
  HocPhiGoiRow,
  KhoaHocCourseCard,
  KhoaHocDetailData,
  KhoaHocTeacher,
  OngoingClassCard,
  TeacherPortfolioSlide,
} from "@/types/khoa-hoc";

type LopRow = { id: number; mon_hoc: number | null; url_class: string | null };
type EnrollRow = { lop_hoc: number | null };

/** Cột tối thiểu cho danh sách / aggregate — tránh `select('*')`. */
const MON_HOC_CARD_SELECT =
  "id, ten_mon_hoc, loai_khoa_hoc, thumbnail, is_featured, hinh_thuc, thu_tu_hien_thi, si_so, video_gioi_thieu, gioi_thieu_mon_hoc";

function normalizeClassSlug(urlClass: string | null | undefined): string {
  const raw = String(urlClass ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const m = u.pathname.match(/\/khoa-hoc\/([^/?#]+)/i);
      if (m?.[1]) return m[1].trim().toLowerCase();
      return u.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }
  return raw
    .replace(/^\/+|\/+$/g, "")
    .replace(/^khoa-hoc\//i, "")
    .toLowerCase();
}

export function inferCourseGroup(loai: string | null, tenMon: string | null): CourseGroupId {
  const s = `${loai ?? ""} ${tenMon ?? ""}`.toLowerCase();
  if (/digital|procreate|after effects|figma|motion|ui\/ux|concept|illustration|vẽ số/.test(s)) return "digital";
  if (/kids|thiếu nhi|trại hè|summer|thieu nhi|5[\s–-]*8|9[\s–-]*12|khóa hè/.test(s)) return "kids";
  if (/bổ trợ|bo tro|giải phẫu|giai phau|portfolio|workshop/.test(s)) return "botro";
  if (/luyện thi|luyen thi|đại học|dai hoc|khối|khoi|ôn thi|on thi|thi đh|đh\b/.test(s)) return "lthi";
  return "lthi";
}

export function slugifyTenMonHoc(ten: string): string {
  let s = (ten || "mon").trim();
  s = s.replace(/đ/g, "d").replace(/Đ/g, "d");
  s = s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const slug = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "mon";
}

export function buildCourseSlugIndex(mons: MonHoc[]): {
  idToSlug: Map<number, string>;
  slugToId: Map<string, number>;
} {
  const sorted = [...mons].sort((a, b) => Number(a.id) - Number(b.id));
  const byBase = new Map<string, MonHoc[]>();
  for (const m of sorted) {
    const base = slugifyTenMonHoc(m.ten_mon_hoc || "mon");
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base)!.push(m);
  }
  const idToSlug = new Map<number, string>();
  for (const list of byBase.values()) {
    if (list.length === 1) {
      const m = list[0]!;
      idToSlug.set(Number(m.id), slugifyTenMonHoc(m.ten_mon_hoc || "mon"));
    } else {
      for (const m of list) {
        const base = slugifyTenMonHoc(m.ten_mon_hoc || "mon");
        idToSlug.set(Number(m.id), `${base}-${Number(m.id)}`);
      }
    }
  }
  const slugToId = new Map<string, number>();
  for (const [id, slug] of idToSlug) slugToId.set(slug, id);
  return { idToSlug, slugToId };
}

/**
 * Khi URL không trùng khóa trong `slugToId` (vd: `hinh-hoa-online` vs `hinh-hoa-online-1`),
 * tìm `mon` theo slugify tên hoặc khớp tiền tố slug có hậu tố `-{id}`.
 */
export function findMonIdForKhoaSlug(slug: string, allMons: MonHoc[]): number | null {
  if (!allMons.length) return null;
  const key = slug.trim().toLowerCase();
  const { slugToId, idToSlug } = buildCourseSlugIndex(allMons);
  if (slugToId.has(key)) return slugToId.get(key)!;

  const exactTen = allMons.filter(
    (m) => slugifyTenMonHoc(m.ten_mon_hoc || "") === key
  );
  if (exactTen.length === 1) return Number(exactTen[0]!.id);
  if (exactTen.length > 1) {
    return Number(
      [...exactTen].sort((a, b) => Number(a.id) - Number(b.id))[0]!.id
    );
  }

  const fromBuilt = [...idToSlug]
    .filter(
      ([, s]) =>
        s === key || s.startsWith(`${key}-`) || key.startsWith(`${s}-`)
    )
    .map(([id]) => id);
  if (fromBuilt.length) return Math.min(...fromBuilt);

  return null;
}

export function hinhThucTagFromMon(
  tinhChat: string | null | undefined
): HinhThucHocTag {
  const t = (tinhChat ?? "").trim();
  const low = t.toLowerCase();
  if (low === "online") return "Online";
  if (low === "tại lớp" || low === "tai lop") return "Tại lớp";
  if (/\bonline\b/.test(low)) return "Online";
  if (/\btại\s*lớp\b|tai\s*lop\b/.test(low)) return "Tại lớp";
  return "Tại lớp";
}

function normalizeHinhThucAscii(s: string): string {
  return s
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Suy Online vs Tại lớp từ chuỗi `hinh_thuc` (hoặc chuỗi tương tự). */
function isOnlineLikeHinhThucText(value: string): boolean {
  const low = normalizeHinhThucAscii(value);
  if (!low) return false;
  if (low === "online") return true;
  if (low === "tai lop" || low === "tai cho" || low === "offline") return false;
  if (/\bonline\b/.test(low)) return true;
  if (/\btai\s*lop\b|tai\s*cho|offline/.test(low)) return false;
  if (low.includes("truc tuyen") || low.includes("zoom")) return true;
  if (low.includes("online")) return true;
  return false;
}

/**
 * Thẻ hình thức từ `ql_mon_hoc.hinh_thuc` (nhãn + Online/Tại lớp).
 * Không có giá trị → mặc định tag «Tại lớp».
 */
export function resolveHinhThucFromMon(
  m: Pick<MonHoc, "hinh_thuc">
): { tag: HinhThucHocTag; navLabel: string | null } {
  const raw = (m.hinh_thuc ?? "").trim();
  if (raw.length > 0) {
    return {
      tag: isOnlineLikeHinhThucText(raw) ? "Online" : "Tại lớp",
      navLabel: raw,
    };
  }
  return { tag: hinhThucTagFromMon(null), navLabel: null };
}

function aggregate(
  mons: MonHoc[],
  lops: LopRow[],
  enrollments: EnrollRow[]
): KhoaHocCourseCard[] {
  const lopToMon = new Map<number, number>();
  for (const l of lops) {
    if (l.mon_hoc != null) lopToMon.set(Number(l.id), Number(l.mon_hoc));
  }
  const activeEnrolls = enrollments.filter((e) => e.lop_hoc != null);
  const activeLopsPerMon = new Map<number, Set<number>>();
  for (const e of activeEnrolls) {
    const lid = Number(e.lop_hoc);
    const monId = lopToMon.get(lid);
    if (monId == null) continue;
    if (!activeLopsPerMon.has(monId)) activeLopsPerMon.set(monId, new Set());
    activeLopsPerMon.get(monId)!.add(lid);
  }
  const { idToSlug } = buildCourseSlugIndex(mons);
  return mons.map((m) => {
    const id = Number(m.id);
    const loai = m.loai_khoa_hoc?.trim() ?? null;
    const group = inferCourseGroup(loai, m.ten_mon_hoc);
    const lopSet = activeLopsPerMon.get(id);
    const soLop = lopSet?.size ?? 0;
    const { tag, navLabel } = resolveHinhThucFromMon(m);
    const subline = (m.hinh_thuc ?? "").trim() || null;
    return {
      id,
      slug: idToSlug.get(id) ?? `mon-${id}`,
      tenMonHoc: m.ten_mon_hoc?.trim() || "Môn học",
      tinhChat: subline,
      loaiKhoaHoc: loai,
      soLopDangHoatDong: soLop,
      thumbnail: m.thumbnail?.trim() || null,
      gradientStart: null,
      gradientEnd: null,
      group,
      isFeatured: Boolean(m.is_featured),
      hinhThucTag: tag,
      hinhThucNavLabel: navLabel,
    };
  });
}

async function getKhoaHocPageDataUncached(): Promise<{
  courses: KhoaHocCourseCard[];
}> {
  const supabase = await createClient();
  if (!supabase) return { courses: [] };
  const [monsRes, lopsRes] = await Promise.all([
    supabase
      .from("ql_mon_hoc")
      .select(MON_HOC_CARD_SELECT)
      .order("thu_tu_hien_thi", { ascending: true }),
    supabase.from("ql_lop_hoc").select("id, mon_hoc, url_class"),
  ]);
  const mons = (monsRes.error ? [] : (monsRes.data ?? [])) as MonHoc[];
  const lops = (lopsRes.error ? [] : (lopsRes.data ?? [])) as LopRow[];
  const lopIdsOpen = lops
    .filter((l) => l.mon_hoc != null)
    .map((l) => Number(l.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const envRes =
    lopIdsOpen.length > 0
      ? await supabase
          .from("ql_quan_ly_hoc_vien")
          .select("lop_hoc")
          .in("lop_hoc", lopIdsOpen)
      : { data: [] as Record<string, unknown>[], error: null };
  const enrollments = (envRes.error ? [] : (envRes.data ?? [])) as EnrollRow[];
  if (!mons.length) return { courses: [] };
  return { courses: aggregate(mons, lops, enrollments) };
}

export const getKhoaHocPageData = cache(getKhoaHocPageDataUncached);

function mapMonToDetail(
  row: MonHoc,
  goiHocPhi: GoiHocPhi[] = [],
  teachers: KhoaHocTeacher[] = []
): KhoaHocDetailData {
  const loai = row.loai_khoa_hoc?.trim() ?? null;
  const ten = row.ten_mon_hoc?.trim() || "Môn học";
  const { tag } = resolveHinhThucFromMon(row);
  return {
    id: Number(row.id),
    tenMonHoc: ten,
    tinhChat: (row.hinh_thuc ?? "").trim() || null,
    loaiKhoaHoc: loai,
    thumbnail: row.thumbnail?.trim() || null,
    gradientStart: null,
    gradientEnd: null,
    isFeatured: Boolean(row.is_featured),
    group: inferCourseGroup(loai, row.ten_mon_hoc),
    goiHocPhi,
    teachers,
    hinhThucTag: tag,
    videoGioiThieu:
      row.video_gioi_thieu != null && String(row.video_gioi_thieu).trim()
        ? String(row.video_gioi_thieu).trim()
        : null,
    gioiThieuMonHocHtml:
      row.gioi_thieu_mon_hoc != null && String(row.gioi_thieu_mon_hoc).trim()
        ? String(row.gioi_thieu_mon_hoc).trim()
        : null,
  };
}

async function fetchTeachersForMon(
  supabase: SupabaseClient,
  _monId: number,
  tenMonHoc: string,
  _slug: string
): Promise<KhoaHocTeacher[]> {
  const extractHttpUrlsFromText = (s: string): string[] => {
    const found = s.match(/https?:\/\/[^\s<>"']+/gi);
    if (!found?.length) return [];
    return [...new Set(found.map((u) => u.replace(/[),.;]+$/g, "").trim()))].filter(
      Boolean
    );
  };

  const normalizePortfolioToUrls = (raw: unknown): string[] => {
    if (raw == null) return [];
    if (typeof raw === "string") {
      const s = raw.trim();
      if (!s) return [];
      if (s.startsWith("[") || s.startsWith("{")) {
        try {
          return normalizePortfolioToUrls(JSON.parse(s) as unknown);
        } catch {
          const fromText = extractHttpUrlsFromText(s);
          if (fromText.length) return fromText;
          return [];
        }
      }
      const fromText = extractHttpUrlsFromText(s);
      if (fromText.length) return fromText;
      if (/^https?:\/\//i.test(s)) return [s];
      return [];
    }
    if (Array.isArray(raw)) {
      const out: string[] = [];
      for (const item of raw) {
        if (typeof item === "string" && item.trim()) out.push(item.trim());
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          for (const k of ["url", "src", "path", "image", "photo"] as const) {
            const v = o[k];
            if (typeof v === "string" && v.trim()) {
              out.push(v.trim());
              break;
            }
          }
        }
      }
      return out;
    }
    if (typeof raw === "object") {
      const o = raw as Record<string, unknown>;
      if (typeof o.url === "string" && o.url.trim()) return [o.url.trim()];
      if (typeof o.src === "string" && o.src.trim()) return [o.src.trim()];
      if (Array.isArray(o.urls)) return normalizePortfolioToUrls(o.urls);
      if (Array.isArray(o.images)) return normalizePortfolioToUrls(o.images);
    }
    return [];
  };

  const mapStaffRows = (rows: Record<string, unknown>[]): KhoaHocTeacher[] => {
    return rows.map((row) => {
      const portfolioUrls = normalizePortfolioToUrls(row.portfolio);
      return {
        id: Number(row.id),
        fullName: String(row.full_name ?? "").trim() || "Giáo viên",
        tag: tenMonHoc,
        portfolioUrls,
      };
    });
  };

  const { data, error } = await supabase
    .from("hr_nhan_su")
    .select("id, full_name, portfolio")
    .not("portfolio", "is", null)
    .order("id", { ascending: true })
    .limit(80);
  if (error || !data?.length) return [];
  const teachers = mapStaffRows(data as Record<string, unknown>[]);
  return teachers
    .filter((t) => t.portfolioUrls.length > 0)
    .map((t) => ({ ...t, tag: tenMonHoc }));
}

function parseBoolLoose(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "t" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "f" || s === "0" || s === "no" || s === "") return false;
  return null;
}

/** Supabase/Postgres `numeric` thường trả về string — parse an toàn cho giá */
function parseMoney(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const s = v.replace(/\s/g, "").replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const GOI_SELECT_FULL =
  'id, ten_goi_hoc_phi, gia_goc, discount, "number", don_vi, so_mon, thoi_han_thang, so_buoi, hinh_thuc, la_chuan_thi';
const GOI_SELECT_MIN =
  'id, ten_goi_hoc_phi, gia_goc, discount, "number", don_vi, so_mon, thoi_han_thang, hinh_thuc, la_chuan_thi';

function mapHpGoiHocPhiRow(row: Record<string, unknown>): GoiHocPhi {
  const soRaw = row.so_mon;
  const thRaw = row.thoi_han_thang;
  const soMon =
    soRaw == null || soRaw === ""
      ? null
      : Number.isFinite(Number(soRaw)) ? Number(soRaw) : null;
  const thoiHanThang =
    thRaw == null || thRaw === ""
      ? null
      : Number.isFinite(Number(thRaw)) ? Number(thRaw) : null;
  const soBuoiRaw = row.so_buoi;
  const soBuoi =
    soBuoiRaw == null || soBuoiRaw === ""
      ? null
      : Number.isFinite(Number(soBuoiRaw)) ? Number(soBuoiRaw) : null;
  const hinhRaw = row.hinh_thuc;
  const hinhThuc =
    hinhRaw == null || hinhRaw === ""
      ? null
      : String(hinhRaw).trim() || null;
  const giaGoc = parseMoney(row.gia_goc);
  const discountRaw = parseMoney(row.discount);
  const discount = Math.min(100, Math.max(0, discountRaw));
  const numberRaw = row.number;
  const numberValue =
    numberRaw == null || numberRaw === ""
      ? null
      : Number.isFinite(Number(numberRaw)) ? Number(numberRaw) : null;
  const donViRaw = row.don_vi;
  const donVi =
    donViRaw == null || donViRaw === ""
      ? null
      : String(donViRaw).trim() || null;
  const hocPhiThucDong =
    giaGoc > 0 ? Math.round((giaGoc * (100 - discount)) / 100) : 0;

  return {
    id: Number(row.id),
    tenGoiHocPhi: String(row.ten_goi_hoc_phi ?? "").trim() || "Gói học phí",
    giaGoc,
    discount,
    numberValue,
    donVi,
    hocPhiThucDong,
    soMon,
    thoiHanThang,
    soBuoi,
    hinhThuc,
    laChuanThi: parseBoolLoose(row.la_chuan_thi),
  };
}

async function fetchGoiHocPhiForMon(
  supabase: SupabaseClient,
  monId: number
): Promise<GoiHocPhi[]> {
  const goiTable = hpGoiHocPhiTableName();
  const q = (select: string) =>
    supabase
      .from(goiTable)
      .select(select)
      .eq("mon_hoc", monId)
      .order("number", { ascending: true, nullsFirst: true })
      .order("don_vi", { ascending: true, nullsFirst: true })
      .order("so_mon", { ascending: true, nullsFirst: true })
      .order("thoi_han_thang", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true });

  let { data, error } = await q(GOI_SELECT_FULL);
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[${goiTable}] select (full) failed, retry without so_buoi:`,
        error.message
      );
    }
    const second = await q(GOI_SELECT_MIN);
    data = second.data;
    error = second.error;
  }
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[${goiTable}]`, error.message, { monId });
    }
    return [];
  }
  if (!data?.length) return [];

  return (data as unknown as Record<string, unknown>[]).map((row) =>
    mapHpGoiHocPhiRow(row)
  );
}

/**
 * Xác định `ql_mon_hoc.id` từ slug route (cùng logic với `getKhoaHocDetailBySlug`),
 * dùng khi cần dữ liệu phụ (vd: học phí) mà không có `KhoaHocDetailData`.
 */
async function resolveMonIdForKhoaSlugUncached(
  slug: string
): Promise<number | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: allMonsRows } = await supabase
    .from("ql_mon_hoc")
    .select("id, ten_mon_hoc")
    .order("id", { ascending: true });

  const allMons = (allMonsRows ?? []) as MonHoc[];
  if (allMons.length) {
    const { slugToId } = buildCourseSlugIndex(allMons);
    const key = slug.trim().toLowerCase();
    const monIdFromName =
      slugToId.get(key) ?? findMonIdForKhoaSlug(slug, allMons);
    if (monIdFromName != null) return monIdFromName;
  }

  const { data: lopRows } = await supabase
    .from("ql_lop_hoc")
    .select("mon_hoc, url_class")
    .not("url_class", "is", null);

  const fromLop = (lopRows ?? []).find(
    (r: Record<string, unknown>) =>
      normalizeClassSlug(String(r.url_class ?? "")) === slug.trim().toLowerCase()
  )?.mon_hoc;
  if (fromLop != null && Number.isFinite(Number(fromLop))) {
    return Number(fromLop);
  }

  const idMatch = /^mon-(\d+)$/.exec(slug);
  if (idMatch) {
    const id = Number(idMatch[1]);
    if (Number.isFinite(id)) return id;
  }

  return null;
}

export const resolveMonIdForKhoaSlug = cache(resolveMonIdForKhoaSlugUncached);

async function getKhoaHocDetailBySlugUncached(
  slug: string
): Promise<KhoaHocDetailData | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: allMonsRows } = await supabase
    .from("ql_mon_hoc")
    .select(MON_HOC_CARD_SELECT)
    .order("id", { ascending: true });

  const allMons = (allMonsRows ?? []) as MonHoc[];
  if (allMons.length) {
    const { slugToId } = buildCourseSlugIndex(allMons);
    const key = slug.trim().toLowerCase();
    const monIdFromName =
      slugToId.get(key) ?? findMonIdForKhoaSlug(slug, allMons);
    if (monIdFromName != null) {
      const mon = allMons.find((m) => Number(m.id) === monIdFromName);
      if (mon) {
        const ten = mon.ten_mon_hoc?.trim() || "Môn học";
        const [goi, teachers] = await Promise.all([
          fetchGoiHocPhiForMon(supabase, monIdFromName),
          fetchTeachersForMon(supabase, monIdFromName, ten, slug),
        ]);
        return mapMonToDetail(mon as MonHoc, goi, teachers);
      }
    }
  }

  const { data: lopRows } = await supabase
    .from("ql_lop_hoc")
    .select("mon_hoc, url_class")
    .not("url_class", "is", null);

  const fromLop = (lopRows ?? []).find(
    (r: Record<string, unknown>) =>
      normalizeClassSlug(String(r.url_class ?? "")) === slug.trim().toLowerCase()
  )?.mon_hoc;
  if (fromLop != null) {
    const { data: mon } = await supabase
      .from("ql_mon_hoc")
      .select(MON_HOC_CARD_SELECT)
      .eq("id", fromLop)
      .maybeSingle();
    if (mon) {
      const monId = Number((mon as MonHoc).id);
      const ten = mon.ten_mon_hoc?.trim() || "Môn học";
      const [goi, teachers] = await Promise.all([
        fetchGoiHocPhiForMon(supabase, monId),
        fetchTeachersForMon(supabase, monId, ten, slug),
      ]);
      return mapMonToDetail(mon as MonHoc, goi, teachers);
    }
  }

  const idMatch = /^mon-(\d+)$/.exec(slug);
  if (idMatch) {
    const id = Number(idMatch[1]);
    if (Number.isFinite(id)) {
      const { data: mon } = await supabase
        .from("ql_mon_hoc")
        .select(MON_HOC_CARD_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (mon) {
        const ten = mon.ten_mon_hoc?.trim() || "Môn học";
        const [goi, teachers] = await Promise.all([
          fetchGoiHocPhiForMon(supabase, id),
          fetchTeachersForMon(supabase, id, ten, slug),
        ]);
        return mapMonToDetail(mon as MonHoc, goi, teachers);
      }
    }
  }

  return null;
}

export const getKhoaHocDetailBySlug = cache(getKhoaHocDetailBySlugUncached);

function deriveClassTime(hinhThucTag: HinhThucHocTag, lichHoc: string): string {
  if (hinhThucTag === "Online") return "19h00 - 21h30";
  const low = lichHoc.toLowerCase();
  if (/(18|19|20|21)h|tối|toi/.test(low)) return "18h30 - 21h30";
  return "14h00 - 17h00";
}

export function normalizePortfolioToUrls(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => {
        if (typeof item === "string") return [item.trim()];
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          for (const k of ["url", "src", "path", "image", "photo"] as const) {
            const v = o[k];
            if (typeof v === "string" && v.trim()) return [v.trim()];
          }
        }
        return [];
      })
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        return normalizePortfolioToUrls(JSON.parse(s) as unknown);
      } catch {
        const found = s.match(/https?:\/\/[^\s<>"']+/gi);
        return found ? found : [];
      }
    }
    const found = s.match(/https?:\/\/[^\s<>"']+/gi);
    if (found?.length) return found;
    if (/^https?:\/\//i.test(s)) return [s];
  }
  return [];
}

export async function getOngoingClassesForMon(
  monId: number,
  hinhThucTag: HinhThucHocTag
): Promise<OngoingClassCard[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: lopRows, error: lopErr } = await supabase
    .from("ql_lop_hoc")
    .select("id, class_name, class_full_name, teacher, chi_nhanh_id, lich_hoc")
    .eq("mon_hoc", monId)
    .order("id", { ascending: true });
  if (lopErr || !lopRows?.length) return [];

  const lopList = lopRows as Record<string, unknown>[];
  const lopIds = lopList
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (!lopIds.length) return [];

  const teacherIds = [
    ...new Set(lopList.flatMap((r) => parseTeacherIds(r.teacher))),
  ];
  const branchIds = [
    ...new Set(
      lopList
        .map((r) => Number(r.chi_nhanh_id))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];

  const [{ data: mon }, { data: enrollRows }, { data: teachers }, { data: branches }] =
    await Promise.all([
      supabase.from("ql_mon_hoc").select("id, si_so").eq("id", monId).maybeSingle(),
      supabase
        .from("ql_quan_ly_hoc_vien")
        .select("lop_hoc")
        .in("lop_hoc", lopIds),
      teacherIds.length
        ? supabase
            .from("hr_nhan_su")
            .select("id, full_name, portfolio")
            .in("id", teacherIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      branchIds.length
        ? supabase.from("hr_ban").select("id, ten_ban").in("id", branchIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

  const totalFromMon = Number((mon as Record<string, unknown> | null)?.si_so ?? 0);
  const totalSeat = Number.isFinite(totalFromMon) && totalFromMon > 0 ? totalFromMon : 20;

  const filledByLop = new Map<number, number>();
  for (const row of enrollRows as Record<string, unknown>[]) {
    const lopId = Number(row.lop_hoc);
    if (!Number.isFinite(lopId)) continue;
    filledByLop.set(lopId, (filledByLop.get(lopId) ?? 0) + 1);
  }

  const teacherMap = new Map<number, string>();
  const teacherPortfolioMap = new Map<number, string[]>();
  for (const t of (teachers ?? []) as Record<string, unknown>[]) {
    const id = Number(t.id);
    if (!Number.isFinite(id)) continue;
    teacherMap.set(id, String(t.full_name ?? "").trim() || "Giáo viên");
    teacherPortfolioMap.set(id, normalizePortfolioToUrls(t.portfolio));
  }

  const branchMap = new Map<number, string>();
  for (const b of (branches ?? []) as Record<string, unknown>[]) {
    const id = Number(b.id);
    if (!Number.isFinite(id)) continue;
    branchMap.set(id, String(b.ten_ban ?? "").trim());
  }

  return lopList.map((r) => {
    const id = Number(r.id);
    const filled = filledByLop.get(id) ?? 0;
    const ratio = totalSeat > 0 ? filled / totalSeat : 0;
    const status: OngoingClassCard["status"] =
      filled >= totalSeat ? "full" : ratio >= 0.8 ? "almost" : "open";
    const teacherNames = [...new Set(parseTeacherIds(r.teacher))]
      .map((tid) => teacherMap.get(tid))
      .filter((name): name is string => Boolean(name && name.trim()));
    const teacherIdsOfClass = [...new Set(parseTeacherIds(r.teacher))];
    const portfolioTeacherId =
      teacherIdsOfClass.find((tid) => (teacherPortfolioMap.get(tid) ?? []).length > 0) ?? null;
    const portfolioImage =
      portfolioTeacherId != null
        ? (teacherPortfolioMap.get(portfolioTeacherId) ?? [])[0] ?? null
        : null;
    const lich = String(r.lich_hoc ?? "").trim() || "Theo lịch lớp";
    const title =
      String(r.class_full_name ?? "").trim() ||
      String(r.class_name ?? "").trim() ||
      "Lớp đang mở";
    const branchId = Number(r.chi_nhanh_id);
    const branchLabel = Number.isFinite(branchId) ? branchMap.get(branchId) : undefined;

    return {
      id: `lop-${id}`,
      title,
      gvNames: teacherNames.length ? teacherNames.join(" · ") : "Đang cập nhật",
      branchLabel: branchLabel || undefined,
      portfolioImage,
      portfolioOwner:
        portfolioTeacherId != null ? teacherMap.get(portfolioTeacherId) ?? null : null,
      status,
      lich,
      gio: deriveClassTime(hinhThucTag, lich),
      filled,
      total: totalSeat,
    };
  });
}

async function getGlobalTeacherPortfolioSlidesUncached(
  limit: number = 48
): Promise<TeacherPortfolioSlide[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const normalizePortfolio = (raw: unknown): string[] => {
    if (raw == null) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean);
    }
    if (typeof raw === "string") {
      const s = raw.trim();
      if (!s) return [];
      if (s.startsWith("[")) {
        try {
          return normalizePortfolio(JSON.parse(s) as unknown);
        } catch {
          // ignore
        }
      }
      const found = s.match(/https?:\/\/[^\s<>"']+/gi);
      return found ? found : [];
    }
    return [];
  };

  const extractMonHocName = (raw: unknown): string => {
    if (raw == null) return "";
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const name = extractMonHocName(item);
        if (name) return name;
      }
      return "";
    }
    if (typeof raw === "object") {
      const o = raw as Record<string, unknown>;
      const ten = String(o.ten_mon_hoc ?? "").trim();
      if (ten) return ten;
    }
    return "";
  };

  const { data: classes, error: classesErr } = await supabase
    .from("ql_lop_hoc")
    .select("teacher, ql_mon_hoc(ten_mon_hoc)")
    .not("teacher", "is", null);
  if (classesErr || !classes?.length) return [];

  const teacherIds = [
    ...new Set(
      (classes as Record<string, unknown>[]).flatMap((r) =>
        parseTeacherIds(r.teacher)
      )
    ),
  ];
  if (!teacherIds.length) return [];

  const { data: staff, error: staffErr } = await supabase
    .from("hr_nhan_su")
    .select("id, portfolio")
    .in("id", teacherIds)
    .order("id", { ascending: true });
  if (staffErr || !staff?.length) return [];

  const portfolioByTeacher = new Map<number, string[]>();
  for (const row of staff as Record<string, unknown>[]) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const portfolio = normalizePortfolio(row.portfolio);
    if (portfolio.length > 0) portfolioByTeacher.set(id, portfolio);
  }

  const slides: TeacherPortfolioSlide[] = [];
  const seen = new Set<string>();
  for (const row of classes as Record<string, unknown>[]) {
    const monHoc = extractMonHocName(row.ql_mon_hoc) || "Khác";
    const tids = [...new Set(parseTeacherIds(row.teacher))];
    for (const tid of tids) {
      const portfolio = portfolioByTeacher.get(tid) ?? [];
      portfolio.forEach((src, idx) => {
        const key = `${tid}__${monHoc}__${src}`;
        if (seen.has(key)) return;
        seen.add(key);
        slides.push({
          id: `${tid}-${monHoc}-${idx}`,
          src,
          monHoc,
        });
      });
    }
  }

  return slides.slice(0, Math.max(1, limit));
}

export const getGlobalTeacherPortfolioSlides = cache(
  getGlobalTeacherPortfolioSlidesUncached,
);

function hocPhiBlockGoiSelectColumns(): string {
  return hpGoiHocPhiTableName() === "hp_goi_hoc_phi"
    ? 'id, mon_hoc, "number", don_vi, gia_goc, discount, combo_id, so_buoi'
    : 'id, mon_hoc, "number", don_vi, gia_goc, discount, combo_id, so_buoi, special';
}

function mapHocPhiGoiRow(row: Record<string, unknown>): HocPhiGoiRow {
  const numRaw = row.number;
  const numberValue =
    numRaw == null || numRaw === "" ? 0 : Number(numRaw);
  const donVi = String(row.don_vi ?? "").trim();
  const giaGoc = parseMoney(row.gia_goc);
  const discount = Math.min(100, Math.max(0, parseMoney(row.discount)));
  const comboRaw = row.combo_id;
  const comboNum =
    comboRaw == null || comboRaw === "" ? null : Number(comboRaw);
  const sbRaw = row.so_buoi;
  const soBuoiParsed =
    sbRaw == null || sbRaw === ""
      ? null
      : Number(sbRaw);
  const so_buoi =
    soBuoiParsed != null && Number.isFinite(soBuoiParsed) && soBuoiParsed >= 0
      ? Math.round(soBuoiParsed)
      : null;
  const sp = row.special;
  const special =
    sp == null || sp === ""
      ? null
      : String(sp).trim() || null;

  return {
    id: Number(row.id),
    mon_hoc: Number(row.mon_hoc),
    number: Number.isFinite(numberValue) ? numberValue : 0,
    don_vi: donVi,
    gia_goc: giaGoc,
    discount,
    combo_id:
      comboNum != null && Number.isFinite(comboNum) ? comboNum : null,
    so_buoi,
    special,
  };
}

function mapHocPhiComboRow(row: Record<string, unknown>): HocPhiComboRow {
  return {
    id: Number(row.id),
    ten_combo: String(row.ten_combo ?? "").trim(),
    gia_giam: parseMoney(row.gia_giam),
  };
}

async function buildMonSlugMap(
  supabase: SupabaseClient,
  monIds: number[]
): Promise<Record<number, string>> {
  const uniq = [
    ...new Set(monIds.filter((id) => Number.isFinite(id) && id > 0)),
  ];
  if (!uniq.length) return {};
  const { data: allMonsRows } = await supabase
    .from("ql_mon_hoc")
    .select("id, ten_mon_hoc")
    .order("id", { ascending: true });
  const allMons = (allMonsRows ?? []) as MonHoc[];
  if (!allMons.length) return {};
  const { idToSlug } = buildCourseSlugIndex(allMons);
  const out: Record<number, string> = {};
  for (const id of uniq) {
    const s = idToSlug.get(id);
    if (s) out[id] = s;
  }
  return out;
}

/**
 * Gói học phí + combo cho `HocPhiBlock` (theo brief hoc-phi-block).
 * Lấy gói môn chính + các gói cùng `combo_id` để tính partner.
 */
export async function getHocPhiBlockData(
  monId: number
): Promise<HocPhiBlockData> {
  const supabase = await createClient();
  if (!supabase) {
    return { gois: [], combos: [], monMap: {}, monSlugMap: {} };
  }

  const goiTable = hpGoiHocPhiTableName();
  const goiCols = hocPhiBlockGoiSelectColumns();
  const { data: mainRows, error: e1 } = await supabase
    .from(goiTable)
    .select(goiCols)
    .eq("mon_hoc", monId)
    .order("number", { ascending: true });

  if (e1) {
    if (process.env.NODE_ENV === "development") {
      console.error("[getHocPhiBlockData] main", e1.message);
    }
    const { data: selfMon } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .eq("id", monId)
      .maybeSingle();
    const monMap: Record<number, string> = {};
    if (selfMon) {
      const row = selfMon as { id: number; ten_mon_hoc: string | null };
      monMap[monId] =
        String(row.ten_mon_hoc ?? "").trim() || `Môn ${monId}`;
    }
    const monSlugMap = await buildMonSlugMap(
      supabase,
      Object.keys(monMap).map(Number)
    );
    return { gois: [], combos: [], monMap, monSlugMap };
  }

  const main = (mainRows ?? []) as unknown as Record<string, unknown>[];
  const comboIds = [
    ...new Set(
      main
        .map((r) => r.combo_id)
        .filter((c) => c != null && c !== "")
        .map((c) => Number(c))
        .filter((n) => Number.isFinite(n))
    ),
  ];

  let merged: Record<string, unknown>[] = [...main];
  if (comboIds.length > 0) {
    const { data: extra } = await supabase
      .from(goiTable)
      .select(goiCols)
      .in("combo_id", comboIds);
    const extraRows = (extra ?? []) as unknown as Record<string, unknown>[];
    if (extraRows.length) {
      const byId = new Map<number, Record<string, unknown>>();
      for (const r of merged) byId.set(Number(r.id), r);
      for (const r of extraRows) {
        const id = Number(r.id);
        if (!byId.has(id)) byId.set(id, r);
      }
      merged = [...byId.values()];
    }
  }

  const gois = merged.map(mapHocPhiGoiRow);

  let combos: HocPhiComboRow[] = [];
  if (comboIds.length > 0) {
    const { data: comboRows, error: eCombo } = await supabase
      .from("hp_combo_mon")
      .select("id, ten_combo, gia_giam")
      .in("id", comboIds)
      .order("id", { ascending: true });
    if (!eCombo && comboRows?.length) {
      combos = (comboRows as Record<string, unknown>[]).map(
        mapHocPhiComboRow
      );
    }
  }

  const monIds = [...new Set(gois.map((g) => g.mon_hoc))];
  const monMap: Record<number, string> = {};

  if (monIds.length) {
    const { data: mons } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .in("id", monIds);
    for (const m of mons ?? []) {
      const row = m as { id: number; ten_mon_hoc: string | null };
      monMap[Number(row.id)] =
        String(row.ten_mon_hoc ?? "").trim() || `Môn ${row.id}`;
    }
  }

  const { data: selfMon } = await supabase
    .from("ql_mon_hoc")
    .select("id, ten_mon_hoc")
    .eq("id", monId)
    .maybeSingle();
  if (selfMon) {
    const row = selfMon as { id: number; ten_mon_hoc: string | null };
    monMap[monId] =
      String(row.ten_mon_hoc ?? "").trim() || `Môn ${monId}`;
  }

  const monSlugMap = await buildMonSlugMap(
    supabase,
    Object.keys(monMap).map(Number)
  );

  return { gois, combos, monMap, monSlugMap };
}