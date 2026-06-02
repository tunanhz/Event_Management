import { EventRepository } from './event.repository';
import { IEvent } from './event.model';
import { AppError } from '../../common/utils/AppError';
import { PaginationQuery, PaginatedResult } from '../../common/types';

export class EventService {
  private eventRepository: EventRepository;

  constructor() {
    this.eventRepository = new EventRepository();
  }

  async getAllEvents(query: PaginationQuery & { status?: string; category?: string }): Promise<PaginatedResult<IEvent>> {
    return this.eventRepository.findAll(query);
  }

  async getEventById(id: string): Promise<IEvent> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
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
