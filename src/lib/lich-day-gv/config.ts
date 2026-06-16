/** Ca trong ngày — sáng / chiều / tối. */
export const CA_ORDER = ["sang", "chieu", "toi"] as const;
export type CaDay = (typeof CA_ORDER)[number];

export const CA_LABELS: Record<CaDay, string> = {
  sang: "Sáng",
  chieu: "Chiều",
  toi: "Tối",
};

/** Thứ trong tuần: 1 = Thứ 2 … 7 = Chủ nhật. */
export const THU_ORDER = [1, 2, 3, 4, 5, 6, 7] as const;
export type ThuInWeek = (typeof THU_ORDER)[number];

export const THU_LABELS: Record<ThuInWeek, string> = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  7: "Chủ nhật",
};

export const THU_SHORT: Record<ThuInWeek, string> = {
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
  7: "CN",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-MM-DD` từ Date local. */
export function isoDateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Thứ Hai (ISO) của tuần chứa `d`. */
export function mondayOfDate(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return isoDateLocal(copy);
}

export function mondayOfToday(): string {
  return mondayOfDate(new Date());
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseMondayParam(raw: string | undefined | null): string {
  const today = mondayOfToday();
  if (!raw?.trim() || !ISO_DATE.test(raw.trim())) return today;
  const d = new Date(`${raw.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return today;
  return mondayOfDate(d);
}

export function addWeeksToMonday(mondayIso: string, weeks: number): string {
  const d = new Date(`${mondayIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return mondayOfToday();
  d.setDate(d.getDate() + weeks * 7);
  return isoDateLocal(d);
}

/** Ngày lịch cho `thu` (1=T2) trong tuần bắt đầu `mondayIso`. */
export function dateForThu(mondayIso: string, thu: ThuInWeek): string {
  const d = new Date(`${mondayIso}T12:00:00`);
  d.setDate(d.getDate() + (thu - 1));
  return isoDateLocal(d);
}

export function formatThuHeader(mondayIso: string, thu: ThuInWeek): string {
  const iso = dateForThu(mondayIso, thu);
  const [y, m, day] = iso.split("-");
  return `${THU_SHORT[thu]} ${day}/${m}`;
}

export function formatWeekRange(mondayIso: string): string {
  const end = dateForThu(mondayIso, 7);
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };
  const y = mondayIso.slice(0, 4);
  return `${fmt(mondayIso)} – ${fmt(end)}/${y}`;
}

export function slotKey(thu: ThuInWeek, ca: CaDay, nhom: NhomDay = "hinh"): string {
  return `${thu}_${ca}_${nhom}`;
}

/** Nhóm môn trong ca: Hình họa vs các môn màu. */
export const NHOM_ORDER = ["hinh", "mau"] as const;
export type NhomDay = (typeof NHOM_ORDER)[number];

export const NHOM_LABELS: Record<NhomDay, string> = {
  hinh: "Hình",
  mau: "Màu",
};

export function isNhomDay(v: string): v is NhomDay {
  return (NHOM_ORDER as readonly string[]).includes(v);
}

export function isCaDay(v: string): v is CaDay {
  return (CA_ORDER as readonly string[]).includes(v);
}
