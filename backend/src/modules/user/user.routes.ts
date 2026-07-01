import { Router } from 'express';
import { UserController } from './user.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// ─── Public Authentication Routes ────────────────────────────────────
router.post('/otp/send', userController.sendOTP);
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/google', userController.googleLogin);
router.post('/logout', userController.logout);
router.post('/activate', userController.activateStaff);

// ─── Private Profile Routes ──────────────────────────────────────────
router.get('/me', isAuthenticated as any, userController.getMe as any);
router.put('/me', isAuthenticated as any, userController.updateMe as any);

// ─── Admin Account Management Routes (mounted under /api/users/admin) ─────────────────────────────────
router.get('/admin', isAuthenticated as any, authorize('ADMIN') as any, userController.getAllUsers as any);
router.post('/admin/staff', isAuthenticated as any, authorize('ADMIN') as any, userController.createStaff as any);
router.post('/admin/:id/role', isAuthenticated as any, authorize('ADMIN') as any, userController.updateRole as any);
router.post('/admin/:id/status', isAuthenticated as any, authorize('ADMIN') as any, userController.updateStatus as any);
router.delete('/admin/:id', isAuthenticated as any, authorize('ADMIN') as any, userController.delete as any);


export default router;

