export interface TimelineItem {
  year: string;
  label: string;
  desc?: string;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="timeline">
      {items.map((item, i) => (
        <div key={i} className="tl-row">
          <span className="tl-year">{item.year}</span>
          <div className="tl-body">
            <p className="tl-label">{item.label}</p>
            {item.desc && <p className="tl-desc">{item.desc}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
