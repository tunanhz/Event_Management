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

  async updateEventReviewStatus(
    id: string,
    reviewStatus: IEvent['reviewStatus']
  ): Promise<IEvent | null> {
    return Event.findByIdAndUpdate(id, { reviewStatus }, { new: true, runValidators: true }).lean();
  }

  async updateEvent(id: string, data: Partial<IEvent>): Promise<IEvent | null> {
    return Event.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async deleteEvent(id: string): Promise<void> {
    await Event.findByIdAndDelete(id);
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
