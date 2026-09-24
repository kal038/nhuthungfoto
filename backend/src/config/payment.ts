export const ORDER_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I
export const ORDER_CODE_LENGTH = 7
export const PAYMENT_EXPIRY_MINUTES = 30

// VietQR placeholders (env later):
export const VIETQR = { bin: '...', accountNo: '...', accountName: '...' }

export const buildVietQrUrl = (amountVnd: number, addInfo: string): string =>
  `https://img.vietqr.io/image/${VIETQR.bin}-${VIETQR.accountNo}-compact2.png` +
  `?amount=${amountVnd}&addInfo=${encodeURIComponent(addInfo)}` +
  `&accountName=${encodeURIComponent(VIETQR.accountName)}`
