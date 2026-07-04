import mongoose from 'mongoose';
import { EventRepository, EventQuery } from './event.repository';
import { IEvent } from './event.model';
import { ITicket } from '../organizer/ticket.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';

/** The authenticated user performing a management action on an event. */
interface EventActor {
  id: string;
  role: string;
}

export interface EventDetail {
  event: IEvent;
  tickets: ITicket[];
  related: IEvent[];
}

export class EventService {
  private eventRepository: EventRepository;

  constructor() {
    this.eventRepository = new EventRepository();
  }

  // Public browsing (homepage, listing page): defaults to published-only so
  // anonymous visitors never see draft/cancelled events unless a status is explicitly requested.
  // (query.status is always a key here, just possibly undefined — so the default must win via ??,
  // not object-spread order, otherwise `{ status: undefined }` overwrites the default.)
  async getAllEvents(query: EventQuery): Promise<PaginatedResult<IEvent>> {
    return this.eventRepository.findAll({ ...query, status: query.status ?? 'published' });
  }

  async getEventById(id: string): Promise<IEvent> {
    this.assertValidId(id);
    const event = await this.eventRepository.findById(id);
    if (!event || event.status !== 'published') {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  // Everything the detail page (/su-kien/:id) needs in one call: the event itself,
  // its on-sale ticket tiers, and a same-category "related events" rail.
  async getEventDetail(id: string): Promise<EventDetail> {
    const event = await this.getEventById(id);
    const [tickets, related] = await Promise.all([
      this.eventRepository.findTicketsByEventId(id),
      this.eventRepository.findRelated(event),
    ]);
    return { event, tickets, related };
  }

  async createEvent(data: Partial<IEvent>, organizerId: string): Promise<IEvent> {
    // Ownership is derived from the authenticated organizer, never trusted from
    // the request body — a client cannot create an event on someone else's behalf.
    return this.eventRepository.create({
      ...data,
      organizerId: new mongoose.Types.ObjectId(organizerId),
    });
  }

  async updateEvent(id: string, data: Partial<IEvent>, actor: EventActor): Promise<IEvent> {
    this.assertValidId(id);
    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new AppError('Event not found', 404);
    }
    this.assertCanManage(existing, actor);

    // organizerId is immutable via update — block transferring ownership through the body.
    const safeData: Partial<IEvent> = { ...data };
    delete safeData.organizerId;

    const event = await this.eventRepository.update(id, safeData);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  async deleteEvent(id: string, actor: EventActor): Promise<void> {
    this.assertValidId(id);
    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new AppError('Event not found', 404);
    }
    this.assertCanManage(existing, actor);

    await this.eventRepository.delete(id);
  }

  // A malformed id (not a valid ObjectId) would otherwise reach Mongoose and throw a
  // CastError, which the global error handler turns into an unhelpful 500 — surface it
  // as the same 404 a well-formed-but-missing id would produce instead.
  private assertValidId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Event not found', 404);
    }
  }

  // Organizers may only manage the events they own; admins may manage any event
  // (moderation). Anyone else — including organizers acting on foreign events — is denied.
  private assertCanManage(event: IEvent, actor: EventActor): void {
    if (actor.role === 'ADMIN') return;

    const ownerId = event.organizerId?.toString();
    if (!ownerId || ownerId !== actor.id) {
      throw new AppError('Bạn không có quyền quản lý sự kiện này', 403);
    }
  }
}
