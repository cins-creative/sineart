import type { ReactNode } from "react";

interface KeyTakeawayProps {
  label?: string;
  title: ReactNode;
  desc?: string;
}

export function KeyTakeaway({ label = "⭐ Điểm mấu chốt", title, desc }: KeyTakeawayProps) {
  return (
    <div className="key-block">
      <p className="key-label">{label}</p>
      <p className="key-text">{title}</p>
      {desc && <p className="key-sub">{desc}</p>}
    </div>
  );
}
