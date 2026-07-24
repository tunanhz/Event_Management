import mongoose from 'mongoose';
import { Event, IEvent } from '../event/event.model';
import { Ticket, ITicket } from '../organizer/ticket.model';
import { Registration } from '../registration/registration.model';
import { Payment } from '../registration/payment.model';
import { PaginationQuery, PaginatedResult } from '../../common/types';

export interface AdminEventQuery extends PaginationQuery {
  /** Filter by moderation state (e.g. PENDING_REVIEW for the review queue). */
  reviewStatus?: string;
  /** Filter by public lifecycle state (draft/published/cancelled/completed). */
  status?: string;
  categoryId?: string;
  creatorId?: string;
  /** Case-insensitive title search. */
  search?: string;
  privacy?: string;
  timeStatus?: string;
  fromDate?: string;
  toDate?: string;
}

/** Escape user input before embedding it in a RegExp (title search). */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class AdminEventRepository {
  async findEvents(query: AdminEventQuery): Promise<PaginatedResult<IEvent>> {
    const { page = 1, limit = 10, reviewStatus, status, categoryId, creatorId, search, privacy, timeStatus, fromDate, toDate } = query;
    const filter: Record<string, any> = {};
    if (reviewStatus) filter.reviewStatus = reviewStatus;
    if (status) filter.status = status;
    if (privacy) filter.privacy = privacy;
    if (categoryId) filter.categoryId = categoryId;
    if (creatorId) filter.creatorId = creatorId;
    if (search) filter.title = { $regex: escapeRegExp(search), $options: 'i' };

    const now = new Date();
    if (timeStatus === 'upcoming') {
      filter.startDate = { $gt: now };
      filter.status = { $ne: 'cancelled' };
    } else if (timeStatus === 'ongoing') {
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
      filter.status = { $ne: 'cancelled' };
    } else if (timeStatus === 'completed') {
      filter.$or = [{ endDate: { $lt: now } }, { status: 'completed' }];
    } else if (timeStatus === 'cancelled') {
      filter.status = 'cancelled';
    }

    if (fromDate || toDate) {
      filter.startDate = filter.startDate || {};
      if (fromDate) filter.startDate.$gte = new Date(fromDate);
      if (toDate) filter.startDate.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;
    const [data, totalItems] = await Promise.all([
      Event.find(filter)
        .populate('categoryId', 'name slug')
        .populate('creatorId', 'fullName email')
        // updatedAt ≈ submission time for PENDING_REVIEW rows (SRS: queue sorted by submit date)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
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

  async findEventById(id: string): Promise<IEvent | null> {
    return Event.findById(id)
      .populate('categoryId', 'name slug icon')
      .populate('creatorId', 'fullName email avatar')
      .lean();
  }

  async findTicketsByEvent(eventId: string): Promise<ITicket[]> {
    return Ticket.find({ eventId }).sort({ createdAt: 1 }).lean();
  }

  async countRegistrationsByEvent(eventId: string): Promise<number> {
    return Registration.countDocuments({ eventId });
  }

  async updateEvent(id: string, data: Partial<IEvent>): Promise<IEvent | null> {
    return Event.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('categoryId', 'name slug icon')
      .populate('creatorId', 'fullName email avatar')
      .lean();
  }

  async deleteEventCascade(eventId: string): Promise<IEvent | null> {
    const registrations = await Registration.find({ eventId }).select('_id').lean();
    const registrationIds = registrations.map((registration) => registration._id);

    await Promise.all([
      registrationIds.length > 0 ? Payment.deleteMany({ registrationId: { $in: registrationIds } }) : Promise.resolve(),
      Registration.deleteMany({ eventId }),
      Ticket.deleteMany({ eventId }),
    ]);

    return Event.findByIdAndDelete(eventId).lean();
  }

  /**
   * Atomic PENDING_REVIEW → PUBLISHED transition (no services / serviceCost=0).
   */
  async approveEventDirect(id: string, adminId: string): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      { _id: id, reviewStatus: 'PENDING_REVIEW' },
      {
        $set: {
          reviewStatus: 'PUBLISHED',
          approvedById: new mongoose.Types.ObjectId(adminId),
          reviewedAt: new Date(),
          status: 'published',
        },
        $unset: { rejectionReason: '' },
      },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Atomic PENDING_REVIEW → APPROVED_WAITING_DEPOSIT transition (has services).
   * Records the admin's service cost quotation and the 20% deposit amount.
   */
  async approveEventWithDeposit(
    id: string,
    adminId: string,
    serviceCost: number,
    depositAmount: number
  ): Promise<IEvent | null> {
    const finalPaymentAmount = serviceCost - depositAmount;
    return Event.findOneAndUpdate(
      { _id: id, reviewStatus: 'PENDING_REVIEW' },
      {
        $set: {
          reviewStatus: 'APPROVED_WAITING_DEPOSIT',
          approvedById: new mongoose.Types.ObjectId(adminId),
          reviewedAt: new Date(),
          serviceCost,
          depositAmount,
          depositStatus: 'UNPAID',
          finalPaymentAmount,
          // status stays 'draft' until deposit is paid
        },
        $unset: { rejectionReason: '' },
      },
      { new: true, runValidators: true }
    ).lean();
  }

  /** Atomic PENDING_REVIEW → REJECTED transition (same concurrency guard). */
  async rejectEvent(id: string, reason: string): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      { _id: id, reviewStatus: 'PENDING_REVIEW' },
      {
        $set: {
          reviewStatus: 'REJECTED',
          rejectionReason: reason,
          reviewedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Set additional cost for a completed/published event and compute the
   * final payment amount = (serviceCost * 0.8) + additionalCost.
   */
  async setAdditionalCost(id: string, additionalCost: number): Promise<IEvent | null> {
    const event = await Event.findById(id).lean();
    if (!event) return null;
    const finalPaymentAmount = Math.round(event.serviceCost * 0.8) + additionalCost;
    return Event.findByIdAndUpdate(
      id,
      { $set: { additionalCost, finalPaymentAmount } },
      { new: true, runValidators: true }
    ).lean();
  }
}
