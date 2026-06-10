import { buildKhoaVaLoTrinh } from "@/lib/config/mon-thi-to-khoa";
import {
  monThiPlaceholderGrad,
  monThiPlaceholderLabel,
  resolveMonThiThumbDisplay,
} from "@/lib/cins/mon-thi-thumb";
import { getCinsSupabaseReadClient } from "@/lib/cins/client";

/** Canonical MTS — seed CINS có cấu hình tính điểm đầy đủ. */
export const CINS_MATCHER_DEFAULT_ORG_ID = "a1000000-0000-0000-0000-000000000001";

export const GHI_CHU_DE_THI_FALLBACK = "Theo quy chế trường";

export type CinsMatcherSchool = { id: string; name: string; slug: string };

export type CinsMatcherProgram = {
  id: string;
  orgId: string;
  label: string;
  slug: string;
};

export type CinsMatcherThumb = {
  ten: string;
  ma: string;
  imageUrl: string | null;
  placeholder: boolean;
  placeholderLabel: string;
  placeholderGrad: string;
};

export type CinsMatcherResult = {
  majorKey: string;
  orgId: string;
  programId: string;
  resultTitle: string;
  rows: { label: string; value: string }[];
  thumbs: CinsMatcherThumb[];
  hasConfig: boolean;
  ctaHref: string;
};

export type CinsMatcherPayload = {
  schools: CinsMatcherSchool[];
  programsByOrg: Record<string, CinsMatcherProgram[]>;
  resultsByMajorKey: Record<string, CinsMatcherResult>;
  defaultMajorKey: string;
};

type EduMonThiRow = {
  id?: string;
  ma?: string;
  ten?: string;
  loai?: string;
  thumbnail_id?: string | null;
};

type CauHinhMonRow = {
  so_thu_tu?: number;
  edu_mon_thi?: EduMonThiRow | EduMonThiRow[] | null;
};

type CauHinhKhoiRow = {
  id?: string;
  id_to_chuc?: string;
  nam_ap_dung?: number;
  id_truong_nganh?: string | null;
  mo_ta?: string | null;
  org_cau_hinh_mon?: CauHinhMonRow[] | null;
};

function majorKey(_orgId: string, programId: string): string {
  return programId;
}

function unwrapMon(raw: CauHinhMonRow["edu_mon_thi"]): EduMonThiRow | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function extractMonNangKhieu(khoi: CauHinhKhoiRow | null): EduMonThiRow[] {
  if (!khoi?.org_cau_hinh_mon?.length) return [];
  return [...khoi.org_cau_hinh_mon]
    .map((m) => ({ mon: unwrapMon(m.edu_mon_thi), soThuTu: m.so_thu_tu ?? 0 }))
    .filter((x) => x.mon?.loai === "nang_khieu" && x.mon.ten?.trim())
    .sort((a, b) => a.soThuTu - b.soThuTu)
    .map((x) => x.mon!);
}

function resolveActiveKhoi(
  khois: CauHinhKhoiRow[],
  programId: string,
): CauHinhKhoiRow | null {
  const eligible = khois.filter(
    (k) => k.id_truong_nganh === programId || k.id_truong_nganh == null,
  );
  if (!eligible.length) return null;

  const maxNam = Math.max(...eligible.map((k) => Number(k.nam_ap_dung) || 0));
  const sameYear = eligible.filter((k) => Number(k.nam_ap_dung) === maxNam);
  return (
    sameYear.find((k) => k.id_truong_nganh === programId) ??
    sameYear.find((k) => k.id_truong_nganh == null) ??
    null
  );
}

function mapThumbs(monList: EduMonThiRow[]): CinsMatcherThumb[] {
  return monList.map((m) => {
    const ma = String(m.ma ?? "").trim();
    const ten = String(m.ten ?? "").trim() || ma;
    const thumbnailId = m.thumbnail_id ?? null;
    const { imageUrl, placeholder } = resolveMonThiThumbDisplay(thumbnailId, ma);
    return {
      ten,
      ma,
      imageUrl,
      placeholder,
      placeholderLabel: monThiPlaceholderLabel(ten, ma),
      placeholderGrad: monThiPlaceholderGrad(ma || ten),
    };
  });
}

function buildResultRow(
  orgId: string,
  programId: string,
  schoolName: string,
  programLabel: string,
  khoi: CauHinhKhoiRow | null,
): CinsMatcherResult {
  const monList = extractMonNangKhieu(khoi);
  const hasConfig = monList.length > 0;
  const maList = monList.map((m) => String(m.ma ?? "").trim()).filter(Boolean);
  const { khoaNenHoc, loTrinh } = buildKhoaVaLoTrinh(maList);
  const moTa = khoi?.mo_ta?.trim();

  const rows: { label: string; value: string }[] = hasConfig
    ? [
        {
          label: "Môn thi năng khiếu",
          value: monList.map((m) => m.ten!.trim()).join(" + "),
        },
        {
          label: "Ghi chú đề thi",
          value: moTa || GHI_CHU_DE_THI_FALLBACK,
        },
        { label: "Khóa nên học", value: khoaNenHoc },
        { label: "Lộ trình đề xuất", value: loTrinh },
      ]
    : [];

  return {
    majorKey: majorKey(orgId, programId),
    orgId,
    programId,
    resultTitle: `${programLabel} · ${schoolName}`,
    rows,
    thumbs: mapThumbs(monList),
    hasConfig,
    ctaHref: "/tra-cuu-thong-tin",
  };
}

const FALLBACK_PAYLOAD: CinsMatcherPayload = {
  schools: [
    {
      id: CINS_MATCHER_DEFAULT_ORG_ID,
      name: "Trường Đại học Mỹ thuật TP. Hồ Chí Minh",
      slug: "dai-hoc-my-thuat-tphcm",
    },
  ],
  programsByOrg: {},
  resultsByMajorKey: {},
  defaultMajorKey: "",
};

async function fetchAllActiveKhoi(): Promise<CauHinhKhoiRow[]> {
  const supabase = getCinsSupabaseReadClient();
  const rows: CauHinhKhoiRow[] = [];
  const PAGE = 200;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("org_cau_hinh_khoi")
      .select(
        `
        id, id_to_chuc, nam_ap_dung, id_truong_nganh, mo_ta,
        org_cau_hinh_mon (
          so_thu_tu,
          edu_mon_thi ( id, ma, ten, loai, thumbnail_id )
        )
      `,
      )
      .eq("trang_thai", "active")
      .range(from, from + PAGE - 1);

    if (error || !data?.length) break;
    rows.push(...(data as CauHinhKhoiRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}

/** Trường có ≥1 môn năng khiếu trong cấu hình active (§4.1 brief). */
function orgIdsWithNangKhieu(khois: CauHinhKhoiRow[]): Set<string> {
  const ids = new Set<string>();
  for (const k of khois) {
    const orgId = k.id_to_chuc?.trim();
    if (!orgId) continue;
    if (extractMonNangKhieu(k).length > 0) ids.add(orgId);
  }
  return ids;
}

export async function fetchCinsMatcherPayload(): Promise<CinsMatcherPayload> {
  try {
    const supabase = getCinsSupabaseReadClient();
    const allKhois = await fetchAllActiveKhoi();
    const orgIds = [...orgIdsWithNangKhieu(allKhois)];
    if (!orgIds.length) return FALLBACK_PAYLOAD;

    const khoisByOrg = new Map<string, CauHinhKhoiRow[]>();
    for (const k of allKhois) {
      const orgId = k.id_to_chuc?.trim();
      if (!orgId || !orgIds.includes(orgId)) continue;
      const arr = khoisByOrg.get(orgId) ?? [];
      arr.push(k);
      khoisByOrg.set(orgId, arr);
    }

    const [orgRes, programRes] = await Promise.all([
      supabase
        .from("org_to_chuc")
        .select("id, ten, slug")
        .in("id", orgIds)
        .eq("loai_to_chuc", "truong_dai_hoc")
        .eq("trang_thai_hoat_dong", "dang_hoat_dong")
        .order("ten"),
      supabase
        .from("org_truong_nganh")
        .select("id, id_to_chuc, ten_chuong_trinh, slug")
        .in("id_to_chuc", orgIds)
        .eq("trang_thai_chuong_trinh", "dang_tuyen")
        .order("ten_chuong_trinh"),
    ]);

    if (orgRes.error || !orgRes.data?.length) return FALLBACK_PAYLOAD;

    const schoolNameById = new Map<string, string>();
    for (const o of orgRes.data as { id: string; ten: string; slug: string }[]) {
      schoolNameById.set(o.id, o.ten?.trim() || o.slug);
    }

    const schools: CinsMatcherSchool[] = (orgRes.data as { id: string; ten: string; slug: string }[])
      .filter((o) => khoisByOrg.has(o.id))
      .map((o) => ({
        id: o.id,
        name: o.ten?.trim() || o.slug,
        slug: o.slug,
      }));

    const programsByOrg: Record<string, CinsMatcherProgram[]> = {};
    for (const orgId of orgIds) programsByOrg[orgId] = [];

    for (const raw of (programRes.data ?? []) as {
      id: string;
      id_to_chuc: string;
      ten_chuong_trinh: string;
      slug: string;
    }[]) {
      const orgId = raw.id_to_chuc;
      if (!orgIds.includes(orgId)) continue;
      programsByOrg[orgId]!.push({
        id: raw.id,
        orgId,
        label: raw.ten_chuong_trinh?.trim() || raw.slug,
        slug: raw.slug,
      });
    }

    const resultsByMajorKey: Record<string, CinsMatcherResult> = {};
    for (const school of schools) {
      const khois = khoisByOrg.get(school.id) ?? [];
      const programs = programsByOrg[school.id] ?? [];
      for (const program of programs) {
        const khoi = resolveActiveKhoi(khois, program.id);
        resultsByMajorKey[majorKey(school.id, program.id)] = buildResultRow(
          school.id,
          program.id,
          school.name,
          program.label,
          khoi,
        );
      }
    }

    const defaultSchool =
      schools.find((s) => s.id === CINS_MATCHER_DEFAULT_ORG_ID) ?? schools[0]!;
    const defaultPrograms = programsByOrg[defaultSchool.id] ?? [];
    const defaultProgram =
      defaultPrograms.find((p) => resultsByMajorKey[majorKey(defaultSchool.id, p.id)]?.hasConfig) ??
      defaultPrograms[0];

    return {
      schools,
      programsByOrg,
      resultsByMajorKey,
      defaultMajorKey: defaultProgram
        ? majorKey(defaultSchool.id, defaultProgram.id)
        : "",
    };
  } catch {
    return FALLBACK_PAYLOAD;
  }
}
