import { Request, Response } from 'express';
import { ChatbotService } from './chatbot.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';

export class ChatbotController {
  private chatbotService: ChatbotService;

  constructor() {
    this.chatbotService = new ChatbotService();
  }

  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { message, history } = req.body as {
      message: string;
      history?: { role: 'user' | 'assistant'; text: string }[];
    };
    const result = await this.chatbotService.chat(message, history || []);
    res.json(ApiResponse.ok(result, 'OK'));
  });
}
