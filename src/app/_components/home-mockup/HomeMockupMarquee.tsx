import { Calendar, Gift, MapPin, PenLine } from "lucide-react";

import type { HomeMockupMarqueeItem } from "@/lib/data/home-mockup";

const ICONS = {
  "map-pin": MapPin,
  calendar: Calendar,
  gift: Gift,
  "edit-3": PenLine,
} as const;

export function HomeMockupMarquee({ items }: { items: HomeMockupMarqueeItem[] }) {
  const visible = items.filter((item) => item.text.trim());
  if (visible.length === 0) return null;

  const track = [...visible, ...visible];

  return (
    <div className="marquee" aria-label="Thông báo">
      <div className="marquee-track">
        {track.map((item, i) => {
          const Icon = ICONS[item.icon];
          return (
            <span key={`${item.id}-${i}`} className="marquee-item">
              <Icon className="feather" aria-hidden />
              {item.text} <span className="sep">◆</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
