import { Request, Response } from 'express';
import { EventService } from './event.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';

// "yyyy-mm-dd" or any Date-parseable string -> Date, or undefined if missing/invalid.
// Invalid values are dropped rather than erroring so a bad filter never 500s a listing page.
function parseDateParam(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const {
      page, limit, sort, order, status, category, categorySlug, city,
      isFree, search, excludeId, collection, dateFrom, dateTo,
    } = req.query;

    // `collection` is a homepage-friendly alias: featured | trending | upcoming
    // (upcoming = default published events sorted by soonest date, no extra flag needed)
    const isFeatured = collection === 'featured' ? true : undefined;
    const isTrending = collection === 'trending' ? true : undefined;

    // categorySlug accepts a single slug or a comma-separated list (multi-select filter panel)
    const categorySlugFilter = typeof categorySlug === 'string' && categorySlug.includes(',')
      ? categorySlug.split(',').map((s) => s.trim()).filter(Boolean)
      : (categorySlug as string | undefined);

    const result = await this.eventService.getAllEvents({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as string,
      order: order as 'asc' | 'desc',
      status: status as string,
      category: category as string,
      categorySlug: categorySlugFilter,
      city: city as string,
      isFree: isFree === undefined ? undefined : isFree === 'true',
      isFeatured,
      isTrending,
      search: search as string,
      excludeId: excludeId as string,
      dateFrom: parseDateParam(dateFrom),
      dateTo: parseDateParam(dateTo),
    });
    res.json(ApiResponse.ok(result.data, 'Events retrieved successfully', result.pagination));
  });

  getById = asyncHandler(async (req: Request<{id: string}>, res: Response) => {
    const event = await this.eventService.getEventById(req.params.id);
    res.json(ApiResponse.ok(event, 'Event retrieved successfully'));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const event = await this.eventService.createEvent(req.body);
    res.status(201).json(ApiResponse.created(event));
  });

  update = asyncHandler(async (req: Request<{id: string}>, res: Response) => {
    const event = await this.eventService.updateEvent(req.params.id, req.body);
    res.json(ApiResponse.ok(event, 'Event updated successfully'));
  });

  delete = asyncHandler(async (req: Request<{id: string}>, res: Response) => {
    await this.eventService.deleteEvent(req.params.id);
    res.json(ApiResponse.ok(null, 'Event deleted successfully'));
  });
}
