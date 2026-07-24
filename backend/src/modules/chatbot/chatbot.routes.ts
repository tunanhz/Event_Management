import { Router } from 'express';
import { ChatbotController } from './chatbot.controller';

const router = Router();
const controller = new ChatbotController();

// Public: accessible to both Guest (unauthenticated) and Participant.
router.post('/message', controller.sendMessage);

export default router;
