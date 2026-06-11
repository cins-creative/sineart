"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Film,
  Gift,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  Megaphone,
  PenLine,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import {
  AD_VISIBLE_WHERE_VALUES,
  DEFAULT_HOME_AD,
  DEFAULT_HOME_CONTENT,
  type AdVisibleWhere,
  type ExamContent,
  type HeroContent,
  type HeroSlideContent,
  HERO_SLIDE_IMAGE_SPEC,
  type HomeAdConfig,
  type HomeContent,
  type MarqueeIconKey,
  type MarqueeItemContent,
  type MockupVideoLabels,
  isRenderableAdImageUrl,
  type VideoContent,
} from "@/lib/admin/home-content-schema";
import { parseYoutubeVideoId } from "@/lib/youtube";

type Props = {
  initialContent: HomeContent;
  initialAd: HomeAdConfig;
  /** URL Cloudflare — cột `mkt_home_content.img_class`. */
  initialImgClass: string[];
  initialUpdatedAt: string | null;
  missingServiceRole?: boolean;
  loadError?: string;
};

type Toast = { ok: boolean; msg: string; warn?: boolean } | null;

type HeroCardKey = "top" | "main" | "bottom";

function syncHeroCardsFromSlides(hero: HeroContent, slides: HeroSlideContent[]): HeroContent {
  const cardKeys: HeroCardKey[] = ["main", "top", "bottom"];
  const cards = { ...hero.cards };
  cardKeys.forEach((key, i) => {
    const url = slides[i]?.imageUrl?.trim() ?? "";
    cards[key] = { ...cards[key], imageUrl: url };
  });
  return { ...hero, cards };
}

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
  initialAd,
  initialImgClass,
  initialUpdatedAt,
  missingServiceRole,
  loadError,
}: Props) {
  const [content, setContent] = useState<HomeContent>(initialContent);
  const [ad, setAd] = useState<HomeAdConfig>(initialAd);
  const [imgClass, setImgClass] = useState<string[]>(initialImgClass);
  const [initialSnapshot, setInitialSnapshot] = useState<HomeContent>(initialContent);
  const [initialAdSnapshot, setInitialAdSnapshot] = useState<HomeAdConfig>(initialAd);
  const [initialImgClassSnapshot, setInitialImgClassSnapshot] =
    useState<string[]>(initialImgClass);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const dirty = useMemo(
    () =>
      JSON.stringify(content) !== JSON.stringify(initialSnapshot) ||
      JSON.stringify(ad) !== JSON.stringify(initialAdSnapshot) ||
      JSON.stringify(imgClass) !== JSON.stringify(initialImgClassSnapshot),
    [content, initialSnapshot, ad, initialAdSnapshot, imgClass, initialImgClassSnapshot],
  );

  const setVideo = useCallback((video: VideoContent) => {
    setContent((c) => ({ ...c, video }));
  }, []);
  const setMarquee = useCallback((marquee: MarqueeItemContent[]) => {
    setContent((c) => ({ ...c, marquee }));
  }, []);
  const setHeroSlides = useCallback((heroSlides: HeroSlideContent[]) => {
    setContent((c) => ({
      ...c,
      heroSlides,
      hero: syncHeroCardsFromSlides(c.hero, heroSlides),
    }));
  }, []);
  const setExam = useCallback((exam: ExamContent) => {
    setContent((c) => ({ ...c, exam }));
  }, []);
  const setMockupVideo = useCallback((mockupVideo: MockupVideoLabels) => {
    setContent((c) => ({ ...c, mockupVideo }));
  }, []);

  const handleReset = useCallback(() => {
    if (
      !confirm(
        "Khôi phục về nội dung mặc định (hardcode gốc)? Phải bấm Lưu để áp dụng.",
      )
    ) {
      return;
    }
    setContent(DEFAULT_HOME_CONTENT);
    setAd(DEFAULT_HOME_AD);
    setImgClass([]);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setToast(null);
    let toastDismissMs = 4500;
    try {
      const res = await fetch("/admin/api/home-content-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, ad, img_class: imgClass }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        warning?: string;
        updated_at?: string | null;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Lưu thất bại.");
      }
      if (json.warning) toastDismissMs = 12000;
      setInitialSnapshot(content);
      setInitialAdSnapshot(ad);
      setInitialImgClassSnapshot(imgClass);
      setUpdatedAt(json.updated_at ?? new Date().toISOString());
      setToast(
        json.warning
          ? {
              ok: true,
              warn: true,
              msg: `Đã lưu nội dung. ${json.warning}`,
            }
          : { ok: true, msg: "Đã lưu nội dung trang chủ." },
      );
    } catch (e) {
      setToast({
        ok: false,
        msg: e instanceof Error ? e.message : "Lưu thất bại.",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), toastDismissMs);
    }
  }, [content, ad, imgClass]);

  return (
    <div className="qlh-root">
      <header className="qlh-header">
        <div>
          <h1 className="qlh-h1">Quản lý trang chủ</h1>
          <p className="qlh-updated">
            Layout mới — xem trước tại{" "}
            <a href="/new" target="_blank" rel="noopener noreferrer" className="qlh-preview-link">
              /new
            </a>
            {" · "}
            Cập nhật lần cuối: <b>{fmtUpdatedAt(updatedAt)}</b>
          </p>
        </div>
        <div className="qlh-actions">
          <button
            type="button"
            className="qlh-btn qlh-btn-ghost"
            onClick={handleReset}
          >
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
            Thiếu <code>SUPABASE_SERVICE_ROLE_KEY</code> trên server. Dashboard
            chỉ hiện nội dung mặc định, không lưu được.
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
          Quản lý nội dung trang chủ mới (<a href="/new" target="_blank" rel="noopener noreferrer">/new</a>
          ): ticker, Hero + carousel, số liệu luyện thi, video, CTA, footer, ảnh lớp và banner quảng cáo.
          Khóa học, review, giáo viên, gallery, matcher trường–ngành (CINS) lấy từ DB tự động.
        </span>
      </div>

      {toast ? (
        <div
          className={`qlh-toast ${toast.warn ? "warn" : toast.ok ? "ok" : "err"}`}
          role="status"
        >
          {toast.warn ? <Info size={16} /> : toast.ok ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.msg}</span>
        </div>
      ) : null}

      <MarqueeSection data={content.marquee} onChange={setMarquee} />
      <HeroSlidesSection data={content.heroSlides} onChange={setHeroSlides} />
      <ExamSection data={content.exam} onChange={setExam} />
      <VideoSection
        data={content.video}
        mockupVideo={content.mockupVideo}
        onChange={setVideo}
        onChangeMockupVideo={setMockupVideo}
      />
      <ImgClassPhotosSection urls={imgClass} onChange={setImgClass} />
      <AdSection data={ad} onChange={setAd} />

      <div className="qlh-footer-save">
        <button
          type="button"
          className="qlh-btn qlh-btn-primary"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? (
            <Loader2 size={16} className="qlh-spin" />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: QLH_CSS }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Ảnh lớp thực tế (mkt_home_content.img_class)
// ═══════════════════════════════════════════════════════════════════════════

function ImgClassPhotosSection({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (next: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list?.length) return;
      setUploading(true);
      setError(null);
      try {
        const fd = new FormData();
        for (let i = 0; i < list.length; i++) {
          fd.append("files", list[i]!);
        }
        const res = await fetch("/admin/api/upload-classroom-photos", {
          method: "POST",
          body: fd,
        });
        const json = (await res.json()) as {
          ok?: boolean;
          urls?: string[];
          error?: string;
          warnings?: string[];
        };
        if (!res.ok || !json.ok || !json.urls?.length) {
          throw new Error(json.error || "Upload thất bại.");
        }
        onChange([...urls, ...json.urls]);
        if (json.warnings?.length) {
          setError(json.warnings.join(" "));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload thất bại.");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [onChange, urls],
  );

  return (
    <section className="qlh-section">
      <header className="qlh-section-head">
        <span className="qlh-section-icon">
          <ImageIcon size={18} />
        </span>
        <div>
          <h2 className="qlh-section-title">Ảnh lớp thực tế</h2>
          <p className="qlh-section-sub">
            Hiển thị giữa khối Giáo viên và CTA. Chọn nhiều file — server nén WebP
            (max cạnh 1600px) rồi upload Cloudflare Images.
          </p>
        </div>
      </header>

      <div className="qlh-img-class-toolbar">
        <button
          type="button"
          className="qlh-btn qlh-btn-primary qlh-btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 size={14} className="qlh-spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? "Đang upload…" : "Chọn nhiều ảnh"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
        />
      </div>

      {error ? <div className="qlh-hero-err">{error}</div> : null}

      {urls.length > 0 ? (
        <div className="qlh-img-class-grid">
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} className="qlh-img-class-tile">
              <Image
                src={url}
                alt=""
                fill
                sizes="140px"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                className="qlh-img-class-remove"
                aria-label="Xóa khỏi danh sách"
                onClick={() => onChange(urls.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="qlh-section-sub" style={{ margin: 0 }}>
          Chưa có ảnh — section sẽ ẩn trên trang chủ.
        </p>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Carousel slides (mockup hero)
// ═══════════════════════════════════════════════════════════════════════════

const HERO_SLIDES_MIN = 1;
const HERO_SLIDES_MAX = 8;

function newHeroSlide(): HeroSlideContent {
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tag: "Mới",
    tagColor: "var(--cat-bc)",
    title: "Tiêu đề slide",
    subtitle: "Mô tả ngắn",
    bg: "linear-gradient(160deg,#ee5b9f,#f8a668)",
    imageUrl: "",
  };
}

function HeroSlideImageThumb({
  imageUrl,
  onChange,
}: {
  imageUrl: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/admin/api/upload-cf-image", {
          method: "POST",
          body: form,
        });
        const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (!res.ok || !json.ok || !json.url) {
          throw new Error(json.error || "Upload thất bại.");
        }
        onChange(json.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload thất bại.");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [onChange],
  );

  return (
    <div className="qlh-slide-thumb-wrap">
      <button
        type="button"
        className="qlh-slide-thumb"
        style={{ aspectRatio: HERO_SLIDE_IMAGE_SPEC.ratio }}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title={`Upload ảnh ${HERO_SLIDE_IMAGE_SPEC.label}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="72px"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <span className="qlh-slide-thumb-empty">
            <ImageIcon size={16} />
          </span>
        )}
        {uploading ? (
          <span className="qlh-slide-thumb-loading">
            <Loader2 size={14} className="qlh-spin" />
          </span>
        ) : null}
      </button>
      {imageUrl ? (
        <button
          type="button"
          className="qlh-btn qlh-btn-sm qlh-btn-ghost qlh-slide-thumb-clear"
          onClick={() => onChange("")}
          disabled={uploading}
          aria-label="Xóa ảnh"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
      {error ? <span className="qlh-slide-thumb-err">{error}</span> : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

function HeroSlidesSection({
  data,
  onChange,
}: {
  data: HeroSlideContent[];
  onChange: (v: HeroSlideContent[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const setSlide = (index: number, slide: HeroSlideContent) => {
    const next = [...data];
    next[index] = slide;
    onChange(next);
  };

  const removeSlide = (index: number) => {
    if (data.length <= HERO_SLIDES_MIN) return;
    onChange(data.filter((_, i) => i !== index));
  };

  const addSlide = () => {
    if (data.length >= HERO_SLIDES_MAX) return;
    onChange([...data, newHeroSlide()]);
    setOpen(true);
  };

  const preview =
    data.length === 0
      ? "Chưa có slide"
      : data.length === 1
        ? data[0]!.title.trim() || "1 slide"
        : `${data.length} slide · ${data[0]!.title.trim().slice(0, 40)}${data[0]!.title.length > 40 ? "…" : ""}`;

  return (
    <section className={`qlh-section qlh-collapsible${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="qlh-collapsible-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="qlh-section-icon">
          <ImageIcon size={18} />
        </span>
        <span className="qlh-collapsible-meta">
          <span className="qlh-section-title">Carousel Hero</span>
          <span className="qlh-collapsible-preview">{preview}</span>
        </span>
        <ChevronDown size={18} className="qlh-collapsible-chevron" aria-hidden />
      </button>

      {open ? (
        <div className="qlh-collapsible-body">
          <p className="qlh-section-sub qlh-collapsible-sub">
            Slide bên phải Hero trên /new. Ảnh tuỳ chọn — khuyến nghị{" "}
            <b>{HERO_SLIDE_IMAGE_SPEC.label}</b> (tỷ lệ {HERO_SLIDE_IMAGE_SPEC.ratio.replace(/\s/g, "")}
            ). Không có ảnh sẽ dùng gradient nền.
          </p>
          {data.length > 0 ? (
            <ul className="qlh-slide-rows">
              {data.map((slide, i) => (
                <li key={slide.id} className="qlh-slide-row">
                  <div className="qlh-slide-row-head">
                    <span className="qlh-slide-idx">{i + 1}</span>
                    <span className="qlh-slide-size">{HERO_SLIDE_IMAGE_SPEC.label}</span>
                    <button
                      type="button"
                      className="qlh-btn qlh-btn-sm qlh-btn-ghost qlh-marquee-remove"
                      aria-label="Xóa slide"
                      disabled={data.length <= HERO_SLIDES_MIN}
                      onClick={() => removeSlide(i)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="qlh-slide-row-body">
                    <HeroSlideImageThumb
                      imageUrl={slide.imageUrl?.trim() ?? ""}
                      onChange={(url) => setSlide(i, { ...slide, imageUrl: url })}
                    />
                    <div className="qlh-slide-fields">
                      <input
                        type="text"
                        className="qlh-field-input"
                        value={slide.tag}
                        placeholder="Tag"
                        aria-label={`Tag slide ${i + 1}`}
                        onChange={(e) => setSlide(i, { ...slide, tag: e.target.value })}
                      />
                      <input
                        type="text"
                        className="qlh-field-input"
                        value={slide.title}
                        placeholder="Tiêu đề"
                        aria-label={`Tiêu đề slide ${i + 1}`}
                        onChange={(e) => setSlide(i, { ...slide, title: e.target.value })}
                      />
                      <input
                        type="text"
                        className="qlh-field-input qlh-slide-sub"
                        value={slide.subtitle}
                        placeholder="Mô tả"
                        aria-label={`Mô tả slide ${i + 1}`}
                        onChange={(e) => setSlide(i, { ...slide, subtitle: e.target.value })}
                      />
                      <input
                        type="text"
                        className="qlh-field-input qlh-slide-bg"
                        value={slide.bg}
                        placeholder="Gradient nền (CSS)"
                        aria-label={`Gradient slide ${i + 1}`}
                        onChange={(e) => setSlide(i, { ...slide, bg: e.target.value })}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="qlh-section-sub" style={{ margin: 0 }}>
              Chưa có slide — bấm + để thêm.
            </p>
          )}
          <div className="qlh-marquee-toolbar">
            <button
              type="button"
              className="qlh-btn qlh-btn-sm qlh-btn-ghost"
              onClick={addSlide}
              disabled={data.length >= HERO_SLIDES_MAX}
            >
              <Plus size={14} />
              Thêm slide
            </button>
            {data.length >= HERO_SLIDES_MAX ? (
              <span className="qlh-section-sub" style={{ margin: 0 }}>
                Tối đa {HERO_SLIDES_MAX} slide.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Marquee ticker
// ═══════════════════════════════════════════════════════════════════════════

const MARQUEE_ICON_OPTIONS: {
  value: MarqueeIconKey;
  label: string;
  Icon: typeof MapPin;
}[] = [
  { value: "map-pin", label: "Địa điểm", Icon: MapPin },
  { value: "calendar", label: "Lịch", Icon: Calendar },
  { value: "gift", label: "Ưu đãi", Icon: Gift },
  { value: "edit-3", label: "Thông báo", Icon: PenLine },
];

const MARQUEE_ICONS: Record<MarqueeIconKey, typeof MapPin> = {
  "map-pin": MapPin,
  calendar: Calendar,
  gift: Gift,
  "edit-3": PenLine,
};

const MARQUEE_MAX_ITEMS = 12;

function MarqueeIconPicker({
  value,
  onChange,
  name,
}: {
  value: MarqueeIconKey;
  onChange: (v: MarqueeIconKey) => void;
  name: string;
}) {
  return (
    <div className="qlh-marquee-icon-picker" role="radiogroup" aria-label={`Icon ${name}`}>
      {MARQUEE_ICON_OPTIONS.map(({ value: key, label, Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            className={`qlh-marquee-icon-btn${active ? " is-active" : ""}`}
            onClick={() => onChange(key)}
          >
            <Icon size={16} strokeWidth={2} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

function MarqueeAdminPreview({ items }: { items: MarqueeItemContent[] }) {
  const visible = items.filter((item) => item.text.trim());
  const track = visible.length > 0 ? [...visible, ...visible] : items.slice(0, 4);

  if (track.length === 0) {
    return (
      <div className="qlh-marquee-preview qlh-marquee-preview--empty">
        <Megaphone size={18} strokeWidth={2} aria-hidden />
        <span>Thêm mục để xem trước dòng chạy</span>
      </div>
    );
  }

  return (
    <div className="qlh-marquee-preview" aria-hidden>
      <div className="qlh-marquee-preview-track">
        {track.map((item, i) => {
          const Icon = MARQUEE_ICONS[item.icon];
          const text = item.text.trim() || "Nội dung ticker…";
          return (
            <span key={`${item.id}-${i}`} className="qlh-marquee-preview-item">
              <Icon size={15} strokeWidth={2.2} aria-hidden />
              <span>{text}</span>
              <span className="qlh-marquee-preview-sep">◆</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function newMarqueeItem(): MarqueeItemContent {
  return {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    icon: "gift",
    text: "",
  };
}

function MarqueeSection({
  data,
  onChange,
}: {
  data: MarqueeItemContent[];
  onChange: (v: MarqueeItemContent[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const setItem = (index: number, item: MarqueeItemContent) => {
    const next = [...data];
    next[index] = item;
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const addItem = () => {
    if (data.length >= MARQUEE_MAX_ITEMS) return;
    onChange([...data, newMarqueeItem()]);
    setOpen(true);
  };

  const filledCount = data.filter((item) => item.text.trim()).length;
  const firstFilled = data.find((item) => item.text.trim());
  const firstText = firstFilled?.text.trim() ?? "";

  const preview =
    data.length === 0
      ? "Chưa có mục"
      : filledCount === 0
        ? `${data.length} mục · chưa có nội dung`
        : filledCount === 1
          ? firstText
          : `${filledCount} mục · ${firstText.slice(0, 48)}${firstText.length > 48 ? "…" : ""}`;

  return (
    <section className={`qlh-section qlh-collapsible${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="qlh-collapsible-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="qlh-section-icon">
          <Megaphone size={18} />
        </span>
        <span className="qlh-collapsible-meta">
          <span className="qlh-section-title">Thanh ticker</span>
          <span className="qlh-collapsible-preview">{preview}</span>
        </span>
        <ChevronDown size={18} className="qlh-collapsible-chevron" aria-hidden />
      </button>

      {open ? (
        <div className="qlh-collapsible-body">
          <p className="qlh-section-sub qlh-collapsible-sub">
            Dòng chạy ngang dưới menu trên <code>/new</code>. Chỉ hiển thị mục đã có nội dung.
          </p>

          <MarqueeAdminPreview items={data} />

          {data.length > 0 ? (
            <ul className="qlh-marquee-cards">
              {data.map((item, i) => (
                <li key={item.id} className="qlh-marquee-card">
                  <div className="qlh-marquee-card-head">
                    <span className="qlh-marquee-idx">{i + 1}</span>
                    <span className="qlh-marquee-card-label">Mục ticker</span>
                    <button
                      type="button"
                      className="qlh-btn qlh-btn-sm qlh-btn-ghost qlh-marquee-remove"
                      aria-label={`Xóa mục ${i + 1}`}
                      onClick={() => removeItem(i)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="qlh-marquee-card-body">
                    <label className="qlh-field qlh-marquee-icon-field">
                      <span className="qlh-field-label">Icon</span>
                      <MarqueeIconPicker
                        value={item.icon}
                        name={`mục ${i + 1}`}
                        onChange={(icon) => setItem(i, { ...item, icon })}
                      />
                    </label>
                    <label className="qlh-field qlh-marquee-text-field">
                      <span className="qlh-field-label">Nội dung</span>
                      <input
                        type="text"
                        className="qlh-field-input"
                        value={item.text}
                        placeholder="VD: Khai giảng lớp Hình họa — 15/06"
                        aria-label={`Nội dung mục ${i + 1}`}
                        onChange={(e) => setItem(i, { ...item, text: e.target.value })}
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="qlh-marquee-empty">
              <Megaphone size={22} strokeWidth={2} aria-hidden />
              <p>Chưa có mục ticker nào.</p>
              <button type="button" className="qlh-btn qlh-btn-sm qlh-btn-primary" onClick={addItem}>
                <Plus size={14} />
                Thêm mục đầu tiên
              </button>
            </div>
          )}

          {data.length > 0 ? (
            <div className="qlh-marquee-toolbar">
              <button
                type="button"
                className="qlh-btn qlh-btn-sm qlh-btn-ghost"
                onClick={addItem}
                disabled={data.length >= MARQUEE_MAX_ITEMS}
              >
                <Plus size={14} />
                Thêm mục
              </button>
              <span className="qlh-marquee-count">
                {filledCount}/{data.length} mục có nội dung
                {data.length >= MARQUEE_MAX_ITEMS ? ` · tối đa ${MARQUEE_MAX_ITEMS}` : ""}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ExamSection({
  data,
  onChange,
}: {
  data: ExamContent;
  onChange: (v: ExamContent) => void;
}) {
  const setStat = (index: 0 | 1 | 2 | 3, stat: ExamContent["stats"][number]) => {
    const stats = [...data.stats] as ExamContent["stats"];
    stats[index] = stat;
    onChange({ ...data, stats });
  };

  return (
    <section className="qlh-section">
      <header className="qlh-section-head">
        <span className="qlh-section-icon">
          <Sparkles size={18} />
        </span>
        <div>
          <h2 className="qlh-section-title">Số liệu luyện thi</h2>
          <p className="qlh-section-sub">
            Khối “Học để đậu”. Ô 1 & 3 tự cập nhật số học viên / số trường CINS khi publish.
          </p>
        </div>
      </header>
      <label className="qlh-field">
        <span className="qlh-field-label">Đoạn mô tả</span>
        <textarea
          className="qlh-field-input qlh-field-ta"
          rows={2}
          value={data.subtitle}
          onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
        />
      </label>
      <div className="qlh-marquee-grid">
        {data.stats.map((stat, i) => (
          <div key={i} className="qlh-pillar-card">
            <div className="qlh-pillar-card-head">
              <span className="qlh-pillar-idx">#{i + 1}</span>
            </div>
            <label className="qlh-field">
              <span className="qlh-field-label">Số / giá trị</span>
              <input
                type="text"
                className="qlh-field-input"
                value={stat.value}
                onChange={(e) =>
                  setStat(i as 0 | 1 | 2 | 3, { ...stat, value: e.target.value })
                }
              />
            </label>
            <label className="qlh-field">
              <span className="qlh-field-label">Nhãn</span>
              <input
                type="text"
                className="qlh-field-input"
                value={stat.label}
                onChange={(e) =>
                  setStat(i as 0 | 1 | 2 | 3, { ...stat, label: e.target.value })
                }
              />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Legacy placeholder removed — why section only on trang chủ cũ `/`
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// Section 3: Video URLs
// ═══════════════════════════════════════════════════════════════════════════

function VideoSection({
  data,
  mockupVideo,
  onChange,
  onChangeMockupVideo,
}: {
  data: VideoContent;
  mockupVideo: MockupVideoLabels;
  onChange: (v: VideoContent) => void;
  onChangeMockupVideo: (v: MockupVideoLabels) => void;
}) {
  const setTab = useCallback(
    (index: 0 | 1, tab: VideoContent["tabs"][number]) => {
      const tabs = [...data.tabs] as VideoContent["tabs"];
      tabs[index] = tab;
      onChange({ ...data, tabs });
    },
    [data, onChange],
  );

  return (
    <section className="qlh-section">
      <header className="qlh-section-head">
        <span className="qlh-section-icon">
          <Film size={18} />
        </span>
        <div>
          <h2 className="qlh-section-title">Video lớp online</h2>
          <p className="qlh-section-sub">
            Trang /new dùng tab 1 (Online). Tab 2 giữ cho trang chủ cũ nếu cần.
          </p>
        </div>
      </header>

      <div className="qlh-content-block">
        <span className="qlh-block-pill">Nhãn section video (mockup)</span>
        <div className="qlh-pillars-grid qlh-pillars-grid--2">
          <label className="qlh-field">
            <span className="qlh-field-label">Eyebrow</span>
            <input
              type="text"
              className="qlh-field-input"
              value={mockupVideo.sectionLabel}
              onChange={(e) =>
                onChangeMockupVideo({ ...mockupVideo, sectionLabel: e.target.value })
              }
            />
          </label>
          <label className="qlh-field">
            <span className="qlh-field-label">Nhấn mạnh tiêu đề</span>
            <input
              type="text"
              className="qlh-field-input"
              value={mockupVideo.titleEmphasis}
              onChange={(e) =>
                onChangeMockupVideo({ ...mockupVideo, titleEmphasis: e.target.value })
              }
            />
          </label>
        </div>
        <label className="qlh-field">
          <span className="qlh-field-label">Mô tả</span>
          <textarea
            className="qlh-field-input qlh-field-ta"
            rows={2}
            value={mockupVideo.subtitle}
            onChange={(e) =>
              onChangeMockupVideo({ ...mockupVideo, subtitle: e.target.value })
            }
          />
        </label>
      </div>

      <div className="qlh-video-grid">
        {data.tabs.map((t, i) => (
          <VideoTabCard
            key={i}
            index={i as 0 | 1}
            data={t}
            onChange={(v) => setTab(i as 0 | 1, v)}
          />
        ))}
      </div>
    </section>
  );
}

function VideoTabCard({
  index,
  data,
  onChange,
}: {
  index: 0 | 1;
  data: VideoContent["tabs"][number];
  onChange: (v: VideoContent["tabs"][number]) => void;
}) {
  const thumb = data.youtubeId
    ? `https://img.youtube.com/vi/${data.youtubeId}/hqdefault.jpg`
    : null;

  return (
    <div className="qlh-video-card">
      <div className="qlh-video-card-head">
        <span className="qlh-block-pill">Tab {index + 1}</span>
      </div>
      <div className="qlh-video-thumb" style={{ aspectRatio: "16 / 9" }}>
        {thumb ? (
          <Image
            src={thumb}
            alt={data.label || `Video tab ${index + 1}`}
            fill
            sizes="(max-width: 720px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <div className="qlh-hero-preview-empty">
            <Film size={28} />
            <span>Chưa có video</span>
          </div>
        )}
      </div>
      <label className="qlh-field">
        <span className="qlh-field-label">Nhãn tab (hiển thị trên nút)</span>
        <input
          type="text"
          className="qlh-field-input"
          value={data.label}
          onChange={(e) => onChange({ ...data, label: e.target.value })}
          placeholder="📡 Lớp Online"
        />
      </label>
      <label className="qlh-field">
        <span className="qlh-field-label">YouTube (ID hoặc link)</span>
        <input
          type="text"
          className="qlh-field-input"
          value={data.youtubeId}
          onChange={(e) => {
            const v = e.target.value;
            const next =
              /https?:\/\/|youtu\.be\//i.test(v) || /watch\?v=/i.test(v)
                ? parseYoutubeVideoId(v)
                : v;
            onChange({ ...data, youtubeId: next });
          }}
          onBlur={(e) =>
            onChange({ ...data, youtubeId: parseYoutubeVideoId(e.target.value) })
          }
          placeholder="https://www.youtube.com/watch?v=tiUBpOVqHGs hoặc tiUBpOVqHGs"
        />
      </label>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 4: Ad banner (image URL + visibility)
// ═══════════════════════════════════════════════════════════════════════════

const VISIBLE_WHERE_OPTIONS: {
  value: AdVisibleWhere;
  label: string;
  desc: string;
}[] = [
  {
    value: "home",
    label: "Home",
    desc: "Chỉ trang chủ (/) — không hiện gallery, khóa học, v.v.",
  },
  {
    value: "class",
    label: "Class",
    desc: "Chỉ phòng học online (/phong-hoc).",
  },
  {
    value: "both",
    label: "Both",
    desc: "Trang chủ (/) và phòng học (/phong-hoc).",
  },
];

function AdSection({
  data,
  onChange,
}: {
  data: HomeAdConfig;
  onChange: (v: HomeAdConfig) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adSrc = data.ads.trim();
  const hasPreviewImage = isRenderableAdImageUrl(adSrc);

  const handlePickFile = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/admin/api/upload-cf-image", {
          method: "POST",
          body: form,
        });
        const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (!res.ok || !json.ok || !json.url) {
          throw new Error(json.error || "Upload thất bại.");
        }
        onChange({ ...data, ads: json.url });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload thất bại.");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [data, onChange],
  );

  return (
    <section className="qlh-section qlh-section--ad">
      <header className="qlh-section-head">
        <span className="qlh-section-icon">
          <Megaphone size={18} />
        </span>
        <div>
          <h2 className="qlh-section-title">Quảng cáo (Ad banner)</h2>
          <p className="qlh-section-sub">
            Tạm thời banner chỉ hiển thị dạng ảnh. Kích thước khuyến nghị:{" "}
            <b>360 × 176px</b> (tỷ lệ 45:22). Để trống để ẩn hoàn toàn.
          </p>
        </div>
      </header>

      <div className="qlh-ad-wrap">
        <div className="qlh-ad-editor">
          <label className="qlh-field">
            <span className="qlh-field-label">URL ảnh quảng cáo</span>
            <input
              type="text"
              className="qlh-field-input"
              value={data.ads}
              onChange={(e) => onChange({ ...data, ads: e.target.value })}
              placeholder="https://imagedelivery.net/... hoặc URL ảnh"
            />
          </label>
          {error ? <div className="qlh-hero-err">{error}</div> : null}
          <p className="qlh-ad-hint">
            Ảnh nên xuất đúng canvas <b>360 × 176px</b> để không bị crop.
            <button
              type="button"
              className="qlh-ad-fill"
              onClick={handlePickFile}
              disabled={uploading}
            >
              {uploading ? "Đang upload…" : "Upload ảnh"}
            </button>
            {data.ads.trim() ? (
              <button
                type="button"
                className="qlh-ad-fill qlh-ad-fill-danger"
                onClick={() => onChange({ ...data, ads: "" })}
                disabled={uploading}
              >
                Xoá ảnh
              </button>
            ) : null}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <fieldset className="qlh-fieldset qlh-vw-fieldset">
            <legend>Hiển thị ở đâu</legend>
            <div className="qlh-vw-grid">
              {VISIBLE_WHERE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`qlh-vw-option ${
                    data.visibleWhere === opt.value ? "is-on" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="visible_where"
                    value={opt.value}
                    checked={data.visibleWhere === opt.value}
                    onChange={() =>
                      onChange({
                        ...data,
                        visibleWhere: AD_VISIBLE_WHERE_VALUES.includes(
                          opt.value as AdVisibleWhere,
                        )
                          ? opt.value
                          : "home",
                      })
                    }
                  />
                  <div>
                    <span className="qlh-vw-label">{opt.label}</span>
                    <span className="qlh-vw-desc">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="qlh-ad-preview-col">
          <div className="qlh-ad-preview-label">Preview 360 × 176px</div>
          <div className="qlh-ad-preview-frame">
            {hasPreviewImage ? (
              <div className="qlh-ad-preview-render">
                <Image
                  src={adSrc}
                  alt="Preview quảng cáo"
                  fill
                  sizes="360px"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>
            ) : adSrc ? (
              <div className="qlh-ad-preview-empty">
                <AlertTriangle size={28} />
                <span>URL ảnh không hợp lệ</span>
              </div>
            ) : (
              <div className="qlh-ad-preview-empty">
                <Megaphone size={28} />
                <span>Chưa có ảnh</span>
              </div>
            )}
          </div>
          <p className="qlh-ad-preview-note">
            Banner thật dùng cùng tỷ lệ này trên trang chủ và phòng học. File
            nên nhẹ để không làm chậm trang.
          </p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Scoped CSS
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
.qlh-btn-danger{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
.qlh-btn-danger:hover:not(:disabled){background:#fee2e2}
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
.qlh-toast.warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;align-items:flex-start}
.qlh-toast.warn span{font-weight:600;line-height:1.45;font-size:13px}
.qlh-toast.err{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}

/* Section */
.qlh-section{background:#fff;border:1px solid rgba(45,32,32,.08);border-radius:16px;padding:20px 22px;box-shadow:0 6px 18px rgba(45,32,32,.04);display:flex;flex-direction:column;gap:16px;border-left:4px solid #ee5b9f}
.qlh-section-head{display:flex;align-items:flex-start;gap:12px}
.qlh-section-icon{width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;color:#ee5b9f;background:rgba(238,91,159,.08);border-radius:10px;flex-shrink:0}
.qlh-section-title{font-size:16.5px;font-weight:700;margin:0 0 3px;color:#1a1a1a;letter-spacing:-.005em}
.qlh-section-sub{font-size:12.5px;color:#6b5c5c;margin:0;line-height:1.5}
.qlh-section-sub code{background:#f5f0ec;padding:1px 5px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:11.5px}
.qlh-section-sub em{font-style:italic;color:#ee5b9f;font-weight:600}

/* Hero grid */
.qlh-hero-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.qlh-hero-card{display:flex;flex-direction:column;gap:10px;padding:14px;background:#fafafa;border:1px solid rgba(45,32,32,.08);border-radius:12px}
.qlh-hero-card-head h3{font-size:13px;font-weight:700;margin:0 0 3px;color:#1a1a1a}
.qlh-hero-card-head p{font-size:11.5px;color:#6b5c5c;margin:0;line-height:1.45}

.qlh-hero-preview{position:relative;width:100%;border-radius:10px;overflow:hidden;background:repeating-conic-gradient(#e8e1db 0% 25%,#f5f0ec 0% 50%) 50%/14px 14px;border:1px solid rgba(45,32,32,.1)}
.qlh-hero-preview-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#9c8a8a;font-size:11.5px;font-weight:600;background:#fafafa}
.qlh-hero-preview-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#fff;font-size:12px;font-weight:600;background:rgba(0,0,0,.55);backdrop-filter:blur(2px)}
.qlh-hero-err{font-size:12px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:7px 10px}
.qlh-hero-actions{display:flex;gap:6px;flex-wrap:wrap}

/* Content */
.qlh-content-block{background:#fafafa;border:1px solid rgba(45,32,32,.06);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.qlh-content-block-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.qlh-block-pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;background:rgba(238,91,159,.1);color:#b31e62;letter-spacing:.02em;text-transform:uppercase}
.qlh-content-block-head code{font-size:11.5px;color:#6b5c5c;background:#fff;border:1px solid rgba(45,32,32,.1);padding:2px 8px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,monospace}

.qlh-pillars-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.qlh-pillars-grid--2{grid-template-columns:repeat(2,1fr)}
.qlh-marquee-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.qlh-collapsible{padding:0;overflow:hidden}
.qlh-collapsible-head{width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;border:none;background:transparent;cursor:pointer;text-align:left;font:inherit;color:inherit}
.qlh-collapsible-head:hover{background:rgba(45,32,32,.02)}
.qlh-collapsible-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.qlh-collapsible-meta .qlh-section-title{font-size:15px;font-weight:800;color:#2d2020;line-height:1.2}
.qlh-collapsible-preview{font-size:12.5px;color:#6b5c5c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qlh-collapsible-chevron{flex-shrink:0;color:#6b5c5c;transition:transform .2s ease}
.qlh-collapsible.is-open .qlh-collapsible-chevron{transform:rotate(180deg)}
.qlh-collapsible-body{padding:0 16px 14px;display:flex;flex-direction:column;gap:10px}
.qlh-collapsible-sub{margin:0}
.qlh-marquee-preview{position:relative;overflow:hidden;border-radius:12px;background:linear-gradient(90deg,#f8a668,#ee5b9f);color:#fff;padding:11px 0;box-shadow:0 4px 14px rgba(238,91,159,.22)}
.qlh-marquee-preview--empty{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 16px;font-size:12.5px;font-weight:600;color:rgba(255,255,255,.92);background:linear-gradient(90deg,rgba(248,166,104,.85),rgba(238,91,159,.85))}
.qlh-marquee-preview-track{display:flex;gap:0;white-space:nowrap;width:max-content;animation:qlh-marquee-scroll 28s linear infinite}
.qlh-marquee-preview:hover .qlh-marquee-preview-track{animation-play-state:paused}
.qlh-marquee-preview-item{display:inline-flex;align-items:center;gap:8px;padding:0 24px;font-size:13.5px;font-weight:600;letter-spacing:-.01em}
.qlh-marquee-preview-sep{opacity:.55;font-size:10px}
@keyframes qlh-marquee-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.qlh-marquee-cards{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.qlh-marquee-card{border:1px solid rgba(45,32,32,.08);border-radius:12px;padding:12px 14px;background:#fafafa;display:flex;flex-direction:column;gap:10px}
.qlh-marquee-card-head{display:flex;align-items:center;gap:8px}
.qlh-marquee-idx{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;border-radius:8px;background:rgba(238,92,162,.12);color:#c0447a;font-size:11.5px;font-weight:800;flex-shrink:0}
.qlh-marquee-card-label{flex:1;min-width:0;font-size:12px;font-weight:700;color:#6b5c5c}
.qlh-marquee-card-body{display:grid;grid-template-columns:auto 1fr;gap:12px 14px;align-items:end}
.qlh-marquee-icon-field{flex-shrink:0}
.qlh-marquee-text-field{min-width:0}
.qlh-marquee-icon-picker{display:flex;flex-wrap:wrap;gap:6px}
.qlh-marquee-icon-btn{width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(45,32,32,.12);border-radius:10px;background:#fff;color:#6b5c5c;cursor:pointer;transition:border-color .15s ease,background .15s ease,color .15s ease,box-shadow .15s ease}
.qlh-marquee-icon-btn:hover{border-color:rgba(238,91,159,.35);color:#b31e62;background:rgba(238,91,159,.04)}
.qlh-marquee-icon-btn.is-active{border-color:transparent;color:#fff;background:linear-gradient(135deg,#f8a668,#ee5b9f);box-shadow:0 4px 12px rgba(238,91,159,.28)}
.qlh-marquee-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 16px;border:1.5px dashed rgba(45,32,32,.12);border-radius:12px;background:#fafafa;text-align:center}
.qlh-marquee-empty svg{color:#ee5b9f;opacity:.85}
.qlh-marquee-empty p{margin:0;font-size:13px;color:#6b5c5c;font-weight:600}
.qlh-marquee-count{font-size:11.5px;color:#6b5c5c;font-weight:600}
.qlh-marquee-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.qlh-marquee-row{display:flex;align-items:center;gap:8px}
.qlh-marquee-icon{width:52px;flex-shrink:0;padding:8px 6px;text-align:center}
.qlh-marquee-text{flex:1;min-width:0;padding:8px 10px}
.qlh-marquee-remove{flex-shrink:0;padding:8px;color:#9a6b6b}
.qlh-marquee-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:2px}
.qlh-slide-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.qlh-slide-row{border:1px solid rgba(45,32,32,.08);border-radius:10px;padding:10px;background:#fafafa;display:flex;flex-direction:column;gap:8px}
.qlh-slide-row-head{display:flex;align-items:center;gap:8px}
.qlh-slide-idx{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;border-radius:8px;background:rgba(238,92,162,.12);color:#c0447a;font-size:11.5px;font-weight:800;flex-shrink:0}
.qlh-slide-size{flex:1;min-width:0;font-size:11.5px;color:#6b5c5c;font-weight:600}
.qlh-slide-row-body{display:flex;gap:10px;align-items:flex-start}
.qlh-slide-thumb-wrap{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;width:72px}
.qlh-slide-thumb{position:relative;width:72px;border:none;border-radius:8px;overflow:hidden;background:#eee;cursor:pointer;padding:0;display:block}
.qlh-slide-thumb-empty{display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:79px;color:#9a8a8a;background:#f0ecec}
.qlh-slide-thumb-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.75)}
.qlh-slide-thumb-clear{padding:4px 6px!important;min-height:0!important}
.qlh-slide-thumb-err{font-size:10px;color:#c04444;line-height:1.3;text-align:center}
.qlh-slide-fields{flex:1;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.qlh-slide-fields .qlh-field-input{padding:8px 10px;font-size:13px}
.qlh-slide-sub,.qlh-slide-bg{grid-column:1/-1}
.qlh-preview-link{color:#b31e62;font-weight:700;text-decoration:underline;text-underline-offset:2px}
.qlh-preview-link:hover{color:#ee5b9f}
.qlh-pillar-card{background:#fff;border:1px solid rgba(45,32,32,.08);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.qlh-pillar-card-head{display:flex;align-items:center;gap:8px}
.qlh-pillar-idx{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#f8a668,#ee5b9f);color:#fff;font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.qlh-pillar-card-head code{font-size:11px;color:#6b5c5c;background:#f5f0ec;padding:2px 7px;border-radius:5px;font-family:ui-monospace,SFMono-Regular,monospace}

/* Video */
.qlh-video-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.qlh-video-card{display:flex;flex-direction:column;gap:10px;padding:14px;background:#fafafa;border:1px solid rgba(45,32,32,.08);border-radius:12px}
.qlh-video-card-head{display:flex;align-items:center}
.qlh-video-thumb{position:relative;width:100%;border-radius:10px;overflow:hidden;background:#000;border:1px solid rgba(45,32,32,.1)}

/* Field */
.qlh-field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
.qlh-field-label{font-size:11.5px;font-weight:700;color:#6b5c5c;text-transform:uppercase;letter-spacing:.03em}
.qlh-field-input{width:100%;padding:9px 11px;border:1px solid rgba(45,32,32,.12);border-radius:8px;background:#fff;font-size:13.5px;color:#2d2020;font-family:inherit;outline:none;transition:border-color .15s, box-shadow .15s;box-sizing:border-box}
.qlh-field-input:focus{border-color:#f8a668;box-shadow:0 0 0 3px rgba(248,166,104,.15)}
.qlh-field-ta{resize:vertical;min-height:66px;line-height:1.55}

.qlh-footer-save{display:flex;justify-content:flex-end;padding-top:4px}

.qlh-img-class-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.qlh-img-class-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
.qlh-img-class-tile{position:relative;aspect-ratio:4/3;border-radius:10px;overflow:hidden;border:1px solid rgba(45,32,32,.1);background:#fafafa}
.qlh-img-class-remove{position:absolute;top:6px;right:6px;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,.85);background:rgba(0,0,0,.42);color:#fff;cursor:pointer;transition:background .15s,border-color .15s}
.qlh-img-class-remove:hover{background:rgba(185,28,28,.9);border-color:#fecaca}

/* Ad section */
.qlh-section--ad{border-left-color:#bb89f8}
.qlh-section--ad .qlh-section-icon{color:#bb89f8;background:rgba(187,137,248,.1)}
.qlh-ad-wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px;align-items:flex-start}
.qlh-ad-editor{display:flex;flex-direction:column;gap:12px}
.qlh-ad-html{font-family:ui-monospace,SFMono-Regular,'Courier New',monospace;font-size:12px;min-height:200px;line-height:1.5}
.qlh-ad-hint{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#6b5c5c;margin:0;flex-wrap:wrap}
.qlh-ad-fill{border:1px solid rgba(45,32,32,.12);background:#fff;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;color:#7439cc;cursor:pointer}
.qlh-ad-fill:hover{background:rgba(187,137,248,.08);border-color:rgba(187,137,248,.3)}
.qlh-ad-fill:disabled{opacity:.55;cursor:not-allowed}
.qlh-ad-fill-danger{color:#b91c1c}
.qlh-ad-fill-danger:hover{background:#fef2f2;border-color:#fecaca}

.qlh-vw-fieldset{background:#fff}
.qlh-vw-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.qlh-vw-option{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid rgba(45,32,32,.12);border-radius:10px;background:#fafafa;cursor:pointer;transition:all .15s}
.qlh-vw-option:hover{border-color:rgba(187,137,248,.45)}
.qlh-vw-option.is-on{background:rgba(187,137,248,.08);border-color:#bb89f8;box-shadow:0 0 0 2px rgba(187,137,248,.15)}
.qlh-vw-option input{margin-top:3px;accent-color:#bb89f8;flex-shrink:0}
.qlh-vw-label{display:block;font-size:12.5px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:.02em}
.qlh-vw-desc{display:block;font-size:11px;color:#6b5c5c;line-height:1.4;margin-top:2px}

.qlh-ad-preview-col{display:flex;flex-direction:column;gap:8px}
.qlh-ad-preview-label{font-size:11.5px;font-weight:700;color:#6b5c5c;text-transform:uppercase;letter-spacing:.03em}
.qlh-ad-preview-frame{background:#fff;border:1px solid rgba(45,32,32,.1);border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(45,32,32,.08);width:100%;max-width:360px;aspect-ratio:360/176}
.qlh-ad-preview-render{position:relative;width:100%;height:100%;overflow:hidden}
.qlh-ad-preview-render *{max-width:100%}
.qlh-ad-preview-empty{display:flex;height:100%;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#9c8a8a;font-size:11.5px;font-weight:600;padding:28px 16px}
.qlh-ad-preview-note{font-size:11px;color:#9c8a8a;margin:0;line-height:1.5;font-style:italic}

@media (max-width:900px){
  .qlh-hero-grid,.qlh-pillars-grid,.qlh-marquee-grid{grid-template-columns:1fr}
  .qlh-slide-fields{grid-template-columns:1fr}
  .qlh-marquee-card-body{grid-template-columns:1fr}
  .qlh-video-grid{grid-template-columns:1fr}
  .qlh-ad-wrap{grid-template-columns:1fr}
  .qlh-vw-grid{grid-template-columns:1fr}
}
`;
