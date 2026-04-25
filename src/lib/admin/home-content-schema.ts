/**
 * Schema + defaults cho nội dung tĩnh trang chủ Sine Art.
 *
 * Phase 1: dashboard admin lưu vào `mkt_home_content.content` (JSONB singleton).
 * Phase sau: các component `HeroSection`, `StatStrip`, `WhySection`, `VideoSection`,
 * `ReviewsSection`, `GallerySection`, `CareerSection`, `CtaBandSection` sẽ nhận
 * override props từ server fetch + fallback về DEFAULT_HOME_CONTENT.
 *
 * Các giá trị mặc định ở dưới PHẢI khớp với hardcode hiện tại để không đổi UX public
 * khi chưa kết nối CMS.
 */

// ── Blocks ────────────────────────────────────────────────────────────────────

export type CtaLink = {
  label: string;
  href: string;
};

export type HeroCardImage = {
  imageUrl: string;
  alt: string;
};

export type HeroCardsContent = {
  top: HeroCardImage;
  main: HeroCardImage;
  bottom: HeroCardImage;
};

export type HeroContent = {
  eyebrow: string;
  headlineBefore: string;
  headlineEmphasis: string;
  headlineAfter: string;
  headlineSuffix: string;
  lead: string;
  ctaPrimary: CtaLink;
  ctaGhost: CtaLink;
  ratingScore: string;
  ratingSource: string;
  studentsTrust: string;
  stickers: [
    { emoji: string; title: string; sub: string },
    { emoji: string; title: string; sub: string },
  ];
  cards: HeroCardsContent;
};

export type StatStripContent = {
  cards: [
    { label: string; sublabel: string },
    { label: string; sublabel: string },
    { label: string; sublabel: string },
  ];
};

export type WhyPillarIconKey = "book" | "users" | "pulse";

export type WhyPillar = {
  num: string;
  title: string;
  text: string;
  iconKey: WhyPillarIconKey;
};

export type WhyContent = {
  sectionLabel: string;
  titleBefore: string;
  titleEmphasis: string;
  titleAfter: string;
  subtitle: string;
  pillars: [WhyPillar, WhyPillar, WhyPillar];
};

export type VideoContent = {
  sectionLabel: string;
  titleBefore: string;
  titleEmphasis: string;
  titleAfter: string;
  subtitle: string;
  tabs: [
    { label: string; desc: string; youtubeId: string },
    { label: string; desc: string; youtubeId: string },
  ];
};

export type ReviewsContent = {
  sectionLabel: string;
  titleBefore: string;
  titleEmphasis: string;
  titleAfter: string;
  subtitle: string;
  googleMapsUrl: string;
};

export type GalleryContent = {
  sectionLabel: string;
  titleBefore: string;
  titleEmphasis: string;
  titleAfter: string;
  subtitle: string;
};

export type CareerContent = {
  sectionLabel: string;
  introEyebrow: string;
  introTitle: string;
  introText: string;
  introLinkLabel: string;
  introLinkUrl: string;
};

export type TeachersContent = {
  sectionLabel: string;
  titleBefore: string;
  titleEmphasis: string;
  titleAfter: string;
  subtitle: string;
};

export type CtaBandStick = {
  n: string;
  l: string;
};

export type CtaBandContent = {
  titleBefore: string;
  titleEmphasis: string;
  text: string;
  ctaPrimary: CtaLink;
  ctaGhost: CtaLink;
  sticks: [CtaBandStick, CtaBandStick, CtaBandStick, CtaBandStick];
};

// ── Ad banner ảnh (cột riêng trên bảng mkt_home_content, không phải JSONB) ──

export type AdVisibleWhere = "home" | "class" | "both";

export const AD_VISIBLE_WHERE_VALUES = ["home", "class", "both"] as const;

export type HomeAdConfig = {
  /** URL ảnh quảng cáo. Khung public/phòng học hiện tại: 360 × 176px. */
  ads: string;
  visibleWhere: AdVisibleWhere;
};

export const DEFAULT_HOME_AD: HomeAdConfig = {
  ads: "",
  visibleWhere: "home",
};

export function normalizeAdConfig(raw: {
  ads?: unknown;
  visible_where?: unknown;
  visibleWhere?: unknown;
}): HomeAdConfig {
  const vwRaw =
    typeof raw.visibleWhere === "string"
      ? raw.visibleWhere
      : typeof raw.visible_where === "string"
        ? raw.visible_where
        : "";
  const visibleWhere: AdVisibleWhere =
    vwRaw === "home" || vwRaw === "class" || vwRaw === "both"
      ? vwRaw
      : "home";
  return {
    ads: typeof raw.ads === "string" ? raw.ads : "",
    visibleWhere,
  };
}

export function isRenderableAdImageUrl(value: string): boolean {
  const s = value.trim();
  return (
    /^https?:\/\//i.test(s) ||
    s.startsWith("/") ||
    /^data:image\//i.test(s) ||
    /^blob:/i.test(s)
  );
}

// ── Root shape ────────────────────────────────────────────────────────────────

export type HomeContent = {
  hero: HeroContent;
  statStrip: StatStripContent;
  why: WhyContent;
  video: VideoContent;
  reviews: ReviewsContent;
  gallery: GalleryContent;
  career: CareerContent;
  teachers: TeachersContent;
  ctaBand: CtaBandContent;
};

// ── Defaults (khớp hardcode hiện tại trong các section TSX) ───────────────────

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    eyebrow: "Giáo trình khoa học · Từ 2015",
    headlineBefore: "Dành cho ",
    headlineEmphasis: "Họa sỹ",
    headlineAfter: "công nghệ",
    headlineSuffix: ".",
    lead: "Sine Art xây dựng nền tảng Mỹ thuật bài bản và khoa học, giúp các bạn đủ kiến thức để trở thành Họa sỹ công nghệ trong Hoạt hình, Phim và Game.",
    ctaPrimary: { label: "Học thử miễn phí", href: "/dang-ky" },
    ctaGhost: { label: "Xem khoá học", href: "/khoa-hoc" },
    ratingScore: "4.9/5",
    ratingSource: "Google Reviews",
    studentsTrust: "350+ học viên",
    stickers: [
      { emoji: "🎨", title: "Hình họa", sub: "Lớp mới · T5" },
      { emoji: "✨", title: "Digital Art", sub: "Procreate" },
    ],
    cards: {
      top: { imageUrl: "", alt: "Ảnh nhỏ phía trên — hero" },
      main: { imageUrl: "", alt: "Ảnh lớn chính — hero" },
      bottom: { imageUrl: "", alt: "Ảnh nhỏ phía dưới — hero" },
    },
  },
  statStrip: {
    cards: [
      { label: "Học viên đã theo học", sublabel: "Từ 2018 đến nay" },
      { label: "Năm kinh nghiệm giảng dạy", sublabel: "Đội ngũ giáo viên chuyên sâu" },
      { label: "Nhóm khoá học chuyên sâu", sublabel: "Hình họa · Bố cục · Digital" },
    ],
  },
  why: {
    sectionLabel: "Tại sao Sine Art",
    titleBefore: "Học Mỹ thuật ",
    titleEmphasis: "bài bản",
    titleAfter: " — có người đồng hành",
    subtitle:
      "3 điểm cốt lõi làm nên khác biệt của Sine Art so với các lớp vẽ truyền thống.",
    pillars: [
      {
        num: "01",
        title: "Giáo trình khoa học",
        text: "Từ hình họa cơ bản đến digital painting chuyên sâu — 6 cấp độ được thiết kế bài bản theo chuẩn ĐH Mỹ thuật Công nghiệp & SKĐA.",
        iconKey: "book",
      },
      {
        num: "02",
        title: "Giáo viên đồng hành",
        text: "Lớp nhỏ tối đa 12 học viên. Giáo viên đi từ đầu đến cuối — chấm bài chi tiết, sửa từng nét, hỗ trợ cả khi bạn về nhà.",
        iconKey: "users",
      },
      {
        num: "03",
        title: "Hướng nghiệp thực chiến",
        text: "Kết nối với studio Hoạt hình, Game và Phim hàng đầu Việt Nam. Bạn ra trường với portfolio thật, kỹ năng thật, việc làm thật.",
        iconKey: "pulse",
      },
    ],
  },
  video: {
    sectionLabel: "Video giới thiệu",
    titleBefore: "Bên trong lớp học ",
    titleEmphasis: "Sine Art",
    titleAfter: "",
    subtitle: "Xem cách chúng tôi dạy và học — online và offline.",
    tabs: [
      {
        label: "📡 Lớp Online",
        desc: "📡 Học qua website chính thức của Sine Art hoặc Google Meet",
        youtubeId: "6LKT_E8XGu0",
      },
      {
        label: "🏫 Lớp Offline",
        desc: "🏫 Tại cơ sở · Không gian sáng tạo thực tế",
        youtubeId: "rdtqpyKMn18",
      },
    ],
  },
  reviews: {
    sectionLabel: "Học viên nói gì",
    titleBefore: "Câu chuyện từ ",
    titleEmphasis: "chính học viên",
    titleAfter: "",
    subtitle:
      "Review thực, không chỉnh sửa — lấy trực tiếp từ Google Reviews và Facebook.",
    googleMapsUrl: "https://maps.app.goo.gl/LeKBd5WVyH6EtKjo9",
  },
  gallery: {
    sectionLabel: "Tác phẩm học viên",
    titleBefore: "Tác phẩm từ lớp — ",
    titleEmphasis: "không chỉnh sửa",
    titleAfter: "",
    subtitle:
      "Tất cả bài vẽ đều do học viên Sine Art thực hiện trong khoá học. Chọn theo thể loại để xem chi tiết.",
  },
  career: {
    sectionLabel: "Ngành học",
    introEyebrow: "✦ Powered by CINS.vn",
    introTitle: "Ngành đại học gắn với năng khiếu mỹ thuật",
    introText:
      "Mỗi ngành có mã xét tuyển và mô tả riêng — xem nhanh tên ngành, mã ngành và ảnh minh họa từ thư viện CINS (ngành học đại học).",
    introLinkLabel: "Khám phá tại CINS.vn →",
    introLinkUrl: "https://cins.vn",
  },
  teachers: {
    sectionLabel: "Giáo viên",
    titleBefore: "Đội ngũ ",
    titleEmphasis: "Giáo viên Sine Art",
    titleAfter: "",
    subtitle:
      "Hoạ sỹ thực chiến — đang làm tại studio Hoạt hình, Game, Phim. Dạy bằng kiến thức đúng tiêu chuẩn ngành.",
  },
  ctaBand: {
    titleBefore: "Sẵn sàng bắt đầu hành trình làm ",
    titleEmphasis: "Họa sỹ công nghệ?",
    text: "Học thử 1 buổi miễn phí — không cần kinh nghiệm, chỉ cần giấy bút và đam mê.",
    ctaPrimary: { label: "Đăng ký học thử", href: "/dang-ky" },
    ctaGhost: { label: "Tư vấn lộ trình", href: "/khoa-hoc" },
    sticks: [
      { n: "2 phút", l: "để đăng ký online" },
      { n: "100%", l: "buổi học thử miễn phí" },
      { n: "8+", l: "lớp học / tuần" },
      { n: "7/7", l: "lịch linh hoạt trong tuần" },
    ],
  },
};

// ── Merge helper ──────────────────────────────────────────────────────────────

/**
 * Deep-merge override JSON (có thể partial / sai kiểu) với DEFAULT_HOME_CONTENT.
 * Bất kỳ trường nào thiếu, sai kiểu, hoặc bằng null/undefined → fallback default.
 * Với array có độ dài cố định (stickers, cards, pillars, tabs, sticks): map theo index
 * từng phần tử, item thiếu thì dùng default.
 */
export function mergeHomeContent(raw: unknown): HomeContent {
  const o = isObj(raw) ? raw : {};
  return {
    hero: mergeHero(o.hero),
    statStrip: mergeStatStrip(o.statStrip),
    why: mergeWhy(o.why),
    video: mergeVideo(o.video),
    reviews: mergeReviews(o.reviews),
    gallery: mergeGallery(o.gallery),
    career: mergeCareer(o.career),
    teachers: mergeTeachers(o.teachers),
    ctaBand: mergeCtaBand(o.ctaBand),
  };
}

// ── Internals ─────────────────────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function cta(v: unknown, fallback: CtaLink): CtaLink {
  const o = isObj(v) ? v : {};
  return {
    label: str(o.label, fallback.label),
    href: str(o.href, fallback.href),
  };
}

function mergeHero(v: unknown): HeroContent {
  const d = DEFAULT_HOME_CONTENT.hero;
  const o = isObj(v) ? v : {};
  const stickersRaw = Array.isArray(o.stickers) ? o.stickers : [];
  return {
    eyebrow: str(o.eyebrow, d.eyebrow),
    headlineBefore: str(o.headlineBefore, d.headlineBefore),
    headlineEmphasis: str(o.headlineEmphasis, d.headlineEmphasis),
    headlineAfter: str(o.headlineAfter, d.headlineAfter),
    headlineSuffix: str(o.headlineSuffix, d.headlineSuffix),
    lead: str(o.lead, d.lead),
    ctaPrimary: cta(o.ctaPrimary, d.ctaPrimary),
    ctaGhost: cta(o.ctaGhost, d.ctaGhost),
    ratingScore: str(o.ratingScore, d.ratingScore),
    ratingSource: str(o.ratingSource, d.ratingSource),
    studentsTrust: str(o.studentsTrust, d.studentsTrust),
    stickers: [
      mergeSticker(stickersRaw[0], d.stickers[0]),
      mergeSticker(stickersRaw[1], d.stickers[1]),
    ],
    cards: mergeHeroCards(o.cards),
  };
}

function mergeHeroCards(v: unknown): HeroCardsContent {
  const d = DEFAULT_HOME_CONTENT.hero.cards;
  const o = isObj(v) ? v : {};
  return {
    top: mergeHeroCard(o.top, d.top),
    main: mergeHeroCard(o.main, d.main),
    bottom: mergeHeroCard(o.bottom, d.bottom),
  };
}

function mergeHeroCard(v: unknown, d: HeroCardImage): HeroCardImage {
  const o = isObj(v) ? v : {};
  return {
    imageUrl: str(o.imageUrl, d.imageUrl),
    alt: str(o.alt, d.alt),
  };
}

function mergeSticker(
  v: unknown,
  d: { emoji: string; title: string; sub: string },
): { emoji: string; title: string; sub: string } {
  const o = isObj(v) ? v : {};
  return {
    emoji: str(o.emoji, d.emoji),
    title: str(o.title, d.title),
    sub: str(o.sub, d.sub),
  };
}

function mergeStatStrip(v: unknown): StatStripContent {
  const d = DEFAULT_HOME_CONTENT.statStrip;
  const o = isObj(v) ? v : {};
  const cardsRaw = Array.isArray(o.cards) ? o.cards : [];
  return {
    cards: [
      mergeStatCard(cardsRaw[0], d.cards[0]),
      mergeStatCard(cardsRaw[1], d.cards[1]),
      mergeStatCard(cardsRaw[2], d.cards[2]),
    ],
  };
}

function mergeStatCard(
  v: unknown,
  d: { label: string; sublabel: string },
): { label: string; sublabel: string } {
  const o = isObj(v) ? v : {};
  return {
    label: str(o.label, d.label),
    sublabel: str(o.sublabel, d.sublabel),
  };
}

function mergeWhy(v: unknown): WhyContent {
  const d = DEFAULT_HOME_CONTENT.why;
  const o = isObj(v) ? v : {};
  const pillarsRaw = Array.isArray(o.pillars) ? o.pillars : [];
  return {
    sectionLabel: str(o.sectionLabel, d.sectionLabel),
    titleBefore: str(o.titleBefore, d.titleBefore),
    titleEmphasis: str(o.titleEmphasis, d.titleEmphasis),
    titleAfter: str(o.titleAfter, d.titleAfter),
    subtitle: str(o.subtitle, d.subtitle),
    pillars: [
      mergePillar(pillarsRaw[0], d.pillars[0]),
      mergePillar(pillarsRaw[1], d.pillars[1]),
      mergePillar(pillarsRaw[2], d.pillars[2]),
    ],
  };
}

function mergePillar(v: unknown, d: WhyPillar): WhyPillar {
  const o = isObj(v) ? v : {};
  const iconKey = o.iconKey === "book" || o.iconKey === "users" || o.iconKey === "pulse"
    ? o.iconKey
    : d.iconKey;
  return {
    num: str(o.num, d.num),
    title: str(o.title, d.title),
    text: str(o.text, d.text),
    iconKey,
  };
}

function mergeVideo(v: unknown): VideoContent {
  const d = DEFAULT_HOME_CONTENT.video;
  const o = isObj(v) ? v : {};
  const tabsRaw = Array.isArray(o.tabs) ? o.tabs : [];
  return {
    sectionLabel: str(o.sectionLabel, d.sectionLabel),
    titleBefore: str(o.titleBefore, d.titleBefore),
    titleEmphasis: str(o.titleEmphasis, d.titleEmphasis),
    titleAfter: str(o.titleAfter, d.titleAfter),
    subtitle: str(o.subtitle, d.subtitle),
    tabs: [
      mergeVideoTab(tabsRaw[0], d.tabs[0]),
      mergeVideoTab(tabsRaw[1], d.tabs[1]),
    ],
  };
}

function mergeVideoTab(
  v: unknown,
  d: { label: string; desc: string; youtubeId: string },
): { label: string; desc: string; youtubeId: string } {
  const o = isObj(v) ? v : {};
  return {
    label: str(o.label, d.label),
    desc: str(o.desc, d.desc),
    youtubeId: str(o.youtubeId, d.youtubeId),
  };
}

function mergeReviews(v: unknown): ReviewsContent {
  const d = DEFAULT_HOME_CONTENT.reviews;
  const o = isObj(v) ? v : {};
  return {
    sectionLabel: str(o.sectionLabel, d.sectionLabel),
    titleBefore: str(o.titleBefore, d.titleBefore),
    titleEmphasis: str(o.titleEmphasis, d.titleEmphasis),
    titleAfter: str(o.titleAfter, d.titleAfter),
    subtitle: str(o.subtitle, d.subtitle),
    googleMapsUrl: str(o.googleMapsUrl, d.googleMapsUrl),
  };
}

function mergeGallery(v: unknown): GalleryContent {
  const d = DEFAULT_HOME_CONTENT.gallery;
  const o = isObj(v) ? v : {};
  return {
    sectionLabel: str(o.sectionLabel, d.sectionLabel),
    titleBefore: str(o.titleBefore, d.titleBefore),
    titleEmphasis: str(o.titleEmphasis, d.titleEmphasis),
    titleAfter: str(o.titleAfter, d.titleAfter),
    subtitle: str(o.subtitle, d.subtitle),
  };
}

function mergeCareer(v: unknown): CareerContent {
  const d = DEFAULT_HOME_CONTENT.career;
  const o = isObj(v) ? v : {};
  return {
    sectionLabel: str(o.sectionLabel, d.sectionLabel),
    introEyebrow: str(o.introEyebrow, d.introEyebrow),
    introTitle: str(o.introTitle, d.introTitle),
    introText: str(o.introText, d.introText),
    introLinkLabel: str(o.introLinkLabel, d.introLinkLabel),
    introLinkUrl: str(o.introLinkUrl, d.introLinkUrl),
  };
}

function mergeTeachers(v: unknown): TeachersContent {
  const d = DEFAULT_HOME_CONTENT.teachers;
  const o = isObj(v) ? v : {};
  return {
    sectionLabel: str(o.sectionLabel, d.sectionLabel),
    titleBefore: str(o.titleBefore, d.titleBefore),
    titleEmphasis: str(o.titleEmphasis, d.titleEmphasis),
    titleAfter: str(o.titleAfter, d.titleAfter),
    subtitle: str(o.subtitle, d.subtitle),
  };
}

function mergeCtaBand(v: unknown): CtaBandContent {
  const d = DEFAULT_HOME_CONTENT.ctaBand;
  const o = isObj(v) ? v : {};
  const sticksRaw = Array.isArray(o.sticks) ? o.sticks : [];
  return {
    titleBefore: str(o.titleBefore, d.titleBefore),
    titleEmphasis: str(o.titleEmphasis, d.titleEmphasis),
    text: str(o.text, d.text),
    ctaPrimary: cta(o.ctaPrimary, d.ctaPrimary),
    ctaGhost: cta(o.ctaGhost, d.ctaGhost),
    sticks: [
      mergeStick(sticksRaw[0], d.sticks[0]),
      mergeStick(sticksRaw[1], d.sticks[1]),
      mergeStick(sticksRaw[2], d.sticks[2]),
      mergeStick(sticksRaw[3], d.sticks[3]),
    ],
  };
}

function mergeStick(v: unknown, d: CtaBandStick): CtaBandStick {
  const o = isObj(v) ? v : {};
  return {
    n: str(o.n, d.n),
    l: str(o.l, d.l),
  };
}
