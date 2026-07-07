import mongoose from 'mongoose';
import { Event } from '../event/event.model';
import { Ticket, ITicket } from '../organizer/ticket.model';
import { PaginationQuery, PaginatedResult } from '../../common/types';

export interface AdminTicketQuery extends PaginationQuery {
  eventId?: string;
  status?: string;
  search?: string;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class AdminTicketRepository {
  async findTickets(query: AdminTicketQuery): Promise<PaginatedResult<ITicket>> {
    const { page = 1, limit = 10, eventId, status, search } = query;
    const filter: Record<string, any> = {};
    if (eventId) filter.eventId = new mongoose.Types.ObjectId(eventId);
    if (status) filter.status = status;
    if (search) filter.ticketName = { $regex: escapeRegExp(search), $options: 'i' };

    const skip = (page - 1) * limit;
    const [data, totalItems] = await Promise.all([
      Ticket.find(filter)
        .populate('eventId', 'title status reviewStatus startDate date location category categoryId creatorId organizer')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ticket.countDocuments(filter),
    ]);

    return {
      data: data as ITicket[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  async findTicketById(id: string): Promise<ITicket | null> {
    return Ticket.findById(id)
      .populate('eventId', 'title status reviewStatus startDate date location category categoryId creatorId organizer')
      .lean();
  }

  async findRawTicketById(id: string): Promise<ITicket | null> {
    return Ticket.findById(id).lean();
  }

  async countTicketsByEvent(eventId: string): Promise<number> {
    return Ticket.countDocuments({ eventId });
  }

  async updateTicket(id: string, data: Partial<ITicket>): Promise<ITicket | null> {
    return Ticket.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('eventId', 'title status reviewStatus startDate date location category categoryId creatorId organizer')
      .lean();
  }

  async deleteTicket(id: string): Promise<void> {
    await Ticket.findByIdAndDelete(id);
  }

  async syncEventPriceFields(eventId: string): Promise<void> {
    const visibleTickets = await Ticket.find({ eventId, status: { $ne: 'HIDDEN' } })
      .select('price')
      .lean();
    const priceFrom =
      visibleTickets.length > 0 ? Math.min(...visibleTickets.map((ticket) => ticket.price)) : 0;
    const isFree = visibleTickets.length > 0 && visibleTickets.every((ticket) => ticket.price === 0);
    await Event.findByIdAndUpdate(eventId, { priceFrom, isFree });
  }
}
