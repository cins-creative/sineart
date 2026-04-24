export interface GlossaryItem {
  term: string;
  vn: string;
  def: string;
  src?: string;
}

export function GlossaryBlock({ title = "Thuật ngữ", items }: { title?: string; items: GlossaryItem[] }) {
  return (
    <div className="gls">
      <div className="gls-head">{title}</div>
      <div className="gls-body">
        {items.map((item, i) => (
          <div key={i} className="gls-item">
            <span className="gls-term">{item.term}</span>
            <span className="gls-vn">{item.vn}</span>
            <span className="gls-def">{item.def}</span>
            {item.src && (
              <div className="gls-img">
                <img src={item.src} alt={item.term} loading="lazy" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
