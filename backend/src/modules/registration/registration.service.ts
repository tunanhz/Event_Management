import mongoose from 'mongoose';
import { RegistrationRepository, HOLD_DURATION_MINUTES } from './registration.repository';
import { IRegistration } from './registration.model';
import { IPayment } from './payment.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult, PaginationQuery } from '../../common/types';

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

  async getRegistrationById(id: string, participantId: string): Promise<IRegistration> {
    return this.getOwnedRegistration(id, participantId);
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
