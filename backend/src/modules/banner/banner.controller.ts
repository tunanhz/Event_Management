import { Request, Response } from 'express';
import { BannerService } from './banner.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';

export class BannerController {
  private bannerService: BannerService;

  constructor() {
    this.bannerService = new BannerService();
  }

  getActive = asyncHandler(async (_req: Request, res: Response) => {
    const banners = await this.bannerService.getActiveBanners();
    res.json(ApiResponse.ok(banners, 'Banners retrieved successfully'));
  });

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const banners = await this.bannerService.getAllBanners();
    res.json(ApiResponse.ok(banners, 'All banners retrieved successfully'));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const banner = await this.bannerService.createBanner(req.body);
    res.status(201).json(ApiResponse.created(banner));
  });

  update = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const banner = await this.bannerService.updateBanner(req.params.id, req.body);
    res.json(ApiResponse.ok(banner, 'Banner updated successfully'));
  });

  delete = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    await this.bannerService.deleteBanner(req.params.id);
    res.json(ApiResponse.ok(null, 'Banner deleted successfully'));
  });
}
