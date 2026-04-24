"use client";

import { useEffect, useState } from "react";
import TocList, { type TocItem } from "./TocList";

interface Props {
  items?: TocItem[];
}

/** Card wrapper — tự ẩn khi auto-discover không tìm thấy heading nào. */
export default function TocCard({ items: manualItems }: Props) {
  const [hasItems, setHasItems] = useState(!!manualItems?.length);

  useEffect(() => {
    if (manualItems?.length) {
      setHasItems(true);
      return;
    }
    const root = document.querySelector<HTMLElement>(".ktn-lib .main .body");
    if (!root) return;
    const found = root.querySelectorAll(".div-sec").length;
    setHasItems(found > 0);
  }, [manualItems]);

  if (!hasItems) return null;

  return (
    <div className="rnav-card">
      <h5>Mục lục bài</h5>
      <TocList items={manualItems} />
    </div>
  );
}
