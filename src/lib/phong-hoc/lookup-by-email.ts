import { fetchKyByKhoaHocVienIds, type HpResolvedKy } from "@/lib/data/hp-thu-hp-chi-tiet-ky";
import { calendarDaysRemainingInclusive } from "@/lib/utils";
import { parseTeacherIds } from "@/lib/utils/parse-teacher-ids";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassroomSessionRecord, ClassroomStudentSessionData } from "./classroom-session";

const LO_SELECT_TEACHER =
  "id,class_name,class_full_name,avatar,url_class,teacher,mon_hoc,lich_hoc,meeting_room";

/** Lọc danh sách lớp đã fetch theo `teacherId` (cột `teacher` đa dạng kiểu). */
function lopHocRowsForTeacher(
  rows: Record<string, unknown>[],
  teacherId: number
): Record<string, unknown>[] {
  const byId = new Map<number, Record<string, unknown>>();
  for (const r of rows) {
    if (!parseTeacherIds(r.teacher).includes(teacherId)) continue;
    const id = Number(r.id);
    if (!Number.isFinite(id)) continue;
    byId.set(id, r);
  }
  return [...byId.values()];
}

async function teacherNamesFromLopTeacherColumn(
  supabase: SupabaseClient,
  rawTeacher: unknown
): Promise<string> {
  const ids = parseTeacherIds(rawTeacher);
  if (!ids.length) return "";
  const { data } = await supabase.from("hr_nhan_su").select("id, full_name").in("id", ids);
  const nameById = new Map<number, string>();
  for (const row of data ?? []) {
    const r = row as { id: unknown; full_name?: unknown };
    const id = Number(r.id);
    if (!Number.isFinite(id)) continue;
    nameById.set(id, String(r.full_name ?? "").trim());
  }
  return ids.map((id) => nameById.get(id) ?? "").filter(Boolean).join(" · ");
}

/**
 * Luồng đăng nhập email (học viên):
 * 1) `ql_thong_tin_hoc_vien` — tìm theo email (hồ sơ HV).
 * 2) `ql_quan_ly_hoc_vien` — ghi danh; FK `hoc_vien_id` → `ql_thong_tin_hoc_vien.id`
 *    (schema thực tế không có cột `hoc_vien`).
 */

function calcDaysRemaining(d: string | null): number | null {
  if (!d) return null;
  const s = String(d).trim().slice(0, 10);
  return calendarDaysRemainingInclusive(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
}

/**
 * Tất cả cặp trường–ngành của HV (`ql_hv_truong_nganh` + `dh_*`), theo thứ tự `id`.
 */
export async function fetchTruongNganhLabelsForHv(
  supabase: SupabaseClient,
  hocVienId: number
): Promise<{ truong: string; nganh: string }[]> {
  const { data: rows, error } = await supabase
    .from("ql_hv_truong_nganh")
    .select("truong_dai_hoc, nganh_dao_tao")
    .eq("hoc_vien", hocVienId)
    .order("id", { ascending: true });

  if (error || !rows?.length) return [];

  const truongIds = [
    ...new Set(
      rows
        .map((r) => Number((r as { truong_dai_hoc?: unknown }).truong_dai_hoc))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  const nganhIds = [
    ...new Set(
      rows
        .map((r) => Number((r as { nganh_dao_tao?: unknown }).nganh_dao_tao))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];

  const [trRes, ngRes] = await Promise.all([
    truongIds.length
      ? supabase.from("dh_truong_dai_hoc").select("id, ten_truong_dai_hoc").in("id", truongIds)
      : Promise.resolve({ data: [] as { id: unknown; ten_truong_dai_hoc?: unknown }[] }),
    nganhIds.length
      ? supabase.from("dh_nganh_dao_tao").select("id, ten_nganh").in("id", nganhIds)
      : Promise.resolve({ data: [] as { id: unknown; ten_nganh?: unknown }[] }),
  ]);

  const trMap = new Map<number, string>();
  for (const t of trRes.data ?? []) {
    const id = Number((t as { id: unknown }).id);
    if (!Number.isFinite(id)) continue;
    trMap.set(id, String((t as { ten_truong_dai_hoc?: unknown }).ten_truong_dai_hoc ?? "").trim());
  }
  const ngMap = new Map<number, string>();
  for (const n of ngRes.data ?? []) {
    const id = Number((n as { id: unknown }).id);
    if (!Number.isFinite(id)) continue;
    ngMap.set(id, String((n as { ten_nganh?: unknown }).ten_nganh ?? "").trim());
  }

  const out: { truong: string; nganh: string }[] = [];
  for (const r of rows) {
    const row = r as { truong_dai_hoc?: unknown; nganh_dao_tao?: unknown };
    const tid = row.truong_dai_hoc != null ? Number(row.truong_dai_hoc) : NaN;
    const nid = row.nganh_dao_tao != null ? Number(row.nganh_dao_tao) : NaN;
    const tr = Number.isFinite(tid) ? trMap.get(tid) ?? "" : "";
    const ng = Number.isFinite(nid) ? ngMap.get(nid) ?? "" : "";
    out.push({
      truong: tr || "—",
      nganh: ng || "—",
    });
  }
  return out;
}

function sliceIsoDate(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Nhãn `ql_quan_ly_hoc_vien.tien_do_hoc` → `hv_he_thong_bai_tap`. */
async function fetchTienDoBaiTapLabel(
  supabase: SupabaseClient,
  tienDoHocId: number | null
): Promise<string | null> {
  if (tienDoHocId == null || !Number.isFinite(tienDoHocId) || tienDoHocId <= 0) return null;
  const { data, error } = await supabase
    .from("hv_he_thong_bai_tap")
    .select("ten_bai_tap,bai_so")
    .eq("id", tienDoHocId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { ten_bai_tap?: unknown; bai_so?: unknown };
  const name = String(row.ten_bai_tap ?? "").trim();
  const so = row.bai_so != null && row.bai_so !== "" ? Number(row.bai_so) : NaN;
  if (!name && !Number.isFinite(so)) return null;
  if (Number.isFinite(so) && name) return `Bài ${so}: ${name}`;
  if (name) return name;
  return Number.isFinite(so) ? `Bài ${so}` : null;
}

/** Chuẩn hoá PK bigint từ PostgREST (number | string) */
function asHvPk(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

type HvRow = {
  id: unknown;
  full_name: unknown;
  email: unknown;
  email_prefix?: unknown;
  nam_thi: unknown;
  ngay_bat_dau: unknown;
  ngay_ket_thuc: unknown;
  facebook: unknown;
  sdt: unknown;
  sex?: unknown;
  /** `ql_thong_tin_hoc_vien.avatar` */
  avatar?: unknown;
};

/** Cột `ql_quan_ly_hoc_vien` — schema: `status`, `trang_thai`. */
type QlhvRow = {
  id: unknown;
  hoc_vien_id: unknown;
  lop_hoc: unknown;
  tien_do_hoc?: unknown;
  status?: unknown;
  trang_thai?: unknown;
};

function normalizeEnrollment(row: QlhvRow): {
  enrollmentId: number;
  lopHocId: number;
  tienDoHoc: number | null;
  hocVienPk: string;
  status: string | null;
  trangThai: string | null;
} | null {
  const enrollmentId = Number(row.id);
  const lopHocId = Number(row.lop_hoc);
  if (!Number.isFinite(enrollmentId) || !Number.isFinite(lopHocId)) return null;
  const hocVienPk = asHvPk(row.hoc_vien_id);
  if (!hocVienPk) return null;
  const statusRaw = row.status != null ? String(row.status).trim() : "";
  const trangRaw = row.trang_thai != null ? String(row.trang_thai).trim() : "";
  return {
    enrollmentId,
    lopHocId,
    tienDoHoc:
      row.tien_do_hoc != null && row.tien_do_hoc !== "" ? Number(row.tien_do_hoc) : null,
    hocVienPk,
    status: statusRaw !== "" ? statusRaw : null,
    trangThai: trangRaw !== "" ? trangRaw : null,
  };
}

function mergeEnrollmentsFromRows(
  rows: QlhvRow[]
): NonNullable<ReturnType<typeof normalizeEnrollment>>[] {
  const merged = new Map<number, ReturnType<typeof normalizeEnrollment>>();
  for (const row of rows) {
    const n = normalizeEnrollment(row);
    if (n && !merged.has(n.enrollmentId)) {
      merged.set(n.enrollmentId, n);
    }
  }
  return [...merged.values()].filter(Boolean) as NonNullable<
    ReturnType<typeof normalizeEnrollment>
  >[];
}

/**
 * Nhiều dòng `ql_quan_ly_hoc_vien` cùng lớp: bản mới (gia hạn) có thể chưa có `tien_do_hoc` trong khi
 * bản cũ đã có tiến độ. Phòng học luôn đọc đúng `qlhv_id` của session — khi gộp một thẻ lớp phải giữ
 * tiến độ nhất quán (ưu tiên đúng qlhv đang mở trong session, sau đó bản ghi có tiến độ với id lớn nhất).
 */
function mergeTienDoHocForSameLopSessions(
  group: ClassroomStudentSessionData[],
  preferQlhvId?: number | null
): number | null {
  if (group.length === 0) return null;
  const pref =
    preferQlhvId != null && Number.isFinite(preferQlhvId) && preferQlhvId > 0
      ? group.find((s) => s.qlhv_id === preferQlhvId)
      : undefined;
  if (pref != null) {
    const td = pref.tien_do_hoc;
    if (td != null && Number.isFinite(td)) return td;
  }
  const withTd = group
    .filter((s) => s.tien_do_hoc != null && Number.isFinite(s.tien_do_hoc))
    .sort((a, b) => b.qlhv_id - a.qlhv_id);
  if (withTd.length > 0) return withTd[0]!.tien_do_hoc ?? null;
  return null;
}

/**
 * Cùng học viên + cùng `lop_hoc_id` có thể có nhiều dòng `ql_quan_ly_hoc_vien` (gia hạn / nhập trùng).
 * UI chỉ nên một thẻ lớp — giữ bản ghi ưu tiên `qlhv_id` lớn hơn, sau đó `days_remaining` cao hơn.
 * `tien_do_hoc` trên thẻ được gộp riêng để không mất tiến độ khi bản mới chưa gán bài.
 */
function dedupeStudentSessionDataByLop(
  list: ClassroomStudentSessionData[],
  preferQlhvId?: number | null
): ClassroomStudentSessionData[] {
  const byLop = new Map<number, ClassroomStudentSessionData[]>();
  const noLop: ClassroomStudentSessionData[] = [];

  for (const s of list) {
    const lid = Number(s.lop_hoc_id);
    if (!Number.isFinite(lid)) {
      noLop.push(s);
      continue;
    }
    if (!byLop.has(lid)) byLop.set(lid, []);
    byLop.get(lid)!.push(s);
  }

  const deduped: ClassroomStudentSessionData[] = [];
  for (const [, group] of byLop) {
    let winner = group[0]!;
    for (let i = 1; i < group.length; i++) {
      const s = group[i]!;
      winner =
        s.qlhv_id > winner.qlhv_id
          ? s
          : s.qlhv_id < winner.qlhv_id
            ? winner
            : (s.days_remaining ?? -1e9) > (winner.days_remaining ?? -1e9)
              ? s
              : winner;
    }
    const mergedTd = mergeTienDoHocForSameLopSessions(group, preferQlhvId);
    deduped.push({
      ...winner,
      tien_do_hoc: mergedTd,
    });
  }

  const merged = [...deduped, ...noLop];
  merged.sort((a, b) => {
    const an = a.class_name?.trim() ?? "";
    const bn = b.class_name?.trim() ?? "";
    if (an !== bn) return an.localeCompare(bn, "vi");
    return a.qlhv_id - b.qlhv_id;
  });
  return merged;
}

function dedupeLookupStudentRecordsByLop(
  records: ClassroomSessionRecord[]
): ClassroomSessionRecord[] {
  const teachers = records.filter(
    (r): r is Extract<ClassroomSessionRecord, { userType: "Teacher" }> => r.userType === "Teacher",
  );
  const students = records.filter(
    (r): r is Extract<ClassroomSessionRecord, { userType: "Student" }> => r.userType === "Student",
  );

  const dataList = students.map((r) => r.data);
  const dedupedData = dedupeStudentSessionDataByLop(dataList);
  const mergedStudents: ClassroomSessionRecord[] = dedupedData.map((data) => ({
    userType: "Student" as const,
    data,
  }));

  return [...mergedStudents, ...teachers];
}

/**
 * Một dòng ghi danh → dữ liệu lớp trên session học viên (cùng logic `lookupClassroomByEmail`).
 */
async function classroomStudentDataForEnrollment(
  supabase: SupabaseClient,
  s: HvRow,
  en: NonNullable<ReturnType<typeof normalizeEnrollment>>,
  emailFallback: string,
  kyMap?: Map<number, HpResolvedKy>
): Promise<ClassroomStudentSessionData | null> {
  const { data: clsRows } = await supabase
    .from("ql_lop_hoc")
    .select("id,class_name,class_full_name,avatar,url_class,teacher,mon_hoc,lich_hoc,meeting_room")
    .eq("id", en.lopHocId)
    .limit(1);

  const cls = clsRows?.[0];

  let ngayKetThuc: string | null = null;
  try {
    const resolved =
      kyMap?.get(en.enrollmentId) ??
      (await fetchKyByKhoaHocVienIds(supabase, [en.enrollmentId])).get(en.enrollmentId);
    ngayKetThuc = resolved?.ngay_cuoi_ky ?? null;
  } catch {
    ngayKetThuc = null;
  }

  const days_remaining = calcDaysRemaining(ngayKetThuc);

  let truongNganhPairs: { truong: string; nganh: string }[] = [];
  try {
    truongNganhPairs = await fetchTruongNganhLabelsForHv(supabase, Number(s.id));
  } catch {
    truongNganhPairs = [];
  }
  const firstPair = truongNganhPairs[0];
  const truong = firstPair?.truong ?? "";
  const nganh = firstPair?.nganh ?? "";

  const hvAvatar = String(s.avatar ?? "").trim();
  const hvSdt = String(s.sdt ?? "").trim();
  const hvFacebook = String(s.facebook ?? "").trim();
  const hvSex = String(s.sex ?? "").trim();
  const tienDoLabel = await fetchTienDoBaiTapLabel(supabase, en.tienDoHoc);

  if (!cls) {
    return {
      id: Number(s.id),
      full_name: String(s.full_name ?? ""),
      email: (() => {
        const fromRow = String(s.email ?? "").trim();
        if (fromRow !== "") return fromRow;
        return emailFallback.trim() !== "" ? emailFallback : null;
      })(),
      nam_thi: s.nam_thi != null ? Number(s.nam_thi) : null,
      ...(hvAvatar !== "" ? { hv_avatar: hvAvatar } : {}),
      hv_sdt: hvSdt !== "" ? hvSdt : null,
      hv_facebook: hvFacebook !== "" ? hvFacebook : null,
      hv_sex: hvSex !== "" ? hvSex : null,
      hv_ngay_bat_dau: sliceIsoDate(s.ngay_bat_dau),
      hv_ngay_ket_thuc: sliceIsoDate(s.ngay_ket_thuc),
      tien_do_bai_label: tienDoLabel,
      lop_hoc_id: en.lopHocId,
      qlhv_id: en.enrollmentId,
      class_name: `Lớp #${en.lopHocId}`,
      class_full_name: "Dữ liệu lớp chưa đồng bộ — liên hệ Sine Art nếu cần",
      url_class: null,
      class_avatar: "",
      lich_hoc: "",
      meeting_room: null,
      teacher_name: "—",
      days_remaining,
      ngay_ket_thuc: ngayKetThuc,
      truong_dai_hoc: truong,
      nganh_dao_tao: nganh,
      ...(truongNganhPairs.length ? { truong_nganh_pairs: truongNganhPairs } : {}),
      status: en.status,
      trang_thai: en.trangThai,
      tien_do_hoc: en.tienDoHoc,
    };
  }

  const teacher_name = await teacherNamesFromLopTeacherColumn(supabase, cls.teacher);

  const lopId = Number((cls as { id?: unknown }).id);
  const lopHocId = Number.isFinite(lopId) ? lopId : en.lopHocId;

  return {
    id: Number(s.id),
    full_name: String(s.full_name ?? ""),
    email: (() => {
      const fromRow = String(s.email ?? "").trim();
      if (fromRow !== "") return fromRow;
      return emailFallback.trim() !== "" ? emailFallback : null;
    })(),
    nam_thi: s.nam_thi != null ? Number(s.nam_thi) : null,
    ...(hvAvatar !== "" ? { hv_avatar: hvAvatar } : {}),
    hv_sdt: hvSdt !== "" ? hvSdt : null,
    hv_facebook: hvFacebook !== "" ? hvFacebook : null,
    hv_sex: hvSex !== "" ? hvSex : null,
    hv_ngay_bat_dau: sliceIsoDate(s.ngay_bat_dau),
    hv_ngay_ket_thuc: sliceIsoDate(s.ngay_ket_thuc),
    tien_do_bai_label: tienDoLabel,
    lop_hoc_id: lopHocId,
    qlhv_id: en.enrollmentId,
    class_name: String((cls as { class_name?: unknown }).class_name ?? ""),
    class_full_name: (cls as { class_full_name?: unknown }).class_full_name != null
      ? String((cls as { class_full_name: unknown }).class_full_name)
      : null,
    url_class:
      (cls as { url_class?: unknown }).url_class != null
        ? String((cls as { url_class: unknown }).url_class)
        : null,
    class_avatar: String((cls as { avatar?: unknown }).avatar ?? ""),
    lich_hoc:
      (cls as { lich_hoc?: unknown }).lich_hoc != null
        ? String((cls as { lich_hoc: unknown }).lich_hoc).trim()
        : "",
    meeting_room:
      (cls as { meeting_room?: unknown }).meeting_room != null &&
      String((cls as { meeting_room: unknown }).meeting_room).trim() !== ""
        ? String((cls as { meeting_room: unknown }).meeting_room).trim()
        : null,
    teacher_name,
    days_remaining,
    ngay_ket_thuc: ngayKetThuc,
    truong_dai_hoc: truong,
    nganh_dao_tao: nganh,
    ...(truongNganhPairs.length ? { truong_nganh_pairs: truongNganhPairs } : {}),
    status: en.status,
    trang_thai: en.trangThai,
    tien_do_hoc: en.tienDoHoc,
  };
}

export type FetchAllClassSessionsOptions = {
  /** `ql_quan_ly_hoc_vien.id` của ghi danh đang dùng trong session Phòng học — ưu tiên `tien_do_hoc` của dòng này khi gộp trùng lớp */
  preferQlhvId?: number | null;
};

/** Mọi lớp ghi danh của một học viên (`ql_thong_tin_hoc_vien.id`) — ví dụ tab Lớp học trên trang cá nhân. */
export async function fetchAllClassSessionsForStudentHv(
  supabase: SupabaseClient,
  hocVienId: number,
  options?: FetchAllClassSessionsOptions
): Promise<ClassroomStudentSessionData[]> {
  const pk = asHvPk(hocVienId);
  if (!pk) return [];

  const { data: sRaw, error: hvErr } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select(
      "id,full_name,email,email_prefix,nam_thi,ngay_bat_dau,ngay_ket_thuc,facebook,sdt,avatar,sex"
    )
    .eq("id", pk)
    .maybeSingle();

  if (hvErr || !sRaw) return [];

  const s = sRaw as HvRow;

  const { data: enrollmentRows } = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("id,hoc_vien_id,lop_hoc,tien_do_hoc,status,trang_thai")
    .eq("hoc_vien_id", pk);

  const enrollments = mergeEnrollmentsFromRows((enrollmentRows ?? []) as QlhvRow[]);

  const emailFb = String(s.email ?? "").trim().toLowerCase();

  const qlhvIds = enrollments.filter((e) => e.hocVienPk === pk).map((e) => e.enrollmentId);
  const kyMap =
    qlhvIds.length > 0 ? await fetchKyByKhoaHocVienIds(supabase, qlhvIds) : new Map<number, HpResolvedKy>();

  const list: ClassroomStudentSessionData[] = [];
  for (const en of enrollments) {
    if (en.hocVienPk !== pk) continue;
    const data = await classroomStudentDataForEnrollment(supabase, s, en, emailFb, kyMap);
    if (data) list.push(data);
  }

  return dedupeStudentSessionDataByLop(list, options?.preferQlhvId);
}

export type LookupClassroomOutcome = {
  records: ClassroomSessionRecord[];
  /** Có dòng `ql_thong_tin_hoc_vien` khớp email nhưng không có `ql_quan_ly_hoc_vien` với `hoc_vien_id` đúng */
  studentProfileWithoutEnrollment: boolean;
  /** Email khớp `hr_nhan_su` nhưng không có lớp `ql_lop_hoc` nào gắn teacher */
  teacherWithoutClass: boolean;
};

export async function lookupClassroomByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<LookupClassroomOutcome> {
  const clean = email.trim().toLowerCase();
  const results: ClassroomSessionRecord[] = [];
  let studentProfileWithoutEnrollment = false;
  let teacherWithoutClass = false;

  /* ── Học viên: ql_thong_tin_hoc_vien → ql_quan_ly_hoc_vien (hoc_vien_id) ── */
  /** Ưu tiên `.eq(email)` (dùng index btree trên email) — `.ilike` full scan dễ timeout. */
  const hvSelect =
    "id,full_name,email,email_prefix,nam_thi,ngay_bat_dau,ngay_ket_thuc,facebook,sdt,avatar,sex";

  let stuRes = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select(hvSelect)
    .eq("email", clean);

  let stuErr = stuRes.error;
  let students = stuRes.data;

  if (!stuErr && !students?.length) {
    stuRes = await supabase.from("ql_thong_tin_hoc_vien").select(hvSelect).ilike("email", clean).limit(50);
    stuErr = stuRes.error;
    students = stuRes.data;
  }

  if (!stuErr && !students?.length && clean.includes("@")) {
    const prefix = clean.split("@")[0]?.trim();
    if (prefix) {
      const retry = await supabase
        .from("ql_thong_tin_hoc_vien")
        .select(hvSelect)
        .eq("email_prefix", prefix)
        .limit(50);
      let prefixRows = retry.data;
      let prefixErr = retry.error;
      if (!prefixErr && !prefixRows?.length) {
        const ilikeRetry = await supabase
          .from("ql_thong_tin_hoc_vien")
          .select(hvSelect)
          .ilike("email_prefix", prefix)
          .limit(50);
        prefixRows = ilikeRetry.data;
        prefixErr = ilikeRetry.error;
      }
      if (!prefixErr && prefixRows?.length) {
        const exact = (prefixRows as HvRow[]).filter(
          (row) => String(row.email ?? "").trim().toLowerCase() === clean
        );
        if (exact.length) {
          students = exact as typeof students;
        }
      }
    }
  }

  if (!stuErr && students?.length) {
    const studentByHvId = new Map<string, HvRow>();
    const hvPks: string[] = [];
    for (const raw of students as HvRow[]) {
      const pk = asHvPk(raw.id);
      if (!pk) continue;
      studentByHvId.set(pk, raw);
      hvPks.push(pk);
    }

    if (hvPks.length === 0) {
      studentProfileWithoutEnrollment = true;
    } else {
      const { data: enrollmentRows } = await supabase
        .from("ql_quan_ly_hoc_vien")
        .select("id,hoc_vien_id,lop_hoc,tien_do_hoc,status,trang_thai")
        .in("hoc_vien_id", hvPks);

      const enrollments = mergeEnrollmentsFromRows((enrollmentRows ?? []) as QlhvRow[]);

      if (!enrollments.length) {
        studentProfileWithoutEnrollment = true;
      }

      const qlhvIdsLookup = enrollments.map((e) => e.enrollmentId);
      const kyMapLookup =
        qlhvIdsLookup.length > 0
          ? await fetchKyByKhoaHocVienIds(supabase, qlhvIdsLookup)
          : new Map<number, HpResolvedKy>();

      for (const en of enrollments) {
        const s = studentByHvId.get(en.hocVienPk);
        if (!s) continue;

        const data = await classroomStudentDataForEnrollment(supabase, s, en, clean, kyMapLookup);
        if (data) {
          results.push({ userType: "Student", data });
        }
      }
    }
  }

  /* ── Giáo viên: hr_nhan_su + ql_lop_hoc (đếm ghi danh theo lớp, không lọc cột status — DB có thể không có) ──
     Có thể có nhiều hr_nhan_su trùng email (nhân sự cũ/mới) — gom lớp từ mọi row. */
  const { data: teachers, error: teacherErr } = await supabase
    .from("hr_nhan_su")
    .select("id,full_name,email,avatar")
    .ilike("email", clean);

  if (!teacherErr && teachers?.length) {
    let anyTeacherMatched = false;
    let anyClassFound = false;
    const seenLop = new Set<number>();

    const { data: allLopForTeachers, error: lopAllErr } = await supabase
      .from("ql_lop_hoc")
      .select(LO_SELECT_TEACHER);
    const lopCache = !lopAllErr && allLopForTeachers?.length
      ? (allLopForTeachers as Record<string, unknown>[])
      : [];

    for (const teacherRow of teachers) {
      const t = teacherRow as {
        id: number;
        full_name: string;
        email: string | null;
        avatar: string | null;
      };
      if (!Number.isFinite(Number(t.id))) continue;
      anyTeacherMatched = true;

      const classes = lopHocRowsForTeacher(lopCache, Number(t.id));

      for (const cls of classes) {
        const lopId = Number(cls.id);
        if (!Number.isFinite(lopId) || seenLop.has(lopId)) continue;
        seenLop.add(lopId);
        anyClassFound = true;

        const { count } = await supabase
          .from("ql_quan_ly_hoc_vien")
          .select("id", { count: "exact", head: true })
          .eq("lop_hoc", lopId);

        results.push({
          userType: "Teacher",
          data: {
            id: t.id,
            full_name: t.full_name,
            email: t.email,
            avatar: t.avatar ?? "",
            lop_hoc_id: lopId,
            class_name: (cls.class_name as string | null | undefined) ?? "",
            class_full_name: (cls.class_full_name as string | null | undefined) ?? null,
            class_avatar: (cls.avatar as string | null | undefined) ?? "",
            url_class: (cls.url_class as string | null | undefined) ?? null,
            lich_hoc: cls.lich_hoc != null ? String(cls.lich_hoc).trim() : "",
            meeting_room:
              cls.meeting_room != null && String(cls.meeting_room).trim() !== ""
                ? String(cls.meeting_room).trim()
                : null,
            so_hoc_vien: count ?? 0,
          },
        });
      }
    }

    if (anyTeacherMatched && !anyClassFound) {
      teacherWithoutClass = true;
    }
  }

  return {
    records: dedupeLookupStudentRecordsByLop(results),
    studentProfileWithoutEnrollment,
    teacherWithoutClass,
  };
}
