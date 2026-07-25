import { Event, IEvent } from './event.model';
import { Ticket, ITicket } from '../organizer/ticket.model';
import { PaginationQuery, PaginatedResult } from '../../common/types';

export interface EventQuery extends PaginationQuery {
  status?: string;
  category?: string;
  categorySlug?: string | string[];
  city?: string;
  isFree?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  search?: string;
  excludeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includePast?: boolean;
}

export interface EventSearchQuery extends PaginationQuery {
  q?: string;
  status?: string;
  category?: string;
  categorySlug?: string | string[];
  city?: string;
  isFree?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  includePast?: boolean;
}

// Organizer-private wizard fields must never leave the public API surface
// (bank account, legal permits, contract). Admin/organizer modules read the
// full document through their own repositories.
const PUBLIC_EVENT_EXCLUDE = '-paymentInfo -permitDocuments -contract';

export class EventRepository {
  async findAll(query: EventQuery): Promise<PaginatedResult<IEvent>> {
    const {
      page = 1,
      limit = 10,
      sort = 'date',
      order = 'asc',
      status,
      category,
      categorySlug,
      city,
      isFree,
      isFeatured,
      isTrending,
      search,
      excludeId,
      dateFrom,
      dateTo,
      includePast,
    } = query;
    const filter: Record<string, any> = {
      privacy: { $ne: 'private' },
    };

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (categorySlug) {
      filter.categorySlug = Array.isArray(categorySlug) ? { $in: categorySlug } : categorySlug;
    }
    if (city) filter.city = city;
    if (typeof isFree === 'boolean') filter.isFree = isFree;
    if (typeof isFeatured === 'boolean') filter.isFeatured = isFeatured;
    if (typeof isTrending === 'boolean') filter.isTrending = isTrending;
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (excludeId) filter._id = { $ne: excludeId };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }

    // By default for public browsing, exclude events whose start date/date is in the past (only upcoming events)
    if (!includePast && !dateFrom) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { startDate: { $gte: startOfToday } },
          { startDate: { $exists: false }, date: { $gte: startOfToday } },
        ],
      });
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [data, totalItems] = await Promise.all([
      Event.find(filter)
        .select(PUBLIC_EVENT_EXCLUDE)
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

  // Free-text search across title/description/location/organizer/category, layered on
  // top of the same structured filters as findAll (city/category/isFree/date range).
  // Kept as its own method (rather than folded into findAll's single-field `search`)
  // since it matches multiple fields via $or, which is a different query shape.
  async search(query: EventSearchQuery): Promise<PaginatedResult<IEvent>> {
    const {
      page = 1,
      limit = 10,
      sort = 'date',
      order = 'asc',
      q,
      status,
      category,
      categorySlug,
      city,
      isFree,
      dateFrom,
      dateTo,
      includePast,
    } = query;
    const filter: Record<string, any> = {
      privacy: { $ne: 'private' },
    };

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (categorySlug) {
      filter.categorySlug = Array.isArray(categorySlug) ? { $in: categorySlug } : categorySlug;
    }
    if (city) filter.city = city;
    if (typeof isFree === 'boolean') filter.isFree = isFree;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }
    if (!includePast && !dateFrom) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { startDate: { $gte: startOfToday } },
          { startDate: { $exists: false }, date: { $gte: startOfToday } },
        ],
      });
    }
    if (q) {
      const regex = { $regex: q, $options: 'i' };
      filter.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
        { organizer: regex },
        { category: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [data, totalItems] = await Promise.all([
      Event.find(filter)
        .select(PUBLIC_EVENT_EXCLUDE)
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
    return Event.findById(id).select(PUBLIC_EVENT_EXCLUDE).lean();
  }

  // Ticket tiers on sale for the detail page's booking widget. HIDDEN tiers are
  // organizer-only (surfaced via the organizer module), so they're excluded here.
  async findTicketsByEventId(eventId: string): Promise<ITicket[]> {
    return Ticket.find({ eventId, status: { $ne: 'HIDDEN' } }).sort({ price: 1 }).lean();
  }

  // "You might also like" rail: other published events in the same category,
  // soonest first, capped to a small carousel-sized page. Excludes ongoing and past events.
  async findRelated(event: IEvent, limit = 4): Promise<IEvent[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return Event.find({
      _id: { $ne: event._id },
      status: 'published',
      privacy: { $ne: 'private' },
      categorySlug: event.categorySlug,
      $or: [
        { startDate: { $gte: startOfToday } },
        { startDate: { $exists: false }, date: { $gte: startOfToday } },
      ],
    })
      .select(PUBLIC_EVENT_EXCLUDE)
      .sort({ date: 1 })
      .limit(limit)
      .lean();
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
