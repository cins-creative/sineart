import { MK_INPUT_COLS, type MkDataAnalysisRow, type MkNumericKey } from "@/lib/data/admin-report-mkt";

export type ChartDatum = {
  periodLabel: string;
  ngayISO: string;
} & Partial<Record<MkNumericKey, number | null>>;

export function sortMkRowsByDate(rows: MkDataAnalysisRow[]): MkDataAnalysisRow[] {
  return [...rows].sort((a, b) => (a.ngay_thang_nhap || "").localeCompare(b.ngay_thang_nhap || ""));
}

/** Nhãn trục X giống bảng nhập liệu: MM-DD */
export function periodLabelShort(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  return iso.trim().slice(5);
}

export function colIsPct(col: (typeof MK_INPUT_COLS)[number]): boolean {
  return "isPct" in col && (col as { isPct?: boolean }).isPct === true;
}

/** Chuẩn hoá cho biểu đồ: % lưu dạng 0–1 trong DB → hiển thị trục 0–100 */
export function rowsToChartData(sorted: MkDataAnalysisRow[]): ChartDatum[] {
  return sorted.map((r) => {
    const row: ChartDatum = {
      periodLabel: periodLabelShort(r.ngay_thang_nhap),
      ngayISO: r.ngay_thang_nhap ?? "",
    };
    for (const col of MK_INPUT_COLS) {
      const raw = r[col.key];
      if (raw == null || Number.isNaN(raw)) {
        row[col.key] = null;
        continue;
      }
      row[col.key] = colIsPct(col) ? raw * 100 : raw;
    }
    return row;
  });
}

/** Net học viên tích lũy theo từng kỳ (giống Framer dashboard). */
export function withNetCumulative(data: ChartDatum[]): Array<ChartDatum & { net: number }> {
  let prev = 0;
  return data.map((r) => {
    const delta = (r.fb_hoc_vien_moi ?? 0) - (r.fb_hoc_vien_nghi ?? 0);
    prev += delta;
    return { ...r, net: prev };
  });
}
