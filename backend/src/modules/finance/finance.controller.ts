import { Response } from 'express';
import { FinanceService } from './finance.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';
import { AuthRequest } from '../../common/types';

export class FinanceController {
  private service: FinanceService;

  constructor() {
    this.service = new FinanceService();
  }

  listContracts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.listContracts();
    res.json(ApiResponse.ok(data, 'Lấy danh sách đối soát hợp đồng thành công'));
  });

  updateContractStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, note } = req.body ?? {};
    const result = await this.service.updateContractStatus(
      req.params.id as string,
      req.user!.id,
      status,
      note
    );
    res.json(ApiResponse.ok(result, 'Cập nhật trạng thái đối soát thành công'));
  });

  listPayouts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.listPayouts();
    res.json(ApiResponse.ok(data, 'Lấy danh sách yêu cầu rút tiền thành công'));
  });

  updatePayoutStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, rejectionReason } = req.body ?? {};
    const result = await this.service.updatePayoutStatus(
      req.params.id as string,
      req.user!.id,
      status,
      rejectionReason
    );
    res.json(ApiResponse.ok(result, 'Cập nhật trạng thái yêu cầu rút tiền thành công'));
  });
}
