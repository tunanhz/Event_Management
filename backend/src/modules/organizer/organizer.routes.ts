import { Router } from 'express';
import { OrganizerController } from './organizer.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const organizerController = new OrganizerController();

// ─── Organizer Event Creation (EM-23) ─────────────────────────────────
// Everything here requires an authenticated ORGANIZER; ADMIN kept as
// superuser for parity with the existing event module's convention.
router.use(isAuthenticated as any, authorize('ORGANIZER', 'ADMIN') as any);

router.post('/events', organizerController.createEvent);
router.get('/events', organizerController.getMyEvents);
router.get('/events/:id', organizerController.getEventDetail);
router.put('/events/:id', organizerController.updateEvent);
router.post('/events/:id/submit', organizerController.submitForReview);
router.get('/events/:id/tickets', organizerController.listTickets);
router.post('/events/:id/tickets', organizerController.addTicket);
router.put('/events/:id/tickets/:ticketId', organizerController.updateTicket);
router.delete('/events/:id/tickets/:ticketId', organizerController.deleteTicket);

export default router;
