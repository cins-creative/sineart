import { ListChecks, Users } from "lucide-react";

import type { AdminDhOverviewStats } from "@/lib/data/admin-dh-truong-nganh";
import { cn } from "@/lib/utils";

type Props = {
  stats: AdminDhOverviewStats | null;
};

type CardSpec = {
  label: string;
  value: number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Màu nhấn từ design tokens. */
  tone: "pink" | "orange";
};

const TONE_BG: Record<CardSpec["tone"], string> = {
  pink: "from-[#EE5CA2]/15 to-[#EE5CA2]/5 text-[#a4326c]",
  orange: "from-[#F8A568]/15 to-[#F8A568]/5 text-[#c2410c]",
};

/**
 * Card tổng quan — luôn tính theo bộ lọc hiện tại (trường + ngành + năm).
 * Compact: 2 card nhỏ, không phình ngang trang.
 */
export default function DhStatsCards({ stats }: Props) {
  const cards: CardSpec[] = [
    {
      label: "Thông tin học viên",
      value: stats?.totalHocVien ?? 0,
      hint: "học viên (theo bộ lọc)",
      icon: Users,
      tone: "pink",
    },
    {
      label: "Các ngành đăng ký",
      value: stats?.totalNguyenVong ?? 0,
      hint: stats?.totalHocVien
        ? `~${(stats.totalNguyenVong / stats.totalHocVien).toFixed(1)} NV/HV`
        : "nguyện vọng",
      icon: ListChecks,
      tone: "orange",
    },
  ];

  return (
    <div className="grid gap-2 sm:max-w-md sm:grid-cols-2">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className={cn(
              "rounded-xl border border-black/[0.05] bg-gradient-to-br px-3 py-2 shadow-sm",
              TONE_BG[c.tone],
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.1em] opacity-80">
                  {c.label}
                </p>
                <p className="m-0 mt-0.5 flex items-baseline gap-1 leading-none">
                  <span className="text-lg font-extrabold tracking-tight text-[#1a1a2e]">
                    {c.value.toLocaleString("vi-VN")}
                  </span>
                  {c.hint ? (
                    <span className="text-[10px] font-semibold text-black/45">{c.hint}</span>
                  ) : null}
                </p>
              </div>
              <Icon className="h-4 w-4 shrink-0 opacity-70" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
