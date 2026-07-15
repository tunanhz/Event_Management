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
import { staffAssignmentRoutes } from './modules/staff-assignment';
import { checkInRoutes } from './modules/check-in';
import { incidentRoutes } from './modules/incident';

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
app.use('/api/staff-assignments', staffAssignmentRoutes);
app.use('/api/check-in', checkInRoutes);
app.use('/api/incidents', incidentRoutes);

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
