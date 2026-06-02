import { Event, IEvent } from './event.model';
import { PaginationQuery, PaginatedResult } from '../../common/types';

export class EventRepository {
  async findAll(query: PaginationQuery & { status?: string; category?: string }): Promise<PaginatedResult<IEvent>> {
    const { page = 1, limit = 10, sort = 'date', order = 'asc', status, category } = query;
    const filter: Record<string, any> = {};

    if (status) filter.status = status;
    if (category) filter.category = category;

    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [data, totalItems] = await Promise.all([
      Event.find(filter)
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
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

  async findById(id: string): Promise<IEvent | null> {
    return Event.findById(id).lean();
  }

  async create(data: Partial<IEvent>): Promise<IEvent> {
    const event = new Event(data);
    return event.save();
  }

  async update(id: string, data: Partial<IEvent>): Promise<IEvent | null> {
    return Event.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  async delete(id: string): Promise<IEvent | null> {
    return Event.findByIdAndDelete(id).lean();
  }
}
