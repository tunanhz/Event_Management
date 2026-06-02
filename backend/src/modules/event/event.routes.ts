import { Router } from 'express';
import { EventController } from './event.controller';

const router = Router();
const eventController = new EventController();

router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);
router.post('/', eventController.create);
router.put('/:id', eventController.update);
router.delete('/:id', eventController.delete);

export default router;
