"use client";

import { useState } from "react";

export interface HoverItem {
  id: string;
  num: string;
  name: string;
  nameEn: string;
  desc: string;
  panelSrc?: string;
  panelNote?: string;
}

export function ElListHover({ items }: { items: HoverItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const active = items.find((i) => i.id === activeId);

  return (
    <div className="el-list-hover">
      <div className="el-list-hover-items">
        {items.map((item) => (
          <div
            key={item.id}
            className="el-hover-item"
            data-active={item.id === activeId}
            onMouseEnter={() => setActiveId(item.id)}
            style={{ opacity: item.id === activeId ? 1 : 0.5 }}
          >
            <span
              className="el-hover-n"
              style={
                item.id === activeId
                  ? {
                      background: "linear-gradient(135deg, #f8a668, #ee5b9f)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }
                  : undefined
              }
            >
              {item.num}
            </span>
            <div>
              <p className="el-hover-name">
                {item.name} <em>{item.nameEn}</em>
              </p>
              <p className="el-hover-desc">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="el-hover-panel">
        {active && (
          <div className="panel-slide active">
            {active.panelSrc && (
              <img src={active.panelSrc} alt={active.name} loading="lazy" />
            )}
            {active.panelNote && <p className="panel-note">{active.panelNote}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
