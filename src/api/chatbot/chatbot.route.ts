import { Router } from 'express';
import { ChatController, ChatStreamController } from './chatbot.controller.js';

const router = Router();

router.post('/chat', ChatController);
router.post('/stream', ChatStreamController);

export default router;