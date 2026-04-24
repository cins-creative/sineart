interface DoDontItem { text: string; src?: string }

export function DoDont({
  dos,
  donts,
}: {
  dos: DoDontItem[];
  donts: DoDontItem[];
}) {
  return (
    <div className="dodont">
      <div className="dodont-col do">
        <p className="dodont-label">✓ Nên</p>
        {dos.map((item, i) => (
          <div key={i} className="dodont-item">
            {item.src && <img src={item.src} alt={item.text} loading="lazy" />}
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <div className="dodont-col dont">
        <p className="dodont-label">✕ Không nên</p>
        {donts.map((item, i) => (
          <div key={i} className="dodont-item">
            {item.src && <img src={item.src} alt={item.text} loading="lazy" />}
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
