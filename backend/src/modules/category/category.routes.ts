import { Router } from 'express';
import { CategoryController } from './category.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const categoryController = new CategoryController();

// ─── Public ────────────────────────────────────────────────────────
router.get('/', categoryController.getAll);

// ─── Admin only ────────────────────────────────────────────────────
router.post('/', isAuthenticated as any, authorize('ADMIN') as any, categoryController.create as any);
router.put('/:id', isAuthenticated as any, authorize('ADMIN') as any, categoryController.update as any);
router.delete('/:id', isAuthenticated as any, authorize('ADMIN') as any, categoryController.delete as any);

export default router;
