import { randomBytes } from 'crypto';
import { Registration, IRegistration, RegistrationStatus } from './registration.model';
import { Payment, IPayment } from './payment.model';
import { Ticket, ITicket } from '../organizer/ticket.model';
import { Event, IEvent } from '../event/event.model';
import { Notification, INotification } from '../notification/notification.model';
import { PaginationQuery, PaginatedResult } from '../../common/types';

export const HOLD_DURATION_MINUTES = 10;

export class RegistrationRepository {
  async findEventById(eventId: string): Promise<IEvent | null> {
    return Event.findById(eventId).lean();
  }

  async findTicketById(ticketId: string): Promise<ITicket | null> {
    return Ticket.findById(ticketId);
  }

  // Atomically reserve stock: only succeeds if enough unsold quantity remains, so two
  // concurrent holds racing for the last few tickets can never both succeed (oversell).
  async reserveTicketStock(ticketId: string, quantity: number): Promise<ITicket | null> {
    return Ticket.findOneAndUpdate(
      {
        _id: ticketId,
        status: 'ACTIVE',
        $expr: { $gte: [{ $subtract: ['$quantity', '$soldQuantity'] }, quantity] },
      },
      { $inc: { soldQuantity: quantity } },
      { new: true }
    );
  }

  // Releases a hold that was cancelled or expired without payment.
  async releaseTicketStock(ticketId: string, quantity: number): Promise<void> {
    await Ticket.updateOne({ _id: ticketId }, { $inc: { soldQuantity: -quantity } });
  }

  async create(data: Partial<IRegistration>): Promise<IRegistration> {
    const registration = new Registration(data);
    return registration.save();
  }

  // Not .lean() — callers mutate status and call .save() (confirm/cancel/expire).
  async findById(id: string): Promise<IRegistration | null> {
    return Registration.findById(id);
  }

  // Event + ticket joined for display (payment page, ticket detail). Lean —
  // read-only, so mutating flows keep using findById above.
  async findByIdPopulated(id: string): Promise<IRegistration | null> {
    return Registration.findById(id)
      .populate('eventId', 'title imageUrl banner date time location startDate endDate shows city')
      .populate('ticketId', 'ticketName price showId')
      .lean();
  }

  async findByParticipant(
    participantId: string,
    query: PaginationQuery
  ): Promise<PaginatedResult<IRegistration>> {
    const { page = 1, limit = 10 } = query;
    const filter = { participantId };
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      Registration.find(filter)
        .populate('eventId', 'title imageUrl banner date time location startDate endDate shows city')
        .populate('ticketId', 'ticketName price showId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Registration.countDocuments(filter),
    ]);

    return {
      data: data as IRegistration[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  // Holds that timed out without payment confirmation — swept lazily by the service.
  async findExpiredPendingHolds(): Promise<IRegistration[]> {
    return Registration.find({ status: 'PENDING' as RegistrationStatus, holdExpiresAt: { $lte: new Date() } });
  }

  async createPayment(data: Partial<IPayment>): Promise<IPayment> {
    const payment = new Payment(data);
    return payment.save();
  }

  async findPaymentByRegistrationId(registrationId: string): Promise<IPayment | null> {
    return Payment.findOne({ registrationId }).sort({ createdAt: -1 });
  }

  async findPaymentByTransactionCode(transactionCode: string): Promise<IPayment | null> {
    return Payment.findOne({ transactionCode });
  }

  // Atomic PENDING -> PAID transition so a racing return-redirect and IPN callback (VNPAY
  // fires both for the same order) can never both "win" and double-process a payment.
  // Assigns a unique ticketCode on first successful transition (used for staff QR check-in).
  async markPaid(id: string): Promise<IRegistration | null> {
    const ticketCode = `EVB-${id.slice(-6).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    return Registration.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      { status: 'PAID', ticketCode },
      { new: true }
    );
  }

  async createNotification(data: Partial<INotification>): Promise<INotification> {
    const notification = new Notification(data);
    return notification.save();
  }
}
