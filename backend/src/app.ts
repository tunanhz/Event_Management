import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './common/middleware/errorHandler';
import { notFoundHandler } from './common/middleware/notFound';

// Module routes
import { eventRoutes } from './modules/event';
import { userRoutes } from './modules/user';
import { categoryRoutes } from './modules/category';
import { starRoutes } from './modules/star';
import { bannerRoutes } from './modules/banner';
import { organizerRoutes } from './modules/organizer';
import { registrationRoutes } from './modules/registration';
import { paymentRoutes } from './modules/payment';
import { adminEventRoutes } from './modules/admin-event';
import { adminTicketRoutes } from './modules/admin-ticket';
import { uploadRoutes } from './modules/upload';
import { staffRoutes } from './modules/staff';
import { StaffController } from './modules/staff';
import { financeRoutes } from './modules/finance';
import { Router } from 'express';
import { isAuthenticated, authorize } from './common/middleware/auth.middleware';

const app = express();

// ─── Global Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stars', starRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/events', adminEventRoutes);
app.use('/api/admin/tickets', adminTicketRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/finance', financeRoutes);

// ─── Admin Staff Management Routes ──────────────────────────────────────────
// Phân công staff + quản lý sự cố (Admin only)
(() => {
  const staffController = new StaffController();
  const adminStaffRouter = Router();

  adminStaffRouter.use(isAuthenticated as any, authorize('ADMIN') as any);

  // Phân công staff cho sự kiện
  adminStaffRouter.post('/events/:id/assignments', staffController.createAssignment);
  adminStaffRouter.get('/events/:id/assignments', staffController.getEventAssignments);
  adminStaffRouter.patch('/events/:id/assignments/:assignmentId', staffController.updateAssignmentNote);
  adminStaffRouter.delete('/events/:id/assignments/:assignmentId', staffController.deleteAssignment);

  // Quản lý sự cố
  adminStaffRouter.get('/incidents', staffController.getAllIncidents);
  adminStaffRouter.patch('/incidents/:id/status', staffController.updateIncidentStatus);

  app.use('/api/admin', adminStaffRouter);
})();

// Uploaded permit documents — CORP header relaxed so the FE origin can embed them.
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

// ─── Error Handling ─────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
