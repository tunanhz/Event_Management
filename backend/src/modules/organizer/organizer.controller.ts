import { Response } from 'express';
import { OrganizerService } from './organizer.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';
import { asOptionalString, parsePagination } from '../../common/utils/query-params';

export class OrganizerController {
  private organizerService: OrganizerService;

  constructor() {
    this.organizerService = new OrganizerService();
  }

  // Routes below all run isAuthenticated + authorize('ORGANIZER','ADMIN') first,
  // so req.user is always set.

  createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Full wizard payload: shows[] with nested tiers, or legacy flat
    // startDate/endDate + tickets[] — normalized inside the service.
    const result = await this.organizerService.createEventWithTickets(
      req.body ?? {},
      req.user!.id
    );
    res.status(201).json(ApiResponse.created(result, 'Tạo sự kiện (nháp) thành công'));
  });

  getMyEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await this.organizerService.getMyEvents(req.user!.id, {
      page,
      limit,
      reviewStatus: asOptionalString(req.query.reviewStatus),
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

  updateEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const event = await this.organizerService.updateEvent(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      req.body
    );
    res.json(ApiResponse.ok(event, 'Cập nhật sự kiện thành công'));
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

  configureTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tickets } = req.body ?? {};
    const result = await this.organizerService.configureTickets(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      tickets
    );
    res.json(ApiResponse.ok(result, 'Cấu hình loại vé thành công'));
  });

  updateTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ticket = await this.organizerService.updateTicket(
      req.params.id as string,
      req.params.ticketId as string,
      { id: req.user!.id, role: req.user!.role },
      req.body
    );
    res.json(ApiResponse.ok(ticket, 'Cập nhật loại vé thành công'));
  });

  deleteTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.organizerService.deleteTicket(req.params.id as string, req.params.ticketId as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(null, 'Xoá loại vé thành công'));
  });
}
