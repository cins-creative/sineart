"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Film,
  ImageIcon,
  Info,
  Loader2,
  Megaphone,
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
  type HeroCardImage,
  type HeroCardsContent,
  type HeroContent,
  type HomeAdConfig,
  type HomeContent,
  isRenderableAdImageUrl,
  type VideoContent,
  type WhyContent,
  type WhyPillar,
} from "@/lib/admin/home-content-schema";

type Props = {
  initialContent: HomeContent;
  initialAd: HomeAdConfig;
  initialUpdatedAt: string | null;
  missingServiceRole?: boolean;
  loadError?: string;
};

type Toast = { ok: boolean; msg: string } | null;

type HeroCardKey = "top" | "main" | "bottom";

const HERO_CARD_ORDER: { key: HeroCardKey; label: string; hint: string; ratio: string }[] = [
  {
    key: "top",
    label: "Ảnh nhỏ phía trên (hero-card--top)",
    hint: "Khung nhỏ 3:4 góc trên phải — thường dùng ảnh chân dung / minh họa.",
    ratio: "3 / 4",
  },
  {
    key: "main",
    label: "Ảnh lớn chính (hero-card--main)",
    hint: "Khung lớn giữa — ảnh nổi bật nhất đại diện cho trường.",
    ratio: "4 / 5",
  },
  {
    key: "bottom",
    label: "Ảnh nhỏ phía dưới (hero-card--bottom)",
    hint: "Khung nhỏ 4:3 góc dưới trái — ảnh lớp học hoặc tác phẩm phụ.",
    ratio: "4 / 3",
  },
];

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
  initialUpdatedAt,
  missingServiceRole,
  loadError,
}: Props) {
  const [content, setContent] = useState<HomeContent>(initialContent);
  const [ad, setAd] = useState<HomeAdConfig>(initialAd);
  const [initialSnapshot, setInitialSnapshot] = useState<HomeContent>(initialContent);
  const [initialAdSnapshot, setInitialAdSnapshot] = useState<HomeAdConfig>(initialAd);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const dirty = useMemo(
    () =>
      JSON.stringify(content) !== JSON.stringify(initialSnapshot) ||
      JSON.stringify(ad) !== JSON.stringify(initialAdSnapshot),
    [content, initialSnapshot, ad, initialAdSnapshot],
  );

  const setHero = useCallback((hero: HeroContent) => {
    setContent((c) => ({ ...c, hero }));
  }, []);
  const setWhy = useCallback((why: WhyContent) => {
    setContent((c) => ({ ...c, why }));
  }, []);
  const setVideo = useCallback((video: VideoContent) => {
    setContent((c) => ({ ...c, video }));
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
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/admin/api/home-content-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, ad }),
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
      setInitialAdSnapshot(ad);
      setUpdatedAt(json.updated_at ?? new Date().toISOString());
      setToast({ ok: true, msg: "Đã lưu nội dung trang chủ." });
    } catch (e) {
      setToast({
        ok: false,
        msg: e instanceof Error ? e.message : "Lưu thất bại.",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4500);
    }
  }, [content, ad]);

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
          Chỉ quản lý 3 nhóm phần tử tĩnh trên trang chủ:{" "}
          <b>ảnh Hero (3 khung)</b>, <b>nội dung</b> (đoạn mô tả Hero + 3 trụ
          cột <em>Tại sao Sine Art</em>), và <b>URL video</b> (2 tab Online /
          Offline). Các block động (khóa học, review, giáo viên, gallery) quản
          lý ở trang riêng.
        </span>
      </div>

      {toast ? (
        <div className={`qlh-toast ${toast.ok ? "ok" : "err"}`} role="status">
          {toast.ok ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.msg}</span>
        </div>
      ) : null}

      <HeroImagesSection data={content.hero} onChange={setHero} />
      <ContentSection
        hero={content.hero}
        why={content.why}
        onChangeHero={setHero}
        onChangeWhy={setWhy}
      />
      <VideoSection data={content.video} onChange={setVideo} />
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
// Section 1: Hero images
// ═══════════════════════════════════════════════════════════════════════════

function HeroImagesSection({
  data,
  onChange,
}: {
  data: HeroContent;
  onChange: (v: HeroContent) => void;
}) {
  const setCard = useCallback(
    (key: HeroCardKey, card: HeroCardImage) => {
      const next: HeroCardsContent = { ...data.cards, [key]: card };
      onChange({ ...data, cards: next });
    },
    [data, onChange],
  );

  return (
    <section className="qlh-section">
      <header className="qlh-section-head">
        <span className="qlh-section-icon">
          <ImageIcon size={18} />
        </span>
        <div>
          <h2 className="qlh-section-title">Ảnh Hero</h2>
          <p className="qlh-section-sub">
            3 khung ảnh trong vùng cover của trang chủ. Upload ảnh hoặc dán URL
            Cloudflare Images.
          </p>
        </div>
      </header>

      <div className="qlh-hero-grid">
        {HERO_CARD_ORDER.map(({ key, label, hint, ratio }) => (
          <HeroImageCard
            key={key}
            label={label}
            hint={hint}
            ratio={ratio}
            card={data.cards[key]}
            onChange={(v) => setCard(key, v)}
          />
        ))}
      </div>
    </section>
  );
}

function HeroImageCard({
  label,
  hint,
  ratio,
  card,
  onChange,
}: {
  label: string;
  hint: string;
  ratio: string;
  card: HeroCardImage;
  onChange: (v: HeroCardImage) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        onChange({ ...card, imageUrl: json.url });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload thất bại.");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [card, onChange],
  );

  const handleClear = useCallback(() => {
    if (!card.imageUrl) return;
    if (!confirm("Xoá ảnh này? (chỉ xoá khỏi dashboard, không xoá trên Cloudflare)")) return;
    onChange({ ...card, imageUrl: "" });
  }, [card, onChange]);

  return (
    <div className="qlh-hero-card">
      <div className="qlh-hero-card-head">
        <div>
          <h3>{label}</h3>
          <p>{hint}</p>
        </div>
      </div>

      <div className="qlh-hero-preview" style={{ aspectRatio: ratio }}>
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={card.alt || label}
            fill
            sizes="(max-width: 720px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <div className="qlh-hero-preview-empty">
            <ImageIcon size={28} />
            <span>Chưa có ảnh</span>
          </div>
        )}
        {uploading ? (
          <div className="qlh-hero-preview-loading">
            <Loader2 size={20} className="qlh-spin" />
            <span>Đang upload…</span>
          </div>
        ) : null}
      </div>

      {error ? <div className="qlh-hero-err">{error}</div> : null}

      <div className="qlh-hero-actions">
        <button
          type="button"
          className="qlh-btn qlh-btn-sm qlh-btn-primary"
          onClick={handlePickFile}
          disabled={uploading}
        >
          <Upload size={13} />
          {card.imageUrl ? "Đổi ảnh" : "Upload ảnh"}
        </button>
        {card.imageUrl ? (
          <button
            type="button"
            className="qlh-btn qlh-btn-sm qlh-btn-danger"
            onClick={handleClear}
            disabled={uploading}
          >
            <Trash2 size={13} />
            Xoá
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      <label className="qlh-field">
        <span className="qlh-field-label">URL ảnh</span>
        <input
          type="text"
          className="qlh-field-input"
          value={card.imageUrl}
          onChange={(e) => onChange({ ...card, imageUrl: e.target.value })}
          placeholder="https://imagedelivery.net/..."
        />
      </label>

      <label className="qlh-field">
        <span className="qlh-field-label">Alt text (SEO / accessibility)</span>
        <input
          type="text"
          className="qlh-field-input"
          value={card.alt}
          onChange={(e) => onChange({ ...card, alt: e.target.value })}
          placeholder="Mô tả ngắn về nội dung ảnh"
        />
      </label>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 2: Content (hero lead + 3 why cards)
// ═══════════════════════════════════════════════════════════════════════════

function ContentSection({
  hero,
  why,
  onChangeHero,
  onChangeWhy,
}: {
  hero: HeroContent;
  why: WhyContent;
  onChangeHero: (v: HeroContent) => void;
  onChangeWhy: (v: WhyContent) => void;
}) {
  const setPillar = useCallback(
    (index: 0 | 1 | 2, pillar: WhyPillar) => {
      const pillars = [...why.pillars] as WhyContent["pillars"];
      pillars[index] = pillar;
      onChangeWhy({ ...why, pillars });
    },
    [why, onChangeWhy],
  );

  return (
    <section className="qlh-section">
      <header className="qlh-section-head">
        <span className="qlh-section-icon">
          <Sparkles size={18} />
        </span>
        <div>
          <h2 className="qlh-section-title">Nội dung</h2>
          <p className="qlh-section-sub">
            Đoạn mô tả Hero và 3 trụ cột <em>Tại sao Sine Art</em>.
          </p>
        </div>
      </header>

      <div className="qlh-content-block">
        <div className="qlh-content-block-head">
          <span className="qlh-block-pill">Hero · lead paragraph</span>
          <code>p.hero-lead</code>
        </div>
        <label className="qlh-field">
          <span className="qlh-field-label">
            Đoạn giới thiệu ngắn dưới tiêu đề Hero
          </span>
          <textarea
            className="qlh-field-input qlh-field-ta"
            rows={3}
            value={hero.lead}
            onChange={(e) => onChangeHero({ ...hero, lead: e.target.value })}
            placeholder="Sine Art xây dựng nền tảng Mỹ thuật bài bản và khoa học…"
          />
        </label>
      </div>

      <div className="qlh-content-block">
        <div className="qlh-content-block-head">
          <span className="qlh-block-pill">Tại sao Sine Art · 3 trụ cột</span>
          <code>article.why-card</code>
        </div>
        <div className="qlh-pillars-grid">
          {why.pillars.map((p, i) => (
            <PillarCard
              key={i}
              index={i as 0 | 1 | 2}
              data={p}
              onChange={(v) => setPillar(i as 0 | 1 | 2, v)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PillarCard({
  index,
  data,
  onChange,
}: {
  index: 0 | 1 | 2;
  data: WhyPillar;
  onChange: (v: WhyPillar) => void;
}) {
  return (
    <div className="qlh-pillar-card">
      <div className="qlh-pillar-card-head">
        <span className="qlh-pillar-idx">0{index + 1}</span>
        <code>why-card--c{index + 1}</code>
      </div>
      <label className="qlh-field">
        <span className="qlh-field-label">Số hiển thị</span>
        <input
          type="text"
          className="qlh-field-input"
          value={data.num}
          onChange={(e) => onChange({ ...data, num: e.target.value })}
          placeholder="01"
        />
      </label>
      <label className="qlh-field">
        <span className="qlh-field-label">Tiêu đề</span>
        <input
          type="text"
          className="qlh-field-input"
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Giáo trình khoa học"
        />
      </label>
      <label className="qlh-field">
        <span className="qlh-field-label">Nội dung</span>
        <textarea
          className="qlh-field-input qlh-field-ta"
          rows={4}
          value={data.text}
          onChange={(e) => onChange({ ...data, text: e.target.value })}
          placeholder="Từ hình họa cơ bản đến digital painting chuyên sâu…"
        />
      </label>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 3: Video URLs
// ═══════════════════════════════════════════════════════════════════════════

function VideoSection({
  data,
  onChange,
}: {
  data: VideoContent;
  onChange: (v: VideoContent) => void;
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
          <h2 className="qlh-section-title">URL video</h2>
          <p className="qlh-section-sub">
            2 tab video giới thiệu — Online và Offline. Dán YouTube ID (phần
            sau <code>v=</code>).
          </p>
        </div>
      </header>

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
        <span className="qlh-field-label">YouTube ID</span>
        <input
          type="text"
          className="qlh-field-input"
          value={data.youtubeId}
          onChange={(e) => onChange({ ...data, youtubeId: e.target.value })}
          placeholder="6LKT_E8XGu0"
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
    desc: "Trang chủ và các trang con public (trừ phòng học).",
  },
  {
    value: "class",
    label: "Class",
    desc: "Chỉ hiển thị trong phòng học online (/phong-hoc).",
  },
  {
    value: "both",
    label: "Both",
    desc: "Hiển thị cả trang public lẫn phòng học.",
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
  .qlh-hero-grid,.qlh-pillars-grid{grid-template-columns:1fr}
  .qlh-video-grid{grid-template-columns:1fr}
  .qlh-ad-wrap{grid-template-columns:1fr}
  .qlh-vw-grid{grid-template-columns:1fr}
}
`;
