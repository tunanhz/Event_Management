import mongoose from 'mongoose';
import { OrganizerRepository, OrganizerEventQuery } from './organizer.repository';
import { IEvent } from '../event/event.model';
import { ITicket } from './ticket.model';
import { CategoryRepository } from '../category/category.repository';
import { UserRepository } from '../user/user.repository';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';

/** The authenticated user performing an organizer action. */
interface OrganizerActor {
  id: string;
  role: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  location: string;
  banner: string;
  categoryId: string;
  startDate: string | Date;
  endDate: string | Date;
  capacity: number;
}

export interface CreateTicketInput {
  ticketName: string;
  description?: string;
  price: number;
  quantity: number;
  saleStart?: string | Date;
  saleEnd?: string | Date;
}

export type UpdateEventInput = Partial<CreateEventInput>;
export type UpdateTicketInput = Partial<CreateTicketInput>;

export class OrganizerService {
  private organizerRepository: OrganizerRepository;
  private categoryRepository: CategoryRepository;
  private userRepository: UserRepository;

  constructor() {
    this.organizerRepository = new OrganizerRepository();
    this.categoryRepository = new CategoryRepository();
    this.userRepository = new UserRepository();
  }

  async createEventWithTickets(
    data: CreateEventInput,
    tickets: CreateTicketInput[],
    organizerId: string
  ): Promise<{ event: IEvent; tickets: ITicket[] }> {
    const { title, description, location, banner, categoryId, capacity } = data;
    if (!title || !description || !location || !banner || !categoryId || !capacity) {
      throw new AppError(
        'title, description, location, banner, categoryId và capacity là bắt buộc',
        400
      );
    }
    if (!Array.isArray(tickets) || tickets.length === 0) {
      throw new AppError('Cần cấu hình ít nhất 1 loại vé', 400);
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError('startDate/endDate không hợp lệ', 400);
    }
    if (startDate.getTime() <= Date.now()) {
      throw new AppError('Ngày bắt đầu sự kiện phải ở tương lai', 400);
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);
    }
    if (capacity < 1) {
      throw new AppError('capacity phải >= 1', 400);
    }

    for (const ticket of tickets) {
      this.validateTicketInput(ticket);
    }

    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new AppError('Category không tồn tại', 400);
    }

    const creator = await this.userRepository.findById(organizerId);
    if (!creator) {
      throw new AppError('Không tìm thấy tài khoản tổ chức', 404);
    }

    const event = await this.organizerRepository.createEvent({
      title,
      description,
      location,
      banner,
      categoryId: new mongoose.Types.ObjectId(categoryId),
      creatorId: new mongoose.Types.ObjectId(organizerId),
      startDate,
      endDate,
      capacity,
      reviewStatus: 'DRAFT',

      // Legacy fields mirrored so existing public listing/detail (event module,
      // untouched by this feature) keep working once this event is published.
      date: startDate,
      maxAttendees: capacity,
      imageUrl: banner,
      organizer: creator.fullName,
      organizerId: new mongoose.Types.ObjectId(organizerId),
      category: category.name,
      categorySlug: category.slug,
      status: 'draft',
    });

    const createdTickets: ITicket[] = [];
    try {
      for (const ticket of tickets) {
        const created = await this.organizerRepository.createTicket({
          eventId: event._id as mongoose.Types.ObjectId,
          ticketName: ticket.ticketName,
          description: ticket.description,
          price: ticket.price,
          quantity: ticket.quantity,
          saleStart: ticket.saleStart ? new Date(ticket.saleStart) : undefined,
          saleEnd: ticket.saleEnd ? new Date(ticket.saleEnd) : undefined,
        });
        createdTickets.push(created);
      }
    } catch (err) {
      // Best-effort rollback: no multi-document transaction (local dev Mongo may
      // not be a replica set), so clean up manually on partial ticket failure.
      await Promise.all(createdTickets.map((t) => t.deleteOne()));
      await this.organizerRepository.deleteEvent((event._id as mongoose.Types.ObjectId).toString());
      throw err;
    }

    return { event, tickets: createdTickets };
  }

  async updateEvent(
    eventId: string,
    actor: OrganizerActor,
    data: UpdateEventInput
  ): Promise<IEvent> {
    const event = await this.getOwnedEvent(eventId, actor);
    if (event.reviewStatus !== 'DRAFT') {
      throw new AppError('Chỉ có thể sửa sự kiện khi đang ở trạng thái DRAFT', 400);
    }

    // Merge onto the existing event so partial updates (e.g. only `title`) still
    // validate the full date range / capacity correctly.
    const startDate = new Date(data.startDate ?? event.startDate ?? event.date);
    const endDate = new Date(data.endDate ?? event.endDate ?? event.date);
    const capacity = data.capacity ?? event.capacity ?? event.maxAttendees;

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError('startDate/endDate không hợp lệ', 400);
    }
    if (startDate.getTime() <= Date.now()) {
      throw new AppError('Ngày bắt đầu sự kiện phải ở tương lai', 400);
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);
    }
    if (typeof capacity !== 'number' || capacity < 1) {
      throw new AppError('capacity phải >= 1', 400);
    }

    const update: Partial<IEvent> = {
      startDate,
      endDate,
      capacity,
      date: startDate,
      maxAttendees: capacity,
    };
    if (data.title) update.title = data.title;
    if (data.description) update.description = data.description;
    if (data.location) update.location = data.location;
    if (data.banner) {
      update.banner = data.banner;
      update.imageUrl = data.banner;
    }
    if (data.categoryId) {
      const category = await this.categoryRepository.findById(data.categoryId);
      if (!category) {
        throw new AppError('Category không tồn tại', 400);
      }
      update.categoryId = new mongoose.Types.ObjectId(data.categoryId);
      update.category = category.name;
      update.categorySlug = category.slug;
    }

    const updated = await this.organizerRepository.updateEvent(eventId, update);
    if (!updated) {
      throw new AppError('Event not found', 404);
    }
    return updated;
  }

  async addTicket(
    eventId: string,
    actor: OrganizerActor,
    input: CreateTicketInput
  ): Promise<ITicket> {
    const event = await this.getOwnedEvent(eventId, actor);
    if (event.reviewStatus !== 'DRAFT') {
      throw new AppError('Chỉ có thể thêm loại vé khi sự kiện đang ở trạng thái DRAFT', 400);
    }
    this.validateTicketInput(input);

    return this.organizerRepository.createTicket({
      eventId: event._id as mongoose.Types.ObjectId,
      ticketName: input.ticketName,
      description: input.description,
      price: input.price,
      quantity: input.quantity,
      saleStart: input.saleStart ? new Date(input.saleStart) : undefined,
      saleEnd: input.saleEnd ? new Date(input.saleEnd) : undefined,
    });
  }

  async updateTicket(
    eventId: string,
    ticketId: string,
    actor: OrganizerActor,
    data: UpdateTicketInput
  ): Promise<ITicket> {
    const event = await this.getOwnedEvent(eventId, actor);
    if (event.reviewStatus !== 'DRAFT') {
      throw new AppError('Chỉ có thể sửa loại vé khi sự kiện đang ở trạng thái DRAFT', 400);
    }
    const ticket = await this.getEventTicket(eventId, ticketId);

    const merged: CreateTicketInput = {
      ticketName: data.ticketName ?? ticket.ticketName,
      description: data.description ?? ticket.description,
      price: data.price ?? ticket.price,
      quantity: data.quantity ?? ticket.quantity,
      saleStart: data.saleStart ?? ticket.saleStart,
      saleEnd: data.saleEnd ?? ticket.saleEnd,
    };
    this.validateTicketInput(merged);

    const updated = await this.organizerRepository.updateTicket(ticketId, {
      ticketName: merged.ticketName,
      description: merged.description,
      price: merged.price,
      quantity: merged.quantity,
      saleStart: merged.saleStart ? new Date(merged.saleStart) : undefined,
      saleEnd: merged.saleEnd ? new Date(merged.saleEnd) : undefined,
    });
    if (!updated) {
      throw new AppError('Ticket not found', 404);
    }
    return updated;
  }

  async deleteTicket(eventId: string, ticketId: string, actor: OrganizerActor): Promise<void> {
    const event = await this.getOwnedEvent(eventId, actor);
    if (event.reviewStatus !== 'DRAFT') {
      throw new AppError('Chỉ có thể xoá loại vé khi sự kiện đang ở trạng thái DRAFT', 400);
    }
    const ticket = await this.getEventTicket(eventId, ticketId);
    if (ticket.soldQuantity > 0) {
      throw new AppError('Không thể xoá loại vé đã có người mua', 400);
    }

    const ticketCount = await this.organizerRepository.countTicketsByEvent(eventId);
    if (ticketCount <= 1) {
      throw new AppError('Sự kiện cần giữ lại ít nhất 1 loại vé', 400);
    }

    await this.organizerRepository.deleteTicket(ticketId);
  }

  async listTickets(eventId: string, actor: OrganizerActor): Promise<ITicket[]> {
    await this.getOwnedEvent(eventId, actor);
    return this.organizerRepository.findTicketsByEvent(eventId);
  }

  async submitForReview(eventId: string, actor: OrganizerActor): Promise<IEvent> {
    const event = await this.getOwnedEvent(eventId, actor);
    if (event.reviewStatus !== 'DRAFT') {
      throw new AppError('Sự kiện đã được gửi duyệt hoặc đã được xử lý', 400);
    }

    const ticketCount = await this.organizerRepository.countTicketsByEvent(eventId);
    if (ticketCount === 0) {
      throw new AppError('Cần ít nhất 1 loại vé trước khi gửi duyệt', 400);
    }

    const updated = await this.organizerRepository.updateEventReviewStatus(eventId, 'PENDING_REVIEW');
    if (!updated) {
      throw new AppError('Event not found', 404);
    }
    return updated;
  }

  async getMyEvents(
    organizerId: string,
    query: OrganizerEventQuery
  ): Promise<PaginatedResult<IEvent>> {
    return this.organizerRepository.findEventsByCreator(organizerId, query);
  }

  async getEventDetail(
    eventId: string,
    actor: OrganizerActor
  ): Promise<{ event: IEvent; tickets: ITicket[] }> {
    const event = await this.getOwnedEvent(eventId, actor);
    const tickets = await this.organizerRepository.findTicketsByEvent(eventId);
    return { event, tickets };
  }

  // Loads an event and enforces that only its creator (or an admin) may act on it.
  private async getOwnedEvent(eventId: string, actor: OrganizerActor): Promise<IEvent> {
    const event = await this.organizerRepository.findEventById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    if (actor.role !== 'ADMIN') {
      const ownerId = event.creatorId?.toString();
      if (!ownerId || ownerId !== actor.id) {
        throw new AppError('Bạn không có quyền quản lý sự kiện này', 403);
      }
    }
    return event;
  }

  // Loads a ticket and enforces it actually belongs to the given event, so an
  // organizer can't reference another event's ticket id through this event's URL.
  private async getEventTicket(eventId: string, ticketId: string): Promise<ITicket> {
    const ticket = await this.organizerRepository.findTicketById(ticketId);
    if (!ticket || ticket.eventId.toString() !== eventId) {
      throw new AppError('Ticket not found', 404);
    }
    return ticket;
  }

  private validateTicketInput(ticket: CreateTicketInput): void {
    if (!ticket.ticketName) {
      throw new AppError('ticketName là bắt buộc cho mỗi loại vé', 400);
    }
    if (typeof ticket.price !== 'number' || ticket.price < 0) {
      throw new AppError('price của vé phải là số >= 0', 400);
    }
    if (typeof ticket.quantity !== 'number' || ticket.quantity < 1) {
      throw new AppError('quantity của vé phải >= 1', 400);
    }
    if (ticket.saleStart && ticket.saleEnd) {
      const start = new Date(ticket.saleStart);
      const end = new Date(ticket.saleEnd);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        throw new AppError('saleEnd phải sau saleStart', 400);
      }
    }
  }
}
