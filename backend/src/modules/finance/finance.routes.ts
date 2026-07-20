import { Router } from 'express';
import { FinanceController } from './finance.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const controller = new FinanceController();

// Only admin can access finance routes
router.use(isAuthenticated as any, authorize('ADMIN') as any);

router.get('/contracts', controller.listContracts);
router.patch('/contracts/:id', controller.updateContractStatus);
router.get('/payouts', controller.listPayouts);
router.patch('/payouts/:id', controller.updatePayoutStatus);

export default router;
