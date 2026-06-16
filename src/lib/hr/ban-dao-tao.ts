/** Khớp tên ban giảng dạy / Đào tạo (`hr_ban.ten_ban`). */
export function banLabelMatchesDaoTao(rawLabel: string): boolean {
  const s = rawLabel.trim();
  if (!s) return false;
  try {
    const vi = s.toLocaleLowerCase("vi-VN");
    if (vi.includes("đào tạo")) return true;
  } catch {
    /* ignore */
  }
  const ascii = s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (ascii.includes("dao tao")) return true;
  if (
    ascii.includes("giang day") ||
    ascii.includes("giao duc") ||
    ascii.includes("giang vien") ||
    ascii.includes("training")
  ) {
    return true;
  }
  return false;
}

export function collectDaoTaoBanIds(banById: Record<number, string>): Set<number> {
  const ids = new Set<number>();
  for (const [idRaw, label] of Object.entries(banById)) {
    const id = Number(idRaw);
    if (Number.isFinite(id) && id > 0 && banLabelMatchesDaoTao(label)) ids.add(id);
  }
  return ids;
}

/** `hr_nhan_su.ban` + ban suy ra từ `hr_nhan_su_phong` → `hr_phong.ban`. */
export function isNhanSuThuocBanDaoTao(args: {
  nhanSuBan: number | null;
  phongIds: number[];
  phongToBanId: Record<number, number>;
  daoTaoBanIds: Set<number>;
}): boolean {
  if (args.daoTaoBanIds.size === 0) return false;
  if (args.nhanSuBan != null && args.nhanSuBan > 0 && args.daoTaoBanIds.has(args.nhanSuBan)) {
    return true;
  }
  for (const pid of args.phongIds) {
    const bid = args.phongToBanId[pid];
    if (bid != null && bid > 0 && args.daoTaoBanIds.has(bid)) return true;
  }
  return false;
}
