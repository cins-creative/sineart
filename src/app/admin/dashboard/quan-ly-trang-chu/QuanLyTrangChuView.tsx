"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Film,
  Heart,
  Image as ImageIcon,
  Info,
  Layers,
  Loader2,
  Menu as MenuIcon,
  Save,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";

import {
  DEFAULT_HOME_CONTENT,
  type CareerContent,
  type CtaBandContent,
  type CtaLink,
  type GalleryContent,
  type HeroContent,
  type HomeContent,
  type ReviewsContent,
  type StatStripContent,
  type TeachersContent,
  type VideoContent,
  type WhyContent,
  type WhyPillarIconKey,
} from "@/lib/admin/home-content-schema";

type Props = {
  initialContent: HomeContent;
  initialUpdatedAt: string | null;
  missingServiceRole?: boolean;
  loadError?: string;
};

type Toast = { ok: boolean; msg: string } | null;

type BlockId =
  | "nav"
  | "hero"
  | "statStrip"
  | "why"
  | "video"
  | "reviews"
  | "gallery"
  | "career"
  | "teachers"
  | "ctaBand";

function fmtUpdatedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function QuanLyTrangChuView({
  initialContent,
  initialUpdatedAt,
  missingServiceRole,
  loadError,
}: Props) {
  const [content, setContent] = useState<HomeContent>(initialContent);
  const [initialSnapshot, setInitialSnapshot] = useState<HomeContent>(initialContent);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [expanded, setExpanded] = useState<BlockId | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const dirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(initialSnapshot),
    [content, initialSnapshot],
  );

  const toggleExpand = useCallback((id: BlockId) => {
    setExpanded((prev) => (prev === id ? null : id));
  }, []);

  const updateHero = useCallback(
    (hero: HeroContent) => setContent((c) => ({ ...c, hero })),
    [],
  );
  const updateStat = useCallback(
    (statStrip: StatStripContent) => setContent((c) => ({ ...c, statStrip })),
    [],
  );
  const updateWhy = useCallback(
    (why: WhyContent) => setContent((c) => ({ ...c, why })),
    [],
  );
  const updateVideo = useCallback(
    (video: VideoContent) => setContent((c) => ({ ...c, video })),
    [],
  );
  const updateReviews = useCallback(
    (reviews: ReviewsContent) => setContent((c) => ({ ...c, reviews })),
    [],
  );
  const updateGallery = useCallback(
    (gallery: GalleryContent) => setContent((c) => ({ ...c, gallery })),
    [],
  );
  const updateCareer = useCallback(
    (career: CareerContent) => setContent((c) => ({ ...c, career })),
    [],
  );
  const updateTeachers = useCallback(
    (teachers: TeachersContent) => setContent((c) => ({ ...c, teachers })),
    [],
  );
  const updateCta = useCallback(
    (ctaBand: CtaBandContent) => setContent((c) => ({ ...c, ctaBand })),
    [],
  );

  const handleReset = useCallback(() => {
    if (!confirm("Khôi phục về nội dung mặc định (hardcode gốc)? Phải bấm Lưu để áp dụng.")) {
      return;
    }
    setContent(DEFAULT_HOME_CONTENT);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/admin/api/home-content-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        updated_at?: string | null;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Lưu thất bại.");
      }
      setInitialSnapshot(content);
      setUpdatedAt(json.updated_at ?? new Date().toISOString());
      setToast({ ok: true, msg: "Đã lưu nội dung trang chủ." });
    } catch (e) {
      setToast({ ok: false, msg: e instanceof Error ? e.message : "Lưu thất bại." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4500);
    }
  }, [content]);

  return (
    <div className="qlh-root">
      <header className="qlh-header">
        <div>
          <h1 className="qlh-h1">Quản lý trang chủ</h1>
          <p className="qlh-updated">
            Cập nhật lần cuối: <b>{fmtUpdatedAt(updatedAt)}</b>
          </p>
        </div>
        <div className="qlh-actions">
          <button type="button" className="qlh-btn qlh-btn-ghost" onClick={handleReset}>
            Khôi phục mặc định
          </button>
          <button
            type="button"
            className="qlh-btn qlh-btn-primary"
            onClick={handleSave}
            disabled={!dirty || saving}
            title={!dirty ? "Chưa có thay đổi" : "Lưu toàn bộ"}
          >
            {saving ? (
              <Loader2 size={16} className="qlh-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </header>

      {missingServiceRole ? (
        <div className="qlh-warn">
          <AlertTriangle size={16} />
          <span>
            Thiếu <code>SUPABASE_SERVICE_ROLE_KEY</code> trên server. Dashboard chỉ hiện nội
            dung mặc định, không lưu được.
          </span>
        </div>
      ) : null}

      {loadError ? (
        <div className="qlh-warn qlh-warn-err">
          <AlertTriangle size={16} />
          <span>Lỗi tải dữ liệu: {loadError}</span>
        </div>
      ) : null}

      <div className="qlh-note">
        <Info size={16} />
        <span>
          Dashboard này mockup lại layout trang chủ public để bạn quản lý các element TĨNH
          (Cover, thumbnail, nội dung). Các block ĐỘNG (khóa học, review, gallery, giáo
          viên, ngành học) lấy từ bảng riêng — click để chuyển tới trang quản lý.
          <br />
          <b>Lưu ý:</b> Thay đổi được lưu vào <code>mkt_home_content</code>. Public site sẽ đọc
          từ bảng này khi phần wiring hoàn tất ở phase 2.
        </span>
      </div>

      {toast ? (
        <div className={`qlh-toast ${toast.ok ? "ok" : "err"}`} role="status">
          {toast.ok ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.msg}</span>
        </div>
      ) : null}

      {/* ============ BLOCK 1: NAV (dynamic) ============ */}
      <BlockCard
        index={1}
        tag="dynamic"
        icon={<MenuIcon size={18} />}
        title="Thanh điều hướng (Nav)"
      >
        <p className="qlh-preview-note">
          Cấu trúc menu được config trong mã nguồn
          <code>src/constants/navigation.ts</code>. Danh sách khóa học con tự động build từ
          bảng <code>ql_mon_hoc</code>.
        </p>
        <div className="qlh-dyn-links">
          <Link href="/admin/dashboard/khoa-hoc" className="qlh-dyn-link">
            <ExternalLink size={13} />
            Quản lý Khóa học
          </Link>
        </div>
      </BlockCard>

      {/* ============ BLOCK 2: HERO ============ */}
      <BlockCard
        index={2}
        tag="static"
        icon={<Sparkles size={18} />}
        title="Cover / Hero"
        onEdit={() => toggleExpand("hero")}
        editOpen={expanded === "hero"}
      >
        <HeroPreview data={content.hero} />
        {expanded === "hero" ? (
          <HeroEditor data={content.hero} onChange={updateHero} />
        ) : null}
      </BlockCard>

      {/* ============ BLOCK 3: STAT STRIP ============ */}
      <BlockCard
        index={3}
        tag="mixed"
        icon={<Layers size={18} />}
        title="Số liệu (Stat strip)"
        onEdit={() => toggleExpand("statStrip")}
        editOpen={expanded === "statStrip"}
      >
        <StatPreview data={content.statStrip} />
        {expanded === "statStrip" ? (
          <StatEditor data={content.statStrip} onChange={updateStat} />
        ) : null}
      </BlockCard>

      {/* ============ BLOCK 4: WHY ============ */}
      <BlockCard
        index={4}
        tag="static"
        icon={<Star size={18} />}
        title="Tại sao Sine Art (3 trụ cột)"
        onEdit={() => toggleExpand("why")}
        editOpen={expanded === "why"}
      >
        <WhyPreview data={content.why} />
        {expanded === "why" ? (
          <WhyEditor data={content.why} onChange={updateWhy} />
        ) : null}
      </BlockCard>

      {/* ============ BLOCK 5: VIDEO ============ */}
      <BlockCard
        index={5}
        tag="static"
        icon={<Film size={18} />}
        title="Video giới thiệu"
        onEdit={() => toggleExpand("video")}
        editOpen={expanded === "video"}
      >
        <VideoPreview data={content.video} />
        {expanded === "video" ? (
          <VideoEditor data={content.video} onChange={updateVideo} />
        ) : null}
      </BlockCard>

      {/* ============ BLOCK 6: REVIEWS ============ */}
      <BlockCard
        index={6}
        tag="mixed"
        icon={<Heart size={18} />}
        title="Đánh giá học viên"
        onEdit={() => toggleExpand("reviews")}
        editOpen={expanded === "reviews"}
        dynamicLink={{
          label: "Quản lý bình luận / đánh giá",
          href: "/admin/dashboard/binh-luan",
        }}
      >
        <SectionHeaderPreview
          sectionLabel={content.reviews.sectionLabel}
          titleBefore={content.reviews.titleBefore}
          titleEmphasis={content.reviews.titleEmphasis}
          titleAfter={content.reviews.titleAfter}
          subtitle={content.reviews.subtitle}
        />
        <p className="qlh-preview-note">
          Google Maps URL: <code>{content.reviews.googleMapsUrl}</code>
        </p>
        {expanded === "reviews" ? (
          <ReviewsEditor data={content.reviews} onChange={updateReviews} />
        ) : null}
      </BlockCard>

      {/* ============ BLOCK 7: GALLERY ============ */}
      <BlockCard
        index={7}
        tag="mixed"
        icon={<ImageIcon size={18} />}
        title="Tác phẩm học viên (Gallery)"
        onEdit={() => toggleExpand("gallery")}
        editOpen={expanded === "gallery"}
        dynamicLink={{
          label: "Quản lý bài học viên",
          href: "/admin/dashboard/quan-ly-bai-hoc-vien",
        }}
      >
        <SectionHeaderPreview
          sectionLabel={content.gallery.sectionLabel}
          titleBefore={content.gallery.titleBefore}
          titleEmphasis={content.gallery.titleEmphasis}
          titleAfter={content.gallery.titleAfter}
          subtitle={content.gallery.subtitle}
        />
        {expanded === "gallery" ? (
          <GalleryEditor data={content.gallery} onChange={updateGallery} />
        ) : null}
      </BlockCard>

      {/* ============ BLOCK 8: CAREER ============ */}
      <BlockCard
        index={8}
        tag="mixed"
        icon={<BookOpen size={18} />}
        title="Ngành học (Career)"
        onEdit={() => toggleExpand("career")}
        editOpen={expanded === "career"}
        dynamicLink={{
          label: "Dữ liệu ngành đồng bộ từ CINS.vn",
          href: "https://cins.vn",
          external: true,
        }}
      >
        <CareerPreview data={content.career} />
        {expanded === "career" ? (
          <CareerEditor data={content.career} onChange={updateCareer} />
        ) : null}
      </BlockCard>

      {/* ============ BLOCK 9: TEACHERS ============ */}
      <BlockCard
        index={9}
        tag="mixed"
        icon={<UserRound size={18} />}
        title="Giáo viên (Teachers)"
        onEdit={() => toggleExpand("teachers")}
        editOpen={expanded === "teachers"}
        dynamicLink={{
          label: "Quản lý nhân sự (portfolio)",
          href: "/admin/dashboard/quan-ly-nhan-su",
        }}
      >
        <SectionHeaderPreview
          sectionLabel={content.teachers.sectionLabel}
          titleBefore={content.teachers.titleBefore}
          titleEmphasis={content.teachers.titleEmphasis}
          titleAfter={content.teachers.titleAfter}
          subtitle={content.teachers.subtitle}
        />
        <p className="qlh-preview-note">
          Slideshow portfolio tự động lấy từ <code>hr_nhan_su.portfolio</code>.
        </p>
        {expanded === "teachers" ? (
          <TeachersEditor data={content.teachers} onChange={updateTeachers} />
        ) : null}
      </BlockCard>

      {/* ============ BLOCK 10: CTA BAND ============ */}
      <BlockCard
        index={10}
        tag="static"
        icon={<Sparkles size={18} />}
        title="CTA cuối trang"
        onEdit={() => toggleExpand("ctaBand")}
        editOpen={expanded === "ctaBand"}
      >
        <CtaBandPreview data={content.ctaBand} />
        {expanded === "ctaBand" ? (
          <CtaBandEditor data={content.ctaBand} onChange={updateCta} />
        ) : null}
      </BlockCard>

      <div className="qlh-footer-save">
        <button
          type="button"
          className="qlh-btn qlh-btn-primary"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? <Loader2 size={16} className="qlh-spin" /> : <Save size={16} />}
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: QLH_CSS }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BlockCard — wrapper chung cho mỗi section
// ═══════════════════════════════════════════════════════════════════════════

type BlockTag = "static" | "mixed" | "dynamic";

function BlockCard({
  index,
  tag,
  icon,
  title,
  onEdit,
  editOpen,
  dynamicLink,
  children,
}: {
  index: number;
  tag: BlockTag;
  icon: React.ReactNode;
  title: string;
  onEdit?: () => void;
  editOpen?: boolean;
  dynamicLink?: { label: string; href: string; external?: boolean };
  children: React.ReactNode;
}) {
  const tagLabel: Record<BlockTag, string> = {
    static: "Tĩnh",
    mixed: "Hỗn hợp",
    dynamic: "Động",
  };
  return (
    <section className={`qlh-block qlh-block--${tag}`}>
      <header className="qlh-block-head">
        <div className="qlh-block-head-left">
          <span className="qlh-block-idx">{String(index).padStart(2, "0")}</span>
          <span className="qlh-block-icon">{icon}</span>
          <h2 className="qlh-block-title">{title}</h2>
          <span className={`qlh-tag qlh-tag--${tag}`}>{tagLabel[tag]}</span>
        </div>
        <div className="qlh-block-head-right">
          {dynamicLink ? (
            dynamicLink.external ? (
              <a
                href={dynamicLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="qlh-dyn-link"
              >
                <ExternalLink size={13} />
                {dynamicLink.label}
              </a>
            ) : (
              <Link href={dynamicLink.href} className="qlh-dyn-link">
                <ExternalLink size={13} />
                {dynamicLink.label}
              </Link>
            )
          ) : null}
          {onEdit ? (
            <button
              type="button"
              className={`qlh-btn qlh-btn-sm qlh-btn-ghost ${editOpen ? "is-open" : ""}`}
              onClick={onEdit}
            >
              <Edit3 size={13} />
              {editOpen ? "Thu gọn" : "Sửa"}
              {editOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : null}
        </div>
      </header>
      <div className="qlh-block-body">{children}</div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Previews — hiển thị nội dung hiện tại, typography gần với trang chủ
// ═══════════════════════════════════════════════════════════════════════════

function HeroPreview({ data }: { data: HeroContent }) {
  return (
    <div className="qlh-prev qlh-prev-hero">
      <p className="qlh-prev-eyebrow">
        <span className="qlh-prev-dot" />
        {data.eyebrow}
      </p>
      <h3 className="qlh-prev-headline">
        {data.headlineBefore}
        <em>{data.headlineEmphasis}</em>
        <br />
        <span className="qlh-prev-underline">{data.headlineAfter}</span>
        {data.headlineSuffix}
      </h3>
      <p className="qlh-prev-lead">{data.lead}</p>
      <div className="qlh-prev-cta-row">
        <span className="qlh-prev-btn-p">{data.ctaPrimary.label}</span>
        <span className="qlh-prev-btn-g">{data.ctaGhost.label}</span>
      </div>
      <div className="qlh-prev-trust">
        <span className="qlh-prev-stars">★★★★★</span>
        <span>
          <b>{data.ratingScore}</b> · {data.ratingSource}
        </span>
        <span className="qlh-prev-dot-sep">·</span>
        <span>
          <b>{data.studentsTrust}</b> tin tưởng
        </span>
      </div>
      <div className="qlh-prev-stickers">
        {data.stickers.map((s, i) => (
          <span key={i} className="qlh-prev-sticker">
            <span className="qlh-prev-sticker-emoji">{s.emoji}</span>
            <span>
              <b>{s.title}</b>
              <small>{s.sub}</small>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StatPreview({ data }: { data: StatStripContent }) {
  return (
    <div className="qlh-prev qlh-prev-stat">
      {data.cards.map((c, i) => (
        <div key={i} className="qlh-prev-stat-card">
          <span className="qlh-prev-stat-n">123</span>
          <span className="qlh-prev-stat-l">{c.label}</span>
          <span className="qlh-prev-stat-s">{c.sublabel}</span>
        </div>
      ))}
      <p className="qlh-prev-note qlh-span-3">
        Số hiển thị trong card là động (count học viên, năm hoạt động, nhóm khoá) — chỉ label
        + sublabel là tĩnh.
      </p>
    </div>
  );
}

function WhyPreview({ data }: { data: WhyContent }) {
  return (
    <div className="qlh-prev qlh-prev-why">
      <SectionHeaderPreview
        sectionLabel={data.sectionLabel}
        titleBefore={data.titleBefore}
        titleEmphasis={data.titleEmphasis}
        titleAfter={data.titleAfter}
        subtitle={data.subtitle}
      />
      <div className="qlh-prev-pillars">
        {data.pillars.map((p, i) => (
          <div key={i} className="qlh-prev-pillar">
            <span className="qlh-prev-pillar-num">{p.num}</span>
            <h4>{p.title}</h4>
            <p>{p.text}</p>
            <span className="qlh-prev-pillar-icon">icon: {p.iconKey}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoPreview({ data }: { data: VideoContent }) {
  return (
    <div className="qlh-prev qlh-prev-video">
      <SectionHeaderPreview
        sectionLabel={data.sectionLabel}
        titleBefore={data.titleBefore}
        titleEmphasis={data.titleEmphasis}
        titleAfter={data.titleAfter}
        subtitle={data.subtitle}
      />
      <div className="qlh-prev-video-tabs">
        {data.tabs.map((t, i) => (
          <div key={i} className="qlh-prev-video-card">
            <div
              className="qlh-prev-video-thumb"
              style={{
                backgroundImage: `url(https://img.youtube.com/vi/${t.youtubeId}/hqdefault.jpg)`,
              }}
            />
            <div className="qlh-prev-video-info">
              <b>{t.label}</b>
              <small>{t.desc}</small>
              <code>ID: {t.youtubeId}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CareerPreview({ data }: { data: CareerContent }) {
  return (
    <div className="qlh-prev qlh-prev-career">
      <div className="qlh-prev-sec-label">{data.sectionLabel}</div>
      <div className="qlh-prev-career-intro">
        <div className="qlh-prev-career-eyebrow">{data.introEyebrow}</div>
        <h4>{data.introTitle}</h4>
        <p>{data.introText}</p>
        <a href={data.introLinkUrl} className="qlh-prev-career-link">
          {data.introLinkLabel}
        </a>
      </div>
    </div>
  );
}

function CtaBandPreview({ data }: { data: CtaBandContent }) {
  return (
    <div className="qlh-prev qlh-prev-cta">
      <h3 className="qlh-prev-headline">
        {data.titleBefore}
        <em>{data.titleEmphasis}</em>
      </h3>
      <p className="qlh-prev-lead">{data.text}</p>
      <div className="qlh-prev-cta-row">
        <span className="qlh-prev-btn-p">{data.ctaPrimary.label}</span>
        <span className="qlh-prev-btn-g">{data.ctaGhost.label}</span>
      </div>
      <div className="qlh-prev-sticks">
        {data.sticks.map((s, i) => (
          <span key={i} className="qlh-prev-stick">
            <b>{s.n}</b>
            <small>{s.l}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionHeaderPreview({
  sectionLabel,
  titleBefore,
  titleEmphasis,
  titleAfter,
  subtitle,
}: {
  sectionLabel: string;
  titleBefore: string;
  titleEmphasis: string;
  titleAfter: string;
  subtitle: string;
}) {
  return (
    <div className="qlh-prev-sec">
      <div className="qlh-prev-sec-label">{sectionLabel}</div>
      <h4 className="qlh-prev-sec-title">
        {titleBefore}
        <em>{titleEmphasis}</em>
        {titleAfter}
      </h4>
      <p className="qlh-prev-sec-sub">{subtitle}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Field helpers
// ═══════════════════════════════════════════════════════════════════════════

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="qlh-field">
      <span className="qlh-field-label">{label}</span>
      <input
        type="text"
        className="qlh-field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="qlh-field">
      <span className="qlh-field-label">{label}</span>
      <textarea
        className="qlh-field-input qlh-field-ta"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
      />
    </label>
  );
}

function CtaFieldGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CtaLink;
  onChange: (v: CtaLink) => void;
}) {
  return (
    <fieldset className="qlh-fieldset">
      <legend>{label}</legend>
      <div className="qlh-fg-row">
        <Field
          label="Chữ nút"
          value={value.label}
          onChange={(v) => onChange({ ...value, label: v })}
        />
        <Field
          label="Link"
          value={value.href}
          onChange={(v) => onChange({ ...value, href: v })}
          placeholder="/dang-ky"
        />
      </div>
    </fieldset>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Editors
// ═══════════════════════════════════════════════════════════════════════════

function HeroEditor({
  data,
  onChange,
}: {
  data: HeroContent;
  onChange: (v: HeroContent) => void;
}) {
  return (
    <div className="qlh-editor">
      <Field
        label="Eyebrow (dòng nhỏ phía trên headline)"
        value={data.eyebrow}
        onChange={(v) => onChange({ ...data, eyebrow: v })}
      />
      <fieldset className="qlh-fieldset">
        <legend>Headline (chia 4 đoạn để render đúng em / br / underline)</legend>
        <div className="qlh-fg-row">
          <Field
            label="Trước em"
            value={data.headlineBefore}
            onChange={(v) => onChange({ ...data, headlineBefore: v })}
          />
          <Field
            label="Em (in nghiêng gradient)"
            value={data.headlineEmphasis}
            onChange={(v) => onChange({ ...data, headlineEmphasis: v })}
          />
        </div>
        <div className="qlh-fg-row">
          <Field
            label="Sau xuống dòng (gạch chân)"
            value={data.headlineAfter}
            onChange={(v) => onChange({ ...data, headlineAfter: v })}
          />
          <Field
            label="Hậu tố (vd '.')"
            value={data.headlineSuffix}
            onChange={(v) => onChange({ ...data, headlineSuffix: v })}
          />
        </div>
      </fieldset>
      <TextArea
        label="Lead (đoạn mô tả dưới headline)"
        value={data.lead}
        onChange={(v) => onChange({ ...data, lead: v })}
        rows={3}
      />
      <CtaFieldGroup
        label="Nút chính (primary)"
        value={data.ctaPrimary}
        onChange={(v) => onChange({ ...data, ctaPrimary: v })}
      />
      <CtaFieldGroup
        label="Nút phụ (ghost)"
        value={data.ctaGhost}
        onChange={(v) => onChange({ ...data, ctaGhost: v })}
      />
      <fieldset className="qlh-fieldset">
        <legend>Trust row (dưới CTA)</legend>
        <div className="qlh-fg-row">
          <Field
            label="Điểm review"
            value={data.ratingScore}
            onChange={(v) => onChange({ ...data, ratingScore: v })}
          />
          <Field
            label="Nguồn review"
            value={data.ratingSource}
            onChange={(v) => onChange({ ...data, ratingSource: v })}
          />
        </div>
        <Field
          label="Số học viên tin tưởng"
          value={data.studentsTrust}
          onChange={(v) => onChange({ ...data, studentsTrust: v })}
        />
      </fieldset>
      <fieldset className="qlh-fieldset">
        <legend>Stickers (2 tem nhãn visual)</legend>
        {data.stickers.map((s, i) => (
          <div key={i} className="qlh-fg-row">
            <Field
              label={`Sticker ${i + 1} — emoji`}
              value={s.emoji}
              onChange={(v) =>
                onChange({
                  ...data,
                  stickers: data.stickers.map((x, j) =>
                    j === i ? { ...x, emoji: v } : x,
                  ) as typeof data.stickers,
                })
              }
            />
            <Field
              label="Tiêu đề"
              value={s.title}
              onChange={(v) =>
                onChange({
                  ...data,
                  stickers: data.stickers.map((x, j) =>
                    j === i ? { ...x, title: v } : x,
                  ) as typeof data.stickers,
                })
              }
            />
            <Field
              label="Phụ đề"
              value={s.sub}
              onChange={(v) =>
                onChange({
                  ...data,
                  stickers: data.stickers.map((x, j) =>
                    j === i ? { ...x, sub: v } : x,
                  ) as typeof data.stickers,
                })
              }
            />
          </div>
        ))}
      </fieldset>
    </div>
  );
}

function StatEditor({
  data,
  onChange,
}: {
  data: StatStripContent;
  onChange: (v: StatStripContent) => void;
}) {
  return (
    <div className="qlh-editor">
      {data.cards.map((c, i) => (
        <fieldset key={i} className="qlh-fieldset">
          <legend>Card {i + 1}</legend>
          <div className="qlh-fg-row">
            <Field
              label="Label (dòng chính)"
              value={c.label}
              onChange={(v) =>
                onChange({
                  ...data,
                  cards: data.cards.map((x, j) =>
                    j === i ? { ...x, label: v } : x,
                  ) as typeof data.cards,
                })
              }
            />
            <Field
              label="Sublabel (dòng phụ)"
              value={c.sublabel}
              onChange={(v) =>
                onChange({
                  ...data,
                  cards: data.cards.map((x, j) =>
                    j === i ? { ...x, sublabel: v } : x,
                  ) as typeof data.cards,
                })
              }
            />
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function WhyEditor({
  data,
  onChange,
}: {
  data: WhyContent;
  onChange: (v: WhyContent) => void;
}) {
  const iconOptions: { value: WhyPillarIconKey; label: string }[] = [
    { value: "book", label: "📖 Book" },
    { value: "users", label: "👥 Users" },
    { value: "pulse", label: "💓 Pulse" },
  ];
  return (
    <div className="qlh-editor">
      <Field
        label="Section label"
        value={data.sectionLabel}
        onChange={(v) => onChange({ ...data, sectionLabel: v })}
      />
      <fieldset className="qlh-fieldset">
        <legend>Tiêu đề section</legend>
        <Field
          label="Trước em"
          value={data.titleBefore}
          onChange={(v) => onChange({ ...data, titleBefore: v })}
        />
        <Field
          label="Em (gradient)"
          value={data.titleEmphasis}
          onChange={(v) => onChange({ ...data, titleEmphasis: v })}
        />
        <Field
          label="Sau em"
          value={data.titleAfter}
          onChange={(v) => onChange({ ...data, titleAfter: v })}
        />
      </fieldset>
      <TextArea
        label="Subtitle"
        value={data.subtitle}
        onChange={(v) => onChange({ ...data, subtitle: v })}
      />
      {data.pillars.map((p, i) => (
        <fieldset key={i} className="qlh-fieldset">
          <legend>Trụ cột {i + 1}</legend>
          <div className="qlh-fg-row">
            <Field
              label="Số thứ tự (vd 01)"
              value={p.num}
              onChange={(v) =>
                onChange({
                  ...data,
                  pillars: data.pillars.map((x, j) =>
                    j === i ? { ...x, num: v } : x,
                  ) as typeof data.pillars,
                })
              }
            />
            <Field
              label="Tiêu đề"
              value={p.title}
              onChange={(v) =>
                onChange({
                  ...data,
                  pillars: data.pillars.map((x, j) =>
                    j === i ? { ...x, title: v } : x,
                  ) as typeof data.pillars,
                })
              }
            />
            <label className="qlh-field">
              <span className="qlh-field-label">Icon</span>
              <select
                className="qlh-field-input"
                value={p.iconKey}
                onChange={(e) =>
                  onChange({
                    ...data,
                    pillars: data.pillars.map((x, j) =>
                      j === i
                        ? { ...x, iconKey: e.target.value as WhyPillarIconKey }
                        : x,
                    ) as typeof data.pillars,
                  })
                }
              >
                {iconOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <TextArea
            label="Nội dung"
            value={p.text}
            onChange={(v) =>
              onChange({
                ...data,
                pillars: data.pillars.map((x, j) =>
                  j === i ? { ...x, text: v } : x,
                ) as typeof data.pillars,
              })
            }
          />
        </fieldset>
      ))}
    </div>
  );
}

function VideoEditor({
  data,
  onChange,
}: {
  data: VideoContent;
  onChange: (v: VideoContent) => void;
}) {
  return (
    <div className="qlh-editor">
      <Field
        label="Section label"
        value={data.sectionLabel}
        onChange={(v) => onChange({ ...data, sectionLabel: v })}
      />
      <fieldset className="qlh-fieldset">
        <legend>Tiêu đề section</legend>
        <Field
          label="Trước em"
          value={data.titleBefore}
          onChange={(v) => onChange({ ...data, titleBefore: v })}
        />
        <Field
          label="Em (gradient)"
          value={data.titleEmphasis}
          onChange={(v) => onChange({ ...data, titleEmphasis: v })}
        />
        <Field
          label="Sau em"
          value={data.titleAfter}
          onChange={(v) => onChange({ ...data, titleAfter: v })}
        />
      </fieldset>
      <TextArea
        label="Subtitle"
        value={data.subtitle}
        onChange={(v) => onChange({ ...data, subtitle: v })}
      />
      {data.tabs.map((t, i) => (
        <fieldset key={i} className="qlh-fieldset">
          <legend>Video tab {i + 1}</legend>
          <div className="qlh-fg-row">
            <Field
              label="Nhãn tab"
              value={t.label}
              onChange={(v) =>
                onChange({
                  ...data,
                  tabs: data.tabs.map((x, j) =>
                    j === i ? { ...x, label: v } : x,
                  ) as typeof data.tabs,
                })
              }
            />
            <Field
              label="YouTube ID"
              value={t.youtubeId}
              onChange={(v) =>
                onChange({
                  ...data,
                  tabs: data.tabs.map((x, j) =>
                    j === i ? { ...x, youtubeId: v } : x,
                  ) as typeof data.tabs,
                })
              }
              placeholder="6LKT_E8XGu0"
            />
          </div>
          <TextArea
            label="Mô tả tab"
            value={t.desc}
            onChange={(v) =>
              onChange({
                ...data,
                tabs: data.tabs.map((x, j) =>
                  j === i ? { ...x, desc: v } : x,
                ) as typeof data.tabs,
              })
            }
          />
        </fieldset>
      ))}
    </div>
  );
}

function ReviewsEditor({
  data,
  onChange,
}: {
  data: ReviewsContent;
  onChange: (v: ReviewsContent) => void;
}) {
  return (
    <div className="qlh-editor">
      <Field
        label="Section label"
        value={data.sectionLabel}
        onChange={(v) => onChange({ ...data, sectionLabel: v })}
      />
      <fieldset className="qlh-fieldset">
        <legend>Tiêu đề section</legend>
        <Field
          label="Trước em"
          value={data.titleBefore}
          onChange={(v) => onChange({ ...data, titleBefore: v })}
        />
        <Field
          label="Em (gradient)"
          value={data.titleEmphasis}
          onChange={(v) => onChange({ ...data, titleEmphasis: v })}
        />
        <Field
          label="Sau em"
          value={data.titleAfter}
          onChange={(v) => onChange({ ...data, titleAfter: v })}
        />
      </fieldset>
      <TextArea
        label="Subtitle"
        value={data.subtitle}
        onChange={(v) => onChange({ ...data, subtitle: v })}
      />
      <Field
        label="Google Maps URL (dùng cho nút 'Xem tất cả review')"
        value={data.googleMapsUrl}
        onChange={(v) => onChange({ ...data, googleMapsUrl: v })}
        placeholder="https://maps.app.goo.gl/..."
      />
    </div>
  );
}

function GalleryEditor({
  data,
  onChange,
}: {
  data: GalleryContent;
  onChange: (v: GalleryContent) => void;
}) {
  return (
    <div className="qlh-editor">
      <Field
        label="Section label"
        value={data.sectionLabel}
        onChange={(v) => onChange({ ...data, sectionLabel: v })}
      />
      <fieldset className="qlh-fieldset">
        <legend>Tiêu đề section</legend>
        <Field
          label="Trước em"
          value={data.titleBefore}
          onChange={(v) => onChange({ ...data, titleBefore: v })}
        />
        <Field
          label="Em (gradient)"
          value={data.titleEmphasis}
          onChange={(v) => onChange({ ...data, titleEmphasis: v })}
        />
        <Field
          label="Sau em"
          value={data.titleAfter}
          onChange={(v) => onChange({ ...data, titleAfter: v })}
        />
      </fieldset>
      <TextArea
        label="Subtitle"
        value={data.subtitle}
        onChange={(v) => onChange({ ...data, subtitle: v })}
      />
    </div>
  );
}

function CareerEditor({
  data,
  onChange,
}: {
  data: CareerContent;
  onChange: (v: CareerContent) => void;
}) {
  return (
    <div className="qlh-editor">
      <Field
        label="Section label"
        value={data.sectionLabel}
        onChange={(v) => onChange({ ...data, sectionLabel: v })}
      />
      <Field
        label="Eyebrow"
        value={data.introEyebrow}
        onChange={(v) => onChange({ ...data, introEyebrow: v })}
      />
      <Field
        label="Tiêu đề intro"
        value={data.introTitle}
        onChange={(v) => onChange({ ...data, introTitle: v })}
      />
      <TextArea
        label="Mô tả intro"
        value={data.introText}
        onChange={(v) => onChange({ ...data, introText: v })}
      />
      <div className="qlh-fg-row">
        <Field
          label="Link label"
          value={data.introLinkLabel}
          onChange={(v) => onChange({ ...data, introLinkLabel: v })}
        />
        <Field
          label="Link URL"
          value={data.introLinkUrl}
          onChange={(v) => onChange({ ...data, introLinkUrl: v })}
        />
      </div>
    </div>
  );
}

function TeachersEditor({
  data,
  onChange,
}: {
  data: TeachersContent;
  onChange: (v: TeachersContent) => void;
}) {
  return (
    <div className="qlh-editor">
      <Field
        label="Section label"
        value={data.sectionLabel}
        onChange={(v) => onChange({ ...data, sectionLabel: v })}
      />
      <fieldset className="qlh-fieldset">
        <legend>Tiêu đề section</legend>
        <Field
          label="Trước em"
          value={data.titleBefore}
          onChange={(v) => onChange({ ...data, titleBefore: v })}
        />
        <Field
          label="Em (gradient)"
          value={data.titleEmphasis}
          onChange={(v) => onChange({ ...data, titleEmphasis: v })}
        />
        <Field
          label="Sau em"
          value={data.titleAfter}
          onChange={(v) => onChange({ ...data, titleAfter: v })}
        />
      </fieldset>
      <TextArea
        label="Subtitle"
        value={data.subtitle}
        onChange={(v) => onChange({ ...data, subtitle: v })}
      />
    </div>
  );
}

function CtaBandEditor({
  data,
  onChange,
}: {
  data: CtaBandContent;
  onChange: (v: CtaBandContent) => void;
}) {
  return (
    <div className="qlh-editor">
      <fieldset className="qlh-fieldset">
        <legend>Tiêu đề</legend>
        <Field
          label="Trước em"
          value={data.titleBefore}
          onChange={(v) => onChange({ ...data, titleBefore: v })}
        />
        <Field
          label="Em (gradient)"
          value={data.titleEmphasis}
          onChange={(v) => onChange({ ...data, titleEmphasis: v })}
        />
      </fieldset>
      <TextArea
        label="Đoạn text mô tả"
        value={data.text}
        onChange={(v) => onChange({ ...data, text: v })}
      />
      <CtaFieldGroup
        label="Nút chính"
        value={data.ctaPrimary}
        onChange={(v) => onChange({ ...data, ctaPrimary: v })}
      />
      <CtaFieldGroup
        label="Nút phụ"
        value={data.ctaGhost}
        onChange={(v) => onChange({ ...data, ctaGhost: v })}
      />
      <fieldset className="qlh-fieldset">
        <legend>Sticks (4 điểm nhấn)</legend>
        {data.sticks.map((s, i) => (
          <div key={i} className="qlh-fg-row">
            <Field
              label={`Stick ${i + 1} — số (n)`}
              value={s.n}
              onChange={(v) =>
                onChange({
                  ...data,
                  sticks: data.sticks.map((x, j) =>
                    j === i ? { ...x, n: v } : x,
                  ) as typeof data.sticks,
                })
              }
            />
            <Field
              label="Mô tả (l)"
              value={s.l}
              onChange={(v) =>
                onChange({
                  ...data,
                  sticks: data.sticks.map((x, j) =>
                    j === i ? { ...x, l: v } : x,
                  ) as typeof data.sticks,
                })
              }
            />
          </div>
        ))}
      </fieldset>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS — scoped .qlh-*
// ═══════════════════════════════════════════════════════════════════════════

const QLH_CSS = `
.qlh-root{display:flex;flex-direction:column;gap:18px;padding:4px 0 48px;font-family:'Be Vietnam Pro',system-ui,-apple-system,sans-serif;color:#2d2020}
.qlh-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:4px 4px 0;flex-wrap:wrap}
.qlh-h1{font-size:22px;font-weight:700;margin:0 0 4px;color:#1a1a1a;letter-spacing:-.01em}
.qlh-updated{font-size:12.5px;color:#6b5c5c;margin:0}
.qlh-actions{display:flex;gap:8px;flex-wrap:wrap}

.qlh-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;border:1px solid transparent;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .15s ease;white-space:nowrap;font-family:inherit}
.qlh-btn:disabled{opacity:.55;cursor:not-allowed}
.qlh-btn-primary{background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;box-shadow:0 4px 12px rgba(238,91,159,.25)}
.qlh-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(238,91,159,.3)}
.qlh-btn-ghost{background:#fafafa;color:#5a4a4a;border-color:rgba(45,32,32,.1)}
.qlh-btn-ghost:hover:not(:disabled){background:#f0ece8;color:#2d2020}
.qlh-btn-ghost.is-open{background:#fff4ec;border-color:#f8d4a8;color:#c45127}
.qlh-btn-sm{padding:7px 12px;font-size:12.5px}
.qlh-spin{animation:qlh-spin .8s linear infinite}
@keyframes qlh-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

.qlh-warn{display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border-radius:10px;background:#fff4e8;border:1px solid #f8d4a8;color:#a54b0b;font-size:13px;line-height:1.5}
.qlh-warn-err{background:#fef2f2;border-color:#fecaca;color:#b91c1c}
.qlh-warn code{background:rgba(255,255,255,.6);padding:1px 6px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px}

.qlh-note{display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border-radius:10px;background:#f0f7ff;border:1px solid #cfe3ff;color:#355483;font-size:13px;line-height:1.55}
.qlh-note code{background:rgba(255,255,255,.7);padding:1px 6px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px;color:#2d2020}

.qlh-toast{display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:10px;font-size:13.5px;font-weight:600;position:sticky;top:12px;z-index:10}
.qlh-toast.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857}
.qlh-toast.err{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}

.qlh-block{background:#fff;border:1px solid rgba(45,32,32,.08);border-radius:16px;padding:18px 20px;box-shadow:0 6px 18px rgba(45,32,32,.04);display:flex;flex-direction:column;gap:14px}
.qlh-block--static{border-left:4px solid #ee5b9f}
.qlh-block--mixed{border-left:4px solid #bb89f8}
.qlh-block--dynamic{border-left:4px solid #9ca3af;background:#fafafa}

.qlh-block-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.qlh-block-head-left{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.qlh-block-head-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.qlh-block-idx{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#9c8a8a;background:#f5f0ec;border-radius:8px;font-variant-numeric:tabular-nums}
.qlh-block-icon{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;color:#ee5b9f;background:rgba(238,91,159,.08);border-radius:8px}
.qlh-block-title{font-size:15.5px;font-weight:700;margin:0;color:#1a1a1a;letter-spacing:-.005em}
.qlh-tag{padding:2px 9px;border-radius:100px;font-size:10.5px;font-weight:700;letter-spacing:.02em;text-transform:uppercase}
.qlh-tag--static{background:rgba(238,91,159,.12);color:#b31e62}
.qlh-tag--mixed{background:rgba(187,137,248,.14);color:#7439cc}
.qlh-tag--dynamic{background:rgba(100,116,139,.12);color:#475569}

.qlh-dyn-link{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:#3b82f6;text-decoration:none;padding:5px 10px;border-radius:8px;background:rgba(59,130,246,.08);font-weight:600}
.qlh-dyn-link:hover{background:rgba(59,130,246,.14)}
.qlh-dyn-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}

.qlh-block-body{display:flex;flex-direction:column;gap:12px}

/* Previews */
.qlh-prev{display:flex;flex-direction:column;gap:10px;padding:16px 18px;background:linear-gradient(180deg,#fff9f4,#fff);border:1px dashed rgba(238,91,159,.2);border-radius:12px}
.qlh-prev-note{font-size:12px;color:#6b5c5c;font-style:italic;margin:0}
.qlh-preview-note{font-size:12.5px;color:#6b5c5c;margin:0;line-height:1.5}
.qlh-preview-note code{background:#f5f0ec;padding:1px 5px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:11.5px}

.qlh-prev-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#6b5c5c;letter-spacing:.03em;text-transform:uppercase;margin:0}
.qlh-prev-dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#f8a668,#ee5b9f)}
.qlh-prev-headline{font-size:26px;font-weight:800;margin:2px 0 4px;line-height:1.15;color:#1a1a1a;letter-spacing:-.02em}
.qlh-prev-headline em{font-style:italic;background:linear-gradient(135deg,#f8a668,#ee5b9f);-webkit-background-clip:text;background-clip:text;color:transparent}
.qlh-prev-underline{background:linear-gradient(180deg,transparent 65%,rgba(248,166,104,.4) 65%);padding:0 3px}
.qlh-prev-lead{font-size:13.5px;line-height:1.55;color:#2d2020;margin:0}
.qlh-prev-cta-row{display:flex;gap:8px;flex-wrap:wrap}
.qlh-prev-btn-p{display:inline-flex;align-items:center;padding:9px 16px;border-radius:100px;font-size:12.5px;font-weight:700;background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff}
.qlh-prev-btn-g{display:inline-flex;align-items:center;padding:9px 16px;border-radius:100px;font-size:12.5px;font-weight:700;background:rgba(45,32,32,.06);color:#2d2020}
.qlh-prev-trust{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px;color:#5a4a4a;padding-top:6px;border-top:1px dashed rgba(45,32,32,.08)}
.qlh-prev-stars{color:#fbbf24;letter-spacing:.06em}
.qlh-prev-dot-sep{color:#c8bcbc}
.qlh-prev-stickers{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px}
.qlh-prev-sticker{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;background:#fff;border:1px solid rgba(45,32,32,.1);border-radius:100px;font-size:12px;box-shadow:0 2px 6px rgba(45,32,32,.04)}
.qlh-prev-sticker-emoji{font-size:14px}
.qlh-prev-sticker b{font-weight:700;color:#1a1a1a}
.qlh-prev-sticker small{display:block;font-size:10.5px;color:#6b5c5c;font-weight:500}

.qlh-prev-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px 16px}
.qlh-prev-stat-card{display:flex;flex-direction:column;gap:2px;padding:12px 14px;background:#fff;border:1px solid rgba(45,32,32,.08);border-radius:12px}
.qlh-prev-stat-n{font-size:28px;font-weight:800;color:#1a1a1a;line-height:1.1;letter-spacing:-.02em;opacity:.45}
.qlh-prev-stat-l{font-size:12.5px;font-weight:700;color:#2d2020}
.qlh-prev-stat-s{font-size:11px;color:#6b5c5c}
.qlh-span-3{grid-column:1 / -1}

.qlh-prev-sec{display:flex;flex-direction:column;gap:4px}
.qlh-prev-sec-label{display:inline-block;font-size:11px;font-weight:700;color:#6b5c5c;letter-spacing:.04em;text-transform:uppercase}
.qlh-prev-sec-title{font-size:20px;font-weight:800;margin:0;color:#1a1a1a;letter-spacing:-.015em;line-height:1.25}
.qlh-prev-sec-title em{font-style:italic;background:linear-gradient(135deg,#f8a668,#ee5b9f);-webkit-background-clip:text;background-clip:text;color:transparent}
.qlh-prev-sec-sub{font-size:13px;color:#6b5c5c;margin:0;line-height:1.5}

.qlh-prev-pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:6px}
.qlh-prev-pillar{padding:12px 14px;background:#fff;border:1px solid rgba(45,32,32,.08);border-radius:12px;display:flex;flex-direction:column;gap:4px;min-width:0}
.qlh-prev-pillar-num{font-size:20px;font-weight:800;color:#ee5b9f;letter-spacing:-.02em}
.qlh-prev-pillar h4{font-size:14px;font-weight:700;margin:2px 0 2px}
.qlh-prev-pillar p{font-size:12px;color:#5a4a4a;margin:0;line-height:1.5}
.qlh-prev-pillar-icon{font-size:10.5px;color:#9c8a8a;margin-top:4px;font-family:ui-monospace,SFMono-Regular,monospace}

.qlh-prev-video-tabs{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:6px}
.qlh-prev-video-card{display:flex;gap:10px;padding:10px;background:#fff;border:1px solid rgba(45,32,32,.08);border-radius:12px;align-items:center;min-width:0}
.qlh-prev-video-thumb{width:100px;height:60px;border-radius:8px;background:#000 center/cover;flex-shrink:0}
.qlh-prev-video-info{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.qlh-prev-video-info b{font-size:12.5px;color:#1a1a1a}
.qlh-prev-video-info small{font-size:11.5px;color:#6b5c5c;line-height:1.45}
.qlh-prev-video-info code{font-size:10.5px;color:#9c8a8a;background:#f5f0ec;padding:1px 5px;border-radius:4px;align-self:flex-start;font-family:ui-monospace,SFMono-Regular,monospace;margin-top:2px}

.qlh-prev-career{padding:14px 16px}
.qlh-prev-career-intro{margin-top:6px}
.qlh-prev-career-eyebrow{font-size:11.5px;color:#bb89f8;font-weight:700;margin-bottom:3px}
.qlh-prev-career h4{font-size:16px;font-weight:700;margin:0 0 4px;color:#1a1a1a}
.qlh-prev-career p{font-size:12.5px;color:#5a4a4a;margin:0 0 6px;line-height:1.5}
.qlh-prev-career-link{font-size:12.5px;color:#ee5b9f;font-weight:700;text-decoration:none}

.qlh-prev-sticks{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px}
.qlh-prev-stick{padding:8px 10px;background:#fff;border:1px solid rgba(45,32,32,.08);border-radius:10px;display:flex;flex-direction:column;align-items:flex-start;gap:0}
.qlh-prev-stick b{font-size:14px;font-weight:800;color:#ee5b9f}
.qlh-prev-stick small{font-size:11px;color:#6b5c5c;line-height:1.3}

/* Editor forms */
.qlh-editor{display:flex;flex-direction:column;gap:12px;padding:16px 18px;background:#fafafa;border:1px solid rgba(45,32,32,.06);border-radius:12px;margin-top:2px}
.qlh-field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
.qlh-field-label{font-size:11.5px;font-weight:700;color:#6b5c5c;text-transform:uppercase;letter-spacing:.03em}
.qlh-field-input{width:100%;padding:9px 11px;border:1px solid rgba(45,32,32,.12);border-radius:8px;background:#fff;font-size:13.5px;color:#2d2020;font-family:inherit;outline:none;transition:border-color .15s, box-shadow .15s}
.qlh-field-input:focus{border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.15)}
.qlh-field-ta{resize:vertical;min-height:60px;line-height:1.55}

.qlh-fieldset{border:1px solid rgba(45,32,32,.1);border-radius:10px;padding:12px 14px;margin:0;display:flex;flex-direction:column;gap:10px;background:#fff}
.qlh-fieldset>legend{padding:0 6px;font-size:12px;font-weight:700;color:#1a1a1a;letter-spacing:-.005em}
.qlh-fg-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}

.qlh-footer-save{display:flex;justify-content:flex-end;padding-top:8px}

@media (max-width:720px){
  .qlh-prev-stat,.qlh-prev-pillars,.qlh-prev-video-tabs{grid-template-columns:1fr}
  .qlh-prev-sticks{grid-template-columns:repeat(2,1fr)}
  .qlh-prev-headline{font-size:22px}
  .qlh-prev-sec-title{font-size:17px}
}
`;
