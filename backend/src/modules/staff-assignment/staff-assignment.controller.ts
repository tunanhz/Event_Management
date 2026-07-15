import { Response } from 'express';
import { StaffAssignmentService } from './staff-assignment.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';

export class StaffAssignmentController {
  private service: StaffAssignmentService;

  constructor() {
    this.service = new StaffAssignmentService();
  }

  /** POST /api/staff-assignments — Admin assigns staff to event */
  assign = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId, staffId, roleInEvent, gate, shift } = req.body ?? {};
    const result = await this.service.assignStaff(req.user!.id, {
      eventId,
      staffId,
      roleInEvent,
      gate,
      shift,
    });
    res.status(201).json(ApiResponse.created(result, 'Đã phân công nhân viên'));
  });

  /** DELETE /api/staff-assignments/:eventId/:staffId — Admin removes assignment */
  remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.removeStaff(
      req.user!.id,
      req.params.eventId as string,
      req.params.staffId as string
    );
    res.json(ApiResponse.ok(null, 'Đã gỡ phân công nhân viên'));
  });

  /** GET /api/staff-assignments/event/:eventId — Admin gets staff for event */
  getByEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getByEvent(req.params.eventId as string);
    res.json(ApiResponse.ok(result, 'Lấy danh sách staff theo sự kiện'));
  });

  /** GET /api/staff-assignments/me — Staff gets own assignments */
  getMyAssignments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getMyAssignments(req.user!.id);
    res.json(ApiResponse.ok(result, 'Lấy danh sách sự kiện được giao'));
  });

  /** PATCH /api/staff-assignments/:eventId/:staffId — Admin updates assignment */
  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { roleInEvent, gate, shift } = req.body ?? {};
    const result = await this.service.updateAssignment(
      req.params.eventId as string,
      req.params.staffId as string,
      { roleInEvent, gate, shift }
    );
    res.json(ApiResponse.ok(result, 'Đã cập nhật phân công'));
  });
}
