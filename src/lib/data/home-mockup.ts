import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_HOME_CONTENT, HERO_HOC_THU_FACEBOOK_URL } from "@/lib/admin/home-content-schema";
import { buildCourseSlugIndex } from "@/lib/data/courses-page";
import { fetchNganhHocCardsFromCins } from "@/lib/data/cins-careers";
import { CAREER_CARDS, FALLBACK_STATS } from "@/lib/data/fallback";
import {
  getHomeCareersData,
  getHomeGallerySectionData,
  getHomeReviewsData,
  getHomeStatStripData,
} from "@/lib/data/home";
import { getHomeContent } from "@/lib/data/home-content";
import { getBaiTapListForMon } from "@/lib/data/bai-tap";
import { fetchDhExamProfilesSafe } from "@/lib/agent/dh-exam-profiles";
import { cfResolvedImageUrl } from "@/lib/cfImageUrl";
import { fetchDhNguyenVongCatalog } from "@/lib/donghocphi/dh-catalog";
import { createStaticClient } from "@/lib/supabase/static";
import { toJSONSafe } from "@/lib/serialize";
import type { CareerCard } from "@/types/career";
import type { BaiTap } from "@/types/baiTap";
import type { GalleryDisplayItem, HomeReview, MonHoc } from "@/types/homepage";

const MON_HOC_HOME_SELECT =
  "id, ten_mon_hoc, loai_khoa_hoc, thumbnail, is_featured, thu_tu_hien_thi, hinh_thuc, mo_ta_ngan, gradient_start, gradient_end";

export type HomeMockupSlide = {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  subtitle: string;
  bg: string;
  imageUrl?: string | null;
};

export type HomeMockupMarqueeItem = {
  id: string;
  icon: "map-pin" | "calendar" | "gift" | "edit-3";
  text: string;
};

export type HomeMockupKiengPillar = {
  key: "hh" | "tt" | "bc";
  title: string;
  role: string;
  text: string;
  thumbGrad: string;
  slug: string;
  samplePhoto?: string | null;
};

export type HomeMockupCurriculumCard = {
  key: "hh" | "tt" | "bc";
  monId: number;
  slug: string;
  title: string;
  desc: string;
  steps: { n: string; text: string; last?: boolean }[];
  thumbnail: string | null;
  thumbGrad: string;
  catBg: string;
  catColor: string;
};

export type HomeMockupTeacher = {
  id: number;
  fullName: string;
  school: string;
  work: string;
  avatar: string | null;
  thumbGrad: string;
};

export type HomeMockupExamStat = { value: string; label: string };

export type HomeMockupMatcherSchool = { id: number; name: string };
export type HomeMockupMatcherOption = {
  schoolId: number;
  majorKey: string;
  majorLabel: string;
  resultTitle: string;
  rows: { label: string; value: string }[];
  ctaHref: string;
};

export type HomeMockupPayload = {
  hero: {
    badge: string;
    headlineEmphasis: string;
    subPill: string;
    lead: string;
    ctaPrimary: { label: string; href: string };
    ctaGhost: { label: string; href: string };
    studentsLabel: string;
    /** Cùng nguồn `getHomeReviewsData` như `ReviewsSection` / `HeroSection`. */
    trustAvatars: { id: string | number; name: string; avatarUrl: string | null; grad: string }[];
    trustAvatarOverflow: number;
  };
  marquee: HomeMockupMarqueeItem[];
  slides: HomeMockupSlide[];
  stats: { value: string; label: string }[];
  exam: {
    title: string;
    subtitle: string;
    stats: HomeMockupExamStat[];
    note?: string;
  };
  kieng: {
    pillars: HomeMockupKiengPillar[];
  };
  curriculum: HomeMockupCurriculumCard[];
  beforeAfter: {
    before: GalleryDisplayItem | null;
    after: GalleryDisplayItem | null;
  };
  video: {
    youtubeId: string;
    sectionLabel: string;
    titleEmphasis: string;
    subtitle: string;
    thumbnailUrl?: string | null;
  };
  teachers: HomeMockupTeacher[];
  careers: CareerCard[];
  matcher: {
    schools: HomeMockupMatcherSchool[];
    options: HomeMockupMatcherOption[];
    defaultOptionKey: string;
  };
  reviews: HomeReview[];
  cta: typeof DEFAULT_HOME_CONTENT.ctaBand;
  footer: {
    tagline: string;
    branches: { label: string }[];
    phone: string;
    email: string;
  };
};

const MARQUEE_STATIC: HomeMockupMarqueeItem[] = [
  { id: "m1", icon: "map-pin", text: "Khai trương cơ sở 2 — 131 Nơ Trang Long, Bình Thạnh" },
  { id: "m2", icon: "calendar", text: "Hình họa khóa mới khai giảng thứ 5 hàng tuần" },
  { id: "m3", icon: "gift", text: "Học thử 1 buổi miễn phí — không cần kinh nghiệm" },
  { id: "m4", icon: "edit-3", text: "Đăng ký thi thử năng khiếu online" },
];

const SLIDES_STATIC: HomeMockupSlide[] = [
  {
    id: "s1",
    tag: "Cơ sở mới",
    tagColor: "var(--cat-bc)",
    title: "Khai trương cơ sở 2",
    subtitle: "131 Nơ Trang Long, Bình Thạnh — sẵn sàng đón học viên",
    bg: "linear-gradient(160deg,#ee5b9f,#f8a668)",
  },
  {
    id: "s2",
    tag: "Khai giảng",
    tagColor: "var(--cat-hh)",
    title: "Hình họa khóa mới",
    subtitle: "Khai giảng thứ 5 hàng tuần · lớp online & tại lớp",
    bg: "linear-gradient(160deg,#2D2020,#5a3d3d)",
  },
  {
    id: "s3",
    tag: "Ưu đãi",
    tagColor: "#fff",
    title: "Học thử 1 buổi miễn phí",
    subtitle: "Không cần kinh nghiệm — chỉ cần giấy bút và đam mê",
    bg: "linear-gradient(160deg,#bb89f8,#ee5b9f)",
  },
  {
    id: "s4",
    tag: "Thi thử",
    tagColor: "var(--cat-tt)",
    title: "Thi thử năng khiếu online",
    subtitle: "Làm quen format thi, chấm điểm theo chuẩn trường",
    bg: "linear-gradient(160deg,#6efec0,#1aa377)",
  },
];

const KIENG_META: Record<
  "hh" | "tt" | "bc",
  Omit<HomeMockupKiengPillar, "slug" | "samplePhoto">
> = {
  hh: {
    key: "hh",
    title: "Hình họa",
    role: "Vẽ đúng",
    text: "Xương sống của ngành — cấu trúc, tỷ lệ, hình khối, sáng tối. Nhìn 3D, diễn tả trên mặt phẳng 2D.",
    thumbGrad: "linear-gradient(135deg,#fef9d6,#fde859)",
  },
  tt: {
    key: "tt",
    title: "Trang trí màu",
    role: "Cảm màu",
    text: "Nền tảng của sáng tạo — nguyên lý phối màu, cảm thụ nóng lạnh, sắc độ có hệ thống.",
    thumbGrad: "linear-gradient(135deg,#f1e6ff,#bb89f8)",
  },
  bc: {
    key: "bc",
    title: "Bố cục màu",
    role: "Sáng tác",
    text: "Nền tảng của sáng tác tranh — tổ chức mảng, điểm nhấn, dẫn hướng nhìn vào nhân vật chính.",
    thumbGrad: "linear-gradient(135deg,#dcfff2,#6efec0)",
  },
};

/** Ảnh tĩnh mockup `/new` — bài học viên theo thứ tự hh → tt → bc, before/after. */
const MOCKUP_STATIC_IMAGES = {
  curriculum: {
    hh: "/brand/home-mockup/curr-hh.png",
    tt: "/brand/home-mockup/curr-tt.png",
    bc: "/brand/home-mockup/curr-bc.png",
  },
  beforeAfter: {
    before: "/brand/home-mockup/ba-before.png",
    after: "/brand/home-mockup/ba-after.png",
  },
} as const;

const CURRICULUM_META: Record<
  "hh" | "tt" | "bc",
  {
    title: string;
    desc: string;
    steps: { n: string; text: string; last?: boolean }[];
    thumbGrad: string;
    catBg: string;
    catColor: string;
  }
> = {
  hh: {
    title: "Vẽ đúng từ khối đến người",
    desc: "15 buổi · từ nhập môn đến toàn thân người",
    steps: [
      { n: "B1", text: "Nhập môn — cầm bút, dựng nét, phối cảnh" },
      { n: "B7", text: "Kỹ thuật đan nét & 5 sắc độ sáng tối" },
      { n: "B12", text: "Tượng tròn — chuyển mảng sang mặt cong" },
      { n: "…", text: "đến B15 · Toàn thân người", last: true },
    ],
    thumbGrad: "linear-gradient(135deg,#fef9d6,#fde859)",
    catBg: "#fef9d6",
    catColor: "#8a7400",
  },
  tt: {
    title: "Cảm màu & phối màu hệ thống",
    desc: "Nền tảng cảm thụ và sáng tạo màu sắc",
    steps: [
      { n: "B1", text: "Vòng thuần sắc — nóng, lạnh, trung gian" },
      { n: "B4", text: "Tương phản & hòa sắc có chủ đích" },
      { n: "B7", text: "Sắc xám trung gian, điều màu" },
      { n: "…", text: "đến bài hoàn chỉnh chuyên ngành", last: true },
    ],
    thumbGrad: "linear-gradient(135deg,#f1e6ff,#bb89f8)",
    catBg: "#f1e6ff",
    catColor: "#7a3fc7",
  },
  bc: {
    title: "Tổ chức tranh & điểm nhấn",
    desc: "Nền tảng sáng tác — bố cục và dẫn hướng nhìn",
    steps: [
      { n: "B1", text: "Phân mảng — chính, phụ, nền" },
      { n: "B3", text: "Cân bằng & nhịp điệu thị giác" },
      { n: "B5", text: "Dẫn hướng nhìn vào nhân vật chính" },
      { n: "…", text: "đến bài sáng tác hoàn chỉnh", last: true },
    ],
    thumbGrad: "linear-gradient(135deg,#dcfff2,#6efec0)",
    catBg: "#dcfff2",
    catColor: "#127a59",
  },
};

const FOUNDATION_ORDER: { key: "hh" | "tt" | "bc"; match: RegExp }[] = [
  { key: "hh", match: /hình\s*họa/i },
  { key: "tt", match: /trang\s*trí\s*màu/i },
  { key: "bc", match: /bố\s*cục\s*màu/i },
];

const TEACHER_GRADS = [
  "linear-gradient(135deg,#fef9d6,#fde859)",
  "linear-gradient(135deg,#f1e6ff,#bb89f8)",
  "linear-gradient(135deg,#dcfff2,#6efec0)",
  "linear-gradient(135deg,#fef0e4,#f8a668)",
];

const MATCHER_FALLBACK_SCHOOLS: HomeMockupMatcherSchool[] = [
  { id: 1, name: "ĐH Kiến trúc TP.HCM" },
  { id: 2, name: "ĐH Mỹ thuật TP.HCM" },
  { id: 3, name: "ĐH Sân khấu Điện ảnh" },
  { id: 4, name: "ĐH Tôn Đức Thắng" },
];

const MATCHER_FALLBACK: HomeMockupMatcherOption[] = [
  {
    schoolId: 1,
    majorKey: "1-0",
    majorLabel: "Kiến trúc",
    resultTitle: "Kiến trúc · ĐH Kiến trúc TP.HCM",
    rows: [
      { label: "Môn thi năng khiếu", value: "Hình họa + Bố cục màu" },
      { label: "Thời lượng thi", value: "4 tiếng / bài" },
      { label: "Điểm chuẩn các năm", value: "Chưa có số liệu" },
      { label: "Khóa nên học", value: "Hình họa + Bố cục màu" },
      { label: "Lộ trình đề xuất", value: "3–6 tháng" },
    ],
    ctaHref: "/tra-cuu-thong-tin",
  },
];

type MatcherDiemChuanLatest = { nam: number; diem: number };

function matcherPairKey(truongId: number, nganhId: number): string {
  return `${truongId}-${nganhId}`;
}

function formatMatcherDiemChuanValue(latest: MatcherDiemChuanLatest | undefined): string {
  if (!latest) return "Chưa có số liệu";
  return `${latest.diem} · năm ${latest.nam}`;
}

/** Năm gần nhất có `diem_chuan` cho từng cặp trường–ngành. */
async function fetchMatcherLatestDiemChuanByPair(
  supabase: SupabaseClient,
): Promise<Map<string, MatcherDiemChuanLatest>> {
  const map = new Map<string, MatcherDiemChuanLatest>();
  const PAGE = 500;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("dh_truong_nganh_theo_nam")
      .select("truong_dai_hoc, nganh_dao_tao, nam_tuyen_sinh, diem_chuan")
      .not("diem_chuan", "is", null)
      .order("nam_tuyen_sinh", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error || !data?.length) break;

    for (const raw of data as Record<string, unknown>[]) {
      const tid = Number(raw.truong_dai_hoc);
      const nid = Number(raw.nganh_dao_tao);
      const nam = Number(raw.nam_tuyen_sinh);
      const diemRaw = raw.diem_chuan;
      const diem =
        typeof diemRaw === "number" ? diemRaw : diemRaw != null && diemRaw !== "" ? Number(diemRaw) : NaN;
      if (!Number.isFinite(tid) || !Number.isFinite(nid) || !Number.isFinite(nam) || !Number.isFinite(diem)) {
        continue;
      }

      const key = matcherPairKey(tid, nid);
      if (!map.has(key)) map.set(key, { nam, diem });
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return map;
}

async function fetchMatcherPayload(): Promise<{
  schools: HomeMockupMatcherSchool[];
  options: HomeMockupMatcherOption[];
  defaultOptionKey: string;
}> {
  const supabase = createStaticClient();
  if (!supabase) {
    return {
      schools: MATCHER_FALLBACK_SCHOOLS,
      options: MATCHER_FALLBACK,
      defaultOptionKey: MATCHER_FALLBACK[0]!.majorKey,
    };
  }

  const [profiles, catalogRes, diemChuanByPair] = await Promise.all([
    fetchDhExamProfilesSafe(supabase),
    fetchDhNguyenVongCatalog(supabase),
    fetchMatcherLatestDiemChuanByPair(supabase),
  ]);

  const catalog = catalogRes.catalog;
  const schoolList: HomeMockupMatcherSchool[] =
    catalog?.truong.map((t) => ({ id: t.id, name: t.ten })) ??
    MATCHER_FALLBACK_SCHOOLS;

  if (profiles.length === 0) {
    const optionsFromCatalog: HomeMockupMatcherOption[] = [];
    for (const school of schoolList) {
      const majors = catalog?.nganhByTruongId[String(school.id)] ?? [];
      for (const ng of majors) {
        optionsFromCatalog.push({
          schoolId: school.id,
          majorKey: `${school.id}-${ng.id}`,
          majorLabel: ng.ten,
          resultTitle: `${ng.ten} · ${school.name}`,
          rows: [
            { label: "Môn thi năng khiếu", value: "Hình họa + Bố cục màu" },
            {
              label: "Điểm chuẩn các năm",
              value: formatMatcherDiemChuanValue(
                diemChuanByPair.get(matcherPairKey(school.id, ng.id)),
              ),
            },
            { label: "Khóa nên học", value: "Theo môn thi năng khiếu" },
            { label: "Lộ trình đề xuất", value: "3–6 tháng" },
          ],
          ctaHref: "/tra-cuu-thong-tin",
        });
      }
    }
    const options = optionsFromCatalog.length ? optionsFromCatalog : MATCHER_FALLBACK;
    const preferred =
      options.find((o) => /mỹ thuật tp\.?hcm/i.test(o.resultTitle)) ?? options[0];
    return {
      schools: schoolList.length ? schoolList : MATCHER_FALLBACK_SCHOOLS,
      options,
      defaultOptionKey: preferred?.majorKey ?? options[0]!.majorKey,
    };
  }

  const options: HomeMockupMatcherOption[] = profiles.map((p) => {
    const monThi =
      p.mon_thi.length > 0 ? p.mon_thi.join(" · ") : "Hình họa + Bố cục màu";
    return {
      schoolId: p.truong_id,
      majorKey: `${p.truong_id}-${p.nganh_id}`,
      majorLabel: p.ten_nganh,
      resultTitle: `${p.ten_nganh} · ${p.ten_truong_dai_hoc}`,
      rows: [
        { label: "Môn thi năng khiếu", value: monThi },
        {
          label: "Điểm chuẩn các năm",
          value: formatMatcherDiemChuanValue(
            diemChuanByPair.get(matcherPairKey(p.truong_id, p.nganh_id)),
          ),
        },
        { label: "Khóa nên học", value: "Hình họa · Trang trí màu · Bố cục màu" },
        { label: "Lộ trình đề xuất", value: "3–6 tháng" },
      ],
      ctaHref: "/tra-cuu-thong-tin",
    };
  });

  const schoolMap = new Map<number, string>();
  for (const s of schoolList) schoolMap.set(s.id, s.name);
  for (const p of profiles) {
    if (!schoolMap.has(p.truong_id)) {
      schoolMap.set(p.truong_id, p.ten_truong_dai_hoc);
    }
  }
  const schools = [...schoolMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const preferred =
    options.find((o) => /mỹ thuật tp\.?hcm|đh mỹ thuật tp\.?hcm/i.test(o.resultTitle)) ??
    options[0];

  return {
    schools,
    options,
    defaultOptionKey: preferred?.majorKey ?? options[0]!.majorKey,
  };
}

function resolveFoundationKey(tenMon: string): "hh" | "tt" | "bc" | null {
  for (const f of FOUNDATION_ORDER) {
    if (f.match.test(tenMon)) return f.key;
  }
  return null;
}

function findFoundationMon(monList: MonHoc[], key: "hh" | "tt" | "bc"): MonHoc | undefined {
  const matches = monList.filter((m) => resolveFoundationKey(m.ten_mon_hoc) === key);
  if (matches.length === 0) return undefined;
  return matches.find((m) => m.thumbnail?.trim()) ?? matches[0];
}

function resolveMonThumbnail(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return cfResolvedImageUrl(t, "thumb") || t;
}

/** Preview bước giáo trình — cùng nguồn `getBaiTapListForMon` / `BaiTapList` trên `/khoa-hoc/[slug]`. */
function mapBaiTapPreviewSteps(items: BaiTap[]): { n: string; text: string; last?: boolean }[] {
  const sorted = [...items].sort((a, b) => a.bai_so - b.bai_so);
  if (sorted.length === 0) return [];

  if (sorted.length <= 4) {
    return sorted.map((b, i) => ({
      n: `B${b.bai_so}`,
      text: b.ten_bai_tap,
      last: i === sorted.length - 1 && sorted.length > 1,
    }));
  }

  const mid = Math.floor(sorted.length / 2);
  const nearEnd = Math.max(1, sorted.length - 2);
  const milestoneIdx = [...new Set([0, mid, nearEnd])].sort((a, b) => a - b);
  const steps: { n: string; text: string; last?: boolean }[] = milestoneIdx.map((i) => {
    const b = sorted[i]!;
    return { n: `B${b.bai_so}`, text: b.ten_bai_tap };
  });
  const last = sorted[sorted.length - 1]!;
  steps.push({
    n: "…",
    text: `đến B${last.bai_so} · ${last.ten_bai_tap}`,
    last: true,
  });
  return steps;
}

function curriculumDescFromBaiTap(items: BaiTap[], fallback: string): string {
  const sorted = [...items].sort((a, b) => a.bai_so - b.bai_so);
  if (sorted.length === 0) return fallback;
  const totalBuoi = sorted.reduce((sum, b) => sum + Math.max(0, b.so_buoi || 0), 0);
  const buoiLabel =
    totalBuoi > 0 ? `${totalBuoi} buổi` : `${sorted.length} bài`;
  const first = sorted[0]!.ten_bai_tap;
  const last = sorted[sorted.length - 1]!.ten_bai_tap;
  return `${buoiLabel} · từ ${first} đến ${last}`;
}

function pickBeforeAfter(gallery: GalleryDisplayItem[]): {
  before: GalleryDisplayItem | null;
  after: GalleryDisplayItem | null;
} {
  const hh = gallery.filter((g) =>
    /hình\s*họa/i.test(g.tenMonHoc ?? g.categoryLabel ?? ""),
  );
  const pool = hh.length >= 2 ? hh : gallery;
  if (pool.length < 2) {
    return { before: pool[0] ?? null, after: pool[1] ?? null };
  }
  const byStudent = new Map<string, GalleryDisplayItem[]>();
  for (const g of pool) {
    const k = g.studentName?.trim() || String(g.id);
    const arr = byStudent.get(k) ?? [];
    arr.push(g);
    byStudent.set(k, arr);
  }
  for (const items of byStudent.values()) {
    if (items.length >= 2) {
      const sorted = [...items].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
      return { before: sorted[0]!, after: sorted[sorted.length - 1]! };
    }
  }
  const sorted = [...pool].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  return { before: sorted[0]!, after: sorted[sorted.length - 1]! };
}

function applyMockupStaticVisuals(
  curriculum: HomeMockupCurriculumCard[],
  beforeAfter: { before: GalleryDisplayItem | null; after: GalleryDisplayItem | null },
): {
  curriculum: HomeMockupCurriculumCard[];
  beforeAfter: { before: GalleryDisplayItem; after: GalleryDisplayItem };
} {
  return {
    curriculum: curriculum.map((c) => ({
      ...c,
      thumbnail: MOCKUP_STATIC_IMAGES.curriculum[c.key],
    })),
    beforeAfter: {
      before: {
        id: beforeAfter.before?.id ?? "mockup-ba-before",
        photo: MOCKUP_STATIC_IMAGES.beforeAfter.before,
        score: beforeAfter.before?.score ?? null,
        studentName: beforeAfter.before?.studentName ?? "Học viên",
        categoryLabel: beforeAfter.before?.categoryLabel ?? "Hình họa",
        tenMonHoc: beforeAfter.before?.tenMonHoc ?? "Hình họa",
        monHocId: beforeAfter.before?.monHocId ?? null,
        baiMau: beforeAfter.before?.baiMau ?? false,
        mi: beforeAfter.before?.mi ?? 0,
      },
      after: {
        id: beforeAfter.after?.id ?? "mockup-ba-after",
        photo: MOCKUP_STATIC_IMAGES.beforeAfter.after,
        score: beforeAfter.after?.score ?? null,
        studentName: beforeAfter.after?.studentName ?? "Học viên",
        categoryLabel: beforeAfter.after?.categoryLabel ?? "Hình họa",
        tenMonHoc: beforeAfter.after?.tenMonHoc ?? "Hình họa",
        monHocId: beforeAfter.after?.monHocId ?? null,
        baiMau: beforeAfter.after?.baiMau ?? false,
        mi: beforeAfter.after?.mi ?? 0,
      },
    },
  };
}

async function fetchTeachersUncached(): Promise<HomeMockupTeacher[]> {
  const supabase = createStaticClient();
  if (!supabase) return [];

  const [staffRes, monRes] = await Promise.all([
    supabase
      .from("hr_nhan_su")
      .select("id, full_name, avatar, bio, mon_day")
      .order("full_name")
      .limit(12),
    supabase.from("ql_mon_hoc").select("id, ten_mon_hoc"),
  ]);

  const monMap = new Map<number, string>();
  for (const m of monRes.data ?? []) {
    const row = m as { id?: unknown; ten_mon_hoc?: unknown };
    const id = Number(row.id);
    const name = typeof row.ten_mon_hoc === "string" ? row.ten_mon_hoc.trim() : "";
    if (Number.isFinite(id) && name) monMap.set(id, name);
  }

  const rows = staffRes.data ?? [];
  const out: HomeMockupTeacher[] = [];
  for (const raw of rows) {
    const row = raw as {
      id?: unknown;
      full_name?: unknown;
      avatar?: unknown;
      bio?: unknown;
      mon_day?: unknown;
    };
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    const fullName = typeof row.full_name === "string" ? row.full_name.trim() : "";
    if (!fullName) continue;
    const monIds = Array.isArray(row.mon_day)
      ? row.mon_day.map((x) => Number(x)).filter((x) => Number.isFinite(x))
      : [];
    const monLabels = [...new Set(monIds.map((mid) => monMap.get(mid)).filter(Boolean))] as string[];
    const bio = typeof row.bio === "string" ? row.bio.trim() : "";
    const bioLines = bio.split("\n").map((l) => l.trim()).filter(Boolean);
    out.push({
      id,
      fullName,
      school: bioLines[0] ?? "Sine Art",
      work: monLabels.length
        ? `${monLabels.slice(0, 2).join(" · ")}`
        : (bioLines[1] ?? "Giáo viên Sine Art"),
      avatar: typeof row.avatar === "string" && row.avatar.trim() ? row.avatar.trim() : null,
      thumbGrad: TEACHER_GRADS[out.length % TEACHER_GRADS.length]!,
    });
    if (out.length >= 4) break;
  }
  return out;
}

async function fetchCurriculumUncached(monList: MonHoc[]): Promise<HomeMockupCurriculumCard[]> {
  const supabase = createStaticClient();
  const { idToSlug } = buildCourseSlugIndex(monList);
  const avatarByMon = new Map<number, string>();

  if (supabase) {
    const { data } = await supabase.from("ql_lop_hoc").select("mon_hoc, avatar").not("avatar", "is", null);

    for (const row of data ?? []) {
      const r = row as { mon_hoc?: unknown; avatar?: unknown };
      const monId = Number(r.mon_hoc);
      const avatar = typeof r.avatar === "string" ? r.avatar.trim() : "";
      if (!Number.isFinite(monId) || !avatar || avatarByMon.has(monId)) continue;
      avatarByMon.set(monId, avatar);
    }
  }

  const cards: HomeMockupCurriculumCard[] = [];
  const baiTapByMonId = new Map<number, BaiTap[]>();

  await Promise.all(
    FOUNDATION_ORDER.map(async ({ key }) => {
      const mon = findFoundationMon(monList, key);
      const monId = mon ? Number(mon.id) : 0;
      if (monId <= 0) return;
      const items = await getBaiTapListForMon(monId);
      if (items.length) baiTapByMonId.set(monId, items);
    }),
  );

  for (const { key } of FOUNDATION_ORDER) {
    const mon = findFoundationMon(monList, key);
    const meta = CURRICULUM_META[key];
    const monId = mon ? Number(mon.id) : 0;
    const slug = mon
      ? (idToSlug.get(monId) ?? mon.ten_mon_hoc.toLowerCase().replace(/\s+/g, "-"))
      : key === "hh"
        ? "hinh-hoa"
        : key === "tt"
          ? "trang-tri-mau"
          : "bo-cuc-mau";
    const thumbRaw = mon?.thumbnail?.trim() || (monId > 0 ? avatarByMon.get(monId) : undefined);
    const baiTap = monId > 0 ? baiTapByMonId.get(monId) : undefined;
    const stepsFromDb = baiTap?.length ? mapBaiTapPreviewSteps(baiTap) : [];
    cards.push({
      key,
      monId,
      slug,
      title: mon?.ten_mon_hoc?.trim() || meta.title,
      desc:
        (mon as (MonHoc & { mo_ta_ngan?: string | null }) | undefined)?.mo_ta_ngan?.trim() ||
        (baiTap?.length ? curriculumDescFromBaiTap(baiTap, meta.desc) : meta.desc),
      steps: stepsFromDb.length ? stepsFromDb : meta.steps,
      thumbnail: resolveMonThumbnail(thumbRaw ?? null),
      thumbGrad: meta.thumbGrad,
      catBg: meta.catBg,
      catColor: meta.catColor,
    });
  }
  return cards;
}

async function getHomeMockupPayloadUncached(): Promise<HomeMockupPayload> {
  const [
    homeContent,
    statStrip,
    reviews,
    gallerySection,
    careers,
    matcher,
    teachers,
  ] = await Promise.all([
    getHomeContent(),
    getHomeStatStripData(),
    getHomeReviewsData(),
    getHomeGallerySectionData(),
    getHomeCareersData(),
    fetchMatcherPayload(),
    fetchTeachersUncached(),
  ]);

  const supabase = createStaticClient();
  let monList: MonHoc[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("ql_mon_hoc")
      .select(MON_HOC_HOME_SELECT)
      .order("thu_tu_hien_thi", { ascending: true });
    monList = (data ?? []) as MonHoc[];
  }

  const { idToSlug } = buildCourseSlugIndex(monList);
  const curriculum = await fetchCurriculumUncached(monList);
  const galleryBa = pickBeforeAfter(gallerySection.gallery);
  const { curriculum: curriculumWithImages, beforeAfter } = applyMockupStaticVisuals(
    curriculum,
    galleryBa,
  );

  const gallerySample = gallerySection.gallery;
  const kiengPillars: HomeMockupKiengPillar[] = FOUNDATION_ORDER.map(({ key }) => {
    const mon = monList.find((m) => resolveFoundationKey(m.ten_mon_hoc) === key);
    const meta = KIENG_META[key];
    const sample = gallerySample.find((g) => resolveFoundationKey(g.tenMonHoc ?? "") === key);
    return {
      ...meta,
      slug: mon ? (idToSlug.get(Number(mon.id)) ?? "khoa-hoc") : "khoa-hoc",
      samplePhoto: sample?.photo ?? mon?.thumbnail ?? null,
    };
  });

  const rating = homeContent.hero.ratingScore || "4.9/5";
  const students = statStrip.students || FALLBACK_STATS.students;
  const heroTrustAvatars = reviews.slice(0, 4).map((r) => ({
    id: r.id,
    name: r.name,
    avatarUrl: r.avatarUrl,
    grad: r.grad,
  }));
  const reviewExtra = Math.max(0, reviews.length - heroTrustAvatars.length);
  const studentCountMatch = String(students).match(/(\d+)/);
  const studentNum = studentCountMatch ? parseInt(studentCountMatch[1]!, 10) : NaN;
  const trustAvatarOverflow =
    Number.isFinite(studentNum) && studentNum > 4 ? studentNum - 4 : reviewExtra;

  const slides = SLIDES_STATIC.map((s, i) => {
    const cardUrls = [
      homeContent.hero.cards.main.imageUrl,
      homeContent.hero.cards.top.imageUrl,
      homeContent.hero.cards.bottom.imageUrl,
    ];
    const url = cardUrls[i]?.trim();
    return url ? { ...s, imageUrl: url, bg: s.bg } : s;
  });

  const matcherSchools = matcher.schools;
  const matcherOptions = matcher.options;

  const cinsCareers =
    careers.length > 0
      ? careers
      : (await fetchNganhHocCardsFromCins().catch(() => [])) || CAREER_CARDS;

  return toJSONSafe({
    hero: {
      badge: `${rating} · ${students} học viên tin tưởng · ${homeContent.hero.ratingSource || "Google Reviews"}`,
      headlineEmphasis: "họa sỹ công nghệ",
      subPill: "luyện thi năng khiếu",
      lead: "Sine Art xây nền tảng mỹ thuật khoa học, có người đồng hành, giúp bạn vừa đậu đại học vừa đi xa trong nghề sáng tạo.",
      ctaPrimary: {
        label: "Học thử miễn phí",
        href: homeContent.hero.ctaPrimary.href || HERO_HOC_THU_FACEBOOK_URL,
      },
      ctaGhost: { label: "Xem lộ trình 3 môn", href: "#curr" },
      studentsLabel: `${students} học viên`,
      trustAvatars: heroTrustAvatars,
      trustAvatarOverflow,
    },
    marquee: MARQUEE_STATIC,
    slides,
    stats: [
      { value: students, label: "Học viên đã & đang theo học" },
      { value: statStrip.years || FALLBACK_STATS.years, label: "Năm kinh nghiệm giảng dạy" },
      { value: statStrip.groups || FALLBACK_STATS.groups, label: "Nhóm khóa học chuyên sâu" },
      { value: `${rating.replace(/\/5.*$/i, "")}★`, label: "Đánh giá Google Reviews" },
    ],
    exam: {
      title: "Học để đậu — không chỉ học để biết vẽ.",
      subtitle:
        "Nền tảng vững là con đường ngắn nhất qua kỳ thi năng khiếu. Đây là kết quả các học viên Sine Art đã làm được.",
      stats: [
        {
          value: `${students.replace(/\D/g, "") || "120"}+`,
          label: "Học viên đậu ĐH Mỹ thuật · Kiến trúc 2024–2025",
        },
        { value: "8.5", label: "Điểm năng khiếu trung bình của học viên luyện thi" },
        {
          value: String(Math.max(matcherSchools.length, 12)),
          label: "Trường ĐH có học viên Sine Art trúng tuyển",
        },
        { value: "94%", label: "Học viên luyện thi đạt nguyện vọng đăng ký" },
      ],
    },
    kieng: { pillars: kiengPillars },
    curriculum: curriculumWithImages,
    beforeAfter,
    video: {
      youtubeId: homeContent.video.tabs[0]?.youtubeId || "tiUBpOVqHGs",
      sectionLabel: "Học online tại Sine Art",
      titleEmphasis: "sửa bài 1-1",
      subtitle:
        "Lo lắng học vẽ qua màn hình không hiệu quả? Đây là cách lớp online ở Sine Art vận hành.",
      thumbnailUrl: null,
    },
    teachers,
    careers: cinsCareers,
    matcher: {
      schools: matcherSchools,
      options: matcherOptions,
      defaultOptionKey: matcher.defaultOptionKey,
    },
    reviews: reviews.slice(0, 3),
    cta: {
      ...homeContent.ctaBand,
      ctaPrimary: { ...homeContent.ctaBand.ctaPrimary, href: HERO_HOC_THU_FACEBOOK_URL },
      ctaGhost: { ...homeContent.ctaBand.ctaGhost, href: HERO_HOC_THU_FACEBOOK_URL },
    },
    footer: {
      tagline:
        "Trung tâm luyện thi vẽ với lộ trình chi tiết cho từng ngành và từng trường, giúp bạn thi đậu vào ngôi trường mơ ước.",
      branches: [
        { label: "CS1: 67 Tân Sơn Nhì, P.14, Tân Phú, TP.HCM" },
        { label: "CS2: 131 Nơ Trang Long, Bình Thạnh, TP.HCM" },
      ],
      phone: "086 755 1531",
      email: "sineart.official@gmail.com",
    },
  });
}

export const getHomeMockupPayload = cache(getHomeMockupPayloadUncached);
