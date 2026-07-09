import mongoose from 'mongoose';
import {
  AdminTicketQuery,
  AdminTicketRepository,
} from './admin-ticket.repository';
import { ITicket } from '../organizer/ticket.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';

const TICKET_STATUSES = ['ACTIVE', 'SOLD_OUT', 'HIDDEN'] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface AdminTicketUpdateInput {
  ticketName?: unknown;
  description?: unknown;
  price?: unknown;
  quantity?: unknown;
  minPerOrder?: unknown;
  maxPerOrder?: unknown;
  image?: unknown;
  saleStart?: unknown;
  saleEnd?: unknown;
  status?: unknown;
}

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

  async updateTicket(ticketId: string, input: AdminTicketUpdateInput): Promise<ITicket> {
    const ticket = await this.getTicketOrThrow(ticketId, false);
    const update = this.buildUpdate(input, ticket);

    const updated = await this.adminTicketRepository.updateTicket(ticketId, update);
    if (!updated) throw new AppError('Ticket not found', 404);
    await this.adminTicketRepository.syncEventPriceFields(String(ticket.eventId));
    return updated;
  }

  async updateStatus(ticketId: string, status: unknown): Promise<ITicket> {
    const ticket = await this.getTicketOrThrow(ticketId, false);
    const nextStatus = this.asTicketStatus(status);

    const updated = await this.adminTicketRepository.updateTicket(ticketId, { status: nextStatus });
    if (!updated) throw new AppError('Ticket not found', 404);
    await this.adminTicketRepository.syncEventPriceFields(String(ticket.eventId));
    return updated;
  }

  async deleteTicket(ticketId: string): Promise<void> {
    const ticket = await this.getTicketOrThrow(ticketId, false);
    if (ticket.soldQuantity > 0) {
      throw new AppError('Khong the xoa loai ve da co nguoi mua. Hay an ve hoac chuyen SOLD_OUT.', 400);
    }
    const ticketCount = await this.adminTicketRepository.countTicketsByEvent(String(ticket.eventId));
    if (ticketCount <= 1) {
      throw new AppError('Su kien can giu lai it nhat 1 loai ve', 400);
    }
    await this.adminTicketRepository.deleteTicket(ticketId);
    await this.adminTicketRepository.syncEventPriceFields(String(ticket.eventId));
  }

  private buildUpdate(input: AdminTicketUpdateInput, ticket: ITicket): Partial<ITicket> {
    const update: Partial<ITicket> = {};

    const ticketName = this.asRequiredString(input.ticketName, 'ticketName');
    if (ticketName !== undefined) update.ticketName = ticketName;

    const description = this.asOptionalString(input.description, 'description');
    if (description !== undefined) update.description = description;

    const image = this.asOptionalString(input.image, 'image');
    if (image !== undefined) update.image = image;

    if (input.price !== undefined) {
      const price = Number(input.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new AppError('price phai la so >= 0', 400);
      }
      update.price = price;
    }

    if (input.quantity !== undefined) {
      const quantity = Number(input.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new AppError('quantity phai la so nguyen >= 1', 400);
      }
      if (quantity < ticket.soldQuantity) {
        throw new AppError('quantity khong duoc nho hon so ve da ban', 400);
      }
      update.quantity = quantity;
    }

    const minPerOrder =
      input.minPerOrder !== undefined ? Number(input.minPerOrder) : ticket.minPerOrder;
    const maxPerOrder =
      input.maxPerOrder !== undefined ? Number(input.maxPerOrder) : ticket.maxPerOrder;
    if (input.minPerOrder !== undefined) {
      if (!Number.isInteger(minPerOrder) || minPerOrder < 1) {
        throw new AppError('minPerOrder phai >= 1', 400);
      }
      update.minPerOrder = minPerOrder;
    }
    if (input.maxPerOrder !== undefined) {
      if (!Number.isInteger(maxPerOrder) || maxPerOrder < minPerOrder) {
        throw new AppError('maxPerOrder phai >= minPerOrder', 400);
      }
      update.maxPerOrder = maxPerOrder;
    }

    const saleStart = this.asDate(input.saleStart, 'saleStart');
    const saleEnd = this.asDate(input.saleEnd, 'saleEnd');
    const nextSaleStart = saleStart ?? ticket.saleStart;
    const nextSaleEnd = saleEnd ?? ticket.saleEnd;
    if (nextSaleStart && nextSaleEnd && nextSaleEnd.getTime() < nextSaleStart.getTime()) {
      throw new AppError('saleEnd phai sau saleStart', 400);
    }
    if (input.saleStart !== undefined) update.saleStart = saleStart;
    if (input.saleEnd !== undefined) update.saleEnd = saleEnd;

    if (input.status !== undefined) update.status = this.asTicketStatus(input.status);
    return update;
  }

  private async getTicketOrThrow(ticketId: string, populated = true): Promise<ITicket> {
    if (!mongoose.isValidObjectId(ticketId)) {
      throw new AppError('Ticket not found', 404);
    }
    const ticket = populated
      ? await this.adminTicketRepository.findTicketById(ticketId)
      : await this.adminTicketRepository.findRawTicketById(ticketId);
    if (!ticket) throw new AppError('Ticket not found', 404);
    return ticket;
  }

  private asTicketStatus(value: unknown): TicketStatus {
    if (typeof value !== 'string' || !TICKET_STATUSES.includes(value as any)) {
      throw new AppError(`status chi nhan mot trong: ${TICKET_STATUSES.join(', ')}`, 400);
    }
    return value as TicketStatus;
  }

  private asRequiredString(value: unknown, field: string): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') throw new AppError(`${field} khong hop le`, 400);
    const trimmed = value.trim();
    if (!trimmed) throw new AppError(`${field} khong duoc de trong`, 400);
    return trimmed;
  }

  private asOptionalString(value: unknown, field: string): string | undefined {
    if (value === undefined) return undefined;
    if (value === null) return '';
    if (typeof value !== 'string') throw new AppError(`${field} khong hop le`, 400);
    return value.trim();
  }

  private asDate(value: unknown, field: string): Date | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' && !(value instanceof Date)) {
      throw new AppError(`${field} khong hop le`, 400);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new AppError(`${field} khong hop le`, 400);
    return date;
  }
}
