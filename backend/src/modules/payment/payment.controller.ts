import { Request, Response } from 'express';
import { RegistrationService } from '../registration/registration.service';
import { OrganizerService } from '../organizer/organizer.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AppError } from '../../common/utils/AppError';
import { AuthRequest } from '../../common/types';
import { config } from '../../config';
import {
  verifySecureHash,
  parseOrderInfo,
  parseEventDepositOrderInfo,
  parseEventRemainingOrderInfo,
  getClientIp,
} from './vnpay.util';

const registrationService = new RegistrationService();
const organizerService = new OrganizerService();

// VNPAY sends every param as a plain string — normalize the loosely-typed Express query
// object into Record<string,string> before signature verification.
function toStringRecord(query: Request['query']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

export class PaymentController {
  createVnpayUrl = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { registrationIds } = req.body as { registrationIds: string[] };
    const paymentUrl = await registrationService.createVnpayPaymentUrl(
      Array.isArray(registrationIds) ? registrationIds : [registrationIds].filter(Boolean),
      req.user!.id,
      getClientIp(req)
    );
    res.json(ApiResponse.ok({ paymentUrl }, 'Tạo liên kết thanh toán VNPAY thành công'));
  });

  // Figures out which of the three VNPAY flows (participant registration purchase,
  // organizer deposit, organizer remaining balance) an order's vnp_OrderInfo belongs to.
  // The prefixes are mutually exclusive (see vnpay.util.ts) so at most one branch matches.
  private classifyOrder(orderInfo: string) {
    const registrationIds = parseOrderInfo(orderInfo);
    if (registrationIds.length) return { kind: 'registration' as const, registrationIds };
    const depositEventId = parseEventDepositOrderInfo(orderInfo);
    if (depositEventId) return { kind: 'deposit' as const, eventId: depositEventId };
    const remainingEventId = parseEventRemainingOrderInfo(orderInfo);
    if (remainingEventId) return { kind: 'remaining' as const, eventId: remainingEventId };
    return { kind: 'unknown' as const };
  }

  // Browser-facing redirect target — VNPAY sends the buyer/organizer back here after the
  // sandbox payment page. Never throws to the generic JSON error handler: this is a 302 to
  // the frontend either way, with the outcome expressed as query params instead of a status
  // code. Organizer deposit/remaining orders land on a separate result page since they were
  // paid from the Organizer Center, not the ticket-purchase flow.
  vnpayReturn = asyncHandler(async (req: Request, res: Response) => {
    const query = toStringRecord(req.query);
    const order = this.classifyOrder(query.vnp_OrderInfo || '');
    const resultPage =
      order.kind === 'deposit' || order.kind === 'remaining'
        ? `${config.frontendUrl}/organizer/vnpay-return`
        : `${config.frontendUrl}/thanh-toan/vnpay-return`;

    try {
      if (!verifySecureHash(query, config.vnpay.hashSecret)) {
        return res.redirect(`${resultPage}?status=failed&message=${encodeURIComponent('Chữ ký không hợp lệ')}`);
      }

      if (order.kind === 'unknown') {
        return res.redirect(`${resultPage}?status=failed&message=${encodeURIComponent('Không xác định được đơn hàng')}`);
      }

      const responseCode = query.vnp_ResponseCode;
      const transactionStatus = query.vnp_TransactionStatus;
      if (responseCode !== '00' || transactionStatus !== '00') {
        return res.redirect(`${resultPage}?status=failed&message=${encodeURIComponent('Giao dịch không thành công hoặc đã bị hủy')}`);
      }

      const paymentMeta = {
        transactionNo: query.vnp_TransactionNo || query.vnp_TxnRef,
        amountVnd100: Number(query.vnp_Amount),
        payDate: parseVnpayDate(query.vnp_PayDate),
      };

      if (order.kind === 'registration') {
        await registrationService.finalizeVnpayPayment(order.registrationIds, paymentMeta);
      } else if (order.kind === 'deposit') {
        await organizerService.finalizeDepositVnpayPayment(order.eventId, paymentMeta);
      } else {
        await organizerService.finalizeRemainingVnpayPayment(order.eventId, paymentMeta);
      }

      return res.redirect(`${resultPage}?status=success`);
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Có lỗi xảy ra khi xác nhận thanh toán';
      return res.redirect(`${resultPage}?status=failed&message=${encodeURIComponent(message)}`);
    }
  });

  // Server-to-server webhook — VNPAY calls this directly (no browser involved) and expects
  // a specific `{RspCode, Message}` JSON shape back, retrying on anything other than "00".
  // This is the authoritative confirmation path; vnpayReturn above is only for UX since a
  // buyer/organizer can close their browser before the redirect completes.
  vnpayIpn = async (req: Request, res: Response): Promise<void> => {
    const query = toStringRecord(req.query);
    try {
      if (!verifySecureHash(query, config.vnpay.hashSecret)) {
        res.json({ RspCode: '97', Message: 'Invalid signature' });
        return;
      }

      const order = this.classifyOrder(query.vnp_OrderInfo || '');
      if (order.kind === 'unknown') {
        res.json({ RspCode: '01', Message: 'Order not found' });
        return;
      }

      if (query.vnp_ResponseCode !== '00' || query.vnp_TransactionStatus !== '00') {
        // Payment failed on VNPAY's side — acknowledge receipt, leave the underlying
        // registration/event state untouched so it can be retried within its window.
        res.json({ RspCode: '00', Message: 'Confirm Success' });
        return;
      }

      const paymentMeta = {
        transactionNo: query.vnp_TransactionNo || query.vnp_TxnRef,
        amountVnd100: Number(query.vnp_Amount),
        payDate: parseVnpayDate(query.vnp_PayDate),
      };

      if (order.kind === 'registration') {
        await registrationService.finalizeVnpayPayment(order.registrationIds, paymentMeta);
      } else if (order.kind === 'deposit') {
        await organizerService.finalizeDepositVnpayPayment(order.eventId, paymentMeta);
      } else {
        await organizerService.finalizeRemainingVnpayPayment(order.eventId, paymentMeta);
      }

      res.json({ RspCode: '00', Message: 'Confirm Success' });
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Unknown error';
      // 99 = generic/other error per VNPAY's IPN spec — anything unexpected here should make
      // VNPAY retry the IPN rather than silently drop it.
      res.json({ RspCode: '99', Message: message });
    }
  };
}

// vnp_PayDate is `yyyyMMddHHmmss` in GMT+7 — parsed back into a real Date (UTC internally).
function parseVnpayDate(value?: string): Date | undefined {
  if (!value || value.length !== 14) return undefined;
  const y = Number(value.slice(0, 4));
  const mo = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  const h = Number(value.slice(8, 10));
  const mi = Number(value.slice(10, 12));
  const s = Number(value.slice(12, 14));
  // Date.UTC with the GMT+7 wall-clock fields, then shift back 7h to get the true UTC instant.
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s) - 7 * 60 * 60 * 1000);
}
