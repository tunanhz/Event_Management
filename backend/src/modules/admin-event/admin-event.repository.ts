import mongoose from 'mongoose';
import { Event, IEvent } from '../event/event.model';
import { Ticket, ITicket } from '../organizer/ticket.model';
import { PaginationQuery, PaginatedResult } from '../../common/types';

export interface AdminEventQuery extends PaginationQuery {
  /** Filter by moderation state (e.g. PENDING_REVIEW for the review queue). */
  reviewStatus?: string;
  /** Case-insensitive title search. */
  search?: string;
}

/** Escape user input before embedding it in a RegExp (title search). */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class AdminEventRepository {
  async findEvents(query: AdminEventQuery): Promise<PaginatedResult<IEvent>> {
    const { page = 1, limit = 10, reviewStatus, search } = query;
    const filter: Record<string, any> = {};
    if (reviewStatus) filter.reviewStatus = reviewStatus;
    if (search) filter.title = { $regex: escapeRegExp(search), $options: 'i' };

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

  /**
   * Atomic PENDING_REVIEW → PUBLISHED transition (AM-01 concurrency rule):
   * the reviewStatus filter guarantees a record concurrently processed by
   * another admin (or withdrawn by the organizer) is never overwritten —
   * the call simply matches nothing and returns null.
   */
  async approveEvent(id: string, adminId: string): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      { _id: id, reviewStatus: 'PENDING_REVIEW' },
      {
        $set: {
          reviewStatus: 'PUBLISHED',
          approvedById: new mongoose.Types.ObjectId(adminId),
          reviewedAt: new Date(),
          // Legacy public-listing visibility flag — homepage/listing/detail
          // (event module) only serve status='published' events.
          status: 'published',
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
}
