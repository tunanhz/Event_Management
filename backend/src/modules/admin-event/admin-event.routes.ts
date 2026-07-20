import { Router } from 'express';
import { AdminEventController } from './admin-event.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const adminEventController = new AdminEventController();

// ─── Admin Event Moderation (AM-01) ───────────────────────────────────
// Review queue + approve/reject decisions. ADMIN only.
router.use(isAuthenticated as any, authorize('ADMIN') as any);

// Dashboard analytics (must be registered BEFORE /:id to avoid route masking)
router.get('/dashboard/stats', adminEventController.getDashboardStats);
router.get('/dashboard/reports', adminEventController.getDashboardReports);

router.get('/', adminEventController.listEvents);
router.get('/:id', adminEventController.getEventDetail);
router.put('/:id', adminEventController.updateEvent);
router.patch('/:id/status', adminEventController.forceStatus);
router.post('/:id/cancel', adminEventController.cancelEvent);
router.post('/:id/approve', adminEventController.approveEvent);
router.post('/:id/reject', adminEventController.rejectEvent);
router.delete('/:id', adminEventController.deleteEvent);
router.post('/:id/additional-cost', adminEventController.setAdditionalCost);

export default router;

