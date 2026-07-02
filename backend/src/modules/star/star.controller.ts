import { Request, Response } from 'express';
import { StarService } from './star.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';

export class StarController {
  private starService: StarService;

  constructor() {
    this.starService = new StarService();
  }

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const stars = await this.starService.getAllStars();
    res.json(ApiResponse.ok(stars, 'Stars retrieved successfully'));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const star = await this.starService.createStar(req.body);
    res.status(201).json(ApiResponse.created(star));
  });

  update = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const star = await this.starService.updateStar(req.params.id, req.body);
    res.json(ApiResponse.ok(star, 'Star updated successfully'));
  });

  delete = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    await this.starService.deleteStar(req.params.id);
    res.json(ApiResponse.ok(null, 'Star deleted successfully'));
  });
}
