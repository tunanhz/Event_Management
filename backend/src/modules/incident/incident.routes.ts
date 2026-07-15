import { Router } from 'express';
import { IncidentController } from './incident.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const controller = new IncidentController();

// All routes require authentication
router.use(isAuthenticated as any);

// ─── Staff routes ──────────────────────────────────────────────────
router.post('/', authorize('STAFF', 'ADMIN') as any, controller.create);
router.get('/me', authorize('STAFF', 'ADMIN') as any, controller.getMyIncidents);

// ─── Admin routes ──────────────────────────────────────────────────
router.get('/', authorize('ADMIN') as any, controller.getAll);
router.get('/event/:eventId', authorize('ADMIN') as any, controller.getByEvent);
router.patch('/:id/status', authorize('ADMIN') as any, controller.updateStatus);

export default router;
