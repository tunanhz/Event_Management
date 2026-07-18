import mongoose from 'mongoose';
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

}
