import { EventRepository, EventQuery } from './event.repository';
import { IEvent } from './event.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';

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
    const event = await this.eventRepository.findById(id);
    if (!event || event.status !== 'published') {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  async createEvent(data: Partial<IEvent>): Promise<IEvent> {
    return this.eventRepository.create(data);
  }

  async updateEvent(id: string, data: Partial<IEvent>): Promise<IEvent> {
    const event = await this.eventRepository.update(id, data);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    const event = await this.eventRepository.delete(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
  }
}
