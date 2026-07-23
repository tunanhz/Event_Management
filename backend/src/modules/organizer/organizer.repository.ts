import mongoose from 'mongoose';
import { Event, IEvent } from '../event/event.model';
import { Ticket, ITicket } from './ticket.model';
import { Registration, IRegistration } from '../registration/registration.model';
import { CheckIn, ICheckIn } from '../registration/checkin.model';
// Unified with the staff module's assignment model (develop) — one 'StaffAssignment'
// Mongoose model across the app; the organizer side only reads it here.
import { StaffAssignment, IStaffAssignment } from '../staff/assignment.model';
import { Withdrawal, IWithdrawal } from './withdrawal.model';
import { RevenueReport, IRevenueReport } from './revenue-report.model';
import { PaginationQuery, PaginatedResult } from '../../common/types';

export interface OrganizerEventQuery extends PaginationQuery {
  reviewStatus?: string;
}

export interface EventRegistrationQuery extends PaginationQuery {
  status?: string;
  /** Restrict to registrations whose ticket belongs to one show (suất diễn).
   *  An empty array means "match nothing" (a show with no tickets yet). */
  ticketIds?: string[];
}

/**
 * `.lean()` returns the raw stored document and skips Mongoose's normal
 * default-value hydration — so a report saved before `ticketBreakdown`
 * existed on the schema comes back with the key missing (`undefined`), not
 * `[]`. Every read path funnels through here so callers can always safely
 * call `.length`/`.map()` on it, matching the (non-optional) IRevenueReport
 * type.
 */
function withTicketBreakdownDefault(report: IRevenueReport): IRevenueReport {
  // .lean() results are plain objects, not real Documents (same "trusted as
  // IRevenueReport for its data shape" convention as every other .lean()
  // call in this file) — the cast is only needed here because spreading
  // into a fresh object literal forces TS to structurally recheck it.
  return report.ticketBreakdown
    ? report
    : ({ ...report, ticketBreakdown: [] } as unknown as IRevenueReport);
}

export class OrganizerRepository {
  async createEvent(data: Partial<IEvent>): Promise<IEvent> {
    const event = new Event(data);
    return event.save();
  }

  async findEventById(id: string): Promise<IEvent | null> {
    return Event.findById(id);
  }

  async findEventByIdPopulated(id: string): Promise<IEvent | null> {
    return Event.findById(id)
      .populate('categoryId', 'name slug icon')
      .populate('creatorId', 'fullName email avatar')
      .lean();
  }

  async findEventsByCreator(
    creatorId: string,
    query: OrganizerEventQuery
  ): Promise<PaginatedResult<IEvent>> {
    const { page = 1, limit = 10, reviewStatus } = query;
    const filter: Record<string, any> = { creatorId };
    if (reviewStatus) filter.reviewStatus = reviewStatus;

    const skip = (page - 1) * limit;
    const [data, totalItems] = await Promise.all([
      Event.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Event.countDocuments(filter),
    ]);

    return {
      data: data as IEvent[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  /**
   * DRAFT/REJECTED → PENDING_REVIEW. Atomic on reviewStatus so a concurrent
   * admin decision can't be overwritten; clears the previous rejection reason
   * when an organizer resubmits a corrected event.
   */
  async submitEventForReview(id: string): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      { _id: id, reviewStatus: { $in: ['DRAFT', 'REJECTED'] } },
      { $set: { reviewStatus: 'PENDING_REVIEW' }, $unset: { rejectionReason: '' } },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Apply organizer edits only while the event is still organizer-editable
   * (DRAFT/REJECTED). Atomic on reviewStatus so an edit racing a concurrent
   * submit or admin decision can't mutate an event already locked in review.
   */
  async updateEditableEvent(id: string, data: Partial<IEvent>): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      { _id: id, reviewStatus: { $in: ['DRAFT', 'REJECTED'] } },
      data,
      { new: true, runValidators: true }
    ).lean();
  }

  async deleteEvent(id: string): Promise<void> {
    await Event.findByIdAndDelete(id);
  }

  /** Custom-slug uniqueness check; excludeEventId skips the event being edited. */
  async slugExists(slug: string, excludeEventId?: string): Promise<boolean> {
    const filter: Record<string, any> = { slug };
    if (excludeEventId) filter._id = { $ne: excludeEventId };
    return (await Event.exists(filter)) !== null;
  }

  /** How many ticket types still reference any of the given shows. */
  async countTicketsByShowIds(
    eventId: string,
    showIds: mongoose.Types.ObjectId[]
  ): Promise<number> {
    return Ticket.countDocuments({ eventId, showId: { $in: showIds } });
  }

  /** Tiers created via the legacy flat payload (not attached to any show). */
  async countTicketsWithoutShow(eventId: string): Promise<number> {
    return Ticket.countDocuments({ eventId, showId: { $exists: false } });
  }

  /** Drop showId from every ticket of an event — used when a direct
   *  startDate/endDate edit collapses the event's per-show schedule back to
   *  a single flat time range, so no ticket is left pointing at a show that
   *  no longer exists. */
  async clearTicketShowIds(eventId: string): Promise<void> {
    await Ticket.updateMany({ eventId }, { $unset: { showId: '' } });
  }

  async createTicket(data: Partial<ITicket>): Promise<ITicket> {
    const ticket = new Ticket(data);
    return ticket.save();
  }

  async findTicketById(ticketId: string): Promise<ITicket | null> {
    return Ticket.findById(ticketId);
  }

  async findTicketsByEvent(eventId: string): Promise<ITicket[]> {
    return Ticket.find({ eventId }).sort({ createdAt: 1 }).lean();
  }

  async countTicketsByEvent(eventId: string): Promise<number> {
    return Ticket.countDocuments({ eventId });
  }

  async updateTicket(ticketId: string, data: Partial<ITicket>): Promise<ITicket | null> {
    return Ticket.findByIdAndUpdate(ticketId, data, { new: true, runValidators: true }).lean();
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await Ticket.findByIdAndDelete(ticketId);
  }

  /**
   * Sold (PAID) vs currently-held (PENDING, not-yet-expired) quantity per
   * ticket — the breakdown behind Ticket.soldQuantity (which already counts
   * both combined; see registration.repository.ts reserveTicketStock). Used
   * for the organizer-facing inventory view (EM-132); stale expired-but-
   * unswept holds are excluded from `held` since they're already back in the
   * available pool from the buyer's perspective.
   */
  async sumRegistrationsByTicket(
    ticketIds: string[]
  ): Promise<Map<string, { sold: number; held: number }>> {
    const ids = ticketIds.map((id) => new mongoose.Types.ObjectId(id));
    const rows = await Registration.aggregate([
      {
        $match: {
          ticketId: { $in: ids },
          $or: [{ status: 'PAID' }, { status: 'PENDING', holdExpiresAt: { $gt: new Date() } }],
        },
      },
      { $group: { _id: { ticketId: '$ticketId', status: '$status' }, qty: { $sum: '$quantity' } } },
    ]);

    const result = new Map<string, { sold: number; held: number }>();
    for (const row of rows) {
      const ticketId = String(row._id.ticketId);
      const entry = result.get(ticketId) ?? { sold: 0, held: 0 };
      if (row._id.status === 'PAID') entry.sold = row.qty;
      else entry.held = row.qty;
      result.set(ticketId, entry);
    }
    return result;
  }

  /**
   * APPROVED_WAITING_DEPOSIT → PUBLISHED: marks deposit as paid and publishes
   * the event so it appears on the public site.
   */
  async payDeposit(id: string): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      { _id: id, reviewStatus: 'APPROVED_WAITING_DEPOSIT', depositStatus: 'UNPAID' },
      {
        $set: {
          depositStatus: 'PAID',
          reviewStatus: 'PUBLISHED',
          status: 'published',
        },
      },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Mark the final payment as paid and update finalPaymentAmount if needed.
   * Guards against `finalPaymentStatus` already PAID so a racing VNPAY return-redirect
   * and IPN callback (VNPAY fires both for the same order) can never double-process it.
   */
  async payRemaining(id: string, amount?: number): Promise<IEvent | null> {
    const updateObj: Record<string, any> = { finalPaymentStatus: 'PAID' };
    if (typeof amount === 'number' && amount > 0) {
      updateObj.finalPaymentAmount = amount;
    }
    return Event.findOneAndUpdate(
      { _id: id, finalPaymentStatus: { $ne: 'PAID' } },
      { $set: updateObj },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Cancel an event by organizer.
   */
  async cancelEvent(id: string, reason: string): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          status: 'cancelled',
          rejectionReason: reason,
        },
      },
      { new: true, runValidators: true }
    ).lean();
  }

  // ─── Attendee / order listing (organizer workspace "Đơn hàng") ────────

  /**
   * Paginated registrations for one event with buyer + ticket joined.
   * PENDING (active checkout holds) are excluded by default — they are not
   * attendees yet; pass an explicit `status` to inspect a single state.
   */
  async findRegistrationsByEvent(
    eventId: string,
    query: EventRegistrationQuery
  ): Promise<PaginatedResult<IRegistration>> {
    const { page = 1, limit = 20, status, ticketIds } = query;
    const filter: Record<string, any> = { eventId };
    filter.status = status ? status : { $ne: 'PENDING' };
    if (ticketIds) filter.ticketId = { $in: ticketIds };

    const skip = (page - 1) * limit;
    const [data, totalItems] = await Promise.all([
      Registration.find(filter)
        .sort({ registerDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participantId', 'fullName email phone')
        .populate('ticketId', 'ticketName price')
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

  /** All PAID registrations of an event (check-in report), buyer+ticket joined. */
  async findPaidRegistrationsByEvent(
    eventId: string,
    ticketIds?: string[]
  ): Promise<IRegistration[]> {
    const filter: Record<string, any> = { eventId, status: 'PAID' };
    if (ticketIds) filter.ticketId = { $in: ticketIds };
    return Registration.find(filter)
      .sort({ registerDate: -1 })
      .populate('participantId', 'fullName email phone')
      .populate('ticketId', 'ticketName price')
      .lean();
  }

  /** SUCCESS check-ins for the given registrations ("has one" = checked-in). */
  async findSuccessCheckInsByRegistrationIds(ids: string[]): Promise<ICheckIn[]> {
    if (ids.length === 0) return [];
    return CheckIn.find({ registrationId: { $in: ids }, status: 'SUCCESS' }).lean();
  }

  // ─── Analytics (derived from PAID registrations) ──────────────────────

  /** Revenue / ticket / order totals over PAID registrations, optional date range. */
  async paidTotalsByEvent(
    eventId: string,
    from?: Date,
    to?: Date,
    ticketIds?: string[]
  ): Promise<{ revenue: number; tickets: number; orders: number }> {
    const match: Record<string, any> = {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: 'PAID',
    };
    if (from || to) {
      match.registerDate = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }
    if (ticketIds) {
      match.ticketId = { $in: ticketIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    const rows = await Registration.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          tickets: { $sum: '$quantity' },
          orders: { $sum: 1 },
        },
      },
    ]);
    return rows[0] ?? { revenue: 0, tickets: 0, orders: 0 };
  }

  /** Order counts per registration status (PENDING/PAID/CANCELLED/…). */
  async countRegistrationStatusesByEvent(
    eventId: string,
    ticketIds?: string[]
  ): Promise<Record<string, number>> {
    const match: Record<string, any> = { eventId: new mongoose.Types.ObjectId(eventId) };
    if (ticketIds) {
      match.ticketId = { $in: ticketIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    const rows = await Registration.aggregate([
      { $match: match },
      { $group: { _id: '$status', orders: { $sum: 1 } } },
    ]);
    const out: Record<string, number> = {};
    for (const row of rows) out[row._id] = row.orders;
    return out;
  }

  /** PAID revenue + tickets per local (GMT+7) day, ascending. */
  async paidRevenueByDay(
    eventId: string,
    ticketIds?: string[]
  ): Promise<{ date: string; revenue: number; tickets: number }[]> {
    const match: Record<string, any> = {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: 'PAID',
    };
    if (ticketIds) {
      match.ticketId = { $in: ticketIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    const rows = await Registration.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$registerDate',
              timezone: 'Asia/Ho_Chi_Minh',
            },
          },
          revenue: { $sum: '$totalAmount' },
          tickets: { $sum: '$quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return rows.map((r) => ({ date: r._id as string, revenue: r.revenue, tickets: r.tickets }));
  }

  /**
   * PAID revenue + tickets per GMT+7 time bucket since `from`. `granularity`
   * controls the bucket key: 'day' → '%Y-%m-%d', 'hour' → '%Y-%m-%dT%H'.
   * Only buckets that actually have sales are returned; the caller zero-fills
   * the rest. Powers the summary chart's 30-day / 24-hour windows.
   */
  async paidSalesSeries(
    eventId: string,
    ticketIds: string[] | undefined,
    from: Date,
    granularity: 'day' | 'hour'
  ): Promise<{ bucket: string; revenue: number; tickets: number }[]> {
    const match: Record<string, any> = {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: 'PAID',
      registerDate: { $gte: from },
    };
    if (ticketIds) {
      match.ticketId = { $in: ticketIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    const format = granularity === 'hour' ? '%Y-%m-%dT%H' : '%Y-%m-%d';
    const rows = await Registration.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format, date: '$registerDate', timezone: 'Asia/Ho_Chi_Minh' },
          },
          revenue: { $sum: '$totalAmount' },
          tickets: { $sum: '$quantity' },
        },
      },
    ]);
    return rows.map((r) => ({ bucket: r._id as string, revenue: r.revenue, tickets: r.tickets }));
  }

  /** PAID revenue + ticket quantity per ticket type. */
  async paidStatsByTicket(
    eventId: string,
    from?: Date,
    to?: Date
  ): Promise<Map<string, { revenue: number; tickets: number }>> {
    const match: Record<string, any> = {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: 'PAID',
    };
    if (from || to) {
      match.registerDate = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }
    const rows = await Registration.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$ticketId',
          revenue: { $sum: '$totalAmount' },
          tickets: { $sum: '$quantity' },
        },
      },
    ]);
    const out = new Map<string, { revenue: number; tickets: number }>();
    for (const row of rows) out.set(String(row._id), { revenue: row.revenue, tickets: row.tickets });
    return out;
  }

  // ─── Staff assignments (organizer read-only "Thành viên") ─────────────

  async findAssignmentsByEvent(eventId: string): Promise<IStaffAssignment[]> {
    // status/sort follow the unified staff model: lowercase enum, timestamps.
    return StaffAssignment.find({ eventId, status: { $ne: 'cancelled' } })
      .sort({ createdAt: 1 })
      .populate('staffId', 'fullName email avatar')
      .lean();
  }

  // ─── Withdrawals (post-event payout requests) ─────────────────────────

  async createWithdrawal(data: Partial<IWithdrawal>): Promise<IWithdrawal> {
    const withdrawal = new Withdrawal(data);
    return withdrawal.save();
  }

  async findWithdrawalsByEvent(eventId: string): Promise<IWithdrawal[]> {
    return Withdrawal.find({ eventId }).sort({ requestDate: -1 }).lean();
  }

  /** Amount already spoken for: PENDING (on hold) + APPROVED (paid out). */
  async sumHeldWithdrawalsByEvent(eventId: string): Promise<number> {
    const rows = await Withdrawal.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          status: { $in: ['PENDING', 'APPROVED'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return rows[0]?.total ?? 0;
  }

  // ─── Revenue reports ──────────────────────────────────────────────────

  async createRevenueReport(data: Partial<IRevenueReport>): Promise<IRevenueReport> {
    const report = new RevenueReport(data);
    return report.save();
  }

  async findReportsByGenerator(
    userId: string,
    query: PaginationQuery
  ): Promise<PaginatedResult<IRevenueReport>> {
    const { page = 1, limit = 10 } = query;
    const filter = { generatedBy: userId };
    const skip = (page - 1) * limit;

    const [reports, totalItems] = await Promise.all([
      RevenueReport.find(filter)
        .sort({ generatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('eventId', 'title')
        .populate('generatedBy', 'fullName')
        .lean(),
      RevenueReport.countDocuments(filter),
    ]);

    return {
      data: reports.map(withTicketBreakdownDefault),
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  /** Raw report by id, with event title populated (for export headers). */
  async findReportById(id: string): Promise<IRevenueReport | null> {
    const report = await RevenueReport.findById(id).populate('eventId', 'title').lean();
    return report ? withTicketBreakdownDefault(report) : null;
  }

  async deleteReport(id: string): Promise<void> {
    await RevenueReport.findByIdAndDelete(id);
  }

  /**
   * Bulk delete — one round trip instead of N individual deletes. Scoped to
   * `generatedBy: userId` (unless the actor is ADMIN) so an id belonging to
   * someone else is silently excluded from the match rather than erroring;
   * the returned count is how many were actually removed.
   */
  async deleteReportsOwned(ids: string[], userId: string, isAdmin: boolean): Promise<number> {
    if (ids.length === 0) return 0;
    const filter: Record<string, any> = { _id: { $in: ids } };
    if (!isAdmin) filter.generatedBy = userId;
    const result = await RevenueReport.deleteMany(filter);
    return result.deletedCount ?? 0;
  }
}
