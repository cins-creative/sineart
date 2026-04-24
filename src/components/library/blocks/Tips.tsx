interface TipItem { text: string }

export function Tips({ title = "Mẹo thực hành", items }: { title?: string; items: TipItem[] }) {
  return (
    <div className="tips">
      <p className="tips-title">{title}</p>
      <ul className="tips-list">
        {items.map((tip, i) => (
          <li key={i}>{tip.text}</li>
        ))}
      </ul>
    </div>
  );
}
