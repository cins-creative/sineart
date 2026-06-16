/** Phân bổ doanh thu học phí → cột BCTC (Online/Offline theo môn). */

export type AmountAllocation = { colKey: string; ratio: number };

function tonelessVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function isOnlineLikeHinhThucText(value: string): boolean {
  const low = tonelessVi(value);
  if (!low) return false;
  if (low === "online") return true;
  if (low === "tai lop" || low === "tai cho" || low === "offline") return false;
  if (/\bonline\b/.test(low)) return true;
  if (/\btai\s*lop\b|tai\s*cho|\boffline\b/.test(low)) return false;
  if (low.includes("truc tuyen") || low.includes("zoom")) return true;
  return false;
}

export function subjectOnlineOffline(
  blob: string,
  onlineKey: string,
  offlineKey: string,
): AmountAllocation[] {
  const isOnline =
    /\b(onl|online)\b/.test(blob) ||
    blob.includes("truc tuyen") ||
    blob.includes("zoom");
  const isOffline =
    /\b(off|offline)\b/.test(blob) ||
    blob.includes("tai lop") ||
    blob.includes("tai cho") ||
    blob.includes("trung tam") ||
    blob.includes("luyen thi");
  if (isOnline && !isOffline) return [{ colKey: onlineKey, ratio: 1 }];
  if (isOffline && !isOnline) return [{ colKey: offlineKey, ratio: 1 }];
  if (isOnline && isOffline) {
    return [
      { colKey: onlineKey, ratio: 0.5 },
      { colKey: offlineKey, ratio: 0.5 },
    ];
  }
  return [
    { colKey: onlineKey, ratio: 0.7 },
    { colKey: offlineKey, ratio: 0.3 },
  ];
}

function isHinhHoaBlob(blob: string, ma: string): boolean {
  return (
    blob.includes("hinh hoa") ||
    blob.includes("hinh hoc") ||
    /\bhh\b/.test(blob) ||
    ma.startsWith("hh")
  );
}

function isTtmBlob(blob: string): boolean {
  return blob.includes("trang tri") || /\bttm\b/.test(blob);
}

function isBcmBlob(blob: string): boolean {
  return blob.includes("bo cuc") || /\bbcm\b/.test(blob);
}

function mergeAllocations(allocs: AmountAllocation[]): AmountAllocation[] {
  const byKey = new Map<string, number>();
  for (const a of allocs) {
    if (!Number.isFinite(a.ratio) || a.ratio === 0) continue;
    byKey.set(a.colKey, (byKey.get(a.colKey) ?? 0) + a.ratio);
  }
  return [...byKey.entries()].map(([colKey, ratio]) => ({ colKey, ratio }));
}

function scaleAllocations(allocs: AmountAllocation[], factor: number): AmountAllocation[] {
  return allocs.map((a) => ({ colKey: a.colKey, ratio: a.ratio * factor }));
}

/** Có cả tín hiệu Hình họa và Bố cục màu (combo 2 môn). */
function indicatesHhAndBcm(text: string): boolean {
  const n = tonelessVi(text);
  if (!n) return false;
  const hh = n.includes("hinh hoa") || n.includes("hinh hoc") || /\bhh\b/.test(n);
  const bcm = n.includes("bo cuc") || /\bbcm\b/.test(n) || n.includes("ct bcm");
  return hh && bcm;
}

function isHhBcmCombo(ctx: HocPhiRevenueContext, blob: string, ma: string): boolean {
  if (indicatesHhAndBcm(blob)) return true;
  const joined = [ctx.lopName, ctx.goiTen, ctx.monName, ctx.ten, ctx.ma].filter(Boolean).join(" ");
  if (indicatesHhAndBcm(joined)) return true;
  if (ctx.goiSoMon === 2) {
    const lop = tonelessVi(ctx.lopName ?? "");
    const goi = tonelessVi(ctx.goiTen ?? "");
    const hasHh = isHinhHoaBlob(blob, ma) || isHinhHoaBlob(lop, "") || isHinhHoaBlob(goi, "");
    const hasBcm = isBcmBlob(blob) || isBcmBlob(lop) || isBcmBlob(goi);
    if (hasHh && hasBcm) return true;
  }
  return false;
}

/** Combo Hình họa + Bố cục màu: 50% HH (Online/Offline) + 50% BCM (Online/Offline). */
function allocateHhBcmCombo(blob: string): AmountAllocation[] {
  const hh = subjectOnlineOffline(blob, "dtHHOnline", "dtHHOffline");
  const bcm = subjectOnlineOffline(blob, "dtBCMOnline", "dtBCMOffline");
  return mergeAllocations([...scaleAllocations(hh, 0.5), ...scaleAllocations(bcm, 0.5)]);
}

export type HocPhiRevenueContext = {
  ma: string;
  ten: string;
  goiTen?: string | null;
  /** `hp_goi_hoc_phi.hinh_thuc` hoặc tương đương */
  goiHinhThuc?: string | null;
  monName?: string | null;
  /** `ql_mon_hoc.hinh_thuc` */
  monHinhThuc?: string | null;
  monLoaiKhoaHoc?: string | null;
  /** Tên lớp từ ghi danh (`ql_lop_hoc`) — nguồn đáng tin cho luyện thi tại lớp. */
  lopName?: string | null;
  /** `hp_goi_hoc_phi.so_mon` — 2 = gói combo 2 môn. */
  goiSoMon?: number | null;
};

/** Ghép nhãn ma trận — bổ sung môn/hình thức khi danh mục thu chưa đủ. */
export function resolveHocPhiBctcLabel(
  lb: { ma: string; ten: string },
  ctx: HocPhiRevenueContext,
): { ma: string; ten: string } {
  const blob = tonelessVi(`${lb.ma} ${lb.ten}`);
  const unassigned =
    blob.includes("chua gan danh muc") || lb.ma === "—" || lb.ma === "?" || !lb.ten.trim();

  const goiTen = (ctx.goiTen ?? "").trim();
  const goiHinh = (ctx.goiHinhThuc ?? "").trim();
  const monHinh = (ctx.monHinhThuc ?? "").trim();
  const hinhThuc = goiHinh || monHinh;
  const mon = (ctx.monName ?? "").trim();
  const lop = (ctx.lopName ?? "").trim();

  if (unassigned) {
    const parts = [goiTen, mon, lop, hinhThuc].filter(Boolean);
    return {
      ma: lb.ma !== "—" && lb.ma !== "?" ? lb.ma : "HP",
      ten: parts.length > 0 ? parts.join(" · ") : lb.ten,
    };
  }

  const needsMon = !/\b(hh|hinh|ttm|trang tri|bcm|bo cuc|luyen thi)\b/.test(blob);
  const needsHinh = !/\b(onl|online|off|offline|tai lop|tai cho)\b/.test(blob);
  const extras: string[] = [];
  if (needsMon && mon) extras.push(mon);
  if (needsMon && lop && !mon) extras.push(lop);
  if (needsHinh && hinhThuc) extras.push(hinhThuc);
  if (needsHinh && lop && !hinhThuc) extras.push(lop);
  if (extras.length === 0) return lb;
  return { ma: lb.ma, ten: `${lb.ten} · ${extras.join(" · ")}` };
}

function buildHocPhiClassificationBlob(ctx: HocPhiRevenueContext, lb: { ma: string; ten: string }): string {
  const parts = [
    lb.ma,
    lb.ten,
    ctx.goiTen,
    ctx.monName,
    ctx.lopName,
    ctx.goiHinhThuc,
    ctx.monHinhThuc,
  ].filter((p) => (p ?? "").trim());
  let blob = tonelessVi(parts.join(" "));
  const loai = tonelessVi(ctx.monLoaiKhoaHoc ?? "");
  if (
    (loai.includes("lthi") || loai.includes("luyen thi")) &&
    !/\b(onl|online|truc tuyen|zoom)\b/.test(blob)
  ) {
    blob += " tai lop luyen thi";
  }
  const lopBlob = tonelessVi(ctx.lopName ?? "");
  if (
    lopBlob &&
    (lopBlob.includes("tai lop") ||
      lopBlob.includes("offline") ||
      lopBlob.includes("luyen thi") ||
      lopBlob.includes("trung tam") ||
      /\blt\b/.test(lopBlob))
  ) {
    blob += " tai lop offline luyen thi";
  }
  const hinhRaw = (ctx.goiHinhThuc ?? ctx.monHinhThuc ?? "").trim();
  if (hinhRaw && !isOnlineLikeHinhThucText(hinhRaw) && !/\b(off|offline|tai lop|tai cho)\b/.test(blob)) {
    blob += " tai lop offline";
  }
  return blob;
}

/** Phân bổ doanh thu một dòng học phí → cột dt*Online / dt*Offline. */
export function classifyHocPhiRevenueAllocations(
  ctx: HocPhiRevenueContext,
  lb: { ma: string; ten: string },
): AmountAllocation[] {
  const ma = tonelessVi(lb.ma);
  const blob = buildHocPhiClassificationBlob(ctx, lb);
  if (isHhBcmCombo(ctx, blob, ma)) {
    return allocateHhBcmCombo(blob);
  }
  if (isHinhHoaBlob(blob, ma)) return subjectOnlineOffline(blob, "dtHHOnline", "dtHHOffline");
  if (isTtmBlob(blob)) return subjectOnlineOffline(blob, "dtTTMOnline", "dtTTMOffline");
  if (isBcmBlob(blob)) return subjectOnlineOffline(blob, "dtBCMOnline", "dtBCMOffline");
  if (blob.includes("luyen thi")) {
    return subjectOnlineOffline(blob, "dtHHOnline", "dtHHOffline");
  }
  return subjectOnlineOffline(blob, "dtHHOnline", "dtHHOffline");
}

const REV_DISC_PREFIX = "rev:";

/** Mã hóa phân bổ vào `rowDiscriminator` của ma trận BCTC tự động. */
export function revenueAllocDiscriminator(allocs: AmountAllocation[]): string {
  const body = allocs
    .map((a) => `${a.colKey}@${Math.round(a.ratio * 10_000)}`)
    .join("+");
  return `${REV_DISC_PREFIX}${body}`;
}

export function parseRevenueAllocDiscriminator(rowKey: string): AmountAllocation[] | null {
  const idx = rowKey.lastIndexOf("__");
  if (idx < 0) return null;
  const disc = rowKey.slice(idx + 2);
  if (!disc.startsWith(REV_DISC_PREFIX)) return null;
  const body = disc.slice(REV_DISC_PREFIX.length);
  if (!body) return null;
  return body.split("+").map((part) => {
    const at = part.lastIndexOf("@");
    const colKey = at >= 0 ? part.slice(0, at) : part;
    const ratioRaw = at >= 0 ? Number(part.slice(at + 1)) : 10_000;
    return { colKey, ratio: ratioRaw / 10_000 };
  });
}

export function mapTuDongRowToRevenueAllocations(args: {
  ma: string;
  ten: string;
  loai: "thu" | "chi";
  source: string;
  key: string;
}): AmountAllocation[] | null {
  if (args.loai !== "thu") return null;
  const fromDisc = parseRevenueAllocDiscriminator(args.key);
  if (fromDisc) return fromDisc;

  const ma = tonelessVi(args.ma);
  const blob = tonelessVi(`${ma} ${args.ten}`).trim();

  if (args.source === "hoa_cu_ban") return [{ colKey: "dtHoaCu", ratio: 1 }];
  if (blob.includes("kids")) return [{ colKey: "dtKids", ratio: 1 }];
  if (blob.includes("background") || /\bbg\b/.test(blob)) return [{ colKey: "dtBackground", ratio: 1 }];
  if (blob.includes("hoa cu") || blob.includes("hoc cu") || blob.includes("marketplace")) {
    return [{ colKey: "dtHoaCu", ratio: 1 }];
  }
  if (blob.includes("dich vu") || blob.includes("dichvu")) return [{ colKey: "dtDichVu", ratio: 1 }];
  if (isHinhHoaBlob(blob, ma)) return subjectOnlineOffline(blob, "dtHHOnline", "dtHHOffline");
  if (isTtmBlob(blob)) return subjectOnlineOffline(blob, "dtTTMOnline", "dtTTMOffline");
  if (isBcmBlob(blob)) return subjectOnlineOffline(blob, "dtBCMOnline", "dtBCMOffline");
  if (args.source === "hoc_phi") {
    return classifyHocPhiRevenueAllocations(
      { ma: args.ma, ten: args.ten },
      { ma: args.ma, ten: args.ten },
    );
  }
  return [{ colKey: "dtDichVu", ratio: 1 }];
}
