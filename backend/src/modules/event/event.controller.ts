import { Request, Response } from 'express';
import { EventService } from './event.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';

export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sort, order, status, category } = req.query;
    const result = await this.eventService.getAllEvents({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as string,
      order: order as 'asc' | 'desc',
      status: status as string,
      category: category as string,
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
