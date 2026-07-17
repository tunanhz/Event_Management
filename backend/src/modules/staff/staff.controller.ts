import { Response } from 'express';
import { StaffService } from './staff.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';

export class StaffController {
  private staffService: StaffService;

  constructor() {
    this.staffService = new StaffService();
  }

  private assertStaffCanWork = async (req: AuthRequest, eventId: string): Promise<void> => {
    if (req.user!.role === 'STAFF') {
      await this.staffService.assertConfirmedAssignment(eventId, req.user!.id);
    }
  };

  // ── Assignments (Staff) ──────────────────────────────────────────────────────

  /** GET /api/staff/assignments — Staff xem ca trực của mình */
  getMyAssignments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staffId = req.user!.id;
    const assignments = await this.staffService.getMyAssignments(staffId);
    res.json(ApiResponse.ok(assignments, 'Lấy danh sách ca trực thành công'));
  });

  /** PATCH /api/staff/assignments/:id/confirm — Staff xác nhận nhận ca */
  confirmAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staffId = req.user!.id;
    const updated = await this.staffService.confirmAssignment(req.params.id as string, staffId);
    res.json(ApiResponse.ok(updated, 'Xác nhận nhận ca thành công'));
  });

  // ── Assignments (Admin) ──────────────────────────────────────────────────────

  /** POST /api/admin/events/:id/assignments — Admin phân công staff */
  createAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const eventId = req.params.id as string;
    const assignment = await this.staffService.createAssignment({ eventId, ...req.body });
    res.status(201).json(ApiResponse.created(assignment, 'Phân công nhân viên thành công'));
  });

  /** GET /api/admin/events/:id/assignments — Admin xem danh sách staff được phân công */
  getEventAssignments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignments = await this.staffService.getEventAssignments(req.params.id as string);
    res.json(ApiResponse.ok(assignments, 'Lấy danh sách phân công thành công'));
  });

  /** DELETE /api/admin/events/:id/assignments/:assignmentId — Admin hủy phân công */
  deleteAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.staffService.deleteAssignment(
      req.params.assignmentId as string,
      req.params.id as string
    );
    res.json(ApiResponse.ok(null, 'Hủy phân công thành công'));
  });

  // ── Check-in ─────────────────────────────────────────────────────────────────

  /** POST /api/staff/check-in — Quét vé / check-in */
  checkIn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staffId = req.user!.id;
    const { ticketCode, eventId, gate } = req.body;

    if (!ticketCode || !eventId) {
      res.status(400).json(ApiResponse.error('ticketCode và eventId là bắt buộc'));
      return;
    }

    await this.assertStaffCanWork(req, eventId as string);

    const result = await this.staffService.checkIn({
      ticketCode: ticketCode as string,
      eventId: eventId as string,
      staffId,
      gate: gate as string | undefined,
    });
    res.json(ApiResponse.ok(result, result.message));
  });

  /** GET /api/staff/events/:eventId/checkin-stats — Live stats */
  getCheckInStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const eventId = req.params.eventId as string;
    await this.assertStaffCanWork(req, eventId);
    const stats = await this.staffService.getCheckInStats(eventId);
    res.json(ApiResponse.ok(stats, 'Lấy thống kê check-in thành công'));
  });

  /** GET /api/staff/events/:eventId/checkin-history — Lịch sử check-in */
  getCheckInHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = req.query;
    const eventId = req.params.eventId as string;
    await this.assertStaffCanWork(req, eventId);
    const result = await this.staffService.getCheckInHistory(eventId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(ApiResponse.ok(result.data, 'Lấy lịch sử check-in thành công', result.pagination));
  });

  // ── Attendees ────────────────────────────────────────────────────────────────

  /** GET /api/staff/events/:eventId/attendees — Danh sách người tham dự */
  getAttendees = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, search, checkedIn } = req.query;
    const eventId = req.params.eventId as string;
    await this.assertStaffCanWork(req, eventId);

    const result = await this.staffService.getAttendees(eventId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: typeof search === 'string' ? search : undefined,
      checkedIn: checkedIn === 'true' ? true : checkedIn === 'false' ? false : undefined,
    });
    res.json(ApiResponse.ok(result.data, 'Lấy danh sách người tham dự thành công', result.pagination));
  });

  /** POST /api/staff/events/:eventId/attendees/:registrationId/check-in — Manual check-in */
  manualCheckIn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staffId = req.user!.id;
    const eventId = req.params.eventId as string;
    const registrationId = req.params.registrationId as string;
    await this.assertStaffCanWork(req, eventId);
    const updated = await this.staffService.manualCheckIn(registrationId, staffId, eventId);
    res.json(ApiResponse.ok(updated, 'Check-in thủ công thành công'));
  });

  // ── Incidents ────────────────────────────────────────────────────────────────

  /** POST /api/staff/incidents — Staff tạo báo cáo sự cố */
  createIncident = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staffId = req.user!.id;
    await this.assertStaffCanWork(req, req.body.eventId as string);
    const incident = await this.staffService.createIncident({ ...req.body, staffId });
    res.status(201).json(ApiResponse.created(incident, 'Gửi báo cáo sự cố thành công'));
  });

  /** GET /api/staff/incidents — Staff xem sự cố của mình */
  getMyIncidents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staffId = req.user!.id;
    const { page, limit } = req.query;
    const result = await this.staffService.getMyIncidents(staffId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(ApiResponse.ok(result.data, 'Lấy danh sách sự cố thành công', result.pagination));
  });

  /** GET /api/staff/incidents/:id — Chi tiết sự cố */
  getIncidentById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const incident = await this.staffService.getIncidentById(req.params.id as string);
    res.json(ApiResponse.ok(incident, 'Lấy chi tiết sự cố thành công'));
  });

  /** GET /api/admin/incidents — Admin xem toàn bộ sự cố */
  getAllIncidents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId, status, page, limit } = req.query;
    const result = await this.staffService.getAllIncidents({
      eventId: typeof eventId === 'string' ? eventId : undefined,
      status: typeof status === 'string' ? (status as any) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(ApiResponse.ok(result.data, 'Lấy danh sách sự cố thành công', result.pagination));
  });

  /** PATCH /api/admin/incidents/:id/status — Admin cập nhật trạng thái sự cố */
  updateIncidentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminId = req.user!.id;
    const { status, resolvedNote } = req.body;
    const updated = await this.staffService.updateIncidentStatus(
      req.params.id as string,
      { status, resolvedNote },
      adminId
    );
    res.json(ApiResponse.ok(updated, 'Cập nhật trạng thái sự cố thành công'));
  });
}
