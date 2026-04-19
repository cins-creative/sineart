# Sine Art — Design System Skill

Use this skill when designing anything for **Sine Art** (SineArt School) — landing pages, course detail pages, emails, slides, or any Vietnamese-language mỹ thuật / art-school creative. Load `colors_and_type.css` as the single source of truth; every token below is defined there as a CSS custom property.

## Voice
Vietnamese first. Warm, encouraging, concrete. Use Vietnamese art-category names (Hình họa, Bố cục màu, Trang trí màu) — do not translate them. Never use cold/enterprise tone.

## Colors
- **Brand gradient** `#f8a668 → #ee5b9f` (peach → magenta). Use on: hero wordmark accent, primary CTA, avatar rings, gradient text on "Họa sỹ" / "Họa sỹ công nghệ" style punchlines.
- **Ink** `#2D2020` (warm near-black) — never pure `#000`. Use `--ink-2` (.78) for body, `--ink-muted` (.56) for captions.
- **BG** `#FFFFFF`. Use `--ink-tint` (.045) for resting surface hover.
- **Category accents** (from official brand sheet):
  - `--cat-hh` `#FDE859` yellow — Hình họa
  - `--cat-bc` `#6EFEC0` mint — Bố cục màu
  - `--cat-tt` `#BB89F8` lilac — Trang trí màu
  Used as backgrounds of stat cards, category dots, and soft section fills at ~10–15% opacity.

## Typography
- **Display** `Grandstander` (Geomanist fallback) — weights 500/700/800 — H1/H2/H3, logo, stat numbers. Letter-spacing `-0.02em`.
- **Body** `Quicksand` — 400/500/600/700 — everything else. Latin + Vietnamese subsets required.
- **Scale** eyebrow 11 · caption 12 · body 15–16 · sub 18 · H3 18 · H2 24 · stat 28–42 · H1 40–52.
- **Rule**: gradient text is reserved for the noun being celebrated (e.g. "Dành cho **Họa sỹ**"). Don't apply it to full headlines.

## Shape & Motion
- **Bo góc** (rounded corners) is doctrine — per the brand sheet, avoid sharp angles. Use rounded rectangles, circles, rounded pill sticks, and free-form blobs.
- **Radii**: `12` small, `16` card (mobile), `20` card (desktop), `999px` pill.
- **Shadows**: warm, never cool. `shadow-sm` (rest card), `shadow-md` (hover lift +2px translateY), `shadow-cta` (primary button with inset highlight + magenta drop).
- **Easing**: `cubic-bezier(0.22, 1, 0.32, 1)` for UI, `(0.32, 0.72, 0, 1)` for sheets.

## Components (rules of thumb)
- **Primary CTA**: gradient pill, bold Quicksand, min-height 44px, `shadow-cta`. Often paired with a small circular play-icon chip on the left for "Vào học" / "Học thử".
- **Filter pills**: outline at rest (border .12), gradient-filled when active, opacity .58 when inactive.
- **Course card**: 4:3 thumbnail, `border-radius:16px`, 2px ink-.08 border, footer row = 8px colored dot + bold 13px category name.
- **Review card**: gradient avatar with 2-letter mono, name bold 14, course/duration caption, italic quote body, gradient cursor `|` at end of text.
- **Stat card**: tinted bg (brand at 10% or category at 12–15%), tabular display number, 12px semibold label.
- **Hero overlay**: cover image + `linear-gradient(to top, rgba(20,10,10,.92) 38%, rgba(20,10,10,.2))` at 60% opacity. Text gets a subtle text-shadow for legibility.

## Don'ts
- No sharp corners on containers.
- No cool-gray shadows (`rgba(0,0,0,.x)` on neutrals). Use warm ink `rgba(45,32,32,.x)`.
- **Icons: Feather only.** Stroke 2, `stroke-linecap:round`, `stroke-linejoin:round`. Do not mix icon sets (no Material, Heroicons, FontAwesome, Bootstrap Icons) in the same surface. Filled shapes (e.g. the solid play triangle inside the "Vào học" CTA chip) are fine but must still derive from the Feather library.
- No emoji in headlines or UI chrome — use a Feather glyph instead.
- Don't invent new accent colors. If you need another category, pick one of the four.
- Don't use the gradient on body copy or long text — it loses legibility.

## Files in this system
- `colors_and_type.css` — all tokens + base utility classes (`.sa-h1`, `.sa-body`, `.sa-eyebrow`, `.sa-sec-label`, `.sa-logo`, `.sa-grad-text`).
- `preview/*.html` — reference renderings of each token group.
- `assets/brand/sine-art-brand-guide.png` — the original Vietnamese brand sheet (source of truth for shape + palette).
