import { Router } from 'express';
import { BannerController } from './banner.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const bannerController = new BannerController();

// ─── Public (only isActive banners) ───────────────────────────────
router.get('/', bannerController.getActive);

// ─── Admin only ────────────────────────────────────────────────────
router.get('/admin', isAuthenticated as any, authorize('ADMIN') as any, bannerController.getAll as any);
router.post('/', isAuthenticated as any, authorize('ADMIN') as any, bannerController.create as any);
router.put('/:id', isAuthenticated as any, authorize('ADMIN') as any, bannerController.update as any);
router.delete('/:id', isAuthenticated as any, authorize('ADMIN') as any, bannerController.delete as any);

export default router;
