interface DualItem {
  label: string;
  note: string;
  src?: string;
  alt?: string;
}

export function BleedDual({ a, b }: { a: DualItem; b: DualItem }) {
  return (
    <div className="bleed-dual">
      <div className="bleed-item">
        <div className="bleed-box variant-a">
          {a.src && (
            <img src={a.src} alt={a.alt ?? a.note} loading="lazy" />
          )}
        </div>
        <div className="bleed-cap">
          <span className="bleed-badge">{a.label}</span>
          <p className="bleed-note">{a.note}</p>
        </div>
      </div>
      <div className="bleed-item">
        <div className="bleed-box variant-b">
          {b.src && (
            <img src={b.src} alt={b.alt ?? b.note} loading="lazy" />
          )}
        </div>
        <div className="bleed-cap">
          <span className="bleed-badge">{b.label}</span>
          <p className="bleed-note">{b.note}</p>
        </div>
      </div>
    </div>
  );
}
