import crypto from 'crypto';
import {
  signParams,
  buildPaymentUrl,
  verifySecureHash,
  buildOrderInfo,
  parseOrderInfo,
  formatVnpayDate,
} from '../../../modules/payment/vnpay.util';

describe('vnpay.util', () => {
  describe('signParams', () => {
    it('should produce a 128-char lowercase hex hash', () => {
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay' };
      const hashSecret = 'TESTHASHSECRET0123456789';
      const hash = signParams(params, hashSecret);

      expect(hash).toMatch(/^[0-9a-f]{128}$/);
    });

    it('should produce a deterministic hash for the same params', () => {
      const params = { key_a: 'value_a', key_b: 'value_b' };
      const hashSecret = 'secret';
      const hash1 = signParams(params, hashSecret);
      const hash2 = signParams(params, hashSecret);

      expect(hash1).toBe(hash2);
    });

    it('should sort params by key before hashing', () => {
      const params1 = { z: '1', a: '2', m: '3' };
      const params2 = { a: '2', m: '3', z: '1' };
      const hashSecret = 'secret';

      expect(signParams(params1, hashSecret)).toBe(signParams(params2, hashSecret));
    });

    it('should encode spaces as + not %20', () => {
      const params = { key: 'hello world' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      // Manually compute the expected hash to verify the encoding
      const signData = 'key=hello+world';
      const expectedHash = crypto
        .createHmac('sha512', hashSecret)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

      expect(hash).toBe(expectedHash);
    });

    it('should handle Vietnamese diacritics', () => {
      const params = { vnp_OrderInfo: 'Tạo liên kết thanh toán thành công' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      expect(hash).toMatch(/^[0-9a-f]{128}$/);
    });

    it('should handle empty params object', () => {
      const params = {};
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      // Manually compute expected hash for empty string
      const expectedHash = crypto.createHmac('sha512', hashSecret).update(Buffer.from('', 'utf-8')).digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('should produce different hashes for different secrets', () => {
      const params = { key: 'value' };
      const hash1 = signParams(params, 'secret1');
      const hash2 = signParams(params, 'secret2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters and percent-encode them', () => {
      const params = { key: 'value&other=test' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      expect(hash).toMatch(/^[0-9a-f]{128}$/);
    });

    it('should produce different hashes for changed param values', () => {
      const params1 = { key: 'value1' };
      const params2 = { key: 'value2' };
      const hashSecret = 'secret';

      expect(signParams(params1, hashSecret)).not.toBe(signParams(params2, hashSecret));
    });

    it('should handle numeric-looking string values', () => {
      const params = { amount: '1000000', count: '5' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      expect(hash).toMatch(/^[0-9a-f]{128}$/);
    });
  });

  describe('buildPaymentUrl', () => {
    it('should start with the base URL and ?', () => {
      const baseUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay' };
      const hashSecret = 'TESTHASHSECRET0123456789';
      const url = buildPaymentUrl(baseUrl, params, hashSecret);

      expect(url).toMatch(/^https:\/\/sandbox\.vnpayment\.vn\/paymentv2\/vpcpay\.html\?/);
    });

    it('should contain all params in the query string', () => {
      const baseUrl = 'https://example.com';
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: 'TESTTMN01' };
      const hashSecret = 'secret';
      const url = buildPaymentUrl(baseUrl, params, hashSecret);

      expect(url).toContain('vnp_Version=2.1.0');
      expect(url).toContain('vnp_Command=pay');
      expect(url).toContain('vnp_TmnCode=TESTTMN01');
    });

    it('should end with vnp_SecureHash=<hash>', () => {
      const baseUrl = 'https://example.com';
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay' };
      const hashSecret = 'secret';
      const url = buildPaymentUrl(baseUrl, params, hashSecret);

      expect(url).toMatch(/&vnp_SecureHash=[0-9a-f]{128}$/);
    });

    it('should have embedded hash equal to signParams result', () => {
      const baseUrl = 'https://example.com';
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay' };
      const hashSecret = 'secret';
      const url = buildPaymentUrl(baseUrl, params, hashSecret);

      const expectedHash = signParams(params, hashSecret);
      expect(url).toContain(`vnp_SecureHash=${expectedHash}`);
    });

    it('should sort query params', () => {
      const baseUrl = 'https://example.com';
      const params = { z_param: 'z', a_param: 'a', m_param: 'm' };
      const hashSecret = 'secret';
      const url = buildPaymentUrl(baseUrl, params, hashSecret);

      const queryPart = url.split('?')[1].split('&vnp_SecureHash=')[0];
      const paramOrder = queryPart.split('&').map((p) => p.split('=')[0]);

      // All sorted params should appear in order before the hash
      const sortedKeys = Object.keys(params).sort();
      sortedKeys.forEach((key, idx) => {
        expect(paramOrder[idx]).toBe(key);
      });
    });

    it('should handle empty params object', () => {
      const baseUrl = 'https://example.com';
      const params = {};
      const hashSecret = 'secret';
      const url = buildPaymentUrl(baseUrl, params, hashSecret);

      const expectedHash = signParams(params, hashSecret);
      expect(url).toBe(`${baseUrl}?&vnp_SecureHash=${expectedHash}`);
    });
  });

  describe('verifySecureHash', () => {
    it('should return true for a valid signature', () => {
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: 'TESTTMN01' };
      const hashSecret = 'TESTHASHSECRET0123456789';
      const hash = signParams(params, hashSecret);

      const query = { ...params, vnp_SecureHash: hash };
      expect(verifySecureHash(query, hashSecret)).toBe(true);
    });

    it('should return false if vnp_SecureHash is missing', () => {
      const query = { vnp_Version: '2.1.0', vnp_Command: 'pay' };
      expect(verifySecureHash(query, 'secret')).toBe(false);
    });

    it('should return false if hash is tampered (param value changed)', () => {
      const params = { vnp_Version: '2.1.0', vnp_Amount: '1000000' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      const query = { vnp_Version: '2.1.0', vnp_Amount: '2000000', vnp_SecureHash: hash };
      expect(verifySecureHash(query, hashSecret)).toBe(false);
    });

    it('should return false if hash is tampered (param added)', () => {
      const params = { vnp_Version: '2.1.0' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      const query = { vnp_Version: '2.1.0', vnp_Extra: 'added', vnp_SecureHash: hash };
      expect(verifySecureHash(query, hashSecret)).toBe(false);
    });

    it('should return false if hash is tampered (param removed)', () => {
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: 'TESTTMN01' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      const query = { vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_SecureHash: hash };
      expect(verifySecureHash(query, hashSecret)).toBe(false);
    });

    it('should ignore vnp_SecureHashType when verifying', () => {
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      const query = { vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_SecureHash: hash, vnp_SecureHashType: 'SHA512' };
      expect(verifySecureHash(query, hashSecret)).toBe(true);
    });

    it('should return false with wrong secret', () => {
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay' };
      const hashSecret = 'secret1';
      const hash = signParams(params, hashSecret);

      const query = { vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_SecureHash: hash };
      expect(verifySecureHash(query, 'secret2')).toBe(false);
    });

    it('should be case-insensitive for hash comparison', () => {
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);

      const query = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_SecureHash: hash.toUpperCase(),
      };
      expect(verifySecureHash(query, hashSecret)).toBe(true);
    });

    it('should handle mixed-case hash with lowercase params', () => {
      const params = { vnp_Version: '2.1.0', vnp_Command: 'pay' };
      const hashSecret = 'secret';
      const hash = signParams(params, hashSecret);
      const mixedCaseHash = hash.substring(0, 50).toUpperCase() + hash.substring(50);

      const query = { vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_SecureHash: mixedCaseHash };
      expect(verifySecureHash(query, hashSecret)).toBe(true);
    });
  });

  describe('buildOrderInfo', () => {
    it('should start with EVB_ prefix', () => {
      const ids = ['507f1f77bcf86cd799439011'];
      const orderInfo = buildOrderInfo(ids);

      expect(orderInfo).toMatch(/^EVB_/);
    });

    it('should join ids with -', () => {
      const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const orderInfo = buildOrderInfo(ids);

      expect(orderInfo).toBe('EVB_507f1f77bcf86cd799439011-507f1f77bcf86cd799439012');
    });

    it('should handle a single id', () => {
      const ids = ['507f1f77bcf86cd799439011'];
      const orderInfo = buildOrderInfo(ids);

      expect(orderInfo).toBe('EVB_507f1f77bcf86cd799439011');
    });

    it('should handle multiple ids', () => {
      const ids = [
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
      ];
      const orderInfo = buildOrderInfo(ids);

      expect(orderInfo).toBe('EVB_507f1f77bcf86cd799439011-507f1f77bcf86cd799439012-507f1f77bcf86cd799439013');
    });

    it('should handle an empty array', () => {
      const ids: string[] = [];
      const orderInfo = buildOrderInfo(ids);

      expect(orderInfo).toBe('EVB_');
    });
  });

  describe('parseOrderInfo', () => {
    it('should extract ids from a valid order info', () => {
      const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const orderInfo = buildOrderInfo(ids);
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual(ids);
    });

    it('should return empty array if no EVB_ prefix', () => {
      const orderInfo = 'INVALID_507f1f77bcf86cd799439011';
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual([]);
    });

    it('should handle a single valid id', () => {
      const orderInfo = 'EVB_507f1f77bcf86cd799439011';
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual(['507f1f77bcf86cd799439011']);
    });

    it('should filter out non-24-hex segments', () => {
      const orderInfo = 'EVB_507f1f77bcf86cd799439011-invalid-507f1f77bcf86cd799439012';
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual(['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']);
    });

    it('should handle empty segments after EVB_', () => {
      const orderInfo = 'EVB_';
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual([]);
    });

    it('should validate hex digits (case-insensitive)', () => {
      const orderInfo = 'EVB_507f1f77bcf86cd799439011-507F1F77BCF86CD799439012';
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual(['507f1f77bcf86cd799439011', '507F1F77BCF86CD799439012']);
    });

    it('should reject segments shorter than 24 chars', () => {
      const orderInfo = 'EVB_507f1f77bcf86cd79943901-507f1f77bcf86cd799439012';
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual(['507f1f77bcf86cd799439012']);
    });

    it('should reject segments longer than 24 chars', () => {
      const orderInfo = 'EVB_507f1f77bcf86cd7994390111-507f1f77bcf86cd799439012';
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual(['507f1f77bcf86cd799439012']);
    });

    it('should reject segments with non-hex characters', () => {
      const orderInfo = 'EVB_507f1f77bcfG6cd799439011-507f1f77bcf86cd799439012';
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual(['507f1f77bcf86cd799439012']);
    });

    it('should be a round-trip with buildOrderInfo', () => {
      const originalIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
      const orderInfo = buildOrderInfo(originalIds);
      const parsed = parseOrderInfo(orderInfo);

      expect(parsed).toEqual(originalIds);
    });
  });

  describe('formatVnpayDate', () => {
    it('should return exactly 14 digits', () => {
      const date = new Date('2024-01-15T08:30:45Z');
      const formatted = formatVnpayDate(date);

      expect(formatted).toMatch(/^\d{14}$/);
    });

    it('should format as yyyyMMddHHmmss', () => {
      const date = new Date('2024-01-15T08:30:45Z');
      const formatted = formatVnpayDate(date);

      expect(formatted).toMatch(/^\d{14}$/);
      expect(formatted.substring(0, 4)).toBe('2024');
    });

    it('should shift to GMT+7', () => {
      // 2024-01-15T01:00:00 UTC => 2024-01-15T08:00:00 GMT+7
      const utcDate = new Date(Date.UTC(2024, 0, 15, 1, 0, 0));
      const formatted = formatVnpayDate(utcDate);

      expect(formatted).toBe('20240115080000');
    });

    it('should handle date boundary crossing to next day in GMT+7', () => {
      // 2024-01-14T23:00:00 UTC => 2024-01-15T06:00:00 GMT+7 (same day)
      // 2024-01-15T17:00:00 UTC => 2024-01-16T00:00:00 GMT+7 (next day)
      const utcDate = new Date(Date.UTC(2024, 0, 15, 17, 0, 0));
      const formatted = formatVnpayDate(utcDate);

      expect(formatted).toBe('20240116000000');
    });

    it('should handle month boundary crossing', () => {
      // 2024-01-31T23:59:59 UTC => 2024-02-01T06:59:59 GMT+7 (next month)
      const utcDate = new Date(Date.UTC(2024, 0, 31, 18, 0, 0));
      const formatted = formatVnpayDate(utcDate);

      expect(formatted).toMatch(/^202402/);
    });

    it('should zero-pad single-digit month, day, hour, minute, second', () => {
      const utcDate = new Date(Date.UTC(2024, 0, 1, 1, 0, 0));
      const formatted = formatVnpayDate(utcDate);

      expect(formatted).toBe('20240101080000');
    });

    it('should handle seconds correctly', () => {
      const utcDate = new Date(Date.UTC(2024, 0, 15, 0, 0, 5));
      const formatted = formatVnpayDate(utcDate);

      expect(formatted).toMatch(/05$/);
    });

    it('should handle minutes correctly', () => {
      const utcDate = new Date(Date.UTC(2024, 0, 15, 0, 5, 0));
      const formatted = formatVnpayDate(utcDate);

      expect(formatted).toBe('20240115070500');
    });

    it('should handle hours correctly', () => {
      const utcDate = new Date(Date.UTC(2024, 0, 15, 5, 0, 0));
      const formatted = formatVnpayDate(utcDate);

      expect(formatted).toMatch(/120000$/);
    });

    it('should be consistent across multiple calls', () => {
      const date = new Date('2024-01-15T08:30:45Z');
      const formatted1 = formatVnpayDate(date);
      const formatted2 = formatVnpayDate(date);

      expect(formatted1).toBe(formatted2);
    });
  });
});
