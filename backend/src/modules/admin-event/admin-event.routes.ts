import { Router } from 'express';
import { AdminEventController } from './admin-event.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const adminEventController = new AdminEventController();

// ─── Admin Event Moderation (AM-01) ───────────────────────────────────
// Review queue + approve/reject decisions. ADMIN only.
router.use(isAuthenticated as any, authorize('ADMIN') as any);

router.get('/', adminEventController.listEvents);
router.get('/:id', adminEventController.getEventDetail);
router.post('/:id/approve', adminEventController.approveEvent);
router.post('/:id/reject', adminEventController.rejectEvent);

export default router;
