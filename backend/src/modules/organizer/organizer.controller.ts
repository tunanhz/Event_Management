import { Response } from 'express';
import { OrganizerService } from './organizer.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';

export class OrganizerController {
  private organizerService: OrganizerService;

  constructor() {
    this.organizerService = new OrganizerService();
  }

  // Routes below all run isAuthenticated + authorize('ORGANIZER','ADMIN') first,
  // so req.user is always set.

  createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tickets, ...eventData } = req.body ?? {};
    const result = await this.organizerService.createEventWithTickets(
      eventData,
      tickets,
      req.user!.id
    );
    res.status(201).json(ApiResponse.created(result, 'Tạo sự kiện (nháp) thành công'));
  });

  getMyEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, reviewStatus } = req.query;
    const result = await this.organizerService.getMyEvents(req.user!.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      reviewStatus: reviewStatus as string,
    });
    res.json(ApiResponse.ok(result.data, 'Lấy danh sách sự kiện thành công', result.pagination));
  });

  getEventDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.organizerService.getEventDetail(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(result, 'Lấy chi tiết sự kiện thành công'));
  });

  submitForReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const event = await this.organizerService.submitForReview(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(event, 'Đã gửi sự kiện để chờ duyệt'));
  });

  addTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ticket = await this.organizerService.addTicket(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      req.body
    );
    res.status(201).json(ApiResponse.created(ticket, 'Thêm loại vé thành công'));
  });

  listTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
    const tickets = await this.organizerService.listTickets(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(tickets, 'Lấy danh sách vé thành công'));
  });
}
