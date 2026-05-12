import {
  dedupeMon1Pills,
  groupMon1ByPostTitle,
  isHocPhiCapTocSpecial,
} from "@/lib/hocPhiDedupe";
import type { HocPhiBlockData, HocPhiGoiRow, KhoaHocDetailData } from "@/types/khoa-hoc";

function hocPhiGoiEffectivePrice(g: HocPhiGoiRow): number {
  const d = Math.min(100, Math.max(0, g.discount));
  return Math.round((g.gia_goc * (100 - d)) / 100);
}

function vnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";
}

/** Cùng tập gói với JSON-LD Offer — đưa giá vào HTML tĩnh cho crawler. */
function snapshotLines(detail: KhoaHocDetailData, hocPhiBlock: HocPhiBlockData): string[] {
  const ten = detail.tenMonHoc.trim();
  const lines: string[] = [];
  const seenGoiIds = new Set<number>();

  const mon1 = hocPhiBlock.gois.filter(
    (g) => g.mon_hoc === detail.id && !isHocPhiCapTocSpecial(g.special),
  );
  const usePostTitle = mon1.some((g) => (g.post_title ?? "").trim() !== "");
  const rows = usePostTitle
    ? groupMon1ByPostTitle(mon1).flatMap((gr) => gr.pills)
    : dedupeMon1Pills(mon1);

  for (const g of rows) {
    if (seenGoiIds.has(g.id)) continue;
    seenGoiIds.add(g.id);
    const price = hocPhiGoiEffectivePrice(g);
    if (!Number.isFinite(price) || price <= 0) continue;
    const pt = (g.post_title ?? "").trim();
    const dur = `${g.number} ${g.don_vi}`.trim();
    const label = [pt, dur].filter(Boolean).join(" · ") || `Gói`;
    lines.push(`${ten} — ${label}: ${vnd(price)}`);
  }

  for (const leg of detail.goiHocPhi) {
    const price = Math.round(Number(leg.hocPhiThucDong));
    if (!Number.isFinite(price) || price <= 0) continue;
    lines.push(`${ten} — ${leg.tenGoiHocPhi.trim()}: ${vnd(price)}`);
  }

  return lines;
}

/**
 * Bảng học phí dạng văn bản ẩn (screen reader / bot) — bổ sung cho widget client
 * khi paint đầu tiên chưa gán `selGoi`.
 */
export function KhoaHocHocPhiSeoSnapshot({
  detail,
  hocPhiBlock,
}: Readonly<{
  detail: KhoaHocDetailData;
  hocPhiBlock: HocPhiBlockData;
}>) {
  const lines = snapshotLines(detail, hocPhiBlock);
  if (lines.length === 0) return null;
  return (
    <div className="sr-only" aria-hidden="true">
      <p>Học phí tham khảo (VNĐ)</p>
      <ul>
        {lines.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
