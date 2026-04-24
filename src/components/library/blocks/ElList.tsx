export interface ElItem {
  num: string;
  name: string;
  nameEn?: string;
  desc: string;
  src?: string;
  wide?: boolean;
}

export function ElList({ items }: { items: ElItem[] }) {
  return (
    <div className="el-list">
      {items.map((item, i) => (
        <div key={i} className={`el-item${item.wide ? " el-item--wide" : ""}`}>
          <div className="el-item-text">
            <span className="el-n">{item.num}</span>
            <p className="el-name">
              {item.name}
              {item.nameEn && <em>{item.nameEn}</em>}
            </p>
            <p className="el-desc">{item.desc}</p>
          </div>
          <div className="el-item-img">
            {item.src && <img src={item.src} alt={item.name} loading="lazy" />}
          </div>
        </div>
      ))}
    </div>
  );
}
