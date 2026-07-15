import mongoose from 'mongoose';
import { CheckInRepository } from './check-in.repository';
import { ICheckIn } from './check-in.model';
import { StaffAssignmentRepository } from '../staff-assignment/staff-assignment.repository';
import { Registration } from '../registration/registration.model';
import { Payment } from '../registration/payment.model';
import { Ticket } from '../organizer/ticket.model';
import { User } from '../user/user.model';
import { AppError } from '../../common/utils/AppError';

export interface CheckInResult {
  status: 'SUCCESS' | 'DUPLICATE' | 'INVALID';
  checkIn?: ICheckIn;
  /** For DUPLICATE: the time it was originally checked in. */
  previousTime?: Date;
  /** Attendee name for the UI feedback. */
  attendeeName?: string;
  ticketType?: string;
}

export class CheckInService {
  private repo: CheckInRepository;
  private assignmentRepo: StaffAssignmentRepository;

  constructor() {
    this.repo = new CheckInRepository();
    this.assignmentRepo = new StaffAssignmentRepository();
  }

  /**
   * Core check-in logic: staff scans a ticket → validate → record.
   * Accepts registrationId directly.
   */
  async checkIn(staffId: string, eventId: string, registrationId: string): Promise<CheckInResult> {
    if (!mongoose.isValidObjectId(registrationId) || !mongoose.isValidObjectId(eventId)) {
      return { status: 'INVALID' };
    }

    // 1. Verify staff is assigned to this event
    const isAssigned = await this.assignmentRepo.isStaffAssignedToEvent(staffId, eventId);
    if (!isAssigned) {
      throw new AppError('Bạn không được phân công cho sự kiện này', 403);
    }

    // 2. Find the registration
    const registration = await Registration.findById(registrationId)
      .populate('participantId', 'fullName email')
      .populate('ticketId', 'ticketName');

    if (!registration) {
      return { status: 'INVALID' };
    }

    // 3. Verify registration belongs to this event
    if (String(registration.eventId) !== eventId) {
      return { status: 'INVALID' };
    }

    // 4. Verify registration is PAID
    if (registration.status !== 'PAID') {
      return { status: 'INVALID' };
    }

    // 5. Check for duplicate check-in
    const existing = await this.repo.findSuccessByRegistration(registrationId);
    if (existing) {
      const participant = registration.participantId as any;
      const ticket = registration.ticketId as any;
      return {
        status: 'DUPLICATE',
        previousTime: existing.checkInTime,
        attendeeName: participant?.fullName ?? 'Không xác định',
        ticketType: ticket?.ticketName ?? 'Không xác định',
      };
    }

    // 6. Create check-in record
    const checkInDoc = await this.repo.create({
      registrationId: new mongoose.Types.ObjectId(registrationId) as any,
      staffId: new mongoose.Types.ObjectId(staffId) as any,
      eventId: new mongoose.Types.ObjectId(eventId) as any,
      status: 'SUCCESS',
    });

    const participant = registration.participantId as any;
    const ticket = registration.ticketId as any;

    return {
      status: 'SUCCESS',
      checkIn: checkInDoc,
      attendeeName: participant?.fullName ?? 'Không xác định',
      ticketType: ticket?.ticketName ?? 'Không xác định',
    };
  }

  /**
   * Get attendees list for an event with check-in status.
   */
  async getAttendeesForEvent(staffId: string, eventId: string) {
    if (!mongoose.isValidObjectId(eventId)) {
      throw new AppError('eventId không hợp lệ', 400);
    }

    // Verify staff assignment
    const isAssigned = await this.assignmentRepo.isStaffAssignedToEvent(staffId, eventId);
    if (!isAssigned) {
      throw new AppError('Bạn không được phân công cho sự kiện này', 403);
    }

    // Get all PAID registrations for this event
    const registrations = await Registration.find({
      eventId,
      status: 'PAID',
    })
      .populate('participantId', 'fullName email phone')
      .populate('ticketId', 'ticketName price')
      .sort({ registerDate: 1 });

    // Get check-in status for each
    const checkedInIds = new Set(await this.repo.getCheckedInRegistrationIds(eventId));

    return registrations.map((reg) => {
      const participant = reg.participantId as any;
      const ticket = reg.ticketId as any;
      return {
        registrationId: String(reg._id),
        attendeeName: participant?.fullName ?? 'Không xác định',
        email: participant?.email ?? '',
        phone: participant?.phone ?? '',
        ticketType: ticket?.ticketName ?? 'Không xác định',
        ticketPrice: ticket?.price ?? 0,
        quantity: reg.quantity,
        checkedIn: checkedInIds.has(String(reg._id)),
      };
    });
  }

  /**
   * Check-in history for an event (recent admissions).
   */
  async getCheckInHistory(staffId: string, eventId: string) {
    if (!mongoose.isValidObjectId(eventId)) {
      throw new AppError('eventId không hợp lệ', 400);
    }

    const isAssigned = await this.assignmentRepo.isStaffAssignedToEvent(staffId, eventId);
    if (!isAssigned) {
      throw new AppError('Bạn không được phân công cho sự kiện này', 403);
    }

    const records = await this.repo.getHistoryByEvent(eventId, 50);

    // Enrich with attendee info
    const results = [];
    for (const record of records) {
      const reg = record.registrationId as any;
      let attendeeName = 'Không xác định';
      let ticketType = 'Không xác định';

      if (reg && reg.participantId) {
        const user = await User.findById(reg.participantId).select('fullName').lean();
        attendeeName = user?.fullName ?? attendeeName;
      }
      if (reg && reg.ticketId) {
        const ticket = await Ticket.findById(reg.ticketId).select('ticketName').lean();
        ticketType = ticket?.ticketName ?? ticketType;
      }

      const staff = record.staffId as any;
      results.push({
        checkInId: String(record._id),
        registrationId: reg ? String(reg._id ?? reg) : '',
        attendeeName,
        ticketType,
        staffName: staff?.fullName ?? 'Hệ thống',
        checkInTime: record.checkInTime,
      });
    }

    return results;
  }

  /**
   * Stats: total sold, checked-in, remaining, breakdown by ticket type.
   */
  async getCheckInStats(staffId: string, eventId: string) {
    if (!mongoose.isValidObjectId(eventId)) {
      throw new AppError('eventId không hợp lệ', 400);
    }

    const isAssigned = await this.assignmentRepo.isStaffAssignedToEvent(staffId, eventId);
    if (!isAssigned) {
      throw new AppError('Bạn không được phân công cho sự kiện này', 403);
    }

    // All PAID registrations for this event
    const registrations = await Registration.find({ eventId, status: 'PAID' })
      .populate('ticketId', 'ticketName')
      .lean();

    const checkedInIds = new Set(await this.repo.getCheckedInRegistrationIds(eventId));

    let totalTickets = 0;
    let checkedInCount = 0;
    const byType = new Map<string, { type: string; total: number; checkedIn: number }>();

    for (const reg of registrations) {
      const ticket = reg.ticketId as any;
      const typeName = ticket?.ticketName ?? 'Không xác định';
      const qty = reg.quantity;
      const isCheckedIn = checkedInIds.has(String(reg._id));

      totalTickets += qty;
      if (isCheckedIn) checkedInCount += qty;

      const row = byType.get(typeName) ?? { type: typeName, total: 0, checkedIn: 0 };
      row.total += qty;
      if (isCheckedIn) row.checkedIn += qty;
      byType.set(typeName, row);
    }

    return {
      total: totalTickets,
      checkedIn: checkedInCount,
      remaining: totalTickets - checkedInCount,
      percent: totalTickets ? Math.round((checkedInCount / totalTickets) * 100) : 0,
      byType: Array.from(byType.values()),
    };
  }

  /**
   * Sell tickets offline at the gate.
   * Decrements ticket stock, registers user/registration as PAID, records payment, and performs check-in.
   */
  async sellOffline(
    staffId: string,
    eventId: string,
    data: {
      ticketId: string;
      quantity: number;
      customerName: string;
      customerEmail?: string;
      customerPhone?: string;
    }
  ) {
    const { ticketId, quantity, customerName, customerEmail, customerPhone } = data;

    if (!ticketId || !quantity || !customerName?.trim()) {
      throw new AppError('ticketId, quantity, và customerName là bắt buộc', 400);
    }

    if (!mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(ticketId)) {
      throw new AppError('ID không hợp lệ', 400);
    }

    // 1. Verify staff assignment
    const isAssigned = await this.assignmentRepo.isStaffAssignedToEvent(staffId, eventId);
    if (!isAssigned) {
      throw new AppError('Bạn không được phân công cho sự kiện này', 403);
    }

    // 2. Atomically reserve ticket stock
    const ticket = await Ticket.findOneAndUpdate(
      {
        _id: ticketId,
        eventId,
        status: 'ACTIVE',
        $expr: { $gte: [{ $subtract: ['$quantity', '$soldQuantity'] }, quantity] },
      },
      { $inc: { soldQuantity: quantity } },
      { new: true }
    );

    if (!ticket) {
      throw new AppError('Vé không tồn tại, đã hết hoặc không mở bán', 400);
    }

    // 3. Find or create participant user
    let user;
    const email = customerEmail?.trim()?.toLowerCase() || `offline_${Date.now()}_${Math.floor(Math.random() * 1000)}@eventbox.vn`;
    
    user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        fullName: customerName.trim(),
        email,
        phone: customerPhone?.trim(),
        role: 'PARTICIPANT',
        accountStatus: 'ACTIVE',
      });
    }

    // 4. Create Registration
    const registration = await Registration.create({
      participantId: user._id,
      eventId: new mongoose.Types.ObjectId(eventId),
      ticketId: new mongoose.Types.ObjectId(ticketId),
      quantity,
      unitPrice: ticket.price,
      totalAmount: ticket.price * quantity,
      status: 'PAID',
      registerDate: new Date(),
    });

    // 5. Create Payment record
    const payment = await Payment.create({
      registrationId: registration._id,
      amount: registration.totalAmount,
      paymentMethod: 'OFFLINE',
      transactionCode: `OFFLINE-${registration._id}-${Date.now()}`,
      status: 'PAID',
      paymentDate: new Date(),
    });

    // 6. Automatically perform check-in
    const checkInDoc = await this.repo.create({
      registrationId: registration._id,
      staffId: new mongoose.Types.ObjectId(staffId) as any,
      eventId: new mongoose.Types.ObjectId(eventId) as any,
      status: 'SUCCESS',
    });

    return {
      status: 'SUCCESS',
      registration,
      payment,
      checkIn: checkInDoc,
      attendeeName: user.fullName,
      ticketType: ticket.ticketName,
    };
  }
}
