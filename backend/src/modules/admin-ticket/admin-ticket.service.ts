import mongoose from 'mongoose';
import {
  AdminTicketQuery,
  AdminTicketRepository,
} from './admin-ticket.repository';
import { ITicket } from '../organizer/ticket.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';

const TICKET_STATUSES = ['ACTIVE', 'SOLD_OUT', 'HIDDEN'] as const;

export class AdminTicketService {
  private adminTicketRepository: AdminTicketRepository;

  constructor() {
    this.adminTicketRepository = new AdminTicketRepository();
  }

  async listTickets(query: AdminTicketQuery): Promise<PaginatedResult<ITicket>> {
    if (query.eventId && !mongoose.isValidObjectId(query.eventId)) {
      throw new AppError('eventId khong hop le', 400);
    }
    if (query.status && !TICKET_STATUSES.includes(query.status as any)) {
      throw new AppError(`status chi nhan mot trong: ${TICKET_STATUSES.join(', ')}`, 400);
    }
    return this.adminTicketRepository.findTickets(query);
  }

  async getTicket(ticketId: string): Promise<ITicket> {
    return this.getTicketOrThrow(ticketId);
  }

  private async getTicketOrThrow(ticketId: string): Promise<ITicket> {
    if (!mongoose.isValidObjectId(ticketId)) {
      throw new AppError('Ticket not found', 404);
    }
    const ticket = await this.adminTicketRepository.findTicketById(ticketId);
    if (!ticket) throw new AppError('Ticket not found', 404);
    return ticket;
  }

}
