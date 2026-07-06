import { Response } from 'express';
import { RegistrationService } from './registration.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';

export class RegistrationController {
  private registrationService: RegistrationService;

  constructor() {
    this.registrationService = new RegistrationService();
  }

  // Every route below runs isAuthenticated + authorize('PARTICIPANT') first (see
  // registration.routes.ts), so req.user is always set here.
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId, ticketId, quantity } = req.body;
    const registration = await this.registrationService.createRegistration(req.user!.id, {
      eventId,
      ticketId,
      quantity: Number(quantity),
    });
    res
      .status(201)
      .json(ApiResponse.created(registration, 'Giữ chỗ thành công, vui lòng thanh toán trong 10 phút'));
  });

  confirmPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.registrationService.confirmPayment(req.params.id as string, req.user!.id);
    res.json(ApiResponse.ok(result, 'Xác nhận thanh toán thành công'));
  });

  cancel = asyncHandler(async (req: AuthRequest, res: Response) => {
    const registration = await this.registrationService.cancelRegistration(
      req.params.id as string,
      req.user!.id
    );
    res.json(ApiResponse.ok(registration, 'Hủy đăng ký thành công'));
  });

  getMine = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = req.query;
    const result = await this.registrationService.getMyRegistrations(req.user!.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(ApiResponse.ok(result.data, 'Lấy danh sách đăng ký thành công', result.pagination));
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const registration = await this.registrationService.getRegistrationById(
      req.params.id as string,
      req.user!.id
    );
    res.json(ApiResponse.ok(registration, 'Lấy thông tin đăng ký thành công'));
  });
}
