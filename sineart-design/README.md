# Sine Art Design System

**Sine Art** (`sineart.vn`) is a Vietnamese fine-art school with ~350 students, training young artists for university entrance exams and careers as "Họa sỹ công nghệ" (tech artists) — animation, film, and game art. The product is a Next.js 14 marketing + admin website backed by Supabase, deployed on Vercel.

The brand voice is warm, encouraging, and distinctly Vietnamese. Typography pairs **Geomanist** for display titles (Medium / Bold / Black) with **Quicksand** for body (Regular / Medium). The visual signature is a warm **peach → magenta** gradient (`#f8a668 → #ee5b9f`) paired with a soft white canvas and three category accent colors — yellow `#fde859` (Hình họa), mint `#6efec0` (Bố cục màu), lilac `#bb89f8` (Trang trí màu). Per the official brand sheet, shape language is **bo góc** (rounded corners) — avoid sharp angles; use rounded rectangles, circles, rounded pill-sticks, and free-form blob shapes.

> ⚠️ **Font substitution:** Geomanist is a licensed font not on Google Fonts. In this design system we fall back to **Grandstander** (Google Fonts) as the closest playful-geometric match for titles. The live codebase currently uses Quicksand for everything via `next/font/google`. If you have Geomanist `.woff2` files, drop them in `fonts/` and update `colors_and_type.css`.

## Source materials (from `cins-creative/sineart@main`)

| File | What's in it |
|---|---|
| `CLAUDE.md` | Project overview, Supabase schema, conventions |
| `SITE_STRUCTURE.md` | All routes, URL rules, SEO priorities |
| `src/app/layout.tsx` | Root layout — loads Quicksand via `next/font/google` |
| `src/app/globals.css` | Tailwind v4 + minimal base tokens |
| `src/app/sineart-home.css` | **The bulk of the design system** (~65KB) — all homepage tokens, components, layout rules |
| `src/app/_components/*` | Hero, Nav, Courses, Reviews, Stats, Career, Teachers, Gallery, Video |
| `src/constants/navigation.ts` | Nav structure |
| `public/` | Only Next.js starter SVGs — no brand assets in repo (hosted on Cloudflare Images) |

Cloudflare Images host: `https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/<id>/public`

## Index

- `README.md` — this file
- `colors_and_type.css` — CSS variables for colors, type, spacing, shadows, semantic tokens
- `fonts/` — Quicksand webfont (via Google Fonts CDN; no TTFs in repo)
- `assets/` — logos, hero cover, course thumbnails, placeholders
- `preview/` — design system preview cards (rendered in the Design System tab)
- `ui_kits/website/` — high-fidelity homepage recreation with modular JSX components
- `SKILL.md` — agent skill manifest

---

## CONTENT FUNDAMENTALS

**Language:** Vietnamese (primary). All UI strings, navigation, marketing copy are in Vietnamese with full diacritics (`đ`, `ạ`, `ố`, etc). Slugs are decoded Vietnamese (e.g. `đề-thi-hình-họa-sine-art-mẫu-tĩnh-vật-1`).

**Tone:** Warm, aspirational, professional. Positions the school as serious and "bài bản" (systematic, methodical) but inviting — not cold or corporate. Talks to the student directly: "Dành cho Họa sỹ công nghệ" ("For tech artists"), "Học viên nói gì" ("What students say").

**Voice examples (from homepage):**
- Eyebrow: "Giáo trình khoa học" (Scientific curriculum)
- Headline: "Dành cho **Họa sỹ công nghệ**"
- Lead: "Sứ mệnh của Sine Art xây dựng Kiến thức Mỹ thuật một cách bài bản và khoa học, giúp các bạn có đầy đủ kiến thức để trở thành Họa sỹ công nghệ trong lĩnh vực Hoạt hình, Phim và Game trong tương lai."
- CTAs: "🎨 Học thử miễn phí" (Try free), "Xem khoá học" (View courses), "Vào học" (Enter class)
- Stats labels: "học viên", "năm kinh nghiệm", "nhóm khoá học"
- Section labels are SHORT, sentence-cased: "Khoá học", "Học viên nói gì", "Hướng nghiệp"

**Casing:** Sentence case for section labels and buttons. Title case is rare. ALL CAPS is used sparingly (only in the tiny eyebrow `SEC-LABEL` tracking `0.1em`, and 11px uppercase eyebrows in hero/career).

**Pronoun:** Uses "bạn" / "các bạn" (friendly "you") — never formal "quý khách". "Chúng tôi" / "Sine Art" is used for first person.

**Emoji:** Yes, used sparingly as accents — `🎨` on the primary CTA, `⭐` for star ratings, `🌸` as a decorative mark in reviews. Category icons in the careers scroll. Never used in body copy or headlines.

**Numbers:** Tabular nums for stat cards (`font-variant-numeric: tabular-nums`). Currency in VND.

---

## VISUAL FOUNDATIONS

### Color

- **Ink (foreground):** `#2D2020` — a warm near-black, intentionally NOT pure black. Muted variants are rgba(45,32,32, .78 / .56 / .15 / .08 / .06) for body, muted, dividers, tints.
- **Background:** pure `#ffffff`. The site is LIGHT-MODE ONLY — dark-mode media query is explicitly overridden back to white ("Trang Sine Art là layout sáng").
- **Signature gradient:** `linear-gradient(135deg, #f8a668, #ee5b9f)` — peach to magenta. Used on primary buttons, active pills, brand accents ("Art" in logo), star ratings, navbar CTA.
- **Category swatches** (used as 8px dots and tinted 10-15% backgrounds):
  - `--hh` Hình họa (figure drawing): `#fde859` yellow
  - `--bc` Bố cục màu (color composition): `#6efec0` mint
  - `--tt` Trang trí màu (color decoration): `#bb89f8` lilac
  - `--dg` Digital: `#f8a668` peach
  - `--mt` MT cơ bản: `#f0f0f0` neutral
- **Surface tint:** `rgba(187, 137, 248, 0.08)` — lilac-tinted surface for hovers and sidebars.
- **Imagery vibe:** warm, saturated, studio-lit student artwork. Portraits of teachers and student work dominate. No cold/corporate stock photos.

### Typography

**Family:** Quicksand (Google Fonts), loaded with Latin + Vietnamese subsets. Geometric sans with friendly rounded terminals — reads warm, not corporate. Italic is used for headline emphasis WITHOUT actual italic: `em { font-style: normal; background-clip: text; }` — just the gradient fill.

**Base:** 15px / 1.5, upgraded to 16px on ≥900px desktop.

**Weights in use:** 500 (hero lead), 600 (subtitle / muted body), 700 (most UI), 800 (headings, titles, active states). 400 is rarely used — the system runs heavy.

**Scale (mobile → desktop):**
- Hero headline: `clamp(26px, 5.5vw, 40px)` → `clamp(36px, 4.2vw, 52px)`, weight 800, `letter-spacing -0.02em`, `line-height 1.12`
- H2 / feature name: 18–24px / 800 / -0.02em
- Stat number: 28px → 42px / 800 / -0.02em / tabular-nums
- Body: 14–15px / 1.5–1.65 / 500–600
- Section label (eyebrow): 12px / 700 / uppercase / `letter-spacing 0.1em`
- Caption / sub: 11–13px / 600–700
- Button: 13–15px / 700–800

### Spacing, radii, shadows

- `--gap: 10px` mobile, `14px` desktop — the universal breathing room between cards and sections.
- `--r: 16px` mobile, `20px` desktop — the universal card radius. Buttons use `999px` pill radius. Badges/pills share `100px`.
- **Shadows are soft and warm:** `0 4px 18px rgba(45,32,32,.06)` for cards at rest; `0 10px 32px rgba(45,32,32,.12)` on hover. Primary CTA carries `0 8px 28px rgba(232,72,150,.38)` — colored shadow from the gradient itself. Inset highlights (`inset 0 1px 0 rgba(255,255,255,.35)`) add a subtle glass edge on the primary button.

### Borders

- `1.5px solid rgba(45, 32, 32, 0.07)` for most card rests.
- `2px solid rgba(45, 32, 32, 0.08)` for the bento course blocks (which on hover fade to a 2px animated rainbow gradient border: peach → magenta → lilac → indigo → green → back, looped with `background-size: 320% 320%` and a 3.5s `courses-border-flow` keyframe).
- Dashed `1.5px dashed rgba(45,32,32,.12)` for empty states.

### Backgrounds

- **Hero:** full-bleed Cloudflare Image cover with a dark `linear-gradient(to top, rgba(20,10,10,.92) 38%, rgba(20,10,10,.2) 100%)` overlay at 0.6 opacity. White type with `text-shadow: 0 1px 2px rgba(12,8,8,.55), 0 2px 14px rgba(12,8,8,.4)` for legibility protection.
- **Footer:** multi-stop radial gradient on pink / peach / mint / yellow that reads like a painter's palette, with a `rgba(255,255,255,0.8)` inner sheet for legibility.
- **Mobile nav:** glass dock — `linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.96))` + `blur(12px) saturate(1.06)`, top-rounded 22px.
- NO repeating patterns, NO hand-drawn illustrations, NO grain textures. Placeholders are flat color with decorative circles.

### Animation

- Entry: `fadeUp` (opacity 0 + translateY(12px) → 1), `popIn` (scale .94 → 1), staggered 0.05–0.24s. Gallery tiles use `galleryMiFlyIn` with a 3px blur easing out on a `cubic-bezier(0.22, 1, 0.32, 1)` curve.
- Hover: border-color and shadow 0.18–0.22s ease. The bento "Luyện thi ĐH" block uses `mix-blend-mode: plus-lighter` for its animated rainbow border.
- Press: `transform: scale(0.96–0.98)` with 0.15s transition. Buttons and cards all respect this.
- Framer Motion is used in NavBar for the mobile sheet (tween, `cubic-bezier(0.32, 0.72, 0, 1)`, 0.46s) and list-stagger on items.
- `@media (prefers-reduced-motion: reduce)` shuts down the rainbow loop and heavy tilts — the system is disciplined here.

### Buttons & interactive states

- **Primary CTA** (`.btn-p`, `.sbtn-e`): gradient fill, white text, 100px radius, 14px/700, 13px padding, colored shadow `rgba(238,91,159,.35)`.
- **Ghost CTA** (`.btn-g` on dark hero): 15% white fill, 1.5px white/30 border, `backdrop-filter: blur(8px)`, white text.
- **Secondary pill** (`.sbtn-r`): `rgba(10,10,10,.06)` fill, subtle border, dark text.
- **Nav CTA "Vào học"** (fixed bottom-right): richer 4-stop gradient `#fbc08a → #f8a668 → #ee5b9f → #d9468a`, white play icon in a `rgba(255,255,255,.2)` circle, heavy shadow `rgba(232,72,150,.38)`.
- **Pill filters** (`.gtab`, `.rv-pill`, `.vtab`): inactive = transparent with 1.5px ink/12 border at 0.58 opacity; active = gradient fill + white text + transparent border. Tabs have sticky behavior with a bottom shadow.
- Active state = always the gradient. There's no blue "primary" — the gradient IS the system's primary.

### Transparency & blur

- Glass morphism is reserved for NAV and the course-block caption strip (`rgba(255,255,255,0.85)` + `blur(10px)`), with a fallback at 0.94 opacity for no-blur browsers.
- Lightboxes: `rgba(12,8,8,.88) + blur(8px)` — intentionally dark so artwork pops.

### Layout rules

- Mobile is the primary canvas. The entire root `.sa-root` runs the same max-width at desktop (no wild rework). `--gap`, `--r`, and body size bump up at ≥900px.
- `.page-inner` caps content at `max-width: 920px` on desktop, centered. Single column — there's no 2-column fight for attention.
- The hero is full-bleed (no padding or rounding on desktop).
- The navbar is a bottom dock on mobile (rounded 22px top) and a sticky top bar on desktop.
- A separate `.nav-cta-fixed` "Vào học" button lives permanently at bottom-right (safe-area aware).

### Iconography

- **Icon library:** `lucide-react` is installed, but usage in components is sparse — inline SVG is the dominant pattern. Specific icons (Play, Menu/Close, Chevron, Google logo) are hand-written inline SVGs at ~12-22px with `stroke-width: 1.75–2` and `strokeLinecap: round`.
- See `ICONOGRAPHY.md` below for the full treatment.

---

## ICONOGRAPHY

**Approach:** Inline SVG for UI controls, emoji for expressive accents, Cloudflare-hosted raster for all imagery.

**UI icons are inline SVG** with these conventions:
- `stroke="currentColor"`, `strokeWidth={1.75}` to `{2}`, `strokeLinecap="round"`, `strokeLinejoin="round"`
- 14–22px box, never filled unless it's a brand mark (Google logo, Play triangle)
- Examples in `assets/icons/`: menu (three lines), close (X), chevron-down, play, google, facebook, mail, phone, map-pin

**Lucide** is installed (`lucide-react@^1.7.0`) and can be used for any icon not hand-rolled. Stroke style matches Sine Art's existing inline SVGs — `stroke-width: 1.75–2`, round caps — so substitution is clean. Load from CDN in mocks: `https://unpkg.com/lucide-static@latest/icons/<name>.svg`.

**Emoji** appear as decorative accents, not controls:
- `🎨` on the primary "Học thử miễn phí" CTA
- `⭐` for star ratings (repeat for count)
- `🌸` as a floral mark in review artwork blocks
- Category-cards in Careers use emoji characters inside a gradient circle

**Logos / brand marks:**
- Wordmark: "Sine" (ink) + "Art" (gradient). Rendered in type at 19px (mobile nav) → 22px (footer) with `letter-spacing: -0.03em`. No separate logo file exists — the mark IS the Quicksand 800 wordmark.
- No logomark / icon form of the brand exists. Use the wordmark only.

**Imagery:**
- All student artwork and hero imagery is on Cloudflare Images at `https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/<id>/public`
- The hero cover referenced in CSS: `7c0ded50-01b1-4680-31d6-19a7394a7300` — a warm studio portrait used as the primary hero background
- Course thumbnails: `7b6189ac-...` (Luyện thi), `8b4e8243-...` (Digital), `b78bba3b-...` (Kids), `b117a1da-...` (Bổ trợ)
- Copied into `assets/images/` for offline use

