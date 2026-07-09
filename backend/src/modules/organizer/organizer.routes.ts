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
router.put('/events/:id/tickets', organizerController.configureTickets); // EM-128: bulk ticket type configuration
router.put('/events/:id/tickets/:ticketId', organizerController.updateTicket);
router.delete('/events/:id/tickets/:ticketId', organizerController.deleteTicket);

// ─── Ticket inventory management (EM-132) ─────────────────────────────
// Stock-only view/edit that keeps working after the event is PUBLISHED,
// unlike the DRAFT/REJECTED-only configuration routes above.
router.get('/events/:id/tickets/inventory', organizerController.getTicketInventory);
router.patch('/events/:id/tickets/:ticketId/inventory', organizerController.adjustTicketInventory);

// ─── Schedule management (EM-25) ──────────────────────────────────────
router.get('/events/:id/shows', organizerController.listShows);
router.put('/events/:id/shows', organizerController.configureShows); // bulk schedule (shows) configuration

// ─── Permit submission (EM-28 / EM-136) ───────────────────────────────
router.get('/events/:id/permits', organizerController.listPermits);
router.put('/events/:id/permits', organizerController.configurePermits); // bulk permit-document submission

// ─── Deposit & settlement (quotation workflow) ────────────────────────
router.post('/events/:id/pay-deposit', organizerController.payDeposit);
router.post('/events/:id/pay-remaining', organizerController.payRemaining);

export default router;
