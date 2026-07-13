import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

// Buyer-initiated — needs the caller's session to prove they own the registrations.
router.post(
  '/vnpay/create-payment-url',
  isAuthenticated as any,
  authorize('PARTICIPANT') as any,
  paymentController.createVnpayUrl
);

// Called by VNPAY itself (browser redirect / server-to-server webhook) — no user session
// exists on these requests, authenticity comes from the vnp_SecureHash check instead.
router.get('/vnpay/return', paymentController.vnpayReturn);
router.get('/vnpay/ipn', paymentController.vnpayIpn);

export default router;
