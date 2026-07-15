import { Router } from 'express';
import { StaffAssignmentController } from './staff-assignment.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const controller = new StaffAssignmentController();

// All routes require authentication
router.use(isAuthenticated as any);

// ─── Staff routes ──────────────────────────────────────────────────
router.get('/me', authorize('STAFF', 'ADMIN') as any, controller.getMyAssignments);

// ─── Admin routes ──────────────────────────────────────────────────
router.post('/', authorize('ADMIN') as any, controller.assign);
router.get('/event/:eventId', authorize('ADMIN') as any, controller.getByEvent);
router.patch('/:eventId/:staffId', authorize('ADMIN') as any, controller.update);
router.delete('/:eventId/:staffId', authorize('ADMIN') as any, controller.remove);

export default router;
