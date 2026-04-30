"use client";

/** Scoped `/thi-thu` — gradient/card đồng bộ design system. */
export function ThiThuStyles() {
  return (
    <style jsx global>{`
      .sa-thi-thu {
        --ink: #2d2020;
        --ink-2: rgba(45, 32, 32, 0.78);
        --ink-muted: rgba(45, 32, 32, 0.56);
        --font-display: var(--font-be-vietnam-pro), system-ui, sans-serif;
        --font-body: var(--font-quicksand), system-ui, sans-serif;
        --grad: linear-gradient(135deg, #f8a668, #ee5b9f);
        --grad-start: #f8a668;
        --grad-end: #ee5b9f;
        --grad-cta: linear-gradient(145deg, #fbc08a 0%, #f8a668 22%, #ee5b9f 78%, #d9468a 100%);
        background: #fff;
        color: var(--ink);
        font-family: var(--font-body);
      }
      .sa-thi-thu * {
        box-sizing: border-box;
      }
      .sa-thi-thu .shell {
        max-width: 1100px;
        margin: 0 auto;
        padding: 0 24px;
      }
      .sa-thi-thu .page-hero {
        position: relative;
        padding: 56px 0 36px;
        overflow: hidden;
        isolation: isolate;
      }
      .sa-thi-thu .page-hero-bg {
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        background:
          radial-gradient(circle at 85% 15%, rgba(248, 166, 104, 0.22) 0%, transparent 45%),
          radial-gradient(circle at 8% 80%, rgba(187, 137, 248, 0.22) 0%, transparent 40%),
          #ffffff;
      }
      .sa-thi-thu .ph-eyebrow .dot {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--grad);
      }
      .sa-thi-thu .page-hero-bg {
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
          radial-gradient(circle at 85% 15%, rgba(248, 166, 104, 0.22) 0%, transparent 45%),
          radial-gradient(circle at 8% 80%, rgba(187, 137, 248, 0.22) 0%, transparent 40%),
          #ffffff;
      }
      .sa-thi-thu .ph-eyebrow {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        padding: 7px 14px 7px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.75);
        border: 1.5px solid rgba(45, 32, 32, 0.08);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 16px;
        color: var(--ink-2);
      }
      .sa-thi-thu .page-hero h1 {
        margin: 0 0 12px;
        font-family: var(--font-display);
        font-size: clamp(32px, 4.5vw, 48px);
        font-weight: 800;
        line-height: 1.05;
      }
      .sa-thi-thu .page-hero h1 em {
        font-style: normal;
        background: var(--grad);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .sa-thi-thu .lead {
        margin: 0;
        max-width: 52ch;
        font-size: 16px;
        line-height: 1.55;
        color: var(--ink-2);
      }
      .sa-thi-thu .card-grid {
        display: grid;
        gap: 18px;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        padding: 24px 0 56px;
      }
      .sa-thi-thu .tt-card {
        background: #fff;
        border: 1.5px solid rgba(45, 32, 32, 0.08);
        border-radius: 18px;
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 4px 18px rgba(45, 32, 32, 0.05);
      }
      .sa-thi-thu .tt-title {
        margin: 0;
        font-family: var(--font-display);
        font-size: 17px;
        font-weight: 800;
        line-height: 1.3;
      }
      .sa-thi-thu .tt-meta {
        font-size: 13px;
        color: var(--ink-muted);
        font-weight: 600;
      }
      .sa-thi-thu .tt-btn {
        margin-top: auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 18px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 800;
        border: 0;
        background: var(--grad-cta);
        color: #fff;
        transition: opacity 0.15s, transform 0.15s;
      }
      .sa-thi-thu .tt-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .sa-thi-thu .tt-btn:not(:disabled):hover {
        opacity: 0.95;
        transform: translateY(-1px);
      }
    `}</style>
  );
}
