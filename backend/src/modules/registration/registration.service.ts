import mongoose from 'mongoose';
import { RegistrationRepository, HOLD_DURATION_MINUTES } from './registration.repository';
import { IRegistration } from './registration.model';
import { IPayment } from './payment.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult, PaginationQuery } from '../../common/types';
import { config } from '../../config';
import { buildPaymentUrl, buildOrderInfo, formatVnpayDate } from '../payment/vnpay.util';

export interface CreateRegistrationInput {
  eventId: string;
  ticketId: string;
  quantity: number;
}

export interface ConfirmPaymentResult {
  registration: IRegistration;
  payment: IPayment;
}

export class RegistrationService {
  private registrationRepository: RegistrationRepository;

  constructor() {
    this.registrationRepository = new RegistrationRepository();
  }

  // Places a 10-minute hold on `quantity` tickets: reserves stock immediately (so it can
  // never be oversold to a second buyer) and expects confirmPayment before the hold lapses.
  async createRegistration(
    participantId: string,
    input: CreateRegistrationInput
  ): Promise<IRegistration> {
    const { eventId, ticketId, quantity } = input;
    this.assertValidObjectIds(eventId, ticketId);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new AppError('Số lượng vé phải là số nguyên >= 1', 400);
    }

    // Sweep this event's stale holds first so their stock is back in the pool before we
    // check availability — otherwise an expired-but-unswept hold could wrongly block a
    // new attempt on the last remaining tickets.
    await this.releaseExpiredHolds();

    const event = await this.registrationRepository.findEventById(eventId);
    if (!event || event.status !== 'published') {
      throw new AppError('Sự kiện không tồn tại hoặc chưa mở bán', 404);
    }

    const ticket = await this.registrationRepository.findTicketById(ticketId);
    if (!ticket || ticket.eventId.toString() !== eventId) {
      throw new AppError('Loại vé không tồn tại', 404);
    }
    if (ticket.status !== 'ACTIVE') {
      throw new AppError('Loại vé này hiện không mở bán', 400);
    }
    const now = new Date();
    if (ticket.saleStart && now < ticket.saleStart) {
      throw new AppError('Chưa đến thời gian mở bán vé', 400);
    }
    if (ticket.saleEnd && now > ticket.saleEnd) {
      throw new AppError('Đã hết thời gian bán vé', 400);
    }

    const reserved = await this.registrationRepository.reserveTicketStock(ticketId, quantity);
    if (!reserved) {
      throw new AppError('Không đủ số lượng vé còn lại', 409);
    }

    const holdExpiresAt = new Date(now.getTime() + HOLD_DURATION_MINUTES * 60 * 1000);
    return this.registrationRepository.create({
      participantId: new mongoose.Types.ObjectId(participantId),
      eventId: new mongoose.Types.ObjectId(eventId),
      ticketId: new mongoose.Types.ObjectId(ticketId),
      quantity,
      unitPrice: ticket.price,
      totalAmount: ticket.price * quantity,
      registerDate: now,
      status: 'PENDING',
      holdExpiresAt,
    });
  }

  // Mock payment confirmation — no real gateway wired up yet (docs/business.md §8).
  // Turns a held registration into a paid one and records the (mock) payment; the ticket
  // stock was already decremented at hold time, so nothing further to reserve here.
  async confirmPayment(id: string, participantId: string): Promise<ConfirmPaymentResult> {
    const registration = await this.getOwnedRegistration(id, participantId);

    if (registration.status === 'PENDING' && this.isHoldExpired(registration)) {
      await this.expireHold(registration);
      throw new AppError('Đã hết thời gian giữ chỗ, vui lòng đặt vé lại', 410);
    }
    if (registration.status !== 'PENDING') {
      throw new AppError('Đăng ký này không ở trạng thái chờ thanh toán', 400);
    }

    registration.status = 'PAID';
    await registration.save();

    const payment = await this.registrationRepository.createPayment({
      registrationId: registration._id as mongoose.Types.ObjectId,
      amount: registration.totalAmount,
      paymentMethod: 'MOCK',
      transactionCode: `MOCK-${registration._id}-${Date.now()}`,
      status: 'PAID',
      paymentDate: new Date(),
    });

    return { registration, payment };
  }

  // Builds a VNPAY redirect URL covering one or more held registrations at once (the
  // ticket-selection UI lets a buyer hold several tiers in one checkout, but VNPAY only
  // knows about a single order/amount per payment — so all of them are paid together as one
  // transaction, and vnp_OrderInfo carries the id list back through VNPAY so the return/IPN
  // handlers know which registrations to mark PAID). Every id must belong to the caller and
  // still be an active, unexpired hold.
  async createVnpayPaymentUrl(
    registrationIds: string[],
    participantId: string,
    ipAddr: string
  ): Promise<string> {
    if (!config.vnpay.tmnCode || !config.vnpay.hashSecret) {
      throw new AppError('VNPAY chưa được cấu hình (thiếu VNPAY_TMN_CODE/VNPAY_HASH_SECRET)', 500);
    }
    if (!registrationIds.length) {
      throw new AppError('Không có đăng ký nào để thanh toán', 400);
    }

    let totalAmount = 0;
    for (const id of registrationIds) {
      const registration = await this.getOwnedRegistration(id, participantId);
      if (registration.status === 'PENDING' && this.isHoldExpired(registration)) {
        await this.expireHold(registration);
        throw new AppError('Đã hết thời gian giữ chỗ, vui lòng đặt vé lại', 410);
      }
      if (registration.status !== 'PENDING') {
        throw new AppError('Một trong các đăng ký không ở trạng thái chờ thanh toán', 400);
      }
      totalAmount += registration.totalAmount;
    }

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: config.vnpay.tmnCode,
      // VNPAY amounts are integers in VND x100 (no decimal places).
      vnp_Amount: String(Math.round(totalAmount * 100)),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: `EVB${Date.now()}${Math.floor(Math.random() * 1000)}`,
      vnp_OrderInfo: buildOrderInfo(registrationIds),
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: config.vnpay.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: formatVnpayDate(new Date()),
    };

    return buildPaymentUrl(config.vnpay.url, params, config.vnpay.hashSecret);
  }

  // Marks every registration in a VNPAY order as PAID and records one Payment row each.
  // Called from both the return-redirect and the IPN webhook, which can race or duplicate
  // (VNPAY retries IPN until it gets a 00 response) — markPaid's atomic PENDING->PAID guard
  // plus the unique transactionCode make re-running this for an already-settled order a
  // no-op that returns the existing rows instead of erroring or double-charging state.
  async finalizeVnpayPayment(
    registrationIds: string[],
    params: { transactionNo: string; amountVnd100: number; payDate?: Date }
  ): Promise<ConfirmPaymentResult[]> {
    const loaded: IRegistration[] = [];
    for (const id of registrationIds) {
      const registration = await this.registrationRepository.findById(id);
      if (!registration) throw new AppError(`Không tìm thấy đăng ký ${id}`, 404);
      loaded.push(registration);
    }

    const expectedAmount = Math.round(loaded.reduce((sum, r) => sum + r.totalAmount, 0) * 100);
    if (expectedAmount !== params.amountVnd100) {
      throw new AppError('Số tiền thanh toán không khớp', 400);
    }

    const results: ConfirmPaymentResult[] = [];
    for (const registration of loaded) {
      const id = (registration._id as mongoose.Types.ObjectId).toString();

      if (registration.status === 'PAID') {
        const existingPayment = await this.registrationRepository.findPaymentByRegistrationId(id);
        if (existingPayment) {
          results.push({ registration, payment: existingPayment });
          continue;
        }
      }

      const updated = await this.registrationRepository.markPaid(id);
      if (!updated) {
        // Hold expired/was cancelled after VNPAY had already captured the money for it —
        // can't silently sell an expired hold. Needs manual reconciliation/refund; surfaced
        // as an error so the caller can report it rather than pretend it succeeded.
        throw new AppError(`Đăng ký ${id} đã hết hạn hoặc bị hủy trước khi thanh toán hoàn tất`, 409);
      }

      const transactionCode = `${params.transactionNo}-${id}`;
      try {
        const payment = await this.registrationRepository.createPayment({
          registrationId: updated._id as mongoose.Types.ObjectId,
          amount: updated.totalAmount,
          paymentMethod: 'VNPAY',
          transactionCode,
          status: 'PAID',
          paymentDate: params.payDate ?? new Date(),
        });
        results.push({ registration: updated, payment });
      } catch (err: any) {
        if (err?.code === 11000) {
          const existingPayment = await this.registrationRepository.findPaymentByTransactionCode(
            transactionCode
          );
          if (existingPayment) {
            results.push({ registration: updated, payment: existingPayment });
            continue;
          }
        }
        throw err;
      }
    }

    return results;
  }

  // Self-service cancel: releases the reserved/sold stock back to the ticket pool.
  // Cancelling an already-PAID registration does not itself refund money — that's a
  // separate admin-driven Withdrawal/refund workflow, out of scope here.
  async cancelRegistration(id: string, participantId: string): Promise<IRegistration> {
    const registration = await this.getOwnedRegistration(id, participantId);

    if (registration.status !== 'PENDING' && registration.status !== 'PAID') {
      throw new AppError('Đăng ký này không thể hủy', 400);
    }

    await this.registrationRepository.releaseTicketStock(
      registration.ticketId.toString(),
      registration.quantity
    );
    registration.status = 'CANCELLED';
    await registration.save();
    return registration;
  }

  async getMyRegistrations(
    participantId: string,
    query: PaginationQuery
  ): Promise<PaginatedResult<IRegistration>> {
    await this.releaseExpiredHolds();
    return this.registrationRepository.findByParticipant(participantId, query);
  }

  // Read-only detail with event + ticket joined (payment page / ticket view).
  async getRegistrationById(id: string, participantId: string): Promise<IRegistration> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Không tìm thấy đăng ký', 404);
    }
    const registration = await this.registrationRepository.findByIdPopulated(id);
    if (!registration || registration.participantId.toString() !== participantId) {
      throw new AppError('Không tìm thấy đăng ký', 404);
    }
    return registration;
  }

  // 404 (not 403) for a registration that exists but belongs to someone else — same
  // privacy-preserving pattern as EventService.getEventById not distinguishing "missing"
  // from "not yours to see".
  private async getOwnedRegistration(id: string, participantId: string): Promise<IRegistration> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Không tìm thấy đăng ký', 404);
    }
    const registration = await this.registrationRepository.findById(id);
    if (!registration || registration.participantId.toString() !== participantId) {
      throw new AppError('Không tìm thấy đăng ký', 404);
    }
    return registration;
  }

  private isHoldExpired(registration: IRegistration): boolean {
    return !!registration.holdExpiresAt && registration.holdExpiresAt < new Date();
  }

  private async expireHold(registration: IRegistration): Promise<void> {
    await this.registrationRepository.releaseTicketStock(
      registration.ticketId.toString(),
      registration.quantity
    );
    registration.status = 'EXPIRED';
    await registration.save();
  }

  // Lazily sweeps timed-out holds instead of running a background job — called at the
  // two points where a stale hold would otherwise cause visible harm: before checking
  // availability for a new booking, and before listing "my registrations".
  private async releaseExpiredHolds(): Promise<void> {
    const expired = await this.registrationRepository.findExpiredPendingHolds();
    for (const registration of expired) {
      await this.expireHold(registration);
    }
  }

  private assertValidObjectIds(...ids: string[]): void {
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('ID không hợp lệ', 400);
      }
    }
  }
}
