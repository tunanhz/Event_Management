import { Router } from 'express';
import { EventController } from './event.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const eventController = new EventController();

// ─── Public Routes (anyone can browse events) ────────────────────────
router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);

// ─── Organizer Management Routes (create / edit / delete events) ─────
// Restricted to organizers; admins retained as superusers for moderation.
// Participants and staff are blocked from managing events.
router.post('/', isAuthenticated as any, authorize('ORGANIZER', 'ADMIN') as any, eventController.create);
router.put('/:id', isAuthenticated as any, authorize('ORGANIZER', 'ADMIN') as any, eventController.update);
router.delete('/:id', isAuthenticated as any, authorize('ORGANIZER', 'ADMIN') as any, eventController.delete);

export default router;
