import type { NhomDay } from "@/lib/lich-day-gv/config";

function toneless(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .toLowerCase()
    .trim();
}

/** Phân loại tên môn → Hình / Màu (null = không xác định). */
export function monTenToNhom(tenMon: string): NhomDay | null {
  const l = toneless(tenMon);
  if (!l) return null;
  if (
    l.includes("hinh hoa") ||
    l.includes("chan dung") ||
    l.includes("ky hoa") ||
    l.includes("tinh vat") ||
    l.includes("nguoi") ||
    l === "hh"
  ) {
    return "hinh";
  }
  if (
    l.includes("trang tri") ||
    l.includes("bo cuc") ||
    l.includes("mau nuoc") ||
    l.includes("bcm") ||
    l.includes("ttm")
  ) {
    return "mau";
  }
  return null;
}

export function teacherNhomFlags(lopMonNames: string[]): { hinh: boolean; mau: boolean } {
  let hinh = false;
  let mau = false;
  for (const name of lopMonNames) {
    const n = monTenToNhom(name);
    if (n === "hinh") hinh = true;
    if (n === "mau") mau = true;
  }
  return { hinh, mau };
}

export function teacherMatchesNhomPick(flags: { hinh: boolean; mau: boolean }, nhom: NhomDay): boolean {
  if (!flags.hinh && !flags.mau) return true;
  return nhom === "hinh" ? flags.hinh : flags.mau;
}
