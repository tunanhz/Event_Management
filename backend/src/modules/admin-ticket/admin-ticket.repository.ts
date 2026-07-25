import mongoose from 'mongoose';
import { Ticket, ITicket } from '../organizer/ticket.model';
import { Registration } from '../registration/registration.model';
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

    // Override soldQuantity with actual count of PAID registrations
    const ticketIds = data.map((t) => t._id);
    const paidStats = await Registration.aggregate([
      { $match: { ticketId: { $in: ticketIds }, status: 'PAID' } },
      { $group: { _id: '$ticketId', tickets: { $sum: '$quantity' } } },
    ]);
    const paidMap = new Map(paidStats.map((p) => [String(p._id), p.tickets]));

    const resultData = data.map((t) => ({
      ...t,
      soldQuantity: paidMap.get(String(t._id)) || 0,
    }));

    return {
      data: resultData as unknown as ITicket[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  async findTicketById(id: string): Promise<ITicket | null> {
    const ticket = await Ticket.findById(id)
      .populate('eventId', 'title status reviewStatus startDate date location category categoryId creatorId organizer')
      .lean();

    if (!ticket) return null;

    const paidStats = await Registration.aggregate([
      { $match: { ticketId: new mongoose.Types.ObjectId(id), status: 'PAID' } },
      { $group: { _id: '$ticketId', tickets: { $sum: '$quantity' } } },
    ]);

    const paidCount = paidStats.length > 0 ? paidStats[0].tickets : 0;
    return {
      ...ticket,
      soldQuantity: paidCount,
    } as unknown as ITicket;
  }
}
