"use client";

import { useState } from "react";

export interface FAQItem {
  q: string;
  a: string;
  defaultOpen?: boolean;
}

export function FAQ({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<Set<number>>(
    () => new Set(items.flatMap((item, i) => (item.defaultOpen ? [i] : [])))
  );

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div className="faq">
      {items.map((item, i) => (
        <details key={i} open={open.has(i)} onClick={(e) => { e.preventDefault(); toggle(i); }}>
          <summary>{item.q}</summary>
          <div className="faq-body"><p>{item.a}</p></div>
        </details>
      ))}
    </div>
  );
}
