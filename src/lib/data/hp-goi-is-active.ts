import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";

/** Bảng legacy `hp_goi_hoc_phi` chưa có cột `is_active` — coi mọi gói là đang bán. */
export function goiTableSupportsIsActive(tableName?: string): boolean {
  return (tableName ?? hpGoiHocPhiTableName()) !== "hp_goi_hoc_phi";
}

/** Thiếu cột trên DB (chưa chạy migration) — bỏ qua filter/select `is_active`. */
export function isSupabaseMissingColumnError(message: string | undefined, column: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  const col = column.toLowerCase();
  return (
    m.includes(col) &&
    (m.includes("does not exist") ||
      m.includes("column") ||
      m.includes("could not find") ||
      m.includes("schema cache"))
  );
}

/** `null` / thiếu cột → coi là đang bán (tương thích dữ liệu cũ). */
export function parseGoiIsActive(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === "boolean") return raw;
  if (raw === true || raw === "true" || raw === "t" || raw === 1 || raw === "1") return true;
  if (raw === false || raw === "false" || raw === "f" || raw === 0 || raw === "0") return false;
  return true;
}

export function appendIsActiveToGoiSelect(cols: string, tableName?: string): string {
  if (!goiTableSupportsIsActive(tableName)) return cols;
  if (/\bis_active\b/.test(cols)) return cols;
  return `${cols}, is_active`;
}

export function filterRawGoiRowsForPayment<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.filter((r) => parseGoiIsActive(r.is_active));
}
