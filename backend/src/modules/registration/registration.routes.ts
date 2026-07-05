import { Router } from 'express';
import { RegistrationController } from './registration.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const registrationController = new RegistrationController();

// Registering for events is a PARTICIPANT-only action — organizers/staff/admins manage
// events, they don't buy tickets through this flow. Applied to the whole router since
// every route here acts on the caller's own registrations.
router.use(isAuthenticated as any, authorize('PARTICIPANT') as any);

router.post('/', registrationController.create);
router.get('/me', registrationController.getMine);
router.get('/:id', registrationController.getById);
router.post('/:id/confirm-payment', registrationController.confirmPayment);
router.post('/:id/cancel', registrationController.cancel);

export default router;
