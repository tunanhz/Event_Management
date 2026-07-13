import crypto from 'crypto';

// VNPAY's signature scheme: sort params by key, join as `key=value&...` with each value
// percent-encoded (spaces as '+', matching VNPAY's own sample code), then HMAC-SHA512 the
// resulting string with the merchant's hash secret. The exact same string-building has to
// happen both when creating a payment URL and when verifying a return/IPN callback, or the
// hash will never match.
function buildSignData(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
    .join('&');
}

export function signParams(params: Record<string, string>, hashSecret: string): string {
  const signData = buildSignData(params);
  return crypto.createHmac('sha512', hashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

export function buildPaymentUrl(
  baseUrl: string,
  params: Record<string, string>,
  hashSecret: string
): string {
  const secureHash = signParams(params, hashSecret);
  return `${baseUrl}?${buildSignData(params)}&vnp_SecureHash=${secureHash}`;
}

// Re-signs every param except the hash itself and compares. `query` values come from
// Express's parsed querystring, already URL-decoded once — re-encoding them here reproduces
// the same string VNPAY signed on their end.
export function verifySecureHash(
  query: Record<string, string>,
  hashSecret: string
): boolean {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
  if (!vnp_SecureHash) return false;
  const expected = signParams(rest, hashSecret);
  return expected.toLowerCase() === vnp_SecureHash.toLowerCase();
}

const ORDER_INFO_PREFIX = 'EVB_';

// vnp_OrderInfo is echoed back unchanged in both the return redirect and the IPN callback,
// so it doubles as the only place to carry "which registrations does this payment cover"
// through VNPAY and back — there's no VNPAY-side concept of a multi-line cart.
export function buildOrderInfo(registrationIds: string[]): string {
  return `${ORDER_INFO_PREFIX}${registrationIds.join('-')}`;
}

export function parseOrderInfo(orderInfo: string): string[] {
  if (!orderInfo.startsWith(ORDER_INFO_PREFIX)) return [];
  return orderInfo
    .slice(ORDER_INFO_PREFIX.length)
    .split('-')
    .filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
}

// yyyyMMddHHmmss in GMT+7 (VNPAY's required format/timezone for vnp_CreateDate), computed
// without a date library by shifting to UTC+7 and reading UTC fields.
export function formatVnpayDate(date: Date): string {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${shifted.getUTCFullYear()}${pad(shifted.getUTCMonth() + 1)}${pad(shifted.getUTCDate())}` +
    `${pad(shifted.getUTCHours())}${pad(shifted.getUTCMinutes())}${pad(shifted.getUTCSeconds())}`
  );
}
