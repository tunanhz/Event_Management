import { Response } from 'express';
import { IncidentService } from './incident.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';

export class IncidentController {
  private service: IncidentService;

  constructor() {
    this.service = new IncidentService();
  }

  /** POST /api/incidents — Staff creates a new incident report */
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId, type, ticketCode, description } = req.body ?? {};
    const result = await this.service.createIncident(req.user!.id, {
      eventId,
      type,
      ticketCode,
      description,
    });
    res.status(201).json(ApiResponse.created(result, 'Đã gửi báo cáo sự cố'));
  });

  /** GET /api/incidents/me — Staff views own reports */
  getMyIncidents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getMyIncidents(req.user!.id);
    res.json(ApiResponse.ok(result, 'Danh sách báo cáo sự cố của bạn'));
  });

  /** GET /api/incidents/event/:eventId — Admin views incidents by event */
  getByEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getByEvent(req.params.eventId as string);
    res.json(ApiResponse.ok(result, 'Danh sách sự cố theo sự kiện'));
  });

  /** GET /api/incidents — Admin views all incidents */
  getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const result = await this.service.getAll(status ? { status } : undefined);
    res.json(ApiResponse.ok(result, 'Danh sách tất cả sự cố'));
  });

  /** PATCH /api/incidents/:id/status — Admin updates incident status */
  updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, resolution } = req.body ?? {};
    const result = await this.service.updateStatus(req.user!.id, req.params.id as string, {
      status,
      resolution,
    });
    res.json(ApiResponse.ok(result, 'Đã cập nhật trạng thái sự cố'));
  });
}
