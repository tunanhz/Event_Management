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

// ─── Error Handling ─────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
