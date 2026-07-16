import { Router } from 'express';
import { AnalysisController } from './analysis.controller';

const router = Router();
const analysisController = new AnalysisController();

router.post('/odds', analysisController.generateMatchOdds);

export const analysisRoutes = router;
