import { Router } from 'express';
import { CheckInController } from './check-in.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const controller = new CheckInController();

// All check-in routes require authentication + STAFF (or ADMIN for oversight)
router.use(isAuthenticated as any, authorize('STAFF', 'ADMIN') as any);

router.post('/', controller.checkIn);
router.post('/event/:eventId/sell-offline', controller.sellOffline);
router.get('/event/:eventId/attendees', controller.getAttendees);
router.get('/event/:eventId/history', controller.getHistory);
router.get('/event/:eventId/stats', controller.getStats);

export default router;
