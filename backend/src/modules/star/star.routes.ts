import { Router } from 'express';
import { StarController } from './star.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const starController = new StarController();

// ─── Public ────────────────────────────────────────────────────────
router.get('/', starController.getAll);

// ─── Admin only ────────────────────────────────────────────────────
router.post('/', isAuthenticated as any, authorize('ADMIN') as any, starController.create as any);
router.put('/:id', isAuthenticated as any, authorize('ADMIN') as any, starController.update as any);
router.delete('/:id', isAuthenticated as any, authorize('ADMIN') as any, starController.delete as any);

export default router;
