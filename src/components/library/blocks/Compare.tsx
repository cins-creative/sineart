interface CompareRow { label: string; a: string; b: string }

export function Compare({
  colA,
  colB,
  rows,
}: {
  colA: string;
  colB: string;
  rows: CompareRow[];
}) {
  return (
    <div className="cmp">
      <div className="cmp-col l">
        <p className="cmp-head">{colA}</p>
        {rows.map((r, i) => <p key={i} className="cmp-row"><strong>{r.label}</strong>{r.a}</p>)}
      </div>
      <div className="cmp-col r">
        <p className="cmp-head">{colB}</p>
        {rows.map((r, i) => <p key={i} className="cmp-row">{r.b}</p>)}
      </div>
    </div>
  );
}
