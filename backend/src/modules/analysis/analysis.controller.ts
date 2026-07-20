import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from './analysis.service';

export class AnalysisController {
  private analysisService: AnalysisService;

  constructor() {
    this.analysisService = new AnalysisService();
  }

  generateMatchOdds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const matchData = req.body;
      const result = await this.analysisService.generateMatchOdds(matchData);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
