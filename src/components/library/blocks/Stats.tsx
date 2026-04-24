interface StatItem { num: string; label: string; sub: string }
interface StatsProps { items: [StatItem, StatItem, StatItem] }

export function Stats({ items }: StatsProps) {
  return (
    <div className="stats break-half">
      {items.map((s, i) => (
        <div key={i} className="stat">
          <div className="stat-num">{s.num}</div>
          <div className="stat-label">{s.label}</div>
          <div className="stat-sub">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
