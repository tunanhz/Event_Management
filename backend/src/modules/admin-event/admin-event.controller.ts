import { Response } from 'express';
import { AdminEventService } from './admin-event.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';
import { asOptionalString, parsePagination } from '../../common/utils/query-params';

export class AdminEventController {
  private adminEventService: AdminEventService;

  constructor() {
    this.adminEventService = new AdminEventService();
  }

  // Routes below all run isAuthenticated + authorize('ADMIN') first,
  // so req.user is always a logged-in admin.

  listEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await this.adminEventService.listEvents({
      page,
      limit,
      reviewStatus: asOptionalString(req.query.reviewStatus),
      status: asOptionalString(req.query.status),
      categoryId: asOptionalString(req.query.categoryId),
      creatorId: asOptionalString(req.query.creatorId),
      search: asOptionalString(req.query.search),
    });
    res.json(ApiResponse.ok(result.data, 'Lấy danh sách sự kiện thành công', result.pagination));
  });

  getEventDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.adminEventService.getEventDetail(req.params.id as string);
    res.json(ApiResponse.ok(result, 'Lấy chi tiết sự kiện thành công'));
  });

  getStatusTracking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.adminEventService.getStatusTracking(
      asOptionalString(req.query.search)
    );
    res.json(ApiResponse.ok(result, 'Lấy theo dõi trạng thái sự kiện thành công'));
  });

  updateEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const event = await this.adminEventService.updateEvent(
      req.params.id as string,
      req.body ?? {}
    );
    res.json(ApiResponse.ok(event, 'Cap nhat su kien thanh cong'));
  });

  forceStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const event = await this.adminEventService.forceStatus(
      req.params.id as string,
      req.user!.id,
      req.body ?? {}
    );
    res.json(ApiResponse.ok(event, 'Cap nhat trang thai su kien thanh cong'));
  });

  cancelEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const event = await this.adminEventService.cancelEvent(
      req.params.id as string,
      (req.body ?? {}).reason
    );
    res.json(ApiResponse.ok(event, 'Da huy su kien'));
  });

  deleteEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.adminEventService.deleteEvent(
      req.params.id as string,
      asOptionalString(req.query.force) === 'true'
    );
    res.json(ApiResponse.ok(null, 'Da xoa su kien'));
  });

  approveEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const event = await this.adminEventService.approveEvent(
      req.params.id as string,
      req.user!.id
    );
    res.json(ApiResponse.ok(event, 'Đã duyệt và công khai sự kiện'));
  });

  rejectEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const event = await this.adminEventService.rejectEvent(
      req.params.id as string,
      (req.body ?? {}).reason
    );
    res.json(ApiResponse.ok(event, 'Đã từ chối sự kiện và gửi lý do cho organizer'));
  });
}
