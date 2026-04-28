/**
 * VietQR (TPBank) — STK luân phiên theo `donId` chẵn/lẻ; chủ TK khớp đăng ký VietQR.
 * `addInfo` = mã ngắn (SA…) — VietQR giới hạn độ dài; n8n regex `/SA\d+/`
 */
export const TPBANK_VIETQR_ACCOUNTS = [
  { stk: "00375554360", accountName: "DO NGOC LINH" },
  { stk: "00346412458", accountName: "PHAM KIM UYEN" },
] as const;

export function getTpBankQrRecipient(
  donId: number | null | undefined
): { stk: string; accountName: string } {
  const n = Math.abs(Math.trunc(donId ?? 0));
  const acc = TPBANK_VIETQR_ACCOUNTS[n % TPBANK_VIETQR_ACCOUNTS.length];
  return { stk: acc.stk, accountName: acc.accountName };
}

/** @deprecated Dùng `getTpBankQrRecipient` khi cần cả tên chủ TK. */
export function getTpBankStkByDonId(donId: number | null | undefined): string {
  return getTpBankQrRecipient(donId).stk;
}

/**
 * URL ảnh QR từ img.vietqr.io (không cần API key).
 * @param maDonSo — ví dụ `SA123456` (nội dung CK)
 * @param amountDong — số tiền VND, số nguyên
 * @param donId — id đơn `hp_don_thu_hoc_phi` để chọn STK; null/undefined → coi như 0
 */
export function buildVietQrImageUrl(
  maDonSo: string,
  amountDong: number,
  donId: number | null | undefined
): string {
  const { stk, accountName } = getTpBankQrRecipient(donId);
  const amount = Math.max(0, Math.round(amountDong));
  const addInfo = maDonSo.trim();
  return `https://img.vietqr.io/image/TPB-${stk}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;
}

/** Khi chưa có đơn DB: tạo số ổn định từ chuỗi để chọn STK giống parity `donId % 2`. */
export function pseudoDonIdFromSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

const TEST_QR_MIN_DONG = 2000;
const TEST_QR_MAX_DONG = 2300;
const TEST_QR_SPAN = TEST_QR_MAX_DONG - TEST_QR_MIN_DONG + 1;

/**
 * VietQR «micro test» (2.000–2.300 ₫ theo mã SA…) — **chỉ bật khi khai báo env**.
 *
 * - Mặc định **tắt** (dev & production): QR luôn dùng đúng `invoiceTotalDong`.
 * - Bật cố ý để thử CK nhỏ: `NEXT_PUBLIC_DHP_TEST_MICRO_QR=1`.
 * - SePay khớp **mã trong nội dung CK** (`SA……`), không so `transfer_amount` với tổng đơn.
 */
export function isDhpTestMicroQrEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_DHP_TEST_MICRO_QR?.trim().toLowerCase();
  return v === "1" || v === "true";
}

/** Số tiền CK trên QR khi test: 2000–2300 ₫, cố định theo mã SA… */
export function testMicroQrAmountDongFromSeed(seed: string): number {
  const h = pseudoDonIdFromSeed(seed);
  return TEST_QR_MIN_DONG + (h % TEST_QR_SPAN);
}

export type QrPaymentResolution = {
  /** Số ghi trên VietQR / app CK */
  qrAmountDong: number;
  isTestMicro: boolean;
  /** invoice − qr (chỉ mang tính hiển thị khi test) */
  impliedTestDiscountDong: number;
};

/**
 * `invoiceTotalDong` = tổng đơn thật. Khi test micro: QR chỉ 2000–2300 ₫.
 */
export function resolveQrPaymentAmounts(
  transferCode: string,
  invoiceTotalDong: number
): QrPaymentResolution {
  const inv = Math.max(0, Math.round(invoiceTotalDong));
  if (!isDhpTestMicroQrEnabled()) {
    return {
      qrAmountDong: inv,
      isTestMicro: false,
      impliedTestDiscountDong: 0,
    };
  }
  if (inv <= 0) {
    return {
      qrAmountDong: 0,
      isTestMicro: true,
      impliedTestDiscountDong: 0,
    };
  }
  const micro = testMicroQrAmountDongFromSeed(transferCode);
  return {
    qrAmountDong: micro,
    isTestMicro: true,
    impliedTestDiscountDong: Math.max(0, inv - micro),
  };
}
