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

// ─── Permit submission (EM-28 / EM-136) ───────────────────────────────
router.get('/events/:id/permits', organizerController.listPermits);
router.put('/events/:id/permits', organizerController.configurePermits); // bulk permit-document submission

// ─── Deposit & settlement (quotation workflow) ────────────────────────
router.post('/events/:id/pay-deposit', organizerController.payDeposit);
router.post('/events/:id/pay-remaining', organizerController.payRemaining);

// ─── Attendee tracker / orders ("Đơn hàng") ───────────────────────────
router.get('/events/:id/registrations', organizerController.listEventRegistrations);

// ─── Check-in attendance report (reads canonical staff CheckInLog) ──
router.get('/events/:id/checkins', organizerController.getEventCheckIns);

// ─── Members — staff assigned by ADMIN, organizer reads ───────────────
router.get('/events/:id/members', organizerController.getEventMembers);
router.get('/events/:id/incidents', organizerController.getEventIncidents);

// ─── Sales analytics (PAID registrations, no web tracking) ────────────
router.get('/events/:id/analytics', organizerController.getEventAnalytics);

// ─── Summary sales chart — real PAID sales per day (30d) / hour (24h) ──
router.get('/events/:id/sales-series', organizerController.getEventSalesSeries);

// ─── Post-event withdrawal requests ───────────────────────────────────
router.get('/events/:id/withdrawals', organizerController.getWithdrawalOverview);
router.post('/events/:id/withdrawals', organizerController.createWithdrawal);

// ─── Revenue reports ("Quản lý báo cáo") ──────────────────────────────
router.get('/reports', organizerController.listMyReports);
router.post('/reports', organizerController.generateReport);
router.get('/reports/:id/export', organizerController.exportReport); // ?format=xlsx|pdf
router.post('/reports/bulk-delete', organizerController.bulkDeleteReports); // body: { ids: string[] }
router.delete('/reports/:id', organizerController.deleteReport);

export default router;
