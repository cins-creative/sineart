"use client";

import { CareerScrollTicker } from "@/app/_components/career/CareerScrollTicker";
import type { CareerCard } from "@/types/career";

type Props = {
  careers: CareerCard[];
};

export function HomeMockupCareerTicker({ careers }: Props) {
  return (
    <div className="career-ticker-wrap">
      <CareerScrollTicker careers={careers} openInNewTab />
    </div>
  );
}
