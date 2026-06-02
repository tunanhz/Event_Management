import { Router } from 'express';
import { UserController } from './user.controller';

const router = Router();
const userController = new UserController();

router.get('/:id', userController.getProfile);
router.put('/:id', userController.updateProfile);
router.delete('/:id', userController.deleteAccount);

export default router;
