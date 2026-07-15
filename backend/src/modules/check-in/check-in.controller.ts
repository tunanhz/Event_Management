import { Response } from 'express';
import { CheckInService } from './check-in.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';

export class CheckInController {
  private service: CheckInService;

  constructor() {
    this.service = new CheckInService();
  }

  /** POST /api/check-in — Staff checks in an attendee */
  checkIn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId, registrationId } = req.body ?? {};
    const result = await this.service.checkIn(req.user!.id, eventId, registrationId);

    const messages: Record<string, string> = {
      SUCCESS: 'Check-in thành công',
      DUPLICATE: 'Vé đã được check-in trước đó',
      INVALID: 'Mã vé không hợp lệ',
    };

    res.json(ApiResponse.ok(result, messages[result.status]));
  });

  /** GET /api/check-in/event/:eventId/attendees — Attendee list + status */
  getAttendees = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getAttendeesForEvent(
      req.user!.id,
      req.params.eventId as string
    );
    res.json(ApiResponse.ok(result, 'Lấy danh sách người tham dự'));
  });

  /** GET /api/check-in/event/:eventId/history — Recent check-in log */
  getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getCheckInHistory(
      req.user!.id,
      req.params.eventId as string
    );
    res.json(ApiResponse.ok(result, 'Lấy lịch sử check-in'));
  });

  /** GET /api/check-in/event/:eventId/stats — Check-in counters */
  getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getCheckInStats(
      req.user!.id,
      req.params.eventId as string
    );
    res.json(ApiResponse.ok(result, 'Lấy thống kê check-in'));
  });

  /** POST /api/check-in/event/:eventId/sell-offline — Staff sells ticket offline */
  sellOffline = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ticketId, quantity, customerName, customerEmail, customerPhone } = req.body ?? {};
    const result = await this.service.sellOffline(
      req.user!.id,
      req.params.eventId as string,
      { ticketId, quantity, customerName, customerEmail, customerPhone }
    );
    res.status(201).json(ApiResponse.created(result, 'Bán vé offline thành công'));
  });
}
