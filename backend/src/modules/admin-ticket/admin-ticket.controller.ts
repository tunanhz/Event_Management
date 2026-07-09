import { Response } from 'express';
import { AdminTicketService } from './admin-ticket.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';
import { asOptionalString, parsePagination } from '../../common/utils/query-params';

export class AdminTicketController {
  private adminTicketService: AdminTicketService;

  constructor() {
    this.adminTicketService = new AdminTicketService();
  }

  listTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await this.adminTicketService.listTickets({
      page,
      limit,
      eventId: asOptionalString(req.query.eventId),
      status: asOptionalString(req.query.status),
      search: asOptionalString(req.query.search),
    });
    res.json(ApiResponse.ok(result.data, 'Lay danh sach ve thanh cong', result.pagination));
  });

  getTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ticket = await this.adminTicketService.getTicket(req.params.id as string);
    res.json(ApiResponse.ok(ticket, 'Lay chi tiet ve thanh cong'));
  });

  updateTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ticket = await this.adminTicketService.updateTicket(
      req.params.id as string,
      req.body ?? {}
    );
    res.json(ApiResponse.ok(ticket, 'Cap nhat ve thanh cong'));
  });

  updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ticket = await this.adminTicketService.updateStatus(
      req.params.id as string,
      (req.body ?? {}).status
    );
    res.json(ApiResponse.ok(ticket, 'Cap nhat trang thai ve thanh cong'));
  });

  deleteTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.adminTicketService.deleteTicket(req.params.id as string);
    res.json(ApiResponse.ok(null, 'Da xoa ve'));
  });
}
