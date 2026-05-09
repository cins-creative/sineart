/**
 * Hai chi nhánh trực tiếp — tọa độ do vận hành cung cấp (WGS84).
 * Chi nhánh 1 = Tân Phú · Chi nhánh 2 = Bình Thạnh (đông hơn).
 */

export type BranchSite = {
  key: "tan_phu" | "binh_thanh";
  displayName: string;
  lat: number;
  lng: number;
};

export const SINE_ART_BRANCH_SITES: BranchSite[] = [
  { key: "tan_phu", displayName: "Tân Phú", lat: 10.8023, lng: 106.6347 },
  { key: "binh_thanh", displayName: "Bình Thạnh", lat: 10.8119, lng: 106.6957 },
];

function foldVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Độ dài cung trái đất (km). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type GeoGuess = { lat: number; lng: number; label: string };

/** Landmark / quận — tọa độ xấp xỉ trung tâm khu vực TP.HCM (ước lượng). */
const GEO_NEEDLES: { needle: string; lat: number; lng: number; label: string }[] = [
  { needle: "dai hoc my thuat tphcm", lat: 10.8233, lng: 106.6989, label: "khu ĐH Mỹ thuật TP.HCM (Phố Hồng Bàng)" },
  { needle: "dai hoc my thuat tp hcm", lat: 10.8233, lng: 106.6989, label: "khu ĐH Mỹ thuật TP.HCM" },
  { needle: "truong dai hoc my thuat", lat: 10.8233, lng: 106.6989, label: "khu ĐH Mỹ thuật" },
  { needle: "dh my thuat", lat: 10.8233, lng: 106.6989, label: "khu ĐH Mỹ thuật" },
  { needle: "hong bang", lat: 10.8233, lng: 106.6989, label: "khu Phố Hồng Bàng / ĐH Mỹ thuật" },
  { needle: "pho hong bang", lat: 10.8233, lng: 106.6989, label: "Phố Hồng Bàng" },
  { needle: "no trang long", lat: 10.8115, lng: 106.702, label: "khu Nơ Trang Long / Bình Thạnh" },
  { needle: "binh thanh", lat: 10.811, lng: 106.708, label: "Quận Bình Thạnh" },
  { needle: "tan phu", lat: 10.791, lng: 106.628, label: "Quận Tân Phú" },
  { needle: "tan son nhi", lat: 10.797, lng: 106.638, label: "Tân Sơn Nhì / Tân Phú" },
  { needle: "tan binh", lat: 10.801, lng: 106.652, label: "Quận Tân Bình" },
  { needle: "binh tan", lat: 10.765, lng: 106.603, label: "Quận Bình Tân" },
  { needle: "quan 1", lat: 10.7769, lng: 106.7009, label: "Quận 1" },
  { needle: "q1 ", lat: 10.7769, lng: 106.7009, label: "Quận 1" },
  { needle: "quan 3", lat: 10.783, lng: 106.683, label: "Quận 3" },
  { needle: "quan 7", lat: 10.731, lng: 106.718, label: "Quận 7" },
  { needle: "phu nhuan", lat: 10.799, lng: 106.68, label: "Quận Phú Nhuận" },
  { needle: "go vap", lat: 10.839, lng: 106.666, label: "Quận Gò Vấp" },
  { needle: "thu duc", lat: 10.85, lng: 106.771, label: "TP Thủ Đức / Thủ Đức" },
  { needle: "quan 12", lat: 10.867, lng: 106.653, label: "Quận 12" },
  { needle: "quan 10", lat: 10.775, lng: 106.667, label: "Quận 10" },
  { needle: "quan 11", lat: 10.763, lng: 106.643, label: "Quận 11" },
  { needle: "quan 5", lat: 10.755, lng: 106.666, label: "Quận 5" },
  { needle: "quan 6", lat: 10.757, lng: 106.634, label: "Quận 6" },
  { needle: "quan 8", lat: 10.722, lng: 106.628, label: "Quận 8" },
  { needle: "quan 4", lat: 10.757, lng: 106.704, label: "Quận 4" },
];

GEO_NEEDLES.sort((a, b) => b.needle.length - a.needle.length);

const LOCATION_INTENT_RE =
  /(?:quận|quan|huyện|huyen|phường|phuong|đường|duong|q\s*[1-9]|q\s*1[0-9]|khu|ở|o\s|gần|gan\s|địa chỉ|dia chi|tân phú|tan phu|bình thạnh|binh thanh|tân bình|tan binh|bình tân|binh tan|dh\s*mt|mỹ thuật|my thuat|hồ chí minh|ho chi minh|tp\s*hcm|tphcm|sài gòn|sai gon|học ở|hoc o|chỗ nào|cho nao|tiện|tien)/i;

/**
 * Ước lượng một điểm (lat,lng) từ địa chỉ / khu vực học viên nhắn.
 * Trả null nếu không đoán được hoặc tin không mang ý định địa điểm.
 */
export function estimateCoordsFromLocationText(message: string): GeoGuess | null {
  const raw = message.trim();
  if (raw.length < 4) return null;
  if (!LOCATION_INTENT_RE.test(raw)) return null;

  const f = foldVi(raw);

  for (const row of GEO_NEEDLES) {
    if (f.includes(row.needle)) {
      return { lat: row.lat, lng: row.lng, label: row.label };
    }
  }

  const qn = f.match(/(?:quận|quan)\s*(\d{1,2})\b/);
  if (qn) {
    const n = Number(qn[1]);
    const map: Record<number, GeoGuess> = {
      1: { lat: 10.7769, lng: 106.7009, label: "Quận 1" },
      2: { lat: 10.787, lng: 106.748, label: "Quận 2" },
      3: { lat: 10.783, lng: 106.683, label: "Quận 3" },
      4: { lat: 10.757, lng: 106.704, label: "Quận 4" },
      5: { lat: 10.755, lng: 106.666, label: "Quận 5" },
      6: { lat: 10.757, lng: 106.634, label: "Quận 6" },
      7: { lat: 10.731, lng: 106.718, label: "Quận 7" },
      8: { lat: 10.722, lng: 106.628, label: "Quận 8" },
      10: { lat: 10.775, lng: 106.667, label: "Quận 10" },
      11: { lat: 10.763, lng: 106.643, label: "Quận 11" },
      12: { lat: 10.867, lng: 106.653, label: "Quận 12" },
    };
    const g = map[n];
    if (g) return g;
  }

  return null;
}

export type ProximityRank = BranchSite & { distanceKm: number };

export function rankBranchesByDistance(lat: number, lng: number): ProximityRank[] {
  return SINE_ART_BRANCH_SITES.map((b) => ({
    ...b,
    distanceKm: haversineKm(lat, lng, b.lat, b.lng),
  })).sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Khối text ghép vào system prompt — chỉ khi ước lượng được điểm HV.
 */
export function formatBranchProximityHintForPrompt(message: string): string | null {
  const guess = estimateCoordsFromLocationText(message);
  if (!guess) return null;

  const ranked = rankBranchesByDistance(guess.lat, guess.lng);
  const [nearest, second] = ranked;
  const lines = [
    `─── GỢI Ý KHOẢNG CÁCH (ước lượng từ khu vực HV mô tả: «${guess.label}» — không thay thế địa chỉ đầy đủ trong dữ liệu vận hành) ───`,
    `Điểm ước lượng ~ ${guess.lat.toFixed(4)}, ${guess.lng.toFixed(4)}.`,
    `So với chi nhánh ${nearest.displayName}: ~${nearest.distanceKm.toFixed(1)} km; chi nhánh ${second.displayName}: ~${second.distanceKm.toFixed(1)} km.`,
    `Ưu tiên gợi ý học viên đến chi nhánh GẦN HƠN (${nearest.displayName}) khi hỏi “học ở đâu tiện” — vẫn đọc địa chỉ chính xác từ khối CHI NHÁNH trong prompt.`,
    `Nếu HV chỉ mơ hồ, hỏi thêm quận/đường để gợi ý chắc hơn.`,
  ];
  return lines.join("\n");
}
