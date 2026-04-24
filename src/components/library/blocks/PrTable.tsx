export interface PrRow {
  num: string;
  name: string;
  nameEn?: string;
  desc: string;
}

export function PrTable({ rows }: { rows: PrRow[] }) {
  return (
    <div className="pr-table">
      {rows.map((row, i) => (
        <div key={i} className="pr-row">
          <span className="pr-i">{row.num}</span>
          <span className="pr-n">
            {row.name}
            {row.nameEn && <small>{row.nameEn}</small>}
          </span>
          <span className="pr-d">{row.desc}</span>
        </div>
      ))}
    </div>
  );
}
