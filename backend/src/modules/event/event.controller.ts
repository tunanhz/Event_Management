import { Request, Response } from 'express';
import { EventService } from './event.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';

// "yyyy-mm-dd" or any Date-parseable string -> Date, or undefined if missing/invalid.
// Invalid values are dropped rather than erroring so a bad filter never 500s a listing page.
function parseDateParam(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// categorySlug accepts a single slug or a comma-separated list (multi-select filter panel)
function parseCategorySlugParam(value: unknown): string | string[] | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  return value.includes(',') ? value.split(',').map((s) => s.trim()).filter(Boolean) : value;
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
    
    let sortParam = sort as string;
    let orderParam = order as 'asc' | 'desc';
    if (collection === 'trending') {
      sortParam = 'views';
      orderParam = 'desc';
    } else if (collection === 'upcoming') {
      sortParam = 'date';
      orderParam = 'asc';
    }

    const categorySlugFilter = parseCategorySlugParam(categorySlug);

    const result = await this.eventService.getAllEvents({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sortParam,
      order: orderParam,
      status: status as string,
      category: category as string,
      categorySlug: categorySlugFilter,
      city: city as string,
      isFree: isFree === undefined ? undefined : isFree === 'true',
      isFeatured,
      isTrending: undefined, // Sorted by views, no hardcoded flag needed
      search: search as string,
      excludeId: excludeId as string,
      dateFrom: parseDateParam(dateFrom),
      dateTo: parseDateParam(dateTo),
    });
    res.json(ApiResponse.ok(result.data, 'Events retrieved successfully', result.pagination));
  });

  // Free-text search bar (header): matches title/description/location/organizer/category,
  // distinct from getAll's single-field `search` param used by the filter-panel listing page.
  search = asyncHandler(async (req: Request, res: Response) => {
    const {
      q, page, limit, sort, order, category, categorySlug, city, isFree, dateFrom, dateTo,
    } = req.query;

    const result = await this.eventService.searchEvents({
      q: q as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as string,
      order: order as 'asc' | 'desc',
      category: category as string,
      categorySlug: parseCategorySlugParam(categorySlug),
      city: city as string,
      isFree: isFree === undefined ? undefined : isFree === 'true',
      dateFrom: parseDateParam(dateFrom),
      dateTo: parseDateParam(dateTo),
    });
    res.json(ApiResponse.ok(result.data, 'Events retrieved successfully', result.pagination));
  });

  getById = asyncHandler(async (req: Request<{id: string}>, res: Response) => {
    const event = await this.eventService.getEventById(req.params.id);
    res.json(ApiResponse.ok(event, 'Event retrieved successfully'));
  });

  // Richer payload for the detail page: event + ticket tiers + related events,
  // in one round trip instead of the plain getById above.
  getDetail = asyncHandler(async (req: Request<{id: string}>, res: Response) => {
    const detail = await this.eventService.getEventDetail(req.params.id);
    res.json(ApiResponse.ok(detail, 'Event detail retrieved successfully'));
  });

  // Routes below run isAuthenticated + authorize first, so req.user is always set.
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const event = await this.eventService.createEvent(req.body, req.user!.id);
    res.status(201).json(ApiResponse.created(event));
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const event = await this.eventService.updateEvent(req.params.id as string, req.body, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(event, 'Event updated successfully'));
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.eventService.deleteEvent(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(null, 'Event deleted successfully'));
  });
}
