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

export type QrPaymentResolution = {
  qrAmountDong: number;
};

/** Số tiền trên QR = tổng đơn (làm tròn). */
export function resolveQrPaymentAmounts(
  _transferCode: string,
  invoiceTotalDong: number
): QrPaymentResolution {
  return { qrAmountDong: Math.max(0, Math.round(invoiceTotalDong)) };
}
