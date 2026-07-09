import { Router } from 'express';
import { AdminTicketController } from './admin-ticket.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const adminTicketController = new AdminTicketController();

router.use(isAuthenticated as any, authorize('ADMIN') as any);

router.get('/', adminTicketController.listTickets);
router.get('/:id', adminTicketController.getTicket);
router.put('/:id', adminTicketController.updateTicket);
router.patch('/:id/status', adminTicketController.updateStatus);
router.delete('/:id', adminTicketController.deleteTicket);

export default router;
