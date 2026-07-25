import { Response } from 'express';
import { OrganizerService } from './organizer.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';
import { asOptionalString, parsePagination } from '../../common/utils/query-params';
import { buildContentDisposition, buildReportPdf, buildReportWorkbook } from './report-export.util';
import { getClientIp } from '../payment/vnpay.util';

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
      bucket: asOptionalString(req.query.bucket),
      search: asOptionalString(req.query.search),
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

  getTicketInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const inventory = await this.organizerService.getTicketInventory(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(inventory, 'Lấy tồn kho vé thành công'));
  });

  adjustTicketInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ticket = await this.organizerService.adjustTicketInventory(
      req.params.id as string,
      req.params.ticketId as string,
      { id: req.user!.id, role: req.user!.role },
      req.body ?? {}
    );
    res.json(ApiResponse.ok(ticket, 'Cập nhật tồn kho vé thành công'));
  });

  listPermits = asyncHandler(async (req: AuthRequest, res: Response) => {
    const permits = await this.organizerService.listPermits(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(permits, 'Lấy hồ sơ giấy phép thành công'));
  });

  configurePermits = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { permitDocuments } = req.body ?? {};
    const result = await this.organizerService.configurePermits(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      permitDocuments
    );
    res.json(ApiResponse.ok(result, 'Cập nhật hồ sơ giấy phép thành công'));
  });

  // ─── Attendee tracker / orders ("Đơn hàng") ───────────────────────────
  listEventRegistrations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await this.organizerService.listEventRegistrations(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      {
        page,
        limit,
        status: asOptionalString(req.query.status),
        showId: asOptionalString(req.query.showId),
      }
    );
    res.json(
      ApiResponse.ok(result.data, 'Lấy danh sách đơn hàng thành công', result.pagination)
    );
  });

  // ─── Check-in attendance report ───────────────────────────────────────
  getEventCheckIns = asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await this.organizerService.getEventCheckInReport(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      asOptionalString(req.query.showId)
    );
    res.json(ApiResponse.ok(report, 'Lấy báo cáo check-in thành công'));
  });

  // ─── Members ("Thành viên") ───────────────────────────────────────────
  getEventMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const members = await this.organizerService.getEventMembers(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(members, 'Lấy danh sách thành viên thành công'));
  });

  getEventIncidents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const incidents = await this.organizerService.getEventIncidents(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(incidents, 'Lấy danh sách báo cáo sự cố thành công'));
  });

  // ─── Analytics ("Phân tích") ──────────────────────────────────────────
  getEventAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const analytics = await this.organizerService.getEventAnalytics(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      asOptionalString(req.query.showId)
    );
    res.json(ApiResponse.ok(analytics, 'Lấy thống kê bán vé thành công'));
  });

  // ─── Summary sales chart (real PAID sales per day / hour) ─────────────
  getEventSalesSeries = asyncHandler(async (req: AuthRequest, res: Response) => {
    const range = req.query.range === '24h' ? '24h' : '30d';
    const series = await this.organizerService.getEventSalesSeries(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      range,
      asOptionalString(req.query.showId)
    );
    res.json(ApiResponse.ok(series, 'Lấy dữ liệu doanh thu theo thời gian thành công'));
  });

  // ─── Withdrawals ("Rút tiền") ─────────────────────────────────────────
  getWithdrawalOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const overview = await this.organizerService.getWithdrawalOverview(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(overview, 'Lấy thông tin rút tiền thành công'));
  });

  createWithdrawal = asyncHandler(async (req: AuthRequest, res: Response) => {
    const withdrawal = await this.organizerService.createWithdrawal(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      req.body ?? {}
    );
    res
      .status(201)
      .json(ApiResponse.created(withdrawal, 'Đã gửi yêu cầu rút tiền — chờ Admin duyệt'));
  });

  // ─── Revenue reports ("Quản lý báo cáo") ──────────────────────────────
  listMyReports = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await this.organizerService.listMyReports(
      { id: req.user!.id, role: req.user!.role },
      { page, limit }
    );
    res.json(
      ApiResponse.ok(result.data, 'Lấy danh sách báo cáo thành công', result.pagination)
    );
  });

  generateReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await this.organizerService.generateRevenueReport(
      { id: req.user!.id, role: req.user!.role },
      req.body ?? {}
    );
    res.status(201).json(ApiResponse.created(report, 'Tạo báo cáo doanh thu thành công'));
  });

  deleteReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.organizerService.deleteReport(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok(null, 'Đã xoá báo cáo'));
  });

  bulkDeleteReports = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ids } = req.body ?? {};
    const idList = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
    const deletedCount = await this.organizerService.deleteReports(idList, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.json(ApiResponse.ok({ deletedCount }, `Đã xoá ${deletedCount} báo cáo`));
  });

  // Streams the file directly — no fileUrl/on-disk storage step, so a report
  // download is always freshly rendered from its frozen snapshot fields.
  exportReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const format = req.query.format === 'pdf' ? 'pdf' : 'xlsx';
    const report = await this.organizerService.getReportForExport(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    const eventTitle =
      typeof report.eventId === 'object' && report.eventId && 'title' in report.eventId
        ? String((report.eventId as any).title ?? '—')
        : '—';

    if (format === 'pdf') {
      const buffer = await buildReportPdf(report, eventTitle);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', buildContentDisposition(report.reportName, 'pdf'));
      res.send(buffer);
      return;
    }

    const buffer = await buildReportWorkbook(report, eventTitle);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', buildContentDisposition(report.reportName, 'xlsx'));
    res.send(buffer);
  });

  // Both endpoints below only ever return a VNPAY redirect URL — the event's
  // depositStatus/finalPaymentStatus/reviewStatus flip happens later, when VNPAY
  // confirms via the return-redirect or IPN callback (see modules/payment).
  payDeposit = asyncHandler(async (req: AuthRequest, res: Response) => {
    const paymentUrl = await this.organizerService.createDepositPaymentUrl(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      getClientIp(req)
    );
    res.json(ApiResponse.ok({ paymentUrl }, 'Tạo liên kết thanh toán cọc VNPAY thành công'));
  });

  payRemaining = asyncHandler(async (req: AuthRequest, res: Response) => {
    const paymentUrl = await this.organizerService.createRemainingPaymentUrl(
      req.params.id as string,
      { id: req.user!.id, role: req.user!.role },
      getClientIp(req)
    );
    res.json(ApiResponse.ok({ paymentUrl }, 'Tạo liên kết thanh toán VNPAY thành công'));
  });

  cancelEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reason = asOptionalString(req.body?.reason) || 'Organizer hủy sự kiện';
    const event = await this.organizerService.cancelEvent(
      req.params.id as string,
      req.user!.id,
      reason
    );
    res.json(ApiResponse.ok(event, 'Đã hủy sự kiện thành công'));
  });
}
