import mongoose from 'mongoose';
import { Event, IEvent } from '../event/event.model';
import { Ticket, ITicket } from './ticket.model';
import { PaginationQuery, PaginatedResult } from '../../common/types';

export interface OrganizerEventQuery extends PaginationQuery {
  reviewStatus?: string;
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
}
