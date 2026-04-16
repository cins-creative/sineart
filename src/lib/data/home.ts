import { createClient } from "@/lib/supabase/server";
import { toJSONSafe } from "@/lib/serialize";
import {
  CAREER_CARDS,
  FALLBACK_FEATURED_COURSE,
  FALLBACK_GALLERY,
  FALLBACK_GALLERY_MON_HOC_TABS,
  FALLBACK_MINI_COURSES,
  FALLBACK_REVIEWS,
  FALLBACK_STATS,
} from "@/lib/data/fallback";
import { buildCourseSlugIndex, slugifyTenMonHoc } from "@/lib/data/courses-page";
import { fetchNganhHocCardsFromCins } from "@/lib/data/cins-careers";
import {
  fetchHvBaiHocVienGalleryItems,
  isLuyenThiTaiLopTitle,
} from "@/lib/data/hv-bai-hoc-vien-gallery";
import type { CareerCard } from "@/types/career";
import type {
  DanhGia,
  GalleryDisplayItem,
  GalleryMonHocTab,
  MonHoc,
  HomeReview,
  TeacherArtSlide,
} from "@/types/homepage";
export type HomePagePayload = {
  stats: { students: string; years: string; groups: string };
  featuredCourse: {
    name: string;
    sub: string;
    grad: string;
    /** `ql_mon_hoc.thumbnail` */
    thumbnail: string | null;
    /** Slug `/khoa-hoc/[slug]` — cùng logic `buildCourseSlugIndex` */
    slug: string;
  };
  miniCourses: typeof FALLBACK_MINI_COURSES;
  gallery: GalleryDisplayItem[];
  /** Tab lọc tác phẩm — theo `ql_mon_hoc` (thứ tự `thu_tu_hien_thi`) */
  galleryMonHocTabs: GalleryMonHocTab[];
  teacherArtSlides: TeacherArtSlide[];
  reviews: HomeReview[];
  careers: CareerCard[];
};

/** Trích mọi URL http(s) trong một đoạn text (Cloudflare, nhiều URL, xuống dòng…) */
function extractHttpUrlsFromText(s: string): string[] {
  const found = s.match(/https?:\/\/[^\s<>"']+/gi);
  if (!found?.length) return [];
  return [...new Set(found.map((u) => u.replace(/[),.;]+$/g, "").trim()))].filter(
    Boolean
  );
}

/** Chuẩn hoá cột portfolio (text chứa URL/json/jsonb/array) → danh sách URL ảnh */
function normalizePortfolioToUrls(raw: unknown): string[] {
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
      if (typeof item === "string") {
        const u = item.trim();
        if (u) out.push(u);
      } else if (item && typeof item === "object") {
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
}

function buildTeacherArtSlides(
  rows: { id: number | string; portfolio: unknown }[]
): TeacherArtSlide[] {
  const slides: TeacherArtSlide[] = [];
  for (const row of rows) {
    const urls = normalizePortfolioToUrls(row.portfolio);
    urls.forEach((src, idx) => {
      slides.push({ id: `${row.id}-${idx}`, src });
    });
  }
  return slides;
}

function gradFromMon(_m: MonHoc): string {
  return "linear-gradient(135deg,#f8a668,#ee5b9f)";
}

function mapReviews(rows: DanhGia[]): HomeReview[] {
  const grads = [
    "linear-gradient(135deg,#f8a668,#ee5b9f)",
    "linear-gradient(135deg,#6efec0,#fde859)",
    "linear-gradient(135deg,#bb89f8,#ee5b9f)",
    "linear-gradient(135deg,#f8a668,#fde859)",
    "linear-gradient(135deg,#ee5b9f,#bb89f8)",
  ];
  return rows.map((r, i) => ({
    id: String(r.id),
    name: r.ten_nguoi,
    course: `${r.khoa_hoc?.ten_mon_hoc ?? "Khoá học"}${r.thoi_gian_hoc ? ` · ${r.thoi_gian_hoc}` : ""}`,
    avatarEmoji: "✨",
    avatarUrl: r.avatar_url,
    text: r.noi_dung,
    stars: Math.min(5, Math.max(1, Number(r.so_sao) || 5)),
    source: r.nguon || "Google",
    grad: grads[i % grads.length]!,
    artTag: `Tác phẩm · ${r.ten_nguoi.split(" ").pop() ?? ""}`,
  }));
}

function mapMonHocToCourses(mon: MonHoc[]) {
  if (!mon.length) {
    return {
      featuredCourse: FALLBACK_FEATURED_COURSE,
      miniCourses: FALLBACK_MINI_COURSES,
    };
  }
  const { idToSlug } = buildCourseSlugIndex(mon);
  const featured = mon.find((m) => m.is_featured) ?? mon[0]!;
  const rest = mon.filter((m) => m.id !== featured.id);
  const emoji = ["🎨", "🖌️", "💻", "🎭", "🖼️", "🖍️", "🖊️", "🎪"];
  const featuredCourse = featured
    ? {
        name: featured.ten_mon_hoc,
        sub: featured.loai_khoa_hoc ?? "",
        grad: gradFromMon(featured),
        thumbnail: featured.thumbnail?.trim() || null,
        slug:
          idToSlug.get(Number(featured.id)) ??
          slugifyTenMonHoc(featured.ten_mon_hoc),
      }
    : FALLBACK_FEATURED_COURSE;

  const miniCourses = rest.length
    ? rest.map((m, i) => ({
        name: m.ten_mon_hoc,
        sub: m.loai_khoa_hoc ?? "",
        grad: gradFromMon(m),
        emoji: emoji[i % emoji.length]!,
        tint: "rgba(248,166,104,.12)",
        thumbnail: m.thumbnail?.trim() || null,
        slug:
          idToSlug.get(Number(m.id)) ?? slugifyTenMonHoc(m.ten_mon_hoc),
      }))
    : FALLBACK_MINI_COURSES;

  return { featuredCourse, miniCourses };
}

export async function getHomePageData(): Promise<HomePagePayload> {
  let cinsCareers: CareerCard[] = [];
  try {
    cinsCareers = await fetchNganhHocCardsFromCins();
  } catch {
    cinsCareers = [];
  }
  const careersResolved =
    cinsCareers.length > 0 ? cinsCareers : CAREER_CARDS;

  const base: HomePagePayload = {
    stats: FALLBACK_STATS,
    featuredCourse: FALLBACK_FEATURED_COURSE,
    miniCourses: FALLBACK_MINI_COURSES,
    gallery: FALLBACK_GALLERY,
    galleryMonHocTabs: FALLBACK_GALLERY_MON_HOC_TABS,
    teacherArtSlides: [],
    reviews: FALLBACK_REVIEWS,
    careers: careersResolved,
  };

  const supabase = await createClient();
  if (!supabase) return toJSONSafe(base);

  try {
    const staffPortfolioQuery = supabase
      .from("hr_nhan_su")
      .select("id, portfolio")
      .not("portfolio", "is", null);

    const [
      monRes,
      galleryItems,
      teacherRes,
      reviewRes,
      lopOpenRes,
      monCountRes,
    ] = await Promise.all([
      supabase
        .from("ql_mon_hoc")
        .select("*")
        .order("thu_tu_hien_thi", { ascending: true }),
      fetchHvBaiHocVienGalleryItems(supabase, 48, { onlyStudentWork: true }),
      staffPortfolioQuery,
      supabase
        .from("ql_danh_gia")
        .select(
          `
          id, ten_nguoi, avatar_url, noi_dung,
          so_sao, thoi_gian_hoc, nguon,
          khoa_hoc:ql_mon_hoc(ten_mon_hoc)
        `
        )
        .eq("hien_thi", true)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("ql_lop_hoc").select("id").not("mon_hoc", "is", null),
      supabase.from("ql_mon_hoc").select("*", { count: "exact", head: true }),
    ]);

    const mon = (monRes.error ? [] : (monRes.data ?? [])) as MonHoc[];
    const { featuredCourse, miniCourses } = mapMonHocToCourses(mon);

    const gallery =
      galleryItems.length > 0 ? galleryItems : FALLBACK_GALLERY;

    const galleryMonHocTabs: GalleryMonHocTab[] = mon.length
      ? mon
          .map((m) => {
            const label = m.ten_mon_hoc?.trim() ?? "";
            return { tenMonHoc: label, label };
          })
          .filter((t) => t.tenMonHoc.length > 0)
      : FALLBACK_GALLERY_MON_HOC_TABS;

    const staffRows = (teacherRes.error ? [] : teacherRes.data ?? []) as unknown as {
      id: number | string;
      portfolio: unknown;
    }[];
    const teacherArtSlides = buildTeacherArtSlides(staffRows);

    const reviewsRaw = (reviewRes.error
      ? []
      : (reviewRes.data ?? [])) as unknown as DanhGia[];
    const reviews =
      reviewsRaw.length > 0 ? mapReviews(reviewsRaw) : FALLBACK_REVIEWS;

    const activeLopIds = new Set<number>(
      (lopOpenRes.data ?? [])
        .map((r) => Number((r as { id?: unknown }).id))
        .filter((id) => Number.isFinite(id) && id > 0)
    );
    let activeEnrollCount = 0;
    if (!lopOpenRes.error && activeLopIds.size > 0) {
      const { count, error: enrErr } = await supabase
        .from("ql_quan_ly_hoc_vien")
        .select("*", { count: "exact", head: true })
        .in("lop_hoc", [...activeLopIds]);
      if (!enrErr && typeof count === "number") {
        activeEnrollCount = count;
      }
    }
    const students =
      activeEnrollCount > 0 ? `${activeEnrollCount}+` : FALLBACK_STATS.students;
    const groups =
      !monCountRes.error &&
      typeof monCountRes.count === "number" &&
      monCountRes.count > 0
        ? String(monCountRes.count)
        : FALLBACK_STATS.groups;

    return toJSONSafe({
      stats: { students, years: FALLBACK_STATS.years, groups },
      featuredCourse,
      miniCourses,
      gallery,
      galleryMonHocTabs,
      teacherArtSlides,
      reviews,
      careers: careersResolved,
    });
  } catch {
    return toJSONSafe(base);
  }
}

/** Trang `/gallery` — nhiều tác phẩm hơn trang chủ + strip giáo viên (portfolio). */
export async function getGalleryPagePayload(): Promise<{
  gallery: GalleryDisplayItem[];
  galleryMonHocTabs: GalleryMonHocTab[];
  teacherArtSlides: TeacherArtSlide[];
}> {
  const base = {
    gallery: FALLBACK_GALLERY,
    galleryMonHocTabs: FALLBACK_GALLERY_MON_HOC_TABS.filter(
      (t) => !isLuyenThiTaiLopTitle(t.tenMonHoc)
    ),
    teacherArtSlides: [] as TeacherArtSlide[],
  };

  const supabase = await createClient();
  if (!supabase) return toJSONSafe(base);

  try {
    const staffPortfolioQuery = supabase
      .from("hr_nhan_su")
      .select("id, portfolio")
      .not("portfolio", "is", null);

    const [monRes, galleryItems, teacherRes] = await Promise.all([
      supabase
        .from("ql_mon_hoc")
        .select("*")
        .order("thu_tu_hien_thi", { ascending: true }),
      fetchHvBaiHocVienGalleryItems(supabase, 300, { onlyStudentWork: true }),
      staffPortfolioQuery,
    ]);

    const mon = (monRes.error ? [] : (monRes.data ?? [])) as MonHoc[];
    const gallery =
      galleryItems.length > 0 ? galleryItems : FALLBACK_GALLERY;

    const galleryMonHocTabs: GalleryMonHocTab[] = (
      mon.length
        ? mon
            .map((m) => {
              const label = m.ten_mon_hoc?.trim() ?? "";
              return { tenMonHoc: label, label };
            })
            .filter((t) => t.tenMonHoc.length > 0)
        : FALLBACK_GALLERY_MON_HOC_TABS
    ).filter((t) => !isLuyenThiTaiLopTitle(t.tenMonHoc));

    const staffRows = (teacherRes.error ? [] : teacherRes.data ?? []) as unknown as {
      id: number | string;
      portfolio: unknown;
    }[];
    const teacherArtSlides = buildTeacherArtSlides(staffRows);

    return toJSONSafe({
      gallery,
      galleryMonHocTabs,
      teacherArtSlides,
    });
  } catch {
    return toJSONSafe(base);
  }
}
